// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IPriceOracle {
    function getPrice() external view returns (uint256);
}

interface IHCFStaking {
    function updateDailyRate(uint256 levelId, uint256 newRate) external;
    function getDailyRate(uint256 levelId) external view returns (uint256);
    function restorePower(address user, bool isNode) external;
    function getTotalStaked() external view returns (uint256);
}

interface IHCFNodeNFT {
    function isNode(address user) external view returns (bool);
    function distributeRewards(uint256 amount) external;
}

interface IHCFToken {
    function burn(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title HCFMarketControl
 * @dev 市场控制/控盘机制合约
 * 实现防暴跌、减产、房损补偿、衰减机制、多签控制
 */
contract HCFMarketControl is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_COMPENSATION = 500 * 10**18; // 最小补偿500 HCF
    uint256 public constant UPDATE_INTERVAL = 1 hours;       // 价格更新间隔
    
    // ============ 结构体 ============
    struct AntiDumpConfig {
        uint256 threshold10;    // 10%跌幅阈值
        uint256 threshold30;    // 30%跌幅阈值
        uint256 threshold50;    // 50%跌幅阈值
        uint256 slippage5;      // 5%滑点
        uint256 slippage15;     // 15%滑点
        uint256 slippage30;     // 30%滑点
    }
    
    struct ReductionConfig {
        uint256 reduction5;     // 5%减产
        uint256 reduction15;    // 15%减产
        uint256 reduction30;    // 30%减产
    }
    
    struct AddonRates {
        uint256 timeBonus;      // 时长加成10%
        uint256 referralBonus;  // 推荐加成5%
        uint256 communityBonus; // 社区加成5%
        uint256 compoundBonus;  // 复合加成20%
    }
    
    // ============ 状态变量 ============
    
    // 配置
    AntiDumpConfig public antiDumpConfig;
    ReductionConfig public reductionConfig;
    AddonRates public addonRates;
    
    // 价格监控
    uint256 public previousPrice;
    uint256 public currentPrice;
    uint256 public lastPriceUpdate;
    uint256 public currentDropPercent;
    
    // 衰减机制
    uint256 public decayThreshold = 100_000_000 * 10**18; // 1亿阈值
    uint256 public decayRate = 10; // 0.1% = 10 basis points
    
    // 底池管理（900万）
    uint256 public availablePool = 9_000_000 * 10**18;
    uint256 public usedPool;
    
    // LP监控
    mapping(address => uint256) public lastLPAmount;
    mapping(address => bool) public hasClaimedCompensation;
    
    // 合约地址
    address public multiSigWallet;
    IPriceOracle public priceOracle;
    IHCFStaking public stakingContract;
    IHCFNodeNFT public nodeContract;
    IHCFToken public hcfToken;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event AntiDumpTriggered(uint256 dropPercent, uint256 newSlippage);
    event ReductionApplied(uint256 reductionPercent);
    event CompensationPaid(address indexed user, uint256 amount);
    event DecayUpdated(uint256 threshold, uint256 rate);
    event AddonUpdated(string addonType, uint256 rate);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 dropPercent);
    event PoolFundsAdded(uint256 amount);
    event PoolFundsWithdrawn(address to, uint256 amount);
    event EmergencyPauseSet(bool status);
    event ContractsSet(address priceOracle, address staking, address node);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier updatePrice() {
        if (block.timestamp >= lastPriceUpdate + UPDATE_INTERVAL) {
            _updatePrice();
        }
        _;
    }
    
    // ============ 构造函数 ============
    constructor(address _multiSigWallet) Ownable(msg.sender) {
        multiSigWallet = _multiSigWallet;
        
        // 初始化防暴跌配置
        antiDumpConfig = AntiDumpConfig({
            threshold10: 1000,  // 10%
            threshold30: 3000,  // 30%
            threshold50: 5000,  // 50%
            slippage5: 500,     // 5%
            slippage15: 1500,   // 15%
            slippage30: 3000    // 30%
        });
        
        // 初始化减产配置
        reductionConfig = ReductionConfig({
            reduction5: 500,    // 5%
            reduction15: 1500,  // 15%
            reduction30: 3000   // 30%
        });
        
        // 初始化加成配置
        addonRates = AddonRates({
            timeBonus: 1000,       // 10%
            referralBonus: 500,    // 5%
            communityBonus: 500,   // 5%
            compoundBonus: 2000    // 20%
        });
    }
    
