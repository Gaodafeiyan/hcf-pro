// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHCFReferral {
    function getReferrer(address user) external view returns (address);
    function isRegistered(address user) external view returns (bool);
}

interface IHCFStaking {
    function getUserStakeAmount(address user) external view returns (uint256);
}

/**
 * @title HCFMultiLevelRewards
 * @dev 20级推荐奖励系统，支持多层级奖励分配和烧伤机制
 */
contract HCFMultiLevelRewards is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_LEVELS = 20;
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ 结构体 ============
    struct UserRewardInfo {
        uint256 totalRewards;      // 总获得奖励
        uint256 unclaimedRewards;  // 未领取奖励
        uint256 claimedRewards;    // 已领取奖励
        uint256[] levelRewards;    // 每层获得的奖励
        uint256 lastUpdateTime;    // 上次更新时间
    }
    
    struct LevelConfig {
        uint256 rewardRate;        // 奖励比例（基点）
        uint256 minStakeRequired;  // 最小质押要求
        bool burnProtection;       // 是否启用烧伤保护
    }
    
    // ============ 状态变量 ============
    mapping(uint256 => LevelConfig) public levelConfigs;  // 层级配置
    mapping(address => UserRewardInfo) public userRewards; // 用户奖励信息
    mapping(address => mapping(uint256 => address)) public userReferrerAtLevel; // 用户在每层的推荐人
    
    IERC20 public hcfToken;
    IHCFReferral public referralContract;
    IHCFStaking public stakingContract;
    
    uint256 public totalDistributed;
    bool public rewardsEnabled = true;
    bool public burnMechanismEnabled = true;
    
    mapping(address => bool) public operators;
    
    // ============ 事件 ============
    event RewardDistributed(
        address indexed user,
        address indexed referrer,
        uint256 level,
        uint256 amount
    );
    event RewardsClaimed(address indexed user, uint256 amount);
    event LevelConfigUpdated(uint256 level, uint256 rate, uint256 minStake);
    event BurnProtectionTriggered(address indexed user, address indexed referrer, uint256 level);
    
    // ============ 修饰符 ============
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }
    
    modifier whenRewardsEnabled() {
        require(rewardsEnabled, "Rewards disabled");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _referralContract,
        address _stakingContract
    ) Ownable() {
        hcfToken = IERC20(_hcfToken);
        referralContract = IHCFReferral(_referralContract);
        stakingContract = IHCFStaking(_stakingContract);
        
        _initializeLevelConfigs();
    }
    
    /**
     * @dev 初始化20级奖励配置
     */
    function _initializeLevelConfigs() internal {
        // 第1-5层：高奖励
        levelConfigs[1] = LevelConfig({
            rewardRate: 1000,  // 10%
            minStakeRequired: 100 * 10**18,
            burnProtection: true
        });
        
        levelConfigs[2] = LevelConfig({
            rewardRate: 800,   // 8%
            minStakeRequired: 100 * 10**18,
            burnProtection: true
        });
        
        levelConfigs[3] = LevelConfig({
            rewardRate: 600,   // 6%
            minStakeRequired: 200 * 10**18,
            burnProtection: true
        });
        
        levelConfigs[4] = LevelConfig({
            rewardRate: 500,   // 5%
            minStakeRequired: 300 * 10**18,
            burnProtection: true
        });
        
        levelConfigs[5] = LevelConfig({
            rewardRate: 400,   // 4%
            minStakeRequired: 500 * 10**18,
            burnProtection: true
        });
        
        // 第6-10层：中等奖励
        for (uint256 i = 6; i <= 10; i++) {
            levelConfigs[i] = LevelConfig({
                rewardRate: 300 - (i - 6) * 20,  // 3% → 2.2%
                minStakeRequired: 1000 * 10**18,
                burnProtection: true
            });
        }
        
        // 第11-15层：较低奖励
        for (uint256 i = 11; i <= 15; i++) {
            levelConfigs[i] = LevelConfig({
                rewardRate: 200 - (i - 11) * 20,  // 2% → 1.2%
                minStakeRequired: 2000 * 10**18,
                burnProtection: false
            });
        }
        
        // 第16-20层：最低奖励
        for (uint256 i = 16; i <= 20; i++) {
            levelConfigs[i] = LevelConfig({
                rewardRate: 100 - (i - 16) * 10,  // 1% → 0.6%
                minStakeRequired: 5000 * 10**18,
                burnProtection: false
            });
        }
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 分发多级推荐奖励
     * @param user 触发奖励的用户
     * @param baseAmount 基础金额
     */
    function distributeMultiLevelRewards(address user, uint256 baseAmount) 
        external 
        onlyOperator 
        whenRewardsEnabled 
    {
        if (!referralContract.isRegistered(user)) {
            return;
        }
        
        address currentUser = user;
        address[] memory referrerChain = new address[](MAX_LEVELS);
        uint256 chainLength = 0;
        
        // 构建推荐链
        for (uint256 i = 0; i < MAX_LEVELS; i++) {
            address referrer = referralContract.getReferrer(currentUser);
            if (referrer == address(0)) {
                break;
            }
            
            referrerChain[i] = referrer;
            userReferrerAtLevel[user][i + 1] = referrer;
            chainLength++;
            currentUser = referrer;
            
            // 防止循环引用
            for (uint256 j = 0; j < i; j++) {
                if (referrerChain[j] == referrer) {
                    chainLength = i;
                    break;
                }
            }
        }
        
        // 分发奖励
        for (uint256 level = 1; level <= chainLength; level++) {
            address referrer = referrerChain[level - 1];
            LevelConfig memory config = levelConfigs[level];
            
            // 检查质押要求
            uint256 referrerStake = stakingContract.getUserStakeAmount(referrer);
            if (referrerStake < config.minStakeRequired) {
                continue;
            }
            
            // 烧伤机制检查
            if (burnMechanismEnabled && config.burnProtection) {
                uint256 userStake = stakingContract.getUserStakeAmount(user);
                if (referrerStake < userStake) {
                    emit BurnProtectionTriggered(user, referrer, level);
                    continue;
                }
            }
            
            // 计算奖励
            uint256 reward = (baseAmount * config.rewardRate) / BASIS_POINTS;
            if (reward == 0) {
                continue;
            }
            
            // 记录奖励
            UserRewardInfo storage info = userRewards[referrer];
            if (info.levelRewards.length == 0) {
                info.levelRewards = new uint256[](MAX_LEVELS);
            }
            
            info.levelRewards[level - 1] += reward;
            info.totalRewards += reward;
            info.unclaimedRewards += reward;
            info.lastUpdateTime = block.timestamp;
            
            totalDistributed += reward;
            
            emit RewardDistributed(user, referrer, level, reward);
        }
    }
    
    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant {
        UserRewardInfo storage info = userRewards[msg.sender];
        require(info.unclaimedRewards > 0, "No rewards");
        
        uint256 amount = info.unclaimedRewards;
        info.unclaimedRewards = 0;
        info.claimedRewards += amount;
        
        require(hcfToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit RewardsClaimed(msg.sender, amount);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户的推荐链
     */
    function getUserReferralChain(address user) 
        external 
        view 
        returns (address[] memory chain, uint256 length) 
    {
        chain = new address[](MAX_LEVELS);
        length = 0;
        
        address currentUser = user;
        for (uint256 i = 0; i < MAX_LEVELS; i++) {
            address referrer = referralContract.getReferrer(currentUser);
            if (referrer == address(0)) {
                break;
            }
            
            chain[i] = referrer;
            length++;
            currentUser = referrer;
            
            // 防止循环
            for (uint256 j = 0; j < i; j++) {
                if (chain[j] == referrer) {
                    length = i;
                    return (chain, length);
                }
            }
        }
        
        return (chain, length);
    }
    
    /**
     * @dev 获取用户各层级奖励详情
     */
    function getUserLevelRewards(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userRewards[user].levelRewards;
    }
    
    /**
     * @dev 计算潜在奖励
     */
    function calculatePotentialRewards(address user, uint256 baseAmount) 
        external 
        view 
        returns (uint256[] memory rewards) 
    {
        rewards = new uint256[](MAX_LEVELS);
        
        if (!referralContract.isRegistered(user)) {
            return rewards;
        }
        
        address currentUser = user;
        for (uint256 level = 1; level <= MAX_LEVELS; level++) {
            address referrer = referralContract.getReferrer(currentUser);
            if (referrer == address(0)) {
                break;
            }
            
            LevelConfig memory config = levelConfigs[level];
            uint256 referrerStake = stakingContract.getUserStakeAmount(referrer);
            
            if (referrerStake >= config.minStakeRequired) {
                uint256 reward = (baseAmount * config.rewardRate) / BASIS_POINTS;
                
                // 检查烧伤
                if (burnMechanismEnabled && config.burnProtection) {
                    uint256 userStake = stakingContract.getUserStakeAmount(user);
                    if (referrerStake < userStake) {
                        reward = 0;
                    }
                }
                
                rewards[level - 1] = reward;
            }
            
            currentUser = referrer;
        }
        
        return rewards;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 更新层级配置
     */
    function updateLevelConfig(
        uint256 level,
        uint256 rewardRate,
        uint256 minStakeRequired,
        bool burnProtection
    ) external onlyOwner {
        require(level >= 1 && level <= MAX_LEVELS, "Invalid level");
        require(rewardRate <= 2000, "Rate too high");  // 最高20%
        
        levelConfigs[level] = LevelConfig({
            rewardRate: rewardRate,
            minStakeRequired: minStakeRequired,
            burnProtection: burnProtection
        });
        
        emit LevelConfigUpdated(level, rewardRate, minStakeRequired);
    }
    
    /**
     * @dev 批量更新层级配置
     */
    function batchUpdateLevelConfigs(
        uint256[] calldata levels,
        uint256[] calldata rates,
        uint256[] calldata minStakes,
        bool[] calldata burnProtections
    ) external onlyOwner {
        require(
            levels.length == rates.length && 
            levels.length == minStakes.length && 
            levels.length == burnProtections.length,
            "Length mismatch"
        );
        
        for (uint256 i = 0; i < levels.length; i++) {
            require(levels[i] >= 1 && levels[i] <= MAX_LEVELS, "Invalid level");
            require(rates[i] <= 2000, "Rate too high");
            
            levelConfigs[levels[i]] = LevelConfig({
                rewardRate: rates[i],
                minStakeRequired: minStakes[i],
                burnProtection: burnProtections[i]
            });
            
            emit LevelConfigUpdated(levels[i], rates[i], minStakes[i]);
        }
    }
    
    /**
     * @dev 设置操作员
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }
    
    /**
     * @dev 设置奖励开关
     */
    function setRewardsEnabled(bool _enabled) external onlyOwner {
        rewardsEnabled = _enabled;
    }
    
    /**
     * @dev 设置烧伤机制开关
     */
    function setBurnMechanismEnabled(bool _enabled) external onlyOwner {
        burnMechanismEnabled = _enabled;
    }
    
    /**
     * @dev 更新合约地址
     */
    function updateContracts(
        address _stakingContract,
        address _referralContract
    ) external onlyOwner {
        if (_stakingContract != address(0)) {
            stakingContract = IHCFStaking(_stakingContract);
        }
        if (_referralContract != address(0)) {
            referralContract = IHCFReferral(_referralContract);
        }
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}