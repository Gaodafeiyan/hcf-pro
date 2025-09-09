// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

interface IHCFNode {
    function distributeDividends(uint256 amount) external;
}

/**
 * @title HCFAntiDump
 * @dev 防暴跌机制合约 - 动态滑点和减产机制
 */
contract HCFAntiDump is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRICE_PRECISION = 1e18;
    
    // ============ 结构体 ============
    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }
    
    struct SlippageConfig {
        uint256 dropThreshold;   // 下跌阈值（基点）
        uint256 slippageRate;    // 滑点增加（基点）
        uint256 burnRate;        // 销毁比例（基点）
        uint256 nodeRewardRate;  // 节点分红比例（基点）
    }
    
    struct ProductionCut {
        uint256 dropThreshold;   // 下跌阈值（基点）
        uint256 cutRate;         // 减产比例（基点）
    }
    
    // ============ 状态变量 ============
    
    // 价格追踪
    PriceData public currentPrice;
    PriceData public dailyOpenPrice;
    uint256 public lastPriceUpdateTime;
    
    // 滑点配置（3个等级）
    SlippageConfig[3] public slippageConfigs;
    
    // 减产配置（3个等级）
    ProductionCut[3] public productionCuts;
    
    // 当前状态
    uint256 public currentSlippage;      // 当前额外滑点
    uint256 public currentBurnRate;      // 当前销毁率
    uint256 public currentNodeReward;    // 当前节点分红率
    uint256 public currentProductionCut; // 当前减产率
    
    // 合约地址
    address public hcfToken;
    address public bsdtToken;
    address public pancakePair;
    address public nodeContract;
    address public stakingContract;
    
    // 统计数据
    uint256 public totalBurned;
    uint256 public totalNodeRewards;
    uint256 public lastResetTime;
    
    mapping(address => bool) public operators;
    
    // ============ 事件 ============
    event PriceUpdated(uint256 oldPrice, uint256 newPrice, int256 changePercent);
    event AntiDumpTriggered(uint256 dropPercent, uint256 slippage, uint256 burnRate, uint256 nodeReward);
    event ProductionCutTriggered(uint256 dropPercent, uint256 cutRate);
    event DailyReset(uint256 openPrice);
    event TokensBurned(uint256 amount);
    event NodeRewardsDistributed(uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _pancakePair
    ) Ownable() {
        hcfToken = _hcfToken;
        bsdtToken = _bsdtToken;
        pancakePair = _pancakePair;
        
        // 初始化滑点配置
        // 10%下跌：5%滑点（3%销毁，2%节点）
        slippageConfigs[0] = SlippageConfig({
            dropThreshold: 1000,  // 10%
            slippageRate: 500,    // 5%
            burnRate: 300,        // 3%
            nodeRewardRate: 200   // 2%
        });
        
        // 30%下跌：15%滑点（10%销毁，5%节点）
        slippageConfigs[1] = SlippageConfig({
            dropThreshold: 3000,  // 30%
            slippageRate: 1500,   // 15%
            burnRate: 1000,       // 10%
            nodeRewardRate: 500   // 5%
        });
        
        // 50%下跌：30%滑点（20%销毁，10%节点）
        slippageConfigs[2] = SlippageConfig({
            dropThreshold: 5000,  // 50%
            slippageRate: 3000,   // 30%
            burnRate: 2000,       // 20%
            nodeRewardRate: 1000  // 10%
        });
        
        // 初始化减产配置
        productionCuts[0] = ProductionCut({
            dropThreshold: 1000,  // 10%
            cutRate: 500          // 5%
        });
        
        productionCuts[1] = ProductionCut({
            dropThreshold: 3000,  // 30%
            cutRate: 1500         // 15%
        });
        
        productionCuts[2] = ProductionCut({
            dropThreshold: 5000,  // 50%
            cutRate: 3000         // 30%
        });
        
        lastResetTime = block.timestamp;
        _updatePrice();
        dailyOpenPrice = currentPrice;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 更新价格并检查触发条件
     */
    function updateAndCheck() external {
        _updatePrice();
        _checkAndTriggerAntiDump();
        _checkDailyReset();
    }
    
    /**
     * @dev 内部更新价格
     */
    function _updatePrice() internal {
        require(pancakePair != address(0), "Pair not set");
        
        uint256 hcfPrice = getHCFPrice();
        
        PriceData memory oldPrice = currentPrice;
        currentPrice = PriceData({
            price: hcfPrice,
            timestamp: block.timestamp
        });
        
        lastPriceUpdateTime = block.timestamp;
        
        if (oldPrice.price > 0) {
            int256 changePercent = ((int256(hcfPrice) - int256(oldPrice.price)) * 10000) / int256(oldPrice.price);
            emit PriceUpdated(oldPrice.price, hcfPrice, changePercent);
        }
    }
    
    /**
     * @dev 获取HCF价格
     */
    function getHCFPrice() public view returns (uint256) {
        IPancakePair pair = IPancakePair(pancakePair);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        
        address token0 = pair.token0();
        
        if (token0 == hcfToken) {
            // HCF是token0，BSDT是token1
            return (uint256(reserve1) * PRICE_PRECISION) / uint256(reserve0);
        } else {
            // BSDT是token0，HCF是token1
            return (uint256(reserve0) * PRICE_PRECISION) / uint256(reserve1);
        }
    }
    
    /**
     * @dev 检查并触发防暴跌机制
     */
    function _checkAndTriggerAntiDump() internal {
        if (dailyOpenPrice.price == 0) return;
        
        // 计算日内跌幅
        uint256 dropPercent = 0;
        if (currentPrice.price < dailyOpenPrice.price) {
            dropPercent = ((dailyOpenPrice.price - currentPrice.price) * BASIS_POINTS) / dailyOpenPrice.price;
        }
        
        // 重置当前设置
        currentSlippage = 0;
        currentBurnRate = 0;
        currentNodeReward = 0;
        currentProductionCut = 0;
        
        // 检查触发条件（从高到低检查）
        for (uint256 i = 2; i >= 0; i--) {
            if (dropPercent >= slippageConfigs[i].dropThreshold) {
                // 设置滑点
                currentSlippage = slippageConfigs[i].slippageRate;
                currentBurnRate = slippageConfigs[i].burnRate;
                currentNodeReward = slippageConfigs[i].nodeRewardRate;
                
                // 设置减产
                currentProductionCut = productionCuts[i].cutRate;
                
                emit AntiDumpTriggered(dropPercent, currentSlippage, currentBurnRate, currentNodeReward);
                emit ProductionCutTriggered(dropPercent, currentProductionCut);
                break;
            }
            
            if (i == 0) break; // 防止下溢
        }
    }
    
    /**
     * @dev 检查是否需要每日重置
     */
    function _checkDailyReset() internal {
        if (block.timestamp >= lastResetTime + 1 days) {
            dailyOpenPrice = currentPrice;
            lastResetTime = block.timestamp;
            
            // 重置防暴跌状态
            currentSlippage = 0;
            currentBurnRate = 0;
            currentNodeReward = 0;
            currentProductionCut = 0;
            
            emit DailyReset(dailyOpenPrice.price);
        }
    }
    
    /**
     * @dev 应用滑点（由交易合约调用）
     */
    function applySlippage(uint256 amount) external returns (uint256 burnAmount, uint256 nodeAmount) {
        if (currentSlippage == 0) return (0, 0);
        
        uint256 slippageAmount = (amount * currentSlippage) / BASIS_POINTS;
        
        // 计算销毁和节点分红
        burnAmount = (amount * currentBurnRate) / BASIS_POINTS;
        nodeAmount = (amount * currentNodeReward) / BASIS_POINTS;
        
        if (burnAmount > 0) {
            totalBurned += burnAmount;
            emit TokensBurned(burnAmount);
        }
        
        if (nodeAmount > 0 && nodeContract != address(0)) {
            totalNodeRewards += nodeAmount;
            IHCFNode(nodeContract).distributeDividends(nodeAmount);
            emit NodeRewardsDistributed(nodeAmount);
        }
        
        return (burnAmount, nodeAmount);
    }
    
    /**
     * @dev 获取当前减产率（由质押合约调用）
     */
    function getProductionCutRate() external view returns (uint256) {
        return currentProductionCut;
    }
    
    /**
     * @dev 获取调整后的产出
     */
    function getAdjustedProduction(uint256 baseProduction) external view returns (uint256) {
        if (currentProductionCut == 0) {
            return baseProduction;
        }
        
        uint256 cutAmount = (baseProduction * currentProductionCut) / BASIS_POINTS;
        return baseProduction - cutAmount;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取当前状态
     */
    function getCurrentStatus() external view returns (
        uint256 currentPriceValue,
        uint256 dailyOpenPriceValue,
        uint256 dropPercent,
        uint256 slippage,
        uint256 burnRate,
        uint256 nodeReward,
        uint256 productionCut
    ) {
        currentPriceValue = currentPrice.price;
        dailyOpenPriceValue = dailyOpenPrice.price;
        
        if (dailyOpenPrice.price > 0 && currentPrice.price < dailyOpenPrice.price) {
            dropPercent = ((dailyOpenPrice.price - currentPrice.price) * BASIS_POINTS) / dailyOpenPrice.price;
        }
        
        slippage = currentSlippage;
        burnRate = currentBurnRate;
        nodeReward = currentNodeReward;
        productionCut = currentProductionCut;
    }
    
    /**
     * @dev 获取下跌百分比
     */
    function getDropPercentage() external view returns (int256) {
        if (dailyOpenPrice.price == 0) return 0;
        
        return ((int256(currentPrice.price) - int256(dailyOpenPrice.price)) * 10000) / int256(dailyOpenPrice.price);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _nodeContract,
        address _stakingContract,
        address _pancakePair
    ) external onlyOwner {
        if (_nodeContract != address(0)) nodeContract = _nodeContract;
        if (_stakingContract != address(0)) stakingContract = _stakingContract;
        if (_pancakePair != address(0)) pancakePair = _pancakePair;
    }
    
    /**
     * @dev 设置操作员
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }
    
    /**
     * @dev 更新滑点配置
     */
    function updateSlippageConfig(
        uint256 level,
        uint256 dropThreshold,
        uint256 slippageRate,
        uint256 burnRate,
        uint256 nodeRewardRate
    ) external onlyOperator {
        require(level < 3, "Invalid level");
        require(slippageRate == burnRate + nodeRewardRate, "Rate mismatch");
        
        slippageConfigs[level] = SlippageConfig({
            dropThreshold: dropThreshold,
            slippageRate: slippageRate,
            burnRate: burnRate,
            nodeRewardRate: nodeRewardRate
        });
    }
    
    /**
     * @dev 更新减产配置
     */
    function updateProductionCut(
        uint256 level,
        uint256 dropThreshold,
        uint256 cutRate
    ) external onlyOperator {
        require(level < 3, "Invalid level");
        require(cutRate <= 5000, "Cut rate too high"); // 最多50%
        
        productionCuts[level] = ProductionCut({
            dropThreshold: dropThreshold,
            cutRate: cutRate
        });
    }
    
    /**
     * @dev 手动重置每日开盘价
     */
    function manualDailyReset() external onlyOperator {
        _updatePrice();
        dailyOpenPrice = currentPrice;
        lastResetTime = block.timestamp;
        
        currentSlippage = 0;
        currentBurnRate = 0;
        currentNodeReward = 0;
        currentProductionCut = 0;
        
        emit DailyReset(dailyOpenPrice.price);
    }
    
    /**
     * @dev 强制更新价格
     */
    function forceUpdatePrice() external onlyOperator {
        _updatePrice();
        _checkAndTriggerAntiDump();
    }
}