    // ============ 防暴跌机制 ============
    
    /**
     * @dev 检查价格下跌并触发防护
     */
    function checkPriceDrop() external notPaused updatePrice returns (uint256) {
        uint256 dropPercent = _calculateDropPercent();
        currentDropPercent = dropPercent;
        
        if (dropPercent > 0) {
            applyAntiDump(dropPercent);
            applyReduction(dropPercent);
        }
        
        return dropPercent;
    }
    
    /**
     * @dev 应用防暴跌措施（增加滑点）
     */
    function applyAntiDump(uint256 dropPercent) public notPaused onlyMultiSig {
        uint256 slippageToApply = 0;
        
        if (dropPercent >= antiDumpConfig.threshold50) {
            slippageToApply = antiDumpConfig.slippage30; // 30%滑点
        } else if (dropPercent >= antiDumpConfig.threshold30) {
            slippageToApply = antiDumpConfig.slippage15; // 15%滑点
        } else if (dropPercent >= antiDumpConfig.threshold10) {
            slippageToApply = antiDumpConfig.slippage5;  // 5%滑点
        }
        
        if (slippageToApply > 0) {
            // 计算滑点金额（从底池）
            uint256 slippageAmount = (availablePool * slippageToApply) / BASIS_POINTS;
            
            if (slippageAmount > 0 && slippageAmount <= availablePool) {
                // 50%销毁
                uint256 burnAmount = slippageAmount / 2;
                if (burnAmount > 0) {
                    hcfToken.burn(burnAmount);
                    availablePool -= burnAmount;
                    usedPool += burnAmount;
                }
                
                // 50%分给节点
                uint256 nodeAmount = slippageAmount - burnAmount;
                if (nodeAmount > 0 && address(nodeContract) != address(0)) {
                    hcfToken.transfer(address(nodeContract), nodeAmount);
                    nodeContract.distributeRewards(nodeAmount);
                    availablePool -= nodeAmount;
                    usedPool += nodeAmount;
                }
            }
            
            emit AntiDumpTriggered(dropPercent, slippageToApply);
        }
    }
    
    // ============ 减产机制 ============
    
    /**
     * @dev 应用减产措施（降低日化率）
     */
    function applyReduction(uint256 dropPercent) public notPaused onlyMultiSig {
        uint256 reductionPercent = 0;
        
        if (dropPercent >= antiDumpConfig.threshold50) {
            reductionPercent = reductionConfig.reduction30; // 30%减产
        } else if (dropPercent >= antiDumpConfig.threshold30) {
            reductionPercent = reductionConfig.reduction15; // 15%减产
        } else if (dropPercent >= antiDumpConfig.threshold10) {
            reductionPercent = reductionConfig.reduction5;  // 5%减产
        }
        
        if (reductionPercent > 0 && address(stakingContract) != address(0)) {
            // 更新所有等级的日化率
            for (uint256 i = 0; i < 5; i++) {
                uint256 currentRate = stakingContract.getDailyRate(i);
                uint256 newRate = (currentRate * (BASIS_POINTS - reductionPercent)) / BASIS_POINTS;
                stakingContract.updateDailyRate(i, newRate);
            }
            
            emit ReductionApplied(reductionPercent);
        }
    }
    
    // ============ 房损补偿机制 ============
    
