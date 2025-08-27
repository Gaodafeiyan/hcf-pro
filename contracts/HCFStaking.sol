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
    function recordInitialLP(address user) external;
    function claimCompensation() external returns (uint256);
}

interface IHCFBurnMechanism {
    function applyBurn(uint256 burnType, uint256 amount, address user) external;
}

/**
 * @title HCFStaking
 * @dev 质押挖矿合约 - 5等级质押，双循环LP，衰减机制
 */
contract HCFStaking is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DAILY_LIMIT = 500 * 10**18;
    uint256 public constant MIN_COMPENSATION = 500 * 10**18;
    uint256 public constant DECAY_RATE = 10;
    uint256 public constant HOLDING_BONUS_DAYS = 30;
    uint256 public constant COOLDOWN_PERIOD = 1 days;
    
    // ============ 结构体 ============
    struct LevelConfig {
        uint256 minStake;
        uint256 baseRate;
        uint256 lpRate;
        uint256 compoundUnit;
    }
    
    struct UserInfo {
        uint256 amount;
        uint256 level;
        uint256 pending;
        uint256 totalClaimed;
        bool isLP;
        uint256 compoundCount;
        bool isEquityLP;
        uint256 lpHCFAmount;
        uint256 lpBSDTAmount;
        uint256 lastUpdate;
        uint256[7] buyHistory;
        uint256 sharingTotal;
        uint256 lastClaimTime;
        uint256 stakingTime;
    }
    
    struct StakePosition {
        uint256 amount;
        uint256 rate;
        uint256 timestamp;
    }
    
    struct AddonRates {
        uint256 holdingBonus;
        uint256 referralBonus;
        uint256 communityBonus;
        uint256 compoundBonus;
    }
    
    // ============ 状态变量 ============
    
    // 等级配置
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
    
    // 配置
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event Staked(address indexed user, uint256 amount, uint256 level, bool isLP);
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 bnbFee);
    event DecayApplied(uint256 totalStake, uint256 reduction);
    event AddonApplied(address indexed user, string addonType, uint256 rate);
    event CompensationClaimed(address indexed user, uint256 amount);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event EmergencyPauseSet(bool status);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
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
    ) Ownable(msg.sender) {
        hcfToken = IHCFToken(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        multiSigWallet = _multiSigWallet;
        collectionAddress = _collectionAddress;
        bridgeAddress = _bridgeAddress;
        
        _initializeLevels();
        
        addonRates = AddonRates({
            holdingBonus: 1000,
            referralBonus: 500,
            communityBonus: 500,
            compoundBonus: 2000
        });
    }
    
    // ============ 初始化函数 ============
    function _initializeLevels() private {
        levels[0] = LevelConfig({
            minStake: 10 * 10**18,
            baseRate: 400,
            lpRate: 800,
            compoundUnit: 10 * 10**18
        });
        
        levels[1] = LevelConfig({
            minStake: 100 * 10**18,
            baseRate: 400,
            lpRate: 800,
            compoundUnit: 20 * 10**18
        });
        
        levels[2] = LevelConfig({
            minStake: 1000 * 10**18,
            baseRate: 500,
            lpRate: 1000,
            compoundUnit: 200 * 10**18
        });
        
        levels[3] = LevelConfig({
            minStake: 10000 * 10**18,
            baseRate: 600,
            lpRate: 1200,
            compoundUnit: 2000 * 10**18
        });
        
        levels[4] = LevelConfig({
            minStake: 100000 * 10**18,
            baseRate: 800,
            lpRate: 1600,
            compoundUnit: 20000 * 10**18
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
        require(level > 0, "Amount too small");
        
        UserInfo storage user = userInfo[msg.sender];
        
        _updateRewards(msg.sender);
        
        if (isLP) {
            uint256 bsdtAmount = amount;
            
            if (isEquity) {
                require(hcfToken.transferFrom(msg.sender, collectionAddress, amount), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, collectionAddress, bsdtAmount), "BSDT transfer failed");
                user.isEquityLP = true;
            } else {
                require(hcfToken.transferFrom(msg.sender, address(this), amount), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount), "BSDT transfer failed");
            }
            
            user.lpHCFAmount += amount;
            user.lpBSDTAmount += bsdtAmount;
            user.isLP = true;
            
            if (address(impermanentLossProtection) != address(0)) {
                impermanentLossProtection.recordInitialLP(msg.sender);
            }
        } else {
            require(hcfToken.transferFrom(msg.sender, address(this), amount), "HCF transfer failed");
        }
        
        // 双循环处理
        if (amount >= 1000 * 10**18) {
            uint256 units = amount / levels[level - 1].compoundUnit;
            for (uint256 i = 0; i < units; i++) {
                uint256 positionAmount = levels[level - 1].compoundUnit;
                uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
                
                // LP 1:5增益
                if (isLP && i > 0 && i % 5 == 0) {
                    rate = rate * 2;
                }
                
                userPositions[msg.sender].push(StakePosition({
                    amount: positionAmount,
                    rate: rate,
                    timestamp: block.timestamp
                }));
            }
            
            uint256 remainder = amount % levels[level - 1].compoundUnit;
            if (remainder > 0) {
                uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
                userPositions[msg.sender].push(StakePosition({
                    amount: remainder,
                    rate: rate,
                    timestamp: block.timestamp
                }));
            }
        } else {
            uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
            userPositions[msg.sender].push(StakePosition({
                amount: amount,
                rate: rate,
                timestamp: block.timestamp
            }));
        }
        
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
     * @dev 提取质押
     */
    function withdraw(uint256 amount) external nonReentrant notPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "Insufficient balance");
        
        _updateRewards(msg.sender);
        
        uint256 withdrawFee = (amount * 1000) / BASIS_POINTS;
        uint256 netAmount = amount - withdrawFee;
        
        if (user.isLP) {
            uint256 lpBSDTFee = (user.lpBSDTAmount * amount / user.amount * 5000) / BASIS_POINTS;
            uint256 lpHCFFee = (user.lpHCFAmount * amount / user.amount * 2000) / BASIS_POINTS;
            uint256 lpBurnAmount = (user.lpHCFAmount * amount / user.amount * 3000) / BASIS_POINTS;
            
            if (lpBSDTFee > 0) {
                bsdtToken.transfer(multiSigWallet, lpBSDTFee);
            }
            if (lpHCFFee > 0) {
                hcfToken.transfer(multiSigWallet, lpHCFFee);
            }
            if (lpBurnAmount > 0) {
                hcfToken.burn(lpBurnAmount);
                if (address(burnMechanism) != address(0)) {
                    burnMechanism.applyBurn(3, lpBurnAmount, msg.sender);
                }
            }
            
            user.lpHCFAmount -= user.lpHCFAmount * amount / user.amount;
            user.lpBSDTAmount -= user.lpBSDTAmount * amount / user.amount;
        }
        
        if (user.sharingTotal > 0 && user.sharingTotal < amount) {
            uint256 burnAmount = (amount * 3000) / BASIS_POINTS;
            hcfToken.burn(burnAmount);
            netAmount -= burnAmount;
            if (address(burnMechanism) != address(0)) {
                burnMechanism.applyBurn(3, burnAmount, msg.sender);
            }
        }
        
        payable(bridgeAddress).transfer(withdrawFee);
        
        user.amount -= amount;
        if (user.amount == 0) {
            user.level = 0;
            user.isLP = false;
            user.isEquityLP = false;
            delete userPositions[msg.sender];
        }
        
        hcfToken.transfer(msg.sender, netAmount);
        
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
        
        uint256 bnbFee = (rewards * 500) / BASIS_POINTS;
        uint256 netRewards = rewards - bnbFee;
        
        payable(bridgeAddress).transfer(bnbFee);
        
        user.pending = 0;
        user.totalClaimed += rewards;
        user.lastClaimTime = block.timestamp;
        
        hcfToken.transfer(msg.sender, netRewards);
        
        if (address(referralContract) != address(0)) {
            try referralContract.distributeRewards(msg.sender, rewards) {} catch {}
        }
        
        if (address(burnMechanism) != address(0)) {
            try burnMechanism.applyBurn(1, rewards / 100, msg.sender) {} catch {}
        }
        
        emit RewardsClaimed(msg.sender, rewards, bnbFee);
    }
    
    /**
     * @dev 复投
     */
    function compound() external nonReentrant notPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(user.pending > 0, "No rewards to compound");
        
        _updateRewards(msg.sender);
        
        uint256 compoundAmount = user.pending;
        user.pending = 0;
        
        user.compoundCount++;
        
        user.amount += compoundAmount;
        totalStaked += compoundAmount;
        
        uint256 rate = user.isLP ? levels[user.level - 1].lpRate : levels[user.level - 1].baseRate;
        userPositions[msg.sender].push(StakePosition({
            amount: compoundAmount,
            rate: rate,
            timestamp: block.timestamp
        }));
        
        emit Staked(msg.sender, compoundAmount, user.level, user.isLP);
    }
    
    /**
     * @dev 应用加成
     */
    function applyAddon(address userAddr) external {
        UserInfo storage user = userInfo[userAddr];
        require(user.amount > 0, "No stake");
        
        uint256 totalAddon = 0;
        
        if (block.timestamp >= user.stakingTime + HOLDING_BONUS_DAYS * 1 days) {
            totalAddon += addonRates.holdingBonus;
            emit AddonApplied(userAddr, "holding", addonRates.holdingBonus);
        }
        
        if (address(referralContract) != address(0)) {
            (, uint256 directCount,,,,,,,,) = referralContract.getUserData(userAddr);
            if (directCount > 3) {
                totalAddon += addonRates.referralBonus;
                emit AddonApplied(userAddr, "referral", addonRates.referralBonus);
            }
            
            (,,,, uint256 teamVolume,,,,,) = referralContract.getUserData(userAddr);
            if (teamVolume > 100000 * 10**18) {
                totalAddon += addonRates.communityBonus;
                emit AddonApplied(userAddr, "community", addonRates.communityBonus);
            }
        }
        
        if (user.compoundCount > 10) {
            totalAddon += addonRates.compoundBonus;
            emit AddonApplied(userAddr, "compound", addonRates.compoundBonus);
        }
        
        for (uint256 i = 0; i < userPositions[userAddr].length; i++) {
            userPositions[userAddr][i].rate += (userPositions[userAddr][i].rate * totalAddon) / BASIS_POINTS;
        }
    }
    
    /**
     * @dev 申请无常损失补偿
     */
    function claimCompensation() external nonReentrant notPaused returns (uint256) {
        UserInfo storage user = userInfo[msg.sender];
        require(user.isLP, "Not LP staker");
        
        uint256 compensation = 0;
        
        if (address(impermanentLossProtection) != address(0)) {
            compensation = impermanentLossProtection.claimCompensation();
            
            for (uint256 i = 0; i < userPositions[msg.sender].length; i++) {
                if (user.isLP) {
                    userPositions[msg.sender][i].rate = levels[user.level - 1].lpRate;
                }
            }
            
            emit CompensationClaimed(msg.sender, compensation);
        }
        
        return compensation;
    }
    
    /**
     * @dev 更新衰减
     */
    function updateDecay() external {
        _updateDecay();
    }
    
    // ============ 内部函数 ============
    
    function _updateRewards(address userAddr) internal {
        UserInfo storage user = userInfo[userAddr];
        if (user.amount == 0) return;
        
        uint256 pending = _calculatePendingRewards(userAddr);
        user.pending += pending;
        user.lastUpdate = block.timestamp;
    }
    
    function _calculatePendingRewards(address userAddr) internal view returns (uint256) {
        UserInfo memory user = userInfo[userAddr];
        if (user.amount == 0 || user.lastUpdate >= block.timestamp) return 0;
        
        uint256 timeElapsed = block.timestamp - user.lastUpdate;
        uint256 daysElapsed = timeElapsed / 1 days;
        if (daysElapsed == 0) return 0;
        
        uint256 totalRewards = 0;
        
        for (uint256 i = 0; i < userPositions[userAddr].length; i++) {
            StakePosition memory position = userPositions[userAddr][i];
            uint256 dailyYield = (position.amount * position.rate) / BASIS_POINTS;
            
            if (totalStaked > decayThreshold) {
                uint256 decay = ((totalStaked / decayThreshold) * DECAY_RATE);
                if (decay > 0) {
                    dailyYield = (dailyYield * (BASIS_POINTS - decay)) / BASIS_POINTS;
                }
            }
            
            totalRewards += dailyYield * daysElapsed;
        }
        
        return totalRewards;
    }
    
    function _checkPurchaseLimit(address user, uint256 amount) internal {
        UserInfo storage info = userInfo[user];
        
        uint256 today = block.timestamp / 1 days;
        uint256 dayIndex = today % 7;
        
        for (uint256 i = 0; i < 7; i++) {
            if (i != dayIndex) {
                uint256 recordDay = info.buyHistory[i] / 10**36;
                if (recordDay > 0 && today - recordDay >= 7) {
                    info.buyHistory[i] = 0;
                }
            }
        }
        
        uint256 total7Days = 0;
        for (uint256 i = 0; i < 7; i++) {
            total7Days += info.buyHistory[i] % 10**36;
        }
        
        require(total7Days + amount <= DAILY_LIMIT * 7, "Exceeds 7-day limit");
        
        info.buyHistory[dayIndex] = (today * 10**36) + amount;
    }
    
    function _getStakeLevel(uint256 amount) internal view returns (uint256) {
        for (uint256 i = 4; i >= 0; i--) {
            if (amount >= levels[i].minStake) {
                return i + 1;
            }
            if (i == 0) break;
        }
        return 0;
    }
    
    function _updateDecay() internal {
        if (totalStaked > decayThreshold) {
            uint256 reduction = (totalStaked / decayThreshold) * DECAY_RATE;
            globalDecayRate = reduction;
            emit DecayApplied(totalStaked, reduction);
        } else {
            globalDecayRate = 0;
        }
    }
    
    // ============ 管理功能 ============
    
    function setLevelConfig(
        uint256 level,
        uint256 minStake,
        uint256 baseRate,
        uint256 lpRate,
        uint256 compoundUnit
    ) external onlyMultiSig {
        require(level > 0 && level <= 5, "Invalid level");
        levels[level - 1] = LevelConfig({
            minStake: minStake,
            baseRate: baseRate,
            lpRate: lpRate,
            compoundUnit: compoundUnit
        });
    }
    
    function setDecayThreshold(uint256 _threshold) external onlyMultiSig {
        decayThreshold = _threshold;
    }
    
    function setAddonRates(
        uint256 holding,
        uint256 referral,
        uint256 community,
        uint256 compoundBonus
    ) external onlyMultiSig {
        addonRates = AddonRates({
            holdingBonus: holding,
            referralBonus: referral,
            communityBonus: community,
            compoundBonus: compoundBonus
        });
    }
    
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    function setAddresses(
        address _collectionAddress,
        address _bridgeAddress
    ) external onlyMultiSig {
        if (_collectionAddress != address(0)) collectionAddress = _collectionAddress;
        if (_bridgeAddress != address(0)) bridgeAddress = _bridgeAddress;
    }
    
    function setContracts(
        address _referral,
        address _impermanentLoss,
        address _burnMechanism
    ) external onlyOwner {
        if (_referral != address(0)) referralContract = IHCFReferral(_referral);
        if (_impermanentLoss != address(0)) impermanentLossProtection = IHCFImpermanentLossProtection(_impermanentLoss);
        if (_burnMechanism != address(0)) burnMechanism = IHCFBurnMechanism(_burnMechanism);
    }
    
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPaused = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    // ============ 查询功能 ============
    
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint256 level,
        uint256 pending,
        uint256 totalClaimed,
        bool isLP,
        uint256 compoundCount,
        bool isEquityLP,
        uint256 lpHCFAmount,
        uint256 lpBSDTAmount
    ) {
        UserInfo memory info = userInfo[user];
        uint256 pendingRewards = _calculatePendingRewards(user);
        
        return (
            info.amount,
            info.level,
            info.pending + pendingRewards,
            info.totalClaimed,
            info.isLP,
            info.compoundCount,
            info.isEquityLP,
            info.lpHCFAmount,
            info.lpBSDTAmount
        );
    }
    
    function getLevelInfo(uint256 level) external view returns (
        uint256 minStake,
        uint256 baseRate,
        uint256 lpRate,
        uint256 compoundUnit
    ) {
        require(level > 0 && level <= 5, "Invalid level");
        LevelConfig memory config = levels[level - 1];
        return (
            config.minStake,
            config.baseRate,
            config.lpRate,
            config.compoundUnit
        );
    }
    
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }
    
    function getDemux(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory rates
    ) {
        StakePosition[] memory positions = userPositions[user];
        amounts = new uint256[](positions.length);
        rates = new uint256[](positions.length);
        
        for (uint256 i = 0; i < positions.length; i++) {
            amounts[i] = positions[i].amount;
            rates[i] = positions[i].rate;
        }
        
        return (amounts, rates);
    }
    
    function getStaticOutput(address user) external view returns (uint256) {
        return _calculatePendingRewards(user);
    }
    
    function getUserStakingInfo(address user) external view returns (uint256 amount, uint256 dailyReward) {
        UserInfo memory info = userInfo[user];
        uint256 daily = 0;
        
        for (uint256 i = 0; i < userPositions[user].length; i++) {
            StakePosition memory position = userPositions[user][i];
            daily += (position.amount * position.rate) / BASIS_POINTS;
        }
        
        return (info.amount, daily);
    }
}