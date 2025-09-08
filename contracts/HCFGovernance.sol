// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HCF治理合约 - 统一参数管理
 * @notice 方便项目方调整所有参数
 */
contract HCFGovernance is Ownable, ReentrancyGuard {
    
    // ============ 质押参数 ============
    struct StakingLevel {
        uint256 minAmount;      // 最小质押量
        uint256 dailyRate;      // 日化收益率 (基点，100 = 1%)
        uint256 lpBonus;        // LP加成
        uint256 compoundUnit;   // 复投单位
        bool enabled;           // 是否启用
    }
    
    mapping(uint8 => StakingLevel) public stakingLevels;
    
    // 股权LP锁定加成
    uint256 public lockBonus100Days = 20;  // 100天锁定加成 20%
    uint256 public lockBonus300Days = 40;  // 300天锁定加成 40%
    
    // ============ 税费参数 ============
    uint256 public buyTaxRate = 200;       // 2%
    uint256 public sellTaxRate = 500;      // 5%
    uint256 public transferTaxRate = 100;  // 1%
    
    // 税费分配
    struct TaxDistribution {
        uint256 burnRate;       // 销毁比例
        uint256 marketingRate;  // 营销比例
        uint256 lpRate;         // LP比例
        uint256 nodeRate;       // 节点比例
    }
    
    TaxDistribution public buyTaxDist = TaxDistribution(25, 25, 25, 25);
    TaxDistribution public sellTaxDist = TaxDistribution(40, 20, 20, 20);
    
    // ============ 收益参数 ============
    uint256 public claimFeeBNB = 500;      // 5% BNB手续费
    uint256 public claimFeeToNode = 40;    // 2% 给节点 (40% of 5%)
    uint256 public claimFeeToMarketing = 60; // 3% 给营销 (60% of 5%)
    
    uint256 public dailyRewardCap = 1000;  // 日收益封顶 10%
    uint256 public minBalance = 1;         // 最小余额 0.0001 HCF (假设18位小数)
    
    // ============ 推荐参数 ============
    uint256[] public referralDepositBonus = [500, 300];     // 入金奖励 5%, 3%
    uint256[] public referralStaticBonus = [2000, 1000, 500, 500, 500, 500, 500, 500, // 1-8代
                                           300, 300, 300, 300, 300, 300, 300,         // 9-15代
                                           200, 200, 200, 200, 200];                   // 16-20代
    
    bool public burnInjuryEnabled = true;  // 烧伤机制开关
    bool public directLimitEnabled = true; // 直推限制开关
    
    // ============ 限购参数 ============
    uint256 public limitPurchaseDays = 7;          // 限购天数
    uint256 public dailyPurchaseLimit = 1000e18;   // 每日限购量
    uint256 public launchTime;                     // 启动时间
    
    // ============ 节点参数 ============
    uint256 public nodeApplicationFee = 5000e18;   // 5000 BSDT
    uint256 public nodeActivationHCF = 1000e18;    // 1000 HCF
    uint256 public nodeActivationLP = 1000e18;     // 1000 LP
    uint256 public maxNodes = 99;                  // 最大节点数
    
    // ============ 防护机制参数 ============
    struct AntiDumpLevel {
        uint256 dropThreshold;  // 下跌阈值
        uint256 slippageAdd;    // 滑点增加
        uint256 burnPortion;    // 销毁部分
        uint256 nodePortion;    // 节点部分
        uint256 yieldReduction; // 收益减少
    }
    
    AntiDumpLevel[] public antiDumpLevels;
    
    // ============ 合约地址 ============
    address public hcfToken;
    address public bsdtToken;
    address public stakingContract;
    address public referralContract;
    address public nodeNFTContract;
    
    // ============ 事件 ============
    event ParameterUpdated(string paramName, uint256 oldValue, uint256 newValue);
    event ContractUpdated(string contractName, address oldAddress, address newAddress);
    event StakingLevelUpdated(uint8 level, uint256 minAmount, uint256 dailyRate);
    
    constructor() {
        launchTime = block.timestamp;
        
        // 初始化3级质押系统
        stakingLevels[1] = StakingLevel(1000e18, 60, 60, 200e18, true);      // L1: 0.6%
        stakingLevels[2] = StakingLevel(10000e18, 70, 70, 2000e18, true);    // L2: 0.7%
        stakingLevels[3] = StakingLevel(100000e18, 80, 80, 2000e18, true);   // L3: 0.8%
        
        // 初始化防护机制
        antiDumpLevels.push(AntiDumpLevel(10, 500, 300, 200, 500));   // 10%跌: +5%滑点, -5%收益
        antiDumpLevels.push(AntiDumpLevel(30, 1500, 1000, 500, 1500)); // 30%跌: +15%滑点, -15%收益
        antiDumpLevels.push(AntiDumpLevel(50, 3000, 2000, 1000, 3000)); // 50%跌: +30%滑点, -30%收益
    }
    
    // ============ 管理函数 ============
    
    /**
     * @notice 设置质押等级参数
     */
    function setStakingLevel(
        uint8 _level,
        uint256 _minAmount,
        uint256 _dailyRate,
        uint256 _lpBonus,
        uint256 _compoundUnit
    ) external onlyOwner {
        require(_level >= 1 && _level <= 3, "Invalid level");
        
        stakingLevels[_level] = StakingLevel({
            minAmount: _minAmount,
            dailyRate: _dailyRate,
            lpBonus: _lpBonus,
            compoundUnit: _compoundUnit,
            enabled: true
        });
        
        emit StakingLevelUpdated(_level, _minAmount, _dailyRate);
    }
    
    /**
     * @notice 批量设置日化收益率
     */
    function setDailyRates(uint256 _rate1, uint256 _rate2, uint256 _rate3) external onlyOwner {
        stakingLevels[1].dailyRate = _rate1;
        stakingLevels[2].dailyRate = _rate2;
        stakingLevels[3].dailyRate = _rate3;
    }
    
    /**
     * @notice 设置税率
     */
    function setTaxRates(uint256 _buy, uint256 _sell, uint256 _transfer) external onlyOwner {
        require(_buy <= 1000 && _sell <= 1000 && _transfer <= 1000, "Tax too high");
        
        buyTaxRate = _buy;
        sellTaxRate = _sell;
        transferTaxRate = _transfer;
    }
    
    /**
     * @notice 设置领取手续费
     */
    function setClaimFee(uint256 _feeBNB, uint256 _toNode, uint256 _toMarketing) external onlyOwner {
        require(_feeBNB <= 1000, "Fee too high"); // 最高10%
        require(_toNode + _toMarketing == 100, "Distribution must be 100%");
        
        claimFeeBNB = _feeBNB;
        claimFeeToNode = _toNode;
        claimFeeToMarketing = _toMarketing;
    }
    
    /**
     * @notice 设置日收益封顶
     */
    function setDailyRewardCap(uint256 _cap) external onlyOwner {
        require(_cap >= 100 && _cap <= 10000, "Cap out of range"); // 1%-100%
        dailyRewardCap = _cap;
    }
    
    /**
     * @notice 设置推荐奖励
     */
    function setReferralBonus(uint256[] memory _deposit, uint256[] memory _static) external onlyOwner {
        require(_deposit.length == 2, "Deposit bonus must be 2 levels");
        require(_static.length == 20, "Static bonus must be 20 levels");
        
        referralDepositBonus = _deposit;
        referralStaticBonus = _static;
    }
    
    /**
     * @notice 设置限购参数
     */
    function setPurchaseLimit(uint256 _days, uint256 _dailyLimit) external onlyOwner {
        limitPurchaseDays = _days;
        dailyPurchaseLimit = _dailyLimit;
    }
    
    /**
     * @notice 设置节点参数
     */
    function setNodeParams(
        uint256 _applicationFee,
        uint256 _activationHCF,
        uint256 _activationLP
    ) external onlyOwner {
        nodeApplicationFee = _applicationFee;
        nodeActivationHCF = _activationHCF;
        nodeActivationLP = _activationLP;
    }
    
    /**
     * @notice 更新合约地址
     */
    function updateContracts(
        address _hcf,
        address _bsdt,
        address _staking,
        address _referral,
        address _node
    ) external onlyOwner {
        hcfToken = _hcf;
        bsdtToken = _bsdt;
        stakingContract = _staking;
        referralContract = _referral;
        nodeNFTContract = _node;
    }
    
    /**
     * @notice 紧急暂停开关
     */
    bool public paused = false;
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    // ============ 查询函数 ============
    
    /**
     * @notice 获取所有质押等级信息
     */
    function getAllStakingLevels() external view returns (StakingLevel[] memory) {
        StakingLevel[] memory levels = new StakingLevel[](3);
        for (uint8 i = 1; i <= 3; i++) {
            levels[i-1] = stakingLevels[i];
        }
        return levels;
    }
    
    /**
     * @notice 检查是否在限购期
     */
    function isInLimitPeriod() external view returns (bool) {
        return block.timestamp < launchTime + (limitPurchaseDays * 1 days);
    }
    
    /**
     * @notice 获取当前防护级别
     */
    function getCurrentAntiDumpLevel(uint256 _dropPercent) external view returns (AntiDumpLevel memory) {
        for (uint i = antiDumpLevels.length; i > 0; i--) {
            if (_dropPercent >= antiDumpLevels[i-1].dropThreshold) {
                return antiDumpLevels[i-1];
            }
        }
        return AntiDumpLevel(0, 0, 0, 0, 0);
    }
}