    /**
     * @dev 申请房损补偿
     */
    function claimCompensation(uint256 currentLPAmount) external nonReentrant notPaused {
        require(!hasClaimedCompensation[msg.sender], "Already claimed");
        
        uint256 previousLP = lastLPAmount[msg.sender];
        require(previousLP > 0, "No previous LP record");
        
        // 检查LP减少
        if (currentLPAmount < previousLP) {
            uint256 lpLoss = previousLP - currentLPAmount;
            
            // 计算补偿金额（最少500 HCF）
            uint256 compensationAmount = MIN_COMPENSATION;
            
            // 如果损失很大，可以补偿更多（但不超过损失值）
            if (lpLoss > MIN_COMPENSATION) {
                compensationAmount = lpLoss > availablePool ? availablePool : lpLoss;
            }
            
            // 确保至少500 HCF
            if (compensationAmount < MIN_COMPENSATION) {
                compensationAmount = MIN_COMPENSATION;
            }
            
            require(compensationAmount <= availablePool, "Insufficient pool funds");
            
            // 支付补偿
            _applyCompensation(msg.sender, compensationAmount);
            
            // 恢复算力（优先节点）
            bool isNode = address(nodeContract) != address(0) && 
                         nodeContract.isNode(msg.sender);
            
            if (address(stakingContract) != address(0)) {
                stakingContract.restorePower(msg.sender, isNode);
            }
            
            hasClaimedCompensation[msg.sender] = true;
            lastLPAmount[msg.sender] = currentLPAmount;
            
            emit CompensationPaid(msg.sender, compensationAmount);
        }
    }
    
    /**
     * @dev 内部应用补偿
     */
    function _applyCompensation(address user, uint256 amount) internal {
        require(hcfToken.transfer(user, amount), "Compensation transfer failed");
        availablePool -= amount;
        usedPool += amount;
    }
    
    // ============ 衰减机制 ============
    
    /**
     * @dev 更新衰减（总质押>1亿减0.1%）
     */
    function updateDecay() external notPaused {
        if (address(stakingContract) == address(0)) return;
        
        uint256 totalStaked = stakingContract.getTotalStaked();
        
        if (totalStaked > decayThreshold) {
            // 计算衰减比例
            uint256 decayFactor = (totalStaked * decayRate) / (decayThreshold * 1000);
            
            // 更新所有等级的日化率
            for (uint256 i = 0; i < 5; i++) {
                uint256 currentRate = stakingContract.getDailyRate(i);
                uint256 newRate = currentRate - (currentRate * decayFactor) / BASIS_POINTS;
                stakingContract.updateDailyRate(i, newRate);
            }
            
            emit DecayUpdated(decayThreshold, decayRate);
        }
    }
    
    /**
     * @dev 应用加成
     */
    function applyAddon(address user, string memory addonType) external notPaused returns (uint256) {
        uint256 bonusRate = 0;
        
        if (keccak256(bytes(addonType)) == keccak256(bytes("time"))) {
            bonusRate = addonRates.timeBonus;
        } else if (keccak256(bytes(addonType)) == keccak256(bytes("referral"))) {
            bonusRate = addonRates.referralBonus;
        } else if (keccak256(bytes(addonType)) == keccak256(bytes("community"))) {
            bonusRate = addonRates.communityBonus;
        } else if (keccak256(bytes(addonType)) == keccak256(bytes("compound"))) {
            bonusRate = addonRates.compoundBonus;
        }
        
        emit AddonUpdated(addonType, bonusRate);
        return bonusRate;
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 计算价格下跌百分比
     */
    function _calculateDropPercent() internal view returns (uint256) {
        if (previousPrice == 0 || currentPrice >= previousPrice) {
            return 0;
        }
        
        return ((previousPrice - currentPrice) * BASIS_POINTS) / previousPrice;
    }
    
    /**
     * @dev 更新价格
     */
    function _updatePrice() internal {
        if (address(priceOracle) == address(0)) return;
        
        previousPrice = currentPrice;
        currentPrice = priceOracle.getPrice();
        lastPriceUpdate = block.timestamp;
        
        uint256 dropPercent = _calculateDropPercent();
        emit PriceUpdated(previousPrice, currentPrice, dropPercent);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置防暴跌配置（仅多签）
     */
    function setAntiDumpConfig(
        uint256[3] memory thresholds,
        uint256[3] memory slippages
    ) external onlyMultiSig {
        antiDumpConfig.threshold10 = thresholds[0];
        antiDumpConfig.threshold30 = thresholds[1];
        antiDumpConfig.threshold50 = thresholds[2];
        
        antiDumpConfig.slippage5 = slippages[0];
        antiDumpConfig.slippage15 = slippages[1];
        antiDumpConfig.slippage30 = slippages[2];
    }
    
    /**
     * @dev 设置减产配置（仅多签）
     */
    function setReductionConfig(
        uint256 reduction5,
        uint256 reduction15,
        uint256 reduction30
    ) external onlyMultiSig {
        reductionConfig.reduction5 = reduction5;
        reductionConfig.reduction15 = reduction15;
        reductionConfig.reduction30 = reduction30;
    }
    
    /**
     * @dev 设置衰减阈值（仅多签）
     */
    function setDecayThreshold(uint256 threshold, uint256 rate) external onlyMultiSig {
        require(threshold >= 50_000_000 * 10**18, "Threshold too low"); // 至少5000万
        require(rate <= 100, "Rate too high"); // 最多1%
        
        decayThreshold = threshold;
        decayRate = rate;
        
        emit DecayUpdated(threshold, rate);
    }
    
    /**
     * @dev 设置加成率（仅多签）
     */
    function setAddonRates(
        uint256 time,
        uint256 referral,
        uint256 community,
        uint256 compound
    ) external onlyMultiSig {
        addonRates.timeBonus = time;
        addonRates.referralBonus = referral;
        addonRates.communityBonus = community;
        addonRates.compoundBonus = compound;
    }
    
    /**
     * @dev 添加底池资金（仅多签）
     */
    function addFunds(uint256 amount) external onlyMultiSig {
        require(hcfToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        availablePool += amount;
        emit PoolFundsAdded(amount);
    }
    
    /**
     * @dev 提取底池资金（仅多签）
     */
    function withdraw(address to, uint256 amount) external onlyMultiSig nonReentrant {
        require(amount <= availablePool, "Insufficient pool");
        require(hcfToken.transfer(to, amount), "Transfer failed");
        availablePool -= amount;
        emit PoolFundsWithdrawn(to, amount);
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function emergencyPause(bool pause) external onlyMultiSig {
        emergencyPaused = pause;
        emit EmergencyPauseSet(pause);
    }
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _priceOracle,
        address _staking,
        address _node,
        address _hcfToken
    ) external onlyOwner {
        if (_priceOracle != address(0)) priceOracle = IPriceOracle(_priceOracle);
        if (_staking != address(0)) stakingContract = IHCFStaking(_staking);
        if (_node != address(0)) nodeContract = IHCFNodeNFT(_node);
        if (_hcfToken != address(0)) hcfToken = IHCFToken(_hcfToken);
        
        emit ContractsSet(_priceOracle, _staking, _node);
    }
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid address");
        multiSigWallet = _multiSigWallet;
    }
    
    /**
     * @dev 记录用户LP金额
     */
    function recordLPAmount(address user, uint256 amount) external {
        lastLPAmount[user] = amount;
        hasClaimedCompensation[user] = false;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取状态
     */
    function getStatus() external view returns (
        uint256 price,
        uint256 dropPercent,
        bool isPaused,
        uint256 poolAvailable
    ) {
        return (
            currentPrice,
            currentDropPercent,
            emergencyPaused,
            availablePool
        );
    }
    
    /**
     * @dev 获取配置信息
     */
    function getConfigs() external view returns (
        AntiDumpConfig memory antiDump,
        ReductionConfig memory reduction,
        AddonRates memory addon,
        uint256 decay
    ) {
        return (
            antiDumpConfig,
            reductionConfig,
            addonRates,
            decayThreshold
        );
    }
}