// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

/**
 * @title HCFStakingV2
 * @dev 质押合约V2 - 5级质押系统、LP双倍收益、复投机制、衰减加成
 */
contract HCFStakingV2 is ReentrancyGuard, Ownable {
    
    // ============ 常量 ============
    uint256 public constant PRECISION = 10000;
    uint256 public constant DAY = 86400;
    uint256 public constant WEEK = 604800;
    
    // 5个质押级别的门槛
    uint256[5] public LEVEL_THRESHOLDS = [
        10 * 10**18,      // VIP1: 10 HCF
        100 * 10**18,     // VIP2: 100 HCF  
        1000 * 10**18,    // VIP3: 1000 HCF
        10000 * 10**18,   // VIP4: 10000 HCF
        100000 * 10**18   // VIP5: 100000 HCF
    ];
    
    // 固定复投金额
    uint256[5] public COMPOUND_AMOUNTS = [
        10 * 10**18,      // VIP1复投: 10 HCF
        20 * 10**18,      // VIP2复投: 20 HCF
        200 * 10**18,     // VIP3复投: 200 HCF
        2000 * 10**18,    // VIP4复投: 2000 HCF
        20000 * 10**18    // VIP5复投: 20000 HCF
    ];
    
    // ============ 状态变量 ============
    IERC20 public hcfToken;
    IERC20 public bsdtToken;
    address public multiSigWallet;
    address public bridgeAddress;
    address public lpPool;
    
    // 基础日化收益率 (基点，10000 = 100%)
    uint256[5] public baseDailyRates = [40, 40, 50, 60, 80]; // VIP1:0.4%, VIP2:0.4%, VIP3:0.5%, VIP4:0.6%, VIP5:0.8%
    
    // 全局参数
    uint256 public totalStaked;
    uint256 public totalLPStaked;
    uint256 public decayThreshold = 100_000_000 * 10**18; // 1亿HCF开始衰减
    uint256 public decayRate = 10; // 每1亿减0.1%
    
    // 加成参数（基点）
    uint256 public timeBonus = 1000;      // 时长加成10%
    uint256 public referralBonus = 500;   // 推荐加成5%
    uint256 public communityBonus = 500;  // 社区加成5%
    uint256 public compoundBonus = 2000;  // 复合加成20%
    
    // 限购参数
    uint256 public dailyLimit = 500 * 10**18; // 每日限购500 HCF
    uint256 public limitPeriod = 7 days;      // 7天限购期
    
    // 赎回费率（基点）
    uint256 public stakingRedeemBNBFee = 1000;     // 质押赎回10% BNB
    uint256 public lpRedeemBSDTFee = 5000;         // LP赎回50% BSDT
    uint256 public lpRedeemHCFFee = 2000;          // LP赎回20% HCF
    uint256 public burnRate = 3000;                // 30%销毁
    
    // ============ 用户数据结构 ============
    struct StakeInfo {
        uint256 amount;           // 质押数量
        uint256 lpAmount;         // LP数量
        uint256 level;           // 质押等级
        uint256 lastRewardTime;  // 上次领取时间
        uint256 pendingRewards;  // 待领取奖励
        uint256 startTime;       // 开始质押时间
        uint256 totalCompounded; // 总复投次数
        bool hasReferral;        // 是否有推荐
        bool inCommunity;        // 是否在社区
    }
    
    struct PurchaseRecord {
        uint256 amount;
        uint256 timestamp;
    }
    
    // 用户映射
    mapping(address => StakeInfo) public stakeInfo;
    mapping(address => PurchaseRecord[]) public purchaseHistory;
    mapping(address => bool) public hasShared; // 是否分享
    
    // ============ 事件 ============
    event Staked(address indexed user, uint256 amount, bool isLP, uint256 level);
    event Unstaked(address indexed user, uint256 amount, uint256 fee);
    event RewardsClaimed(address indexed user, uint256 amount);
    event Compounded(address indexed user, uint256 amount, uint256 newLevel);
    event LPAdded(address indexed user, uint256 hcfAmount, uint256 bsdtAmount);
    event RatesUpdated(uint256[5] newRates);
    event DecayApplied(uint256 totalStaked, uint256 decayPercent);
    event BonusApplied(address indexed user, uint256 bonusType, uint256 bonusAmount);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    modifier updateReward(address account) {
        if (account != address(0)) {
            StakeInfo storage info = stakeInfo[account];
            info.pendingRewards = earned(account);
            info.lastRewardTime = block.timestamp;
        }
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _bridgeAddress,
        address _lpPool
    ) {
        hcfToken = IERC20(_hcfToken);
        bsdtToken = IERC20(_bsdtToken);
        bridgeAddress = _bridgeAddress;
        lpPool = _lpPool;
    }
    
    // ============ 质押功能 ============
    
    /**
     * @dev 质押HCF
     */
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        
        // 检查7天限购
        _checkDailyLimit(msg.sender, amount);
        
        // 确定质押等级
        uint256 newAmount = stakeInfo[msg.sender].amount + amount;
        uint256 level = _getLevel(newAmount);
        require(level > 0, "Amount below minimum");
        
        // 转入HCF
        hcfToken.transferFrom(msg.sender, address(this), amount);
        
        // 更新质押信息
        StakeInfo storage info = stakeInfo[msg.sender];
        info.amount = newAmount;
        info.level = level;
        if (info.startTime == 0) {
            info.startTime = block.timestamp;
        }
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, false, level);
    }
    
    /**
     * @dev 添加LP（HCF+BSDT等额）
     */
    function addLP(uint256 hcfAmount) external nonReentrant updateReward(msg.sender) {
        require(hcfAmount > 0, "Cannot add 0");
        require(stakeInfo[msg.sender].amount > 0, "Must stake first");
        
        // 需要等额BSDT
        uint256 bsdtAmount = hcfAmount;
        
        // 转入代币
        hcfToken.transferFrom(msg.sender, lpPool, hcfAmount);
        bsdtToken.transferFrom(msg.sender, lpPool, bsdtAmount);
        
        // 更新LP信息（LP获得双倍收益）
        stakeInfo[msg.sender].lpAmount += hcfAmount;
        totalLPStaked += hcfAmount;
        
        emit LPAdded(msg.sender, hcfAmount, bsdtAmount);
        emit Staked(msg.sender, hcfAmount, true, stakeInfo[msg.sender].level);
    }
    
    /**
     * @dev 股权LP - 自动加底池
     */
    function addEquityLP(uint256 hcfAmount) external nonReentrant updateReward(msg.sender) {
        require(hcfAmount > 0, "Cannot add 0");
        require(stakeInfo[msg.sender].amount >= 1000 * 10**18, "Need 1000+ HCF staked");
        
        // 股权LP配比 1:5
        uint256 bsdtAmount = hcfAmount * 5;
        
        // 转入代币到归集池
        hcfToken.transferFrom(msg.sender, lpPool, hcfAmount);
        bsdtToken.transferFrom(msg.sender, lpPool, bsdtAmount);
        
        // 自动加底池，增加日产出
        stakeInfo[msg.sender].lpAmount += hcfAmount * 2; // 股权LP获得2倍计算
        totalLPStaked += hcfAmount * 2;
        
        emit LPAdded(msg.sender, hcfAmount, bsdtAmount);
    }
    
    /**
     * @dev 复投 - 固定金额
     */
    function compound() external nonReentrant updateReward(msg.sender) {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        
        // 获取当前级别的复投金额
        uint256 compoundAmount = COMPOUND_AMOUNTS[info.level - 1];
        require(info.pendingRewards >= compoundAmount, "Insufficient rewards");
        
        // 扣除奖励用于复投
        info.pendingRewards -= compoundAmount;
        info.amount += compoundAmount;
        info.totalCompounded++;
        
        // 检查是否升级
        uint256 newLevel = _getLevel(info.amount);
        if (newLevel > info.level) {
            info.level = newLevel;
        }
        
        totalStaked += compoundAmount;
        
        emit Compounded(msg.sender, compoundAmount, newLevel);
    }
    
    /**
     * @dev 双循环复投 (1000+ HCF, 100倍数)
     */
    function doubleCompound(uint256 multiplier) external nonReentrant updateReward(msg.sender) {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount >= 1000 * 10**18, "Need 1000+ HCF");
        require(multiplier == 100 || multiplier == 200, "Must be 100 or 200");
        
        uint256 compoundAmount = multiplier * 10**18;
        require(info.pendingRewards >= compoundAmount, "Insufficient rewards");
        
        // 复投
        info.pendingRewards -= compoundAmount;
        
        // 拆分存储计算
        if (multiplier == 200) {
            // 一半按0.8%，一半按0.4%
            info.amount += compoundAmount / 2;
            info.lpAmount += compoundAmount / 2;
        } else {
            info.amount += compoundAmount;
        }
        
        info.totalCompounded++;
        totalStaked += compoundAmount;
        
        emit Compounded(msg.sender, compoundAmount, info.level);
    }
    
    /**
     * @dev 解除质押
     */
    function unstake(uint256 amount) external payable nonReentrant updateReward(msg.sender) {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(amount > 0 && amount <= info.amount, "Invalid amount");
        
        // 计算赎回费用
        uint256 bnbFee = amount * stakingRedeemBNBFee / PRECISION;
        require(msg.value >= bnbFee, "Insufficient BNB fee");
        
        // 发送BNB到bridge
        if (bnbFee > 0) {
            (bool success, ) = bridgeAddress.call{value: bnbFee}("");
            require(success, "BNB transfer failed");
        }
        
        // 检查是否分享，未分享则销毁30%
        uint256 transferAmount = amount;
        if (!hasShared[msg.sender]) {
            uint256 burnAmount = amount * burnRate / PRECISION;
            transferAmount = amount - burnAmount;
            // 销毁HCF
            hcfToken.transfer(address(0xdead), burnAmount);
        }
        
        // 更新质押信息
        info.amount -= amount;
        totalStaked -= amount;
        
        // 重新计算等级
        info.level = _getLevel(info.amount);
        
        // 转出HCF
        hcfToken.transfer(msg.sender, transferAmount);
        
        // 退还多余BNB
        if (msg.value > bnbFee) {
            (bool success, ) = msg.sender.call{value: msg.value - bnbFee}("");
            require(success, "BNB refund failed");
        }
        
        emit Unstaked(msg.sender, amount, bnbFee);
    }
    
    /**
     * @dev 解除LP
     */
    function unstakeLP(uint256 amount) external nonReentrant updateReward(msg.sender) {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(amount > 0 && amount <= info.lpAmount, "Invalid amount");
        
        // LP赎回费用：50% BSDT + 20% HCF (30%销毁)
        uint256 bsdtFee = amount * lpRedeemBSDTFee / PRECISION;
        uint256 hcfFee = amount * lpRedeemHCFFee / PRECISION;
        uint256 burnAmount = hcfFee * burnRate / PRECISION;
        
        // 扣除费用
        require(bsdtToken.balanceOf(msg.sender) >= bsdtFee, "Insufficient BSDT");
        bsdtToken.transferFrom(msg.sender, bridgeAddress, bsdtFee);
        
        // 更新LP信息
        info.lpAmount -= amount;
        totalLPStaked -= amount;
        
        // 转出剩余HCF（扣除费用和销毁）
        uint256 transferAmount = amount - hcfFee;
        hcfToken.transfer(msg.sender, transferAmount);
        hcfToken.transfer(address(0xdead), burnAmount);
        
        emit Unstaked(msg.sender, amount, bsdtFee + hcfFee);
    }
    
    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        StakeInfo storage info = stakeInfo[msg.sender];
        uint256 reward = info.pendingRewards;
        require(reward > 0, "No rewards");
        
        info.pendingRewards = 0;
        info.lastRewardTime = block.timestamp;
        
        hcfToken.transfer(msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, reward);
    }
    
    // ============ 视图函数 ============
    
    /**
     * @dev 计算收益
     */
    function earned(address account) public view returns (uint256) {
        StakeInfo memory info = stakeInfo[account];
        if (info.amount == 0 && info.lpAmount == 0) {
            return info.pendingRewards;
        }
        
        uint256 timeDiff = block.timestamp - info.lastRewardTime;
        if (timeDiff == 0) {
            return info.pendingRewards;
        }
        
        // 获取当前日化收益率（含衰减）
        uint256 rate = getCurrentRate(account);
        
        // 计算基础收益
        uint256 baseReward = info.amount * rate * timeDiff / DAY / PRECISION;
        
        // LP双倍收益
        uint256 lpReward = info.lpAmount * rate * 2 * timeDiff / DAY / PRECISION;
        
        return info.pendingRewards + baseReward + lpReward;
    }
    
    /**
     * @dev 获取当前收益率（含衰减和加成）
     */
    function getCurrentRate(address account) public view returns (uint256) {
        StakeInfo memory info = stakeInfo[account];
        if (info.level == 0) return 0;
        
        // 基础收益率
        uint256 baseRate = baseDailyRates[info.level - 1];
        
        // 应用衰减
        if (totalStaked > decayThreshold) {
            uint256 decayPercent = (totalStaked / decayThreshold) * decayRate;
            if (decayPercent > baseRate) {
                baseRate = 0;
            } else {
                baseRate = baseRate - decayPercent;
            }
        }
        
        // 应用加成
        uint256 totalBonus = 0;
        
        // 时长加成（质押超过30天）
        if (block.timestamp - info.startTime > 30 days) {
            totalBonus += timeBonus;
        }
        
        // 推荐加成
        if (info.hasReferral) {
            totalBonus += referralBonus;
        }
        
        // 社区加成
        if (info.inCommunity) {
            totalBonus += communityBonus;
        }
        
        // 复合加成（复投超过10次）
        if (info.totalCompounded > 10) {
            totalBonus += compoundBonus;
        }
        
        // 应用加成
        uint256 finalRate = baseRate + (baseRate * totalBonus / PRECISION);
        
        return finalRate;
    }
    
    /**
     * @dev 获取质押等级
     */
    function _getLevel(uint256 amount) private view returns (uint256) {
        for (uint256 i = 4; i >= 0; i--) {
            if (amount >= LEVEL_THRESHOLDS[i]) {
                return i + 1;
            }
            if (i == 0) break;
        }
        return 0;
    }
    
    /**
     * @dev 检查7天限购
     */
    function _checkDailyLimit(address user, uint256 amount) private {
        // 移除7天前的记录
        uint256 cutoffTime = block.timestamp - limitPeriod;
        uint256 writeIndex = 0;
        
        for (uint256 i = 0; i < purchaseHistory[user].length; i++) {
            if (purchaseHistory[user][i].timestamp > cutoffTime) {
                if (writeIndex != i) {
                    purchaseHistory[user][writeIndex] = purchaseHistory[user][i];
                }
                writeIndex++;
            }
        }
        
        // 调整数组长度
        while (purchaseHistory[user].length > writeIndex) {
            purchaseHistory[user].pop();
        }
        
        // 计算7天内总量
        uint256 totalIn7Days = 0;
        for (uint256 i = 0; i < purchaseHistory[user].length; i++) {
            totalIn7Days += purchaseHistory[user][i].amount;
        }
        
        require(totalIn7Days + amount <= dailyLimit * 7, "Exceeds 7-day limit");
        
        // 添加新记录
        purchaseHistory[user].push(PurchaseRecord({
            amount: amount,
            timestamp: block.timestamp
        }));
    }
    
    /**
     * @dev 获取用户信息
     */
    function getUserInfo(address user) external view returns (
        uint256 staked,
        uint256 lp,
        uint256 level,
        uint256 pending,
        uint256 rate
    ) {
        StakeInfo memory info = stakeInfo[user];
        return (
            info.amount,
            info.lpAmount,
            info.level,
            earned(user),
            getCurrentRate(user)
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
     * @dev 设置基础收益率（多签）
     */
    function setBaseDailyRates(uint256[5] memory rates) external onlyMultiSig {
        for (uint256 i = 0; i < 5; i++) {
            require(rates[i] <= 200, "Rate too high"); // 最高2%
        }
        baseDailyRates = rates;
        emit RatesUpdated(rates);
    }
    
    /**
     * @dev 设置衰减参数（多签）
     */
    function setDecayParams(uint256 threshold, uint256 rate) external onlyMultiSig {
        decayThreshold = threshold;
        decayRate = rate;
    }
    
    /**
     * @dev 设置加成参数（多签）
     */
    function setBonusParams(
        uint256 _time,
        uint256 _referral,
        uint256 _community,
        uint256 _compound
    ) external onlyMultiSig {
        timeBonus = _time;
        referralBonus = _referral;
        communityBonus = _community;
        compoundBonus = _compound;
    }
    
    /**
     * @dev 设置用户推荐状态
     */
    function setUserReferral(address user, bool hasRef) external onlyMultiSig {
        stakeInfo[user].hasReferral = hasRef;
    }
    
    /**
     * @dev 设置用户社区状态
     */
    function setUserCommunity(address user, bool inComm) external onlyMultiSig {
        stakeInfo[user].inCommunity = inComm;
    }
    
    /**
     * @dev 设置用户分享状态
     */
    function setUserShared(address user, bool shared) external onlyMultiSig {
        hasShared[user] = shared;
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyMultiSig {
        if (token == address(0)) {
            (bool success, ) = multiSigWallet.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).transfer(multiSigWallet, amount);
        }
    }
    
    receive() external payable {}
}