// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

interface IBSDTToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IHCFReferral {
    function getUserData(address user) external view returns (
        address referrer,
        uint256 directCount,
        uint256 teamLevel,
        uint256 personalVolume,
        uint256 teamVolume,
        uint256 totalReferralReward,
        uint256 totalTeamReward,
        bool isActive,
        uint256 joinTime,
        uint256 lastRewardTime
    );
    function distributeRewards(address user, uint256 amount) external;
}

interface IHCFImpermanentLossProtection {
    function recordInitialLP(address user, bool isEquity) external;
    function claimCompensation() external returns (uint256);
    function onLPChange(address user, uint256 oldAmount, uint256 newAmount) external returns (uint256);
}

interface IHCFNodeNFT {
    function hasNode(address user) external view returns (bool);
}

interface IHCFBurnMechanism {
    function applyBurn(uint256 burnType, uint256 amount, address user) external;
}

/**
 * @title HCFStakingFixed
 * @dev 修复版质押挖矿合约 - 与前端经济模型保持一致
 * 主要修复：复投机制改为追加本金而非倍率放大
 */
contract HCFStakingFixed is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DAILY_LIMIT = 500 * 10**18;  // 每日限额500 HCF
    uint256 public constant MIN_COMPENSATION = 500 * 10**18;
    uint256 public constant DECAY_RATE = 10;
    uint256 public constant HOLDING_BONUS_DAYS = 30;
    uint256 public constant COOLDOWN_PERIOD = 1 days;
    
    // ============ 结构体 ============
    struct LevelConfig {
        uint256 minStake;      // 最小质押量
        uint256 maxStake;      // 最大质押量（用于等级判断）
        uint256 baseRate;      // 基础日化（基点，40=0.4%）
        uint256 lpRate;        // LP日化（基点，80=0.8%）
        uint256 compoundUnit;  // 复投单位（HCF数量，不是倍率！）
        bool enabled;          // 是否启用
    }
    
    struct UserInfo {
        uint256 amount;           // 质押总量
        uint256 level;           // 当前等级
        uint256 pending;         // 待领取收益
        uint256 totalClaimed;    // 累计已领取
        bool isLP;              // 是否LP质押
        uint256 compoundCount;   // 复投次数
        bool isEquityLP;        // 是否股权LP
        uint256 lpHCFAmount;    // LP中的HCF数量
        uint256 lpBSDTAmount;   // LP中的BSDT数量
        uint256 lastUpdate;     // 上次更新时间
        uint256[7] buyHistory;  // 7天购买历史
        uint256 sharingTotal;   // 股权总额
        uint256 lastClaimTime;  // 上次领取时间
        uint256 stakingTime;    // 首次质押时间
    }
    
    struct StakePosition {
        uint256 amount;
        uint256 rate;
        uint256 timestamp;
    }
    
    struct AddonRates {
        uint256 holdingBonus;    // 持有加成
        uint256 referralBonus;   // 推荐加成
        uint256 communityBonus;  // 社区加成
        uint256 compoundBonus;   // 复投加成
    }
    
    // ============ 状态变量 ============
    
    // 等级配置（与前端一致）
    LevelConfig[5] public levels;
    
    // 用户信息
    mapping(address => UserInfo) public userInfo;
    mapping(address => StakePosition[]) public userPositions;
    
    // 全局状态
    uint256 public totalStaked;
    uint256 public decayThreshold = 100_000_000 * 10**18;
    uint256 public globalDecayRate;
    
    // 加成配置
    AddonRates public addonRates;
    
    // 地址设置
    address public multiSigWallet;
    address public collectionAddress;
    address public bridgeAddress;
    IHCFToken public hcfToken;
    IBSDTToken public bsdtToken;
    IHCFReferral public referralContract;
    IHCFImpermanentLossProtection public impermanentLossProtection;
    IHCFBurnMechanism public burnMechanism;
    IHCFNodeNFT public nodeContract;
    
    // 配置
    bool public emergencyPaused = false;
    uint256 public launchTime;  // 合约启动时间，用于7天限购期
    
    // ============ 事件 ============
    event Staked(address indexed user, uint256 amount, uint256 level, bool isLP);
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 bnbFee);
    event CompoundExecuted(address indexed user, uint256 additionalAmount, uint256 newTotal);
    event DecayApplied(uint256 totalStake, uint256 reduction);
    event AddonApplied(address indexed user, string addonType, uint256 rate);
    event CompensationClaimed(address indexed user, uint256 amount);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event EmergencyPauseSet(bool status);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig wallet");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier cooldownCheck() {
        require(
            block.timestamp >= userInfo[msg.sender].lastClaimTime + COOLDOWN_PERIOD,
            "Cooldown period active"
        );
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _multiSigWallet,
        address _collectionAddress,
        address _bridgeAddress
    ) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        multiSigWallet = _multiSigWallet;
        collectionAddress = _collectionAddress;
        bridgeAddress = _bridgeAddress;
        launchTime = block.timestamp;
        
        _initializeLevels();
        
        addonRates = AddonRates({
            holdingBonus: 1000,     // 10%
            referralBonus: 500,     // 5%
            communityBonus: 500,    // 5%
            compoundBonus: 2000     // 20%
        });
    }
    
    // ============ 初始化函数（修复版：与前端一致）============
    function _initializeLevels() private {
        // Level 1: 100-1000 HCF
        levels[0] = LevelConfig({
            minStake: 100 * 10**18,
            maxStake: 1000 * 10**18,
            baseRate: 40,    // 0.4% daily
            lpRate: 80,      // 0.8% daily (2x for LP)
            compoundUnit: 10 * 10**18,  // 复投10 HCF
            enabled: false   // 前端显示L1未启用
        });
        
        // Level 2: 1000-5000 HCF
        levels[1] = LevelConfig({
            minStake: 1000 * 10**18,
            maxStake: 5000 * 10**18,
            baseRate: 50,    // 0.5% daily
            lpRate: 100,     // 1.0% daily (2x for LP)
            compoundUnit: 20 * 10**18,  // 复投20 HCF
            enabled: false   // 前端显示L2未启用
        });
        
        // Level 3: 5000-10000 HCF
        levels[2] = LevelConfig({
            minStake: 5000 * 10**18,
            maxStake: 10000 * 10**18,
            baseRate: 60,    // 0.6% daily
            lpRate: 120,     // 1.2% daily (2x for LP)
            compoundUnit: 200 * 10**18,  // 复投200 HCF
            enabled: true
        });
        
        // Level 4: 10000-50000 HCF
        levels[3] = LevelConfig({
            minStake: 10000 * 10**18,
            maxStake: 50000 * 10**18,
            baseRate: 70,    // 0.7% daily
            lpRate: 140,     // 1.4% daily (2x for LP)
            compoundUnit: 2000 * 10**18,  // 复投2000 HCF
            enabled: true
        });
        
        // Level 5: 50000+ HCF
        levels[4] = LevelConfig({
            minStake: 50000 * 10**18,
            maxStake: type(uint256).max,  // 无上限
            baseRate: 80,    // 0.8% daily
            lpRate: 160,     // 1.6% daily (2x for LP)
            compoundUnit: 20000 * 10**18,  // 复投20000 HCF（不是倍率！）
            enabled: true
        });
    }
    
    // ============ 质押功能 ============
    
    /**
     * @dev 质押代币
     */
    function stake(uint256 amount, bool isLP, bool isEquity) external nonReentrant notPaused {
        require(amount > 0, "Amount must be > 0");
        
        _checkPurchaseLimit(msg.sender, amount);
        
        uint256 level = _getStakeLevel(amount + userInfo[msg.sender].amount);
        require(level > 0, "Amount too small or level disabled");
        require(levels[level - 1].enabled, "This level is not enabled");
        
        UserInfo storage user = userInfo[msg.sender];
        
        _updateRewards(msg.sender);
        
        if (isLP) {
            uint256 bsdtAmount = amount;  // 1:1比例
            
            if (isEquity) {
                // 股权LP - 20% HCF + 10% BSDT到归集地址
                uint256 equityHCF = (amount * 20) / 100;
                uint256 equityBSDT = (amount * 10) / 100;
                
                require(hcfToken.transferFrom(msg.sender, collectionAddress, equityHCF), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, collectionAddress, equityBSDT), "BSDT transfer failed");
                
                // 剩余部分正常质押
                require(hcfToken.transferFrom(msg.sender, address(this), amount - equityHCF), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount - equityBSDT), "BSDT transfer failed");
                
                user.isEquityLP = true;
                user.sharingTotal += equityHCF;
            } else {
                // 普通LP质押
                require(hcfToken.transferFrom(msg.sender, address(this), amount), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount), "BSDT transfer failed");
            }
            
            user.lpHCFAmount += amount;
            user.lpBSDTAmount += bsdtAmount;
            user.isLP = true;
            
            if (address(impermanentLossProtection) != address(0)) {
                impermanentLossProtection.recordInitialLP(msg.sender, isEquity);
            }
        } else {
            // 普通质押
            require(hcfToken.transferFrom(msg.sender, address(this), amount), "HCF transfer failed");
        }
        
        // 创建质押仓位
        uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
        
        userPositions[msg.sender].push(StakePosition({
            amount: amount,
            rate: rate,
            timestamp: block.timestamp
        }));
        
        user.amount += amount;
        user.level = level;
        user.lastUpdate = block.timestamp;
        
        if (user.stakingTime == 0) {
            user.stakingTime = block.timestamp;
        }
        
        totalStaked += amount;
        
        _updateDecay();
        
        emit Staked(msg.sender, amount, level, isLP);
    }
    
    /**
     * @dev 复投功能（修复版：追加本金而非倍率）
     * @param additionalAmount 追加的本金数量（必须符合等级要求的复投单位）
     */
    function compound(uint256 additionalAmount) external nonReentrant notPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount > 0, "No active stake");
        require(user.level > 0 && user.level <= 5, "Invalid level");
        
        uint256 levelIndex = user.level - 1;
        uint256 requiredUnit = levels[levelIndex].compoundUnit;
        
        // 验证追加金额是否符合复投单位要求
        require(additionalAmount == requiredUnit || 
                additionalAmount == requiredUnit * 2 || 
                additionalAmount == requiredUnit * 3 ||
                additionalAmount == requiredUnit * 4 ||
                additionalAmount == requiredUnit * 5, 
                "Amount must be multiple of compound unit");
        
        // 从用户钱包转入追加的本金
        require(hcfToken.transferFrom(msg.sender, address(this), additionalAmount), "HCF transfer failed");
        
        // 如果是LP质押，同时需要追加BSDT
        if (user.isLP) {
            uint256 additionalBSDT = additionalAmount;  // 1:1比例
            require(bsdtToken.transferFrom(msg.sender, address(this), additionalBSDT), "BSDT transfer failed");
            user.lpBSDTAmount += additionalBSDT;
        }
        
        // 更新用户质押信息
        user.amount += additionalAmount;
        user.compoundCount++;
        
        // 创建新的质押仓位（使用当前等级的利率）
        uint256 rate = user.isLP ? levels[levelIndex].lpRate : levels[levelIndex].baseRate;
        
        userPositions[msg.sender].push(StakePosition({
            amount: additionalAmount,
            rate: rate,
            timestamp: block.timestamp
        }));
        
        // 更新全局质押量
        totalStaked += additionalAmount;
        
        // 检查是否需要升级等级
        uint256 newLevel = _getStakeLevel(user.amount);
        if (newLevel > user.level) {
            user.level = newLevel;
        }
        
        _updateRewards(msg.sender);
        
        emit CompoundExecuted(msg.sender, additionalAmount, user.amount);
    }
    
    /**
     * @dev 提取质押
     */
    function withdraw(uint256 amount) external nonReentrant notPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "Insufficient balance");
        
        _updateRewards(msg.sender);
        
        // 计算解押费用（10%）
        uint256 withdrawFee = (amount * 1000) / BASIS_POINTS;
        uint256 netAmount = amount - withdrawFee;
        
        // LP解押的额外处理
        if (user.isLP) {
            uint256 proportionalBSDT = (user.lpBSDTAmount * amount) / user.amount;
            
            // LP解押费用分配：50% BSDT费，20% HCF费，30%销毁
            uint256 lpBSDTFee = (proportionalBSDT * 5000) / BASIS_POINTS;  // 50% BSDT
            uint256 lpHCFFee = (amount * 2000) / BASIS_POINTS;             // 20% HCF
            uint256 lpBurnAmount = (amount * 3000) / BASIS_POINTS;         // 30% 销毁
            
            if (lpBSDTFee > 0 && proportionalBSDT > lpBSDTFee) {
                bsdtToken.transfer(msg.sender, proportionalBSDT - lpBSDTFee);
                bsdtToken.transfer(multiSigWallet, lpBSDTFee);
            }
            
            if (lpHCFFee > 0) {
                netAmount -= lpHCFFee;
                hcfToken.transfer(multiSigWallet, lpHCFFee);
            }
            
            if (lpBurnAmount > 0) {
                netAmount -= lpBurnAmount;
                hcfToken.burn(lpBurnAmount);
                
                if (address(burnMechanism) != address(0)) {
                    burnMechanism.applyBurn(3, lpBurnAmount, msg.sender);
                }
            }
            
            user.lpHCFAmount = (user.lpHCFAmount * (user.amount - amount)) / user.amount;
            user.lpBSDTAmount = (user.lpBSDTAmount * (user.amount - amount)) / user.amount;
            
            if (user.amount == amount) {
                user.isLP = false;
                user.isEquityLP = false;
            }
        }
        
        // 发送解押费到桥地址
        hcfToken.transfer(bridgeAddress, withdrawFee);
        
        // 更新用户质押量
        user.amount -= amount;
        
        // 如果全部提取，重置用户状态
        if (user.amount == 0) {
            user.level = 0;
            user.isLP = false;
            user.isEquityLP = false;
            user.compoundCount = 0;
            delete userPositions[msg.sender];
        } else {
            // 部分提取，按比例减少仓位
            _adjustPositions(msg.sender, amount);
        }
        
        // 转账给用户
        hcfToken.transfer(msg.sender, netAmount);
        
        // 更新全局质押量
        totalStaked -= amount;
        
        emit Withdrawn(msg.sender, amount, withdrawFee);
    }
    
    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant notPaused cooldownCheck {
        UserInfo storage user = userInfo[msg.sender];
        
        _updateRewards(msg.sender);
        
        uint256 rewards = user.pending;
        require(rewards > 0, "No rewards");
        
        // 5% BNB费用到桥地址
        uint256 bnbFee = (rewards * 500) / BASIS_POINTS;
        uint256 netRewards = rewards - bnbFee;
        
        require(msg.value >= bnbFee, "Insufficient BNB for fee");
        
        // 发送BNB费用到桥地址
        if (bnbFee > 0) {
            (bool success, ) = bridgeAddress.call{value: bnbFee}("");
            require(success, "BNB transfer failed");
        }
        
        // 退还多余的BNB
        if (msg.value > bnbFee) {
            (bool success, ) = msg.sender.call{value: msg.value - bnbFee}("");
            require(success, "BNB refund failed");
        }
        
        user.pending = 0;
        user.totalClaimed += rewards;
        user.lastClaimTime = block.timestamp;
        
        // 转账奖励给用户
        hcfToken.transfer(msg.sender, netRewards);
        
        // 触发推荐奖励分配
        if (address(referralContract) != address(0)) {
            try referralContract.distributeRewards(msg.sender, rewards) {} catch {}
        }
        
        // 触发销毁机制
        if (address(burnMechanism) != address(0)) {
            try burnMechanism.applyBurn(1, rewards / 100, msg.sender) {} catch {}
        }
        
        emit RewardsClaimed(msg.sender, rewards, bnbFee);
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 更新用户收益
     */
    function _updateRewards(address userAddr) private {
        UserInfo storage user = userInfo[userAddr];
        
        if (user.amount == 0) return;
        
        uint256 totalReward = 0;
        uint256 currentTime = block.timestamp;
        
        // 计算每个仓位的收益
        for (uint256 i = 0; i < userPositions[userAddr].length; i++) {
            StakePosition storage position = userPositions[userAddr][i];
            
            if (position.timestamp < currentTime) {
                uint256 timeElapsed = currentTime - position.timestamp;
                uint256 dailyReward = (position.amount * position.rate) / BASIS_POINTS;
                uint256 reward = (dailyReward * timeElapsed) / 1 days;
                
                totalReward += reward;
                position.timestamp = currentTime;  // 更新时间戳
            }
        }
        
        user.pending += totalReward;
        user.lastUpdate = currentTime;
    }
    
    /**
     * @dev 获取质押等级
     */
    function _getStakeLevel(uint256 amount) private view returns (uint256) {
        for (uint256 i = 0; i < 5; i++) {
            if (amount >= levels[i].minStake && amount <= levels[i].maxStake) {
                return i + 1;
            }
        }
        
        // 如果超过50000 HCF，返回等级5
        if (amount >= levels[4].minStake) {
            return 5;
        }
        
        return 0;
    }
    
    /**
     * @dev 检查每日购买限制（7天限购期）
     */
    function _checkPurchaseLimit(address user, uint256 amount) private {
        if (block.timestamp <= launchTime + 7 days) {
            uint256 todayIndex = (block.timestamp - launchTime) / 1 days;
            
            if (todayIndex < 7) {
                UserInfo storage userInfo = userInfo[user];
                require(userInfo.buyHistory[todayIndex] + amount <= DAILY_LIMIT, "Daily limit exceeded");
                userInfo.buyHistory[todayIndex] += amount;
            }
        }
    }
    
    /**
     * @dev 按比例调整仓位（部分提取时）
     */
    function _adjustPositions(address user, uint256 withdrawAmount) private {
        UserInfo storage userInfo = userInfo[user];
        uint256 totalAmount = userInfo.amount;
        
        for (uint256 i = 0; i < userPositions[user].length; i++) {
            StakePosition storage position = userPositions[user][i];
            uint256 proportionalAmount = (position.amount * withdrawAmount) / totalAmount;
            position.amount -= proportionalAmount;
        }
    }
    
    /**
     * @dev 更新衰减
     */
    function _updateDecay() private {
        if (totalStaked > decayThreshold) {
            globalDecayRate = (totalStaked - decayThreshold) * DECAY_RATE / decayThreshold;
            
            if (globalDecayRate > 5000) {  // 最大50%衰减
                globalDecayRate = 5000;
            }
        }
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户信息
     */
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint256 level,
        uint256 pending,
        bool isLP,
        uint256 compoundCount,
        uint256 dailyReward
    ) {
        UserInfo memory info = userInfo[user];
        
        // 计算当前日收益
        uint256 dailyRewardCalc = 0;
        if (info.amount > 0 && info.level > 0) {
            uint256 rate = info.isLP ? levels[info.level - 1].lpRate : levels[info.level - 1].baseRate;
            dailyRewardCalc = (info.amount * rate) / BASIS_POINTS;
        }
        
        return (
            info.amount,
            info.level,
            info.pending,
            info.isLP,
            info.compoundCount,
            dailyRewardCalc
        );
    }
    
    /**
     * @dev 获取等级配置
     */
    function getLevelConfig(uint256 level) external view returns (
        uint256 minStake,
        uint256 maxStake,
        uint256 baseRate,
        uint256 lpRate,
        uint256 compoundUnit,
        bool enabled
    ) {
        require(level > 0 && level <= 5, "Invalid level");
        LevelConfig memory config = levels[level - 1];
        
        return (
            config.minStake,
            config.maxStake,
            config.baseRate,
            config.lpRate,
            config.compoundUnit,
            config.enabled
        );
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid multisig address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    /**
     * @dev 设置紧急暂停
     */
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPaused = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _referral,
        address _impermanentLoss,
        address _burnMechanism,
        address _nodeNFT
    ) external onlyMultiSig {
        if (_referral != address(0)) referralContract = IHCFReferral(_referral);
        if (_impermanentLoss != address(0)) impermanentLossProtection = IHCFImpermanentLossProtection(_impermanentLoss);
        if (_burnMechanism != address(0)) burnMechanism = IHCFBurnMechanism(_burnMechanism);
        if (_nodeNFT != address(0)) nodeContract = IHCFNodeNFT(_nodeNFT);
    }
    
    /**
     * @dev 启用/禁用等级
     */
    function setLevelEnabled(uint256 level, bool enabled) external onlyMultiSig {
        require(level > 0 && level <= 5, "Invalid level");
        levels[level - 1].enabled = enabled;
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyMultiSig {
        if (token == address(0)) {
            (bool success, ) = multiSigWallet.call{value: amount}("");
            require(success, "BNB transfer failed");
        } else {
            IERC20(token).transfer(multiSigWallet, amount);
        }
    }
}