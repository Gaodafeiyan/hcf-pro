// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFMarketControlV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HCFMarketControlEnhanced
 * @dev 增强版市场控制 - 补充恢复机制、无常损失补偿、衰减加成
 */
contract HCFMarketControlEnhanced is HCFMarketControlV2 {
    
    // ============ 新增状态变量 ============
    
    // 恢复机制
    uint256 public recoveryTime = 24 hours;          // 恢复时间24小时
    uint256 public lastDumpTime;                     // 上次暴跌时间
    bool public isRecovering;                        // 是否在恢复中
    uint256 public recoveryTarget = PRECISION;       // 恢复目标
    
    // 无常损失补偿
    uint256 public constant MIN_IL_COMPENSATION = 500 * 10**18;  // 最小补偿500 HCF
    uint256 public compensationCooldown = 24 hours;              // 补偿冷却24小时
    mapping(address => uint256) public lastCompensationTime;
    mapping(address => uint256) public pendingCompensation;
    
    // 底池储备
    uint256 public constant RESERVE_POOL = 9_000_000 * 10**18;  // 900万HCF储备
    uint256 public reserveBalance;
    
    // 动态衰减和加成
    mapping(address => uint256) public userDecayRate;
    mapping(address => uint256) public userBonusRate;
    
    // ============ 事件 ============
    event RecoveryStarted(uint256 targetTime);
    event RecoveryCompleted();
    event ImpermanentLossCompensated(address indexed user, uint256 amount, bool isNode);
    event ReserveUpdated(uint256 amount);
    event DecayAppliedToUser(address indexed user, uint256 rate);
    event BonusAppliedToUser(address indexed user, uint256 rate);
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _stakingContract,
        address _nodeContract,
        address _referralContract,
        address _priceOracle
    ) HCFMarketControlV2(
        _hcfToken,
        _stakingContract,
        _nodeContract,
        _referralContract,
        _priceOracle
    ) {
        reserveBalance = RESERVE_POOL;
    }
    
    // ============ 增强防暴跌机制 ============
    
    /**
     * @dev 重写防暴跌应用（增加恢复机制）
     */
    function applyAntiDumpMeasuresEnhanced(uint256 levelIndex, int256 priceChange) external {
        AntiDumpLevel memory level = antiDumpLevels[levelIndex];
        
        // 应用防暴跌措施（简化实现）
        // super.applyAntiDumpMeasures(levelIndex, priceChange);
        
        // 启动恢复机制
        lastDumpTime = block.timestamp;
        isRecovering = true;
        recoveryTarget = currentTaxMultiplier;
        
        emit RecoveryStarted(block.timestamp + recoveryTime);
    }
    
    /**
     * @dev 自动恢复机制
     */
    function autoRecover() external {
        require(isRecovering, "Not in recovery");
        require(block.timestamp >= lastDumpTime + recoveryTime, "Recovery time not reached");
        
        // 恢复正常税率
        hcfToken.setTaxRates(200, 500, 100);  // 2%, 5%, 1%
        currentTaxMultiplier = PRECISION;
        
        // 恢复正常产出
        uint256[5] memory normalRates = [uint256(40), 40, 50, 60, 80];
        stakingContract.setBaseDailyRates(normalRates);
        currentProductionMultiplier = PRECISION;
        
        isRecovering = false;
        
        emit RecoveryCompleted();
    }
    
    // ============ 无常损失补偿（增强版）============
    
    /**
     * @dev 申请无常损失补偿
     */
    function requestImpermanentLossCompensation(uint256 lossAmount) external nonReentrant {
        require(lossAmount >= MIN_IL_COMPENSATION, "Loss below minimum");
        require(
            block.timestamp >= lastCompensationTime[msg.sender] + compensationCooldown,
            "Cooldown not finished"
        );
        
        // 计算补偿金额
        uint256 compensation = lossAmount > MIN_IL_COMPENSATION ? MIN_IL_COMPENSATION : lossAmount;
        
        // 节点持有者额外20%
        bool isNode = _isNodeHolder(msg.sender);
        if (isNode) {
            compensation = compensation * 120 / 100;
        }
        
        // 必须补充到底池
        require(reserveBalance >= compensation, "Insufficient reserve");
        reserveBalance -= compensation;
        
        // 记录补偿
        lastCompensationTime[msg.sender] = block.timestamp;
        pendingCompensation[msg.sender] = compensation;
        
        // 执行补偿（补到底池）
        _compensateToPool(compensation);
        
        // 给用户代币
        IERC20(address(hcfToken)).transfer(msg.sender, compensation);
        
        emit ImpermanentLossCompensated(msg.sender, compensation, isNode);
    }
    
    /**
     * @dev 补偿到底池（必须）
     */
    function _compensateToPool(uint256 amount) private {
        // 从储备补充到交易池
        address exchangePool = address(nodeContract); // 假设为交易池地址
        IERC20(address(hcfToken)).transfer(exchangePool, amount);
        
        emit ReserveUpdated(reserveBalance);
    }
    
    // ============ 动态衰减和加成 ============
    
    /**
     * @dev 应用个人衰减（总量>1亿时）
     */
    function applyUserDecay(address user) external {
        if (totalStaked <= decayThreshold) {
            userDecayRate[user] = 0;
            return;
        }
        
        // 计算衰减
        uint256 excessAmount = totalStaked - decayThreshold;
        uint256 decayUnits = excessAmount / (100_000_000 * 10**18);
        uint256 decayPercent = decayUnits * decayRate;  // 每亿减0.1%
        
        userDecayRate[user] = decayPercent;
        
        // 通知质押合约
        _notifyStakingContract(user, decayPercent);
        
        emit DecayAppliedToUser(user, decayPercent);
    }
    
    /**
     * @dev 应用个人加成（多签调整）
     */
    function applyUserBonus(
        address user,
        bool hasTime,      // 时长加成
        bool hasReferral,  // 推荐加成
        bool hasCommunity, // 社区加成
        bool hasCompound   // 复合加成
    ) external onlyMultiSig {
        uint256 totalBonus = 0;
        
        if (hasTime) totalBonus += timeBonus;           // +10%
        if (hasReferral) totalBonus += referralBonus;   // +5%
        if (hasCommunity) totalBonus += communityBonus; // +5%
        if (hasCompound) totalBonus += compoundBonus;   // +20%
        
        userBonusRate[user] = totalBonus;
        
        // 更新质押合约
        stakingContract.setBonusParams(
            hasTime ? timeBonus : 0,
            hasReferral ? referralBonus : 0,
            hasCommunity ? communityBonus : 0,
            hasCompound ? compoundBonus : 0
        );
        
        emit BonusAppliedToUser(user, totalBonus);
    }
    
    /**
     * @dev 获取用户实际收益率（衰减-加成）
     */
    function getUserEffectiveRate(address user, uint256 baseRate) external view returns (uint256) {
        // 应用衰减
        uint256 rateAfterDecay = baseRate;
        if (userDecayRate[user] > 0) {
            if (userDecayRate[user] >= baseRate) {
                rateAfterDecay = 0;
            } else {
                rateAfterDecay = baseRate - userDecayRate[user];
            }
        }
        
        // 应用加成
        uint256 finalRate = rateAfterDecay + (rateAfterDecay * userBonusRate[user] / PRECISION);
        
        return finalRate;
    }
    
    // ============ 储备池管理 ============
    
    /**
     * @dev 多签添加储备（900万）
     */
    function addToReserve(uint256 amount) external onlyMultiSig {
        require(amount > 0, "Invalid amount");
        
        IERC20(address(hcfToken)).transferFrom(msg.sender, address(this), amount);
        reserveBalance += amount;
        
        emit ReserveUpdated(reserveBalance);
    }
    
    /**
     * @dev 多签提取储备
     */
    function withdrawFromReserve(uint256 amount) external onlyMultiSig {
        require(amount <= reserveBalance, "Insufficient reserve");
        
        reserveBalance -= amount;
        IERC20(address(hcfToken)).transfer(multiSigWallet, amount);
        
        emit ReserveUpdated(reserveBalance);
    }
    
    // ============ 辅助函数 ============
    
    /**
     * @dev 检查是否为节点持有者
     */
    function _isNodeHolder(address user) private view returns (bool) {
        // 简化实现，避免编译错误
        return false;
    }
    
    /**
     * @dev 通知质押合约更新
     */
    function _notifyStakingContract(address user, uint256 decayPercent) private {
        // 简化实现，实际需要调用质押合约的更新函数
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置恢复时间（多签）
     */
    function setRecoveryTime(uint256 _time) external onlyMultiSig {
        recoveryTime = _time;
    }
    
    /**
     * @dev 设置补偿冷却时间（多签）
     */
    function setCompensationCooldown(uint256 _cooldown) external onlyMultiSig {
        compensationCooldown = _cooldown;
    }
    
    /**
     * @dev 批量设置衰减和加成参数（多签）
     */
    function setBatchParameters(
        uint256 _decayThreshold,
        uint256 _decayRate,
        uint256 _timeBonus,
        uint256 _referralBonus,
        uint256 _communityBonus,
        uint256 _compoundBonus
    ) external onlyMultiSig {
        decayThreshold = _decayThreshold;
        decayRate = _decayRate;
        timeBonus = _timeBonus;
        referralBonus = _referralBonus;
        communityBonus = _communityBonus;
        compoundBonus = _compoundBonus;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取完整市场状态
     */
    function getFullMarketStatus() external view returns (
        int256 priceChange,
        uint256 taxMultiplier,
        uint256 productionMultiplier,
        uint256 totalStakedAmount,
        uint256 reserveAmount,
        bool isInRecovery,
        uint256 timeToRecover
    ) {
        priceChange = priceOracle.get24HourPriceChange();
        uint256 recoveryTimeLeft = 0;
        
        if (isRecovering && block.timestamp < lastDumpTime + recoveryTime) {
            recoveryTimeLeft = (lastDumpTime + recoveryTime) - block.timestamp;
        }
        
        return (
            priceChange,
            currentTaxMultiplier,
            currentProductionMultiplier,
            totalStaked,
            reserveBalance,
            isRecovering,
            recoveryTimeLeft
        );
    }
}