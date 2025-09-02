// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IHCFToken {
    function setTaxRates(uint256 _buyTax, uint256 _sellTax, uint256 _transferTax) external;
    function burn(uint256 amount) external;
}

interface IHCFStaking {
    function setBaseDailyRates(uint256[5] memory rates) external;
    function setDecayParams(uint256 threshold, uint256 rate) external;
    function setBonusParams(uint256 _time, uint256 _referral, uint256 _community, uint256 _compound) external;
}

interface IHCFNodeNFT {
    function addDividend(uint256 amount, string memory source) external;
}

interface IHCFReferral {
    function setDynamicYieldRatio(uint256 ratio) external;
    function setBurnCap(uint256 cap) external;
    function setBurnRates(uint256 _deposit, uint256 _static, uint256 _team, uint256 _variable, uint256 _transaction, uint256 _scheduled) external;
}

interface IPriceOracle {
    function getHCFPrice() external view returns (uint256);
    function get24HourPriceChange() external view returns (int256);
}

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

/**
 * @title HCFMarketControlV2
 * @dev 市场控制合约 - 防暴跌、减产、销毁、衰减机制
 */
contract HCFMarketControlV2 is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant PRECISION = 10000;
    uint256 public constant PERCENT = 100;
    
    // ============ 接口 ============
    IHCFToken public hcfToken;
    IHCFStaking public stakingContract;
    IHCFNodeNFT public nodeContract;
    IHCFReferral public referralContract;
    IPriceOracle public priceOracle;
    address public multiSigWallet;
    
    // ============ 防暴跌参数 ============
    struct AntiDumpLevel {
        int256 priceDropThreshold;    // 价格跌幅阈值（负数）
        uint256 additionalTax;        // 额外税率（基点）
        uint256 burnRatio;           // 销毁比例（基点）
        uint256 nodeRatio;           // 节点分红比例（基点）
    }
    
    AntiDumpLevel[3] public antiDumpLevels;
    
    // ============ 防暴减产参数 ============
    struct ProductionReduction {
        int256 priceDropThreshold;    // 价格跌幅阈值
        uint256 reductionRate;       // 减产率（基点）
    }
    
    ProductionReduction[3] public productionReductions;
    
    // ============ 销毁参数 ============
    uint256 public globalBurnCap;           // 全局销毁封顶（质押日产出%）
    uint256 public referralBurnRate = 1000; // 推荐销毁10%
    uint256 public variableBurnRate = 500;  // 变动销毁5%
    uint256 public transactionBurnRate = 100; // 交易销毁1%
    uint256 public scheduledBurnRate = 100;   // 定时销毁1%
    uint256 public lastScheduledBurn;
    uint256 public scheduledBurnInterval = 1 days;
    
    // ============ 衰减参数 ============
    uint256 public decayThreshold = 100_000_000 * 10**18;  // 1亿HCF
    uint256 public decayRate = 10;                         // 每亿减0.1%
    uint256 public totalStaked;                            // 总质押量
    
    // ============ 加成参数 ============
    uint256 public timeBonus = 1000;       // 时长加成10%
    uint256 public referralBonus = 500;    // 推荐加成5%
    uint256 public communityBonus = 500;   // 社区加成5%
    uint256 public compoundBonus = 2000;   // 复合加成20%
    
    // ============ 状态变量 ============
    bool public antiDumpEnabled = true;
    bool public productionReductionEnabled = true;
    bool public decayEnabled = true;
    
    uint256 public currentTaxMultiplier = PRECISION;     // 当前税率乘数
    uint256 public currentProductionMultiplier = PRECISION; // 当前产出乘数
    
    // ============ 事件 ============
    event AntiDumpTriggered(int256 priceChange, uint256 additionalTax, uint256 burned, uint256 toNodes);
    event ProductionReduced(int256 priceChange, uint256 reductionRate);
    event BurnExecuted(uint256 amount, string reason);
    event DecayApplied(uint256 totalStaked, uint256 decayPercent);
    event BonusUpdated(string bonusType, uint256 newRate);
    event MarketControlUpdated(string parameter, uint256 value);
    event ScheduledBurnExecuted(uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _stakingContract,
        address _nodeContract,
        address _referralContract,
        address _priceOracle
    ) {
        hcfToken = IHCFToken(_hcfToken);
        stakingContract = IHCFStaking(_stakingContract);
        nodeContract = IHCFNodeNFT(_nodeContract);
        referralContract = IHCFReferral(_referralContract);
        priceOracle = IPriceOracle(_priceOracle);
        
        // 初始化防暴跌级别
        antiDumpLevels[0] = AntiDumpLevel(-1000, 500, 3000, 7000);   // 跌10%: +5%税, 30%烧70%节点
        antiDumpLevels[1] = AntiDumpLevel(-3000, 1500, 5000, 5000);  // 跌30%: +15%税, 50%烧50%节点
        antiDumpLevels[2] = AntiDumpLevel(-5000, 3000, 7000, 3000);  // 跌50%: +30%税, 70%烧30%节点
        
        // 初始化减产级别
        productionReductions[0] = ProductionReduction(-1000, 500);    // 跌10%: 减5%
        productionReductions[1] = ProductionReduction(-3000, 1500);   // 跌30%: 减15%
        productionReductions[2] = ProductionReduction(-5000, 3000);   // 跌50%: 减30%
        
        lastScheduledBurn = block.timestamp;
    }
    
    // ============ 防暴跌机制 ============
    
    /**
     * @dev 检查并应用防暴跌机制
     */
    function checkAndApplyAntiDump() external nonReentrant {
        if (!antiDumpEnabled) return;
        
        // 获取24小时价格变化
        int256 priceChange = priceOracle.get24HourPriceChange();
        
        // 检查是否触发防暴跌
        for (uint256 i = 2; i >= 0; i--) {
            AntiDumpLevel memory level = antiDumpLevels[i];
            
            if (priceChange <= level.priceDropThreshold) {
                _applyAntiDumpMeasures(i, priceChange);
                break;
            }
            
            if (i == 0) break;
        }
    }
    
    /**
     * @dev 应用防暴跌措施
     */
    function _applyAntiDumpMeasures(uint256 levelIndex, int256 priceChange) private {
        AntiDumpLevel memory level = antiDumpLevels[levelIndex];
        
        // 增加税率
        uint256 baseBuyTax = 200;   // 2%
        uint256 baseSellTax = 500;  // 5%
        uint256 baseTransferTax = 100; // 1%
        
        uint256 newBuyTax = baseBuyTax + level.additionalTax;
        uint256 newSellTax = baseSellTax + level.additionalTax;
        uint256 newTransferTax = baseTransferTax + (level.additionalTax / 2);
        
        // 更新税率
        hcfToken.setTaxRates(newBuyTax, newSellTax, newTransferTax);
        currentTaxMultiplier = PRECISION + level.additionalTax;
        
        // 分配税收：部分销毁，部分给节点
        uint256 taxAmount = 1000000 * 10**18;  // 示例金额
        uint256 burnAmount = (taxAmount * level.burnRatio) / PRECISION;
        uint256 nodeAmount = (taxAmount * level.nodeRatio) / PRECISION;
        
        // 执行销毁
        if (burnAmount > 0) {
            hcfToken.burn(burnAmount);
            emit BurnExecuted(burnAmount, "Anti-dump");
        }
        
        // 分配给节点
        if (nodeAmount > 0) {
            nodeContract.addDividend(nodeAmount, "Anti-dump");
        }
        
        emit AntiDumpTriggered(priceChange, level.additionalTax, burnAmount, nodeAmount);
    }
    
    // ============ 防暴减产机制 ============
    
    /**
     * @dev 检查并应用减产机制
     */
    function checkAndApplyProductionReduction() external nonReentrant {
        if (!productionReductionEnabled) return;
        
        // 获取24小时价格变化
        int256 priceChange = priceOracle.get24HourPriceChange();
        
        // 检查是否触发减产
        for (uint256 i = 2; i >= 0; i--) {
            ProductionReduction memory reduction = productionReductions[i];
            
            if (priceChange <= reduction.priceDropThreshold) {
                _applyProductionReduction(reduction.reductionRate, priceChange);
                break;
            }
            
            if (i == 0) break;
        }
    }
    
    /**
     * @dev 应用减产
     */
    function _applyProductionReduction(uint256 reductionRate, int256 priceChange) private {
        // 更新产出乘数
        currentProductionMultiplier = PRECISION - reductionRate;
        
        // 计算新的日化收益率
        uint256[5] memory currentRates = [uint256(40), 50, 60, 70, 80];  // 基础0.4%-0.8%
        uint256[5] memory newRates;
        
        for (uint256 i = 0; i < 5; i++) {
            newRates[i] = (currentRates[i] * currentProductionMultiplier) / PRECISION;
        }
        
        // 更新质押合约的收益率
        stakingContract.setBaseDailyRates(newRates);
        
        // 更新推荐合约的动态收益比
        uint256 newDynamicRatio = (7000 * currentProductionMultiplier) / PRECISION;  // 基础70%
        if (newDynamicRatio < 5000) newDynamicRatio = 5000;  // 最低50%
        referralContract.setDynamicYieldRatio(newDynamicRatio);
        
        emit ProductionReduced(priceChange, reductionRate);
    }
    
    // ============ 销毁机制 ============
    
    /**
     * @dev 执行销毁（带封顶）
     */
    function executeBurn(uint256 amount, string memory reason) external nonReentrant {
        require(
            msg.sender == address(stakingContract) ||
            msg.sender == address(referralContract) ||
            msg.sender == multiSigWallet,
            "Unauthorized"
        );
        
        // 应用销毁封顶
        uint256 actualBurnAmount = _applyBurnCap(amount);
        
        if (actualBurnAmount > 0) {
            hcfToken.burn(actualBurnAmount);
            emit BurnExecuted(actualBurnAmount, reason);
        }
    }
    
    /**
     * @dev 定时销毁
     */
    function executeScheduledBurn() external nonReentrant {
        require(block.timestamp >= lastScheduledBurn + scheduledBurnInterval, "Too early");
        
        // 计算销毁量（基于总质押量）
        uint256 burnAmount = (totalStaked * scheduledBurnRate) / PRECISION;
        
        if (burnAmount > 0) {
            burnAmount = _applyBurnCap(burnAmount);
            hcfToken.burn(burnAmount);
            emit ScheduledBurnExecuted(burnAmount);
        }
        
        lastScheduledBurn = block.timestamp;
    }
    
    /**
     * @dev 应用销毁封顶
     */
    function _applyBurnCap(uint256 amount) private view returns (uint256) {
        if (globalBurnCap == 0) return amount;
        
        // 计算日产出（示例值）
        uint256 dailyProduction = (totalStaked * 50) / PRECISION;  // 0.5%平均日化
        uint256 cap = (dailyProduction * globalBurnCap) / PRECISION;
        
        return amount > cap ? cap : amount;
    }
    
    // ============ 衰减机制 ============
    
    /**
     * @dev 应用衰减
     */
    function applyDecay() external nonReentrant {
        if (!decayEnabled) return;
        
        // 更新总质押量（从质押合约获取）
        // totalStaked = stakingContract.totalStaked();
        
        if (totalStaked <= decayThreshold) {
            // 未达到衰减阈值
            return;
        }
        
        // 计算衰减
        uint256 excessAmount = totalStaked - decayThreshold;
        uint256 decayUnits = excessAmount / (100_000_000 * 10**18);  // 每1亿为单位
        uint256 decayPercent = decayUnits * decayRate;  // 每亿减0.1%
        
        // 应用衰减到质押收益率
        uint256[5] memory currentRates = [uint256(40), 50, 60, 70, 80];
        uint256[5] memory newRates;
        
        for (uint256 i = 0; i < 5; i++) {
            if (decayPercent >= currentRates[i]) {
                newRates[i] = 0;
            } else {
                newRates[i] = currentRates[i] - decayPercent;
            }
        }
        
        // 更新质押合约
        stakingContract.setBaseDailyRates(newRates);
        stakingContract.setDecayParams(decayThreshold, decayRate);
        
        // 应用加成平衡
        _applyBonusBalance();
        
        emit DecayApplied(totalStaked, decayPercent);
    }
    
    /**
     * @dev 应用加成平衡
     */
    function _applyBonusBalance() private {
        // 更新质押合约的加成参数
        stakingContract.setBonusParams(
            timeBonus,
            referralBonus,
            communityBonus,
            compoundBonus
        );
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSig) external onlyOwner {
        multiSigWallet = _multiSig;
    }
    
    /**
     * @dev 设置防暴跌级别（多签）
     */
    function setAntiDumpLevel(
        uint256 index,
        int256 threshold,
        uint256 tax,
        uint256 burnRatio,
        uint256 nodeRatio
    ) external onlyMultiSig {
        require(index < 3, "Invalid index");
        require(burnRatio + nodeRatio == PRECISION, "Ratios must sum to 100%");
        
        antiDumpLevels[index] = AntiDumpLevel(threshold, tax, burnRatio, nodeRatio);
        emit MarketControlUpdated("AntiDumpLevel", index);
    }
    
    /**
     * @dev 设置减产级别（多签）
     */
    function setProductionReduction(
        uint256 index,
        int256 threshold,
        uint256 reduction
    ) external onlyMultiSig {
        require(index < 3, "Invalid index");
        
        productionReductions[index] = ProductionReduction(threshold, reduction);
        emit MarketControlUpdated("ProductionReduction", index);
    }
    
    /**
     * @dev 设置销毁参数（多签）
     */
    function setBurnParameters(
        uint256 _globalCap,
        uint256 _referral,
        uint256 _variable,
        uint256 _transaction,
        uint256 _scheduled
    ) external onlyMultiSig {
        globalBurnCap = _globalCap;
        referralBurnRate = _referral;
        variableBurnRate = _variable;
        transactionBurnRate = _transaction;
        scheduledBurnRate = _scheduled;
        
        // 更新推荐合约的销毁率
        referralContract.setBurnCap(_globalCap);
        referralContract.setBurnRates(0, _referral, 500, _variable, _transaction, _scheduled);
        
        emit MarketControlUpdated("BurnParameters", _globalCap);
    }
    
    /**
     * @dev 设置衰减参数（多签）
     */
    function setDecayParameters(uint256 threshold, uint256 rate) external onlyMultiSig {
        decayThreshold = threshold;
        decayRate = rate;
        
        emit MarketControlUpdated("DecayParameters", threshold);
    }
    
    /**
     * @dev 设置加成参数（多签）
     */
    function setBonusParameters(
        uint256 _time,
        uint256 _referral,
        uint256 _community,
        uint256 _compound
    ) external onlyMultiSig {
        timeBonus = _time;
        referralBonus = _referral;
        communityBonus = _community;
        compoundBonus = _compound;
        
        _applyBonusBalance();
        
        emit BonusUpdated("All", _time);
    }
    
    /**
     * @dev 启用/禁用机制（多签）
     */
    function setMechanismStatus(
        bool _antiDump,
        bool _production,
        bool _decay
    ) external onlyMultiSig {
        antiDumpEnabled = _antiDump;
        productionReductionEnabled = _production;
        decayEnabled = _decay;
    }
    
    /**
     * @dev 设置定时销毁间隔（多签）
     */
    function setScheduledBurnInterval(uint256 interval) external onlyMultiSig {
        scheduledBurnInterval = interval;
    }
    
    /**
     * @dev 手动触发市场检查
     */
    function manualMarketCheck() external onlyMultiSig {
        // 检查所有机制
        if (antiDumpEnabled) {
            this.checkAndApplyAntiDump();
        }
        
        if (productionReductionEnabled) {
            this.checkAndApplyProductionReduction();
        }
        
        if (decayEnabled) {
            this.applyDecay();
        }
    }
    
    /**
     * @dev 恢复正常税率和产出
     */
    function restoreNormalRates() external onlyMultiSig {
        // 恢复正常税率
        hcfToken.setTaxRates(200, 500, 100);  // 2%, 5%, 1%
        currentTaxMultiplier = PRECISION;
        
        // 恢复正常产出
        uint256[5] memory normalRates = [uint256(40), 50, 60, 70, 80];
        stakingContract.setBaseDailyRates(normalRates);
        currentProductionMultiplier = PRECISION;
        
        // 恢复正常动态收益
        referralContract.setDynamicYieldRatio(7000);  // 70%
        
        emit MarketControlUpdated("RatesRestored", block.timestamp);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取当前市场状态
     */
    function getMarketStatus() external view returns (
        int256 priceChange,
        uint256 taxMultiplier,
        uint256 productionMultiplier,
        uint256 totalStakedAmount,
        bool isAntiDumpActive,
        bool isProductionReduced,
        bool isDecayActive
    ) {
        priceChange = priceOracle.get24HourPriceChange();
        
        return (
            priceChange,
            currentTaxMultiplier,
            currentProductionMultiplier,
            totalStaked,
            currentTaxMultiplier > PRECISION,
            currentProductionMultiplier < PRECISION,
            totalStaked > decayThreshold
        );
    }
    
    /**
     * @dev 获取防暴跌级别信息
     */
    function getAntiDumpLevels() external view returns (AntiDumpLevel[3] memory) {
        return antiDumpLevels;
    }
    
    /**
     * @dev 获取减产级别信息
     */
    function getProductionReductions() external view returns (ProductionReduction[3] memory) {
        return productionReductions;
    }
    
    /**
     * @dev 更新总质押量（由质押合约调用）
     */
    function updateTotalStaked(uint256 amount) external {
        require(msg.sender == address(stakingContract), "Only staking contract");
        totalStaked = amount;
    }
}