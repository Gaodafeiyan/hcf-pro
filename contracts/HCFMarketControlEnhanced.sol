// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFMarketControl.sol";

/**
 * @title HCFMarketControlEnhanced
 * @dev 市场控制增强版 - 补充缺失功能
 */
contract HCFMarketControlEnhanced is HCFMarketControl {
    
    // ============ 新增状态变量 ============
    
    // 减产恢复机制
    struct RecoveryConfig {
        uint256 recoveryRate;          // 恢复速率（每天恢复多少%）
        uint256 lastRecoveryTime;      // 上次恢复时间
        uint256 currentReduction;      // 当前减产比例
        uint256 targetReduction;       // 目标减产比例
        bool autoRecovery;             // 自动恢复开关
    }
    
    RecoveryConfig public recoveryConfig;
    
    // 衰减机制
    struct DecayConfig {
        uint256 decayThreshold;        // 衰减阈值（1亿）
        uint256 decayRate;             // 衰减率（每亿减0.1%）
        uint256 currentDecay;          // 当前衰减值
        bool enabled;                  // 是否启用
    }
    
    DecayConfig public decayConfig;
    
    // 加成机制
    struct BonusConfig {
        uint256 holdingBonus;          // 持有时长加成（+10%）
        uint256 lpBonus;               // LP加成
        uint256 nodeBonus;             // 节点加成
        uint256 communityBonus;        // 社区加成
        mapping(address => uint256) userBonus; // 用户总加成
    }
    
    BonusConfig public bonusConfig;
    
    // 房损补偿改进
    mapping(address => uint256) public lastCompensationTime;  // 上次补偿时间
    mapping(address => bool) public compensationPending;       // 待补偿状态
    uint256 public totalCompensationPool;                      // 补偿池总量
    address public bottomPoolAddress;                          // 底池地址
    
    // 滑点分配（修正版）
    struct SlippageDistribution {
        uint256 burnRate;              // 销毁比例
        uint256 nodeRate;              // 节点分红比例
        uint256 reserveRate;           // 储备比例（移除）
    }
    
    SlippageDistribution public slippageDistribution;
    
    // ============ 事件 ============
    event ProductionRecovered(uint256 recoveredAmount, uint256 newReduction);
    event DecayApplied(uint256 totalSupply, uint256 decayAmount);
    event BonusUpdated(address indexed user, uint256 totalBonus);
    event CompensationToPool(address indexed user, uint256 amount, address pool);
    event SlippageDistributed(uint256 burnAmount, uint256 nodeAmount);
    
    // ============ 构造函数 ============
    constructor(
        address _multiSig,
        address _hcfToken,
        address _nodePool,
        address _bottomPool
    ) HCFMarketControl(_multiSig, _hcfToken, _nodePool) {
        bottomPoolAddress = _bottomPool;
        
        // 初始化恢复配置
        recoveryConfig = RecoveryConfig({
            recoveryRate: 100,         // 每天恢复1%
            lastRecoveryTime: block.timestamp,
            currentReduction: 0,
            targetReduction: 0,
            autoRecovery: true
        });
        
        // 初始化衰减配置
        decayConfig = DecayConfig({
            decayThreshold: 100_000_000 * 10**18,  // 1亿
            decayRate: 10,              // 0.1% per 亿
            currentDecay: 0,
            enabled: true
        });
        
        // 初始化加成配置
        bonusConfig.holdingBonus = 1000;   // 10%
        bonusConfig.lpBonus = 2000;        // 20%
        bonusConfig.nodeBonus = 2000;      // 20%
        bonusConfig.communityBonus = 500;  // 5%
        
        // 初始化滑点分配（修正：只有销毁+节点）
        slippageDistribution = SlippageDistribution({
            burnRate: 6000,     // 60%销毁
            nodeRate: 4000,     // 40%节点
            reserveRate: 0      // 0%储备（移除）
        });
    }
    
    // ============ 减产恢复机制 ============
    
    /**
     * @dev 自动恢复产出（每天恢复1%）
     */
    function autoRecoverProduction() public {
        if (!recoveryConfig.autoRecovery) {
            return;
        }
        
        uint256 daysPassed = (block.timestamp - recoveryConfig.lastRecoveryTime) / 1 days;
        if (daysPassed == 0) {
            return;
        }
        
        uint256 recoveryAmount = (recoveryConfig.currentReduction * recoveryConfig.recoveryRate * daysPassed) / 10000;
        
        if (recoveryAmount > 0) {
            if (recoveryConfig.currentReduction > recoveryAmount) {
                recoveryConfig.currentReduction -= recoveryAmount;
            } else {
                recoveryConfig.currentReduction = 0;
            }
            
            recoveryConfig.lastRecoveryTime = block.timestamp;
            
            // 通知质押合约恢复产出
            if (address(stakingContract) != address(0)) {
                stakingContract.updateProductionRate(10000 - recoveryConfig.currentReduction);
            }
            
            emit ProductionRecovered(recoveryAmount, recoveryConfig.currentReduction);
        }
    }
    
    /**
     * @dev 手动设置恢复（多签）
     */
    function setRecoveryRate(uint256 rate, bool autoEnabled) external onlyMultiSig {
        recoveryConfig.recoveryRate = rate;
        recoveryConfig.autoRecovery = autoEnabled;
    }
    
    /**
     * @dev 立即恢复到指定水平（多签）
     */
    function immediateRecover(uint256 targetReduction) external onlyMultiSig {
        require(targetReduction <= 3000, "Max 30% reduction");
        
        recoveryConfig.currentReduction = targetReduction;
        recoveryConfig.lastRecoveryTime = block.timestamp;
        
        // 更新质押合约
        if (address(stakingContract) != address(0)) {
            stakingContract.updateProductionRate(10000 - targetReduction);
        }
        
        emit ProductionRecovered(0, targetReduction);
    }
    
    // ============ 衰减机制 ============
    
    /**
     * @dev 应用衰减（总量>1亿时每亿减0.1%）
     */
    function applyDecay() public returns (uint256) {
        if (!decayConfig.enabled) {
            return 0;
        }
        
        uint256 totalSupply = hcfToken.totalSupply();
        
        if (totalSupply <= decayConfig.decayThreshold) {
            decayConfig.currentDecay = 0;
            return 0;
        }
        
        // 计算超过多少亿
        uint256 excessBillions = (totalSupply - decayConfig.decayThreshold) / (100_000_000 * 10**18);
        
        // 每亿减0.1%
        uint256 decayAmount = excessBillions * decayConfig.decayRate;
        
        decayConfig.currentDecay = decayAmount;
        
        // 应用到质押合约
        if (address(stakingContract) != address(0)) {
            uint256 newRate = 10000 > decayAmount ? 10000 - decayAmount : 9000;
            stakingContract.updateProductionRate(newRate);
        }
        
        emit DecayApplied(totalSupply, decayAmount);
        
        return decayAmount;
    }
    
    /**
     * @dev 设置衰减参数（多签）
     */
    function setDecayConfig(
        uint256 threshold,
        uint256 rate,
        bool enabled
    ) external onlyMultiSig {
        decayConfig.decayThreshold = threshold;
        decayConfig.decayRate = rate;
        decayConfig.enabled = enabled;
    }
    
    // ============ 加成机制 ============
    
    /**
     * @dev 计算用户总加成
     */
    function calculateUserBonus(address user) public view returns (uint256) {
        uint256 totalBonus = 0;
        
        // 持有时长加成（30天+）
        if (address(stakingContract) != address(0)) {
            try stakingContract.getUserStakingTime(user) returns (uint256 stakingTime) {
                if (block.timestamp >= stakingTime + 30 days) {
                    totalBonus += bonusConfig.holdingBonus;
                }
            } catch {}
        }
        
        // LP加成
        if (address(stakingContract) != address(0)) {
            try stakingContract.isUserLP(user) returns (bool isLP) {
                if (isLP) {
                    totalBonus += bonusConfig.lpBonus;
                }
            } catch {}
        }
        
        // 节点加成
        if (address(nodeContract) != address(0)) {
            try nodeContract.hasNode(user) returns (bool hasNode) {
                if (hasNode) {
                    totalBonus += bonusConfig.nodeBonus;
                }
            } catch {}
        }
        
        // 社区加成（可由多签设置）
        totalBonus += bonusConfig.userBonus[user];
        
        return totalBonus;
    }
    
    /**
     * @dev 应用加成到用户产出
     */
    function applyBonus(address user, uint256 baseAmount) public returns (uint256) {
        uint256 bonus = calculateUserBonus(user);
        uint256 bonusAmount = (baseAmount * bonus) / 10000;
        
        emit BonusUpdated(user, bonus);
        
        return baseAmount + bonusAmount;
    }
    
    /**
     * @dev 设置用户特定加成（多签）
     */
    function setUserBonus(address user, uint256 bonus) external onlyMultiSig {
        bonusConfig.userBonus[user] = bonus;
    }
    
    /**
     * @dev 设置加成参数（多签）
     */
    function setBonusConfig(
        uint256 holding,
        uint256 lp,
        uint256 node,
        uint256 community
    ) external onlyMultiSig {
        bonusConfig.holdingBonus = holding;
        bonusConfig.lpBonus = lp;
        bonusConfig.nodeBonus = node;
        bonusConfig.communityBonus = community;
    }
    
    // ============ 房损补偿改进 ============
    
    /**
     * @dev 申请房损补偿（必须补到底池）
     */
    function claimImpermanentLossCompensation(uint256 lossAmount) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(lossAmount >= MIN_COMPENSATION, "Loss too small");
        require(
            block.timestamp >= lastCompensationTime[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown period"
        );
        
        // 计算补偿
        uint256 compensation = lossAmount;
        
        // 节点用户额外20%
        bool hasNode = false;
        if (address(nodeContract) != address(0)) {
            try nodeContract.hasNode(msg.sender) returns (bool _hasNode) {
                hasNode = _hasNode;
            } catch {}
        }
        
        if (hasNode) {
            uint256 nodeBonus = (compensation * NODE_BONUS_RATE) / BASIS_POINTS;
            compensation += nodeBonus;
        }
        
        // 必须补偿到底池
        require(bottomPoolAddress != address(0), "Bottom pool not set");
        require(
            hcfToken.transferFrom(controlPoolAddress, bottomPoolAddress, compensation),
            "Compensation to pool failed"
        );
        
        // 更新状态
        lastCompensationTime[msg.sender] = block.timestamp;
        totalCompensations += compensation;
        userCompensations[msg.sender] += compensation;
        
        // 恢复用户产出到100%
        if (address(stakingContract) != address(0)) {
            stakingContract.restoreUserProduction(msg.sender);
        }
        
        emit CompensationToPool(msg.sender, compensation, bottomPoolAddress);
        emit CompensationClaimed(msg.sender, compensation);
        
        return compensation;
    }
    
    /**
     * @dev 设置底池地址（多签）
     */
    function setBottomPoolAddress(address pool) external onlyMultiSig {
        require(pool != address(0), "Invalid pool");
        bottomPoolAddress = pool;
    }
    
    // ============ 滑点分配修正 ============
    
    /**
     * @dev 分配滑点收益（只有销毁+节点）
     */
    function distributeSlippage(uint256 amount) internal override {
        if (amount == 0) return;
        
        // 销毁部分
        uint256 burnAmount = (amount * slippageDistribution.burnRate) / BASIS_POINTS;
        
        // 节点分红部分
        uint256 nodeAmount = (amount * slippageDistribution.nodeRate) / BASIS_POINTS;
        
        // 执行销毁
        if (burnAmount > 0) {
            hcfToken.burn(burnAmount);
        }
        
        // 分配给节点
        if (nodeAmount > 0 && nodePoolAddress != address(0)) {
            require(
                hcfToken.transfer(nodePoolAddress, nodeAmount),
                "Node distribution failed"
            );
            
            // 触发节点分红
            if (address(nodeContract) != address(0)) {
                nodeContract.distributeDividends(0, nodeAmount); // 0 = 滑点分红
            }
        }
        
        emit SlippageDistributed(burnAmount, nodeAmount);
    }
    
    /**
     * @dev 设置滑点分配比例（多签）
     */
    function setSlippageDistribution(
        uint256 burnRate,
        uint256 nodeRate
    ) external onlyMultiSig {
        require(burnRate + nodeRate == 10000, "Must sum to 100%");
        
        slippageDistribution.burnRate = burnRate;
        slippageDistribution.nodeRate = nodeRate;
        slippageDistribution.reserveRate = 0; // 强制为0
    }
    
    // ============ 综合控制 ============
    
    /**
     * @dev 处理价格波动（综合所有机制）
     */
    function handlePriceVolatilityComplete(uint256 currentPrice) 
        external 
        override 
        onlyAuthorized 
    {
        uint256 priceChange = _calculatePriceChange(currentPrice);
        
        if (priceChange == 0) return;
        
        // 1. 应用滑点
        uint256 slippageRate = _getSlippageRate(priceChange);
        if (slippageRate > 0) {
            _applySlippage(slippageRate);
        }
        
        // 2. 应用减产
        uint256 reductionRate = _getReductionRate(priceChange);
        if (reductionRate > 0) {
            _applyProduction(reductionRate);
            recoveryConfig.currentReduction = reductionRate;
            recoveryConfig.targetReduction = reductionRate;
        }
        
        // 3. 检查并应用衰减
        applyDecay();
        
        // 4. 自动恢复检查
        autoRecoverProduction();
        
        lastPrice = currentPrice;
        lastUpdateTime = block.timestamp;
        
        emit PriceVolatilityHandled(currentPrice, priceChange);
    }
    
    /**
     * @dev 获取系统状态
     */
    function getSystemStatus() external view returns (
        uint256 currentReduction,
        uint256 currentDecay,
        uint256 totalCompensated,
        uint256 slippageBurn,
        uint256 slippageNode,
        bool recoveryEnabled,
        bool decayEnabled
    ) {
        return (
            recoveryConfig.currentReduction,
            decayConfig.currentDecay,
            totalCompensations,
            slippageDistribution.burnRate,
            slippageDistribution.nodeRate,
            recoveryConfig.autoRecovery,
            decayConfig.enabled
        );
    }
}