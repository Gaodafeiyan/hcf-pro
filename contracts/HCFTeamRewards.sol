// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHCFStaking {
    function getUserStakeAmount(address user) external view returns (uint256);
    function getUserLevel(address user) external view returns (uint256);
}

interface IHCFReferral {
    function getReferrer(address user) external view returns (address);
    function getDirectReferrals(address user) external view returns (address[] memory);
    function isRegistered(address user) external view returns (bool);
}

/**
 * @title HCFTeamRewards
 * @dev 团队奖励V1-V6系统，包含小区业绩计算和烧伤机制
 */
contract HCFTeamRewards is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ 结构体 ============
    struct TeamLevel {
        uint256 minStake;           // 小区最小质押量
        uint256 rewardRate;         // 奖励比例（基点）
        uint256 requiredSubTeams;   // 需要的子团队数量
        uint256 requiredLevel;      // 需要的子团队等级
    }
    
    struct UserTeamInfo {
        uint256 level;               // 团队等级 (0=无, 1-6=V1-V6)
        uint256 totalTeamStake;      // 团队总质押
        uint256 largestAreaStake;    // 最大区质押
        uint256 smallAreaStake;      // 小区质押（总-最大）
        uint256 totalRewards;        // 总获得奖励
        uint256 unclaimedRewards;    // 未领取奖励
        uint256 directV1Count;       // 直推V1数量
        uint256 directV2Count;       // 直推V2数量
        uint256 directV3Count;       // 直推V3数量
        uint256 directV4Count;       // 直推V4数量
        uint256 directV5Count;       // 直推V5数量
        uint256 lastUpdateTime;      // 上次更新时间
    }
    
    // ============ 状态变量 ============
    mapping(uint256 => TeamLevel) public teamLevels;
    mapping(address => UserTeamInfo) public userTeamInfo;
    mapping(address => mapping(address => uint256)) public userAreaStake; // 用户的各个区质押量
    
    IERC20 public hcfToken;
    IHCFStaking public stakingContract;
    IHCFReferral public referralContract;
    
    uint256 public totalDistributed;
    bool public burnEnabled = true; // 烧伤机制开关
    
    mapping(address => bool) public operators;
    
    // ============ 事件 ============
    event TeamLevelUpgraded(address indexed user, uint256 oldLevel, uint256 newLevel);
    event TeamRewardDistributed(address indexed user, uint256 amount, uint256 level);
    event RewardsClaimed(address indexed user, uint256 amount);
    event AreaStakeUpdated(address indexed user, uint256 totalStake, uint256 smallAreaStake);
    
    // ============ 修饰符 ============
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _stakingContract,
        address _referralContract
    ) Ownable() {
        hcfToken = IERC20(_hcfToken);
        stakingContract = IHCFStaking(_stakingContract);
        referralContract = IHCFReferral(_referralContract);
        
        // 初始化团队等级配置
        _initializeTeamLevels();
    }
    
    /**
     * @dev 初始化团队等级
     */
    function _initializeTeamLevels() internal {
        // V1: 小区质押2000枚，奖励6%
        teamLevels[1] = TeamLevel({
            minStake: 2000 * 10**18,
            rewardRate: 600,  // 6%
            requiredSubTeams: 0,
            requiredLevel: 0
        });
        
        // V2: 2个V1，小区质押2万枚，奖励12%
        teamLevels[2] = TeamLevel({
            minStake: 20000 * 10**18,
            rewardRate: 1200,  // 12%
            requiredSubTeams: 2,
            requiredLevel: 1  // 需要V1
        });
        
        // V3: 2个V2，小区质押10万枚，奖励18%
        teamLevels[3] = TeamLevel({
            minStake: 100000 * 10**18,
            rewardRate: 1800,  // 18%
            requiredSubTeams: 2,
            requiredLevel: 2  // 需要V2
        });
        
        // V4: 3个V3，小区质押50万枚，奖励24%
        teamLevels[4] = TeamLevel({
            minStake: 500000 * 10**18,
            rewardRate: 2400,  // 24%
            requiredSubTeams: 3,
            requiredLevel: 3  // 需要V3
        });
        
        // V5: 3个V4，小区质押300万枚，奖励30%
        teamLevels[5] = TeamLevel({
            minStake: 3000000 * 10**18,
            rewardRate: 3000,  // 30%
            requiredSubTeams: 3,
            requiredLevel: 4  // 需要V4
        });
        
        // V6: 3个V5，小区质押2000万枚，奖励36%
        teamLevels[6] = TeamLevel({
            minStake: 20000000 * 10**18,
            rewardRate: 3600,  // 36%
            requiredSubTeams: 3,
            requiredLevel: 5  // 需要V5
        });
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 更新用户团队信息
     */
    function updateUserTeamInfo(address user) public {
        if (!referralContract.isRegistered(user)) {
            return;
        }
        
        UserTeamInfo storage info = userTeamInfo[user];
        
        // 1. 计算团队质押和小区业绩
        (uint256 totalStake, uint256 largestArea, uint256 smallArea) = calculateTeamStake(user);
        info.totalTeamStake = totalStake;
        info.largestAreaStake = largestArea;
        info.smallAreaStake = smallArea;
        
        // 2. 统计直推各等级数量
        _updateDirectTeamCounts(user);
        
        // 3. 计算团队等级
        uint256 oldLevel = info.level;
        uint256 newLevel = _calculateTeamLevel(user);
        
        if (newLevel != oldLevel) {
            info.level = newLevel;
            emit TeamLevelUpgraded(user, oldLevel, newLevel);
        }
        
        info.lastUpdateTime = block.timestamp;
        emit AreaStakeUpdated(user, totalStake, smallArea);
    }
    
    /**
     * @dev 计算团队质押和小区业绩
     */
    function calculateTeamStake(address user) public view returns (
        uint256 totalStake,
        uint256 largestArea,
        uint256 smallArea
    ) {
        address[] memory directs = referralContract.getDirectReferrals(user);
        
        if (directs.length == 0) {
            return (0, 0, 0);
        }
        
        uint256[] memory areaStakes = new uint256[](directs.length);
        
        // 计算每个直推线的总质押
        for (uint256 i = 0; i < directs.length; i++) {
            areaStakes[i] = _getAreaTotalStake(directs[i]);
            totalStake += areaStakes[i];
        }
        
        // 加上自己的质押
        uint256 ownStake = stakingContract.getUserStakeAmount(user);
        totalStake += ownStake;
        
        // 找出最大区
        for (uint256 i = 0; i < areaStakes.length; i++) {
            if (areaStakes[i] > largestArea) {
                largestArea = areaStakes[i];
            }
        }
        
        // 小区业绩 = 总业绩 - 最大区
        smallArea = totalStake - largestArea;
    }
    
    /**
     * @dev 递归计算某个区的总质押
     */
    function _getAreaTotalStake(address root) internal view returns (uint256) {
        uint256 total = stakingContract.getUserStakeAmount(root);
        
        address[] memory children = referralContract.getDirectReferrals(root);
        for (uint256 i = 0; i < children.length; i++) {
            total += _getAreaTotalStake(children[i]);
        }
        
        return total;
    }
    
    /**
     * @dev 更新直推团队等级统计
     */
    function _updateDirectTeamCounts(address user) internal {
        UserTeamInfo storage info = userTeamInfo[user];
        
        info.directV1Count = 0;
        info.directV2Count = 0;
        info.directV3Count = 0;
        info.directV4Count = 0;
        info.directV5Count = 0;
        
        address[] memory directs = referralContract.getDirectReferrals(user);
        
        for (uint256 i = 0; i < directs.length; i++) {
            uint256 level = userTeamInfo[directs[i]].level;
            if (level == 1) info.directV1Count++;
            else if (level == 2) info.directV2Count++;
            else if (level == 3) info.directV3Count++;
            else if (level == 4) info.directV4Count++;
            else if (level == 5) info.directV5Count++;
        }
    }
    
    /**
     * @dev 计算团队等级
     */
    function _calculateTeamLevel(address user) internal view returns (uint256) {
        UserTeamInfo storage info = userTeamInfo[user];
        
        // 从高到低检查等级要求
        for (uint256 level = 6; level >= 1; level--) {
            TeamLevel memory requirement = teamLevels[level];
            
            // 检查小区业绩
            if (info.smallAreaStake < requirement.minStake) {
                continue;
            }
            
            // 检查子团队要求
            if (requirement.requiredSubTeams > 0) {
                uint256 qualifiedSubTeams = 0;
                
                if (requirement.requiredLevel == 1) qualifiedSubTeams = info.directV1Count;
                else if (requirement.requiredLevel == 2) qualifiedSubTeams = info.directV2Count;
                else if (requirement.requiredLevel == 3) qualifiedSubTeams = info.directV3Count;
                else if (requirement.requiredLevel == 4) qualifiedSubTeams = info.directV4Count;
                else if (requirement.requiredLevel == 5) qualifiedSubTeams = info.directV5Count;
                
                if (qualifiedSubTeams < requirement.requiredSubTeams) {
                    continue;
                }
            }
            
            return level;
        }
        
        return 0;
    }
    
    /**
     * @dev 分发团队奖励（由质押合约或其他合约调用）
     */
    function distributeTeamReward(address user, uint256 baseAmount) external onlyOperator {
        updateUserTeamInfo(user);
        
        UserTeamInfo storage info = userTeamInfo[user];
        if (info.level == 0) return;
        
        // 获取团队等级配置
        TeamLevel memory level = teamLevels[info.level];
        uint256 reward = (baseAmount * level.rewardRate) / BASIS_POINTS;
        
        // 烧伤机制：检查自己的质押是否大于等于下级
        if (burnEnabled) {
            uint256 ownStake = stakingContract.getUserStakeAmount(user);
            address referrer = referralContract.getReferrer(user);
            
            if (referrer != address(0)) {
                uint256 referrerStake = stakingContract.getUserStakeAmount(referrer);
                if (referrerStake < ownStake) {
                    // 烧伤：只能拿相同质押量的奖励
                    reward = (reward * referrerStake) / ownStake;
                }
            }
        }
        
        info.totalRewards += reward;
        info.unclaimedRewards += reward;
        totalDistributed += reward;
        
        emit TeamRewardDistributed(user, reward, info.level);
    }
    
    /**
     * @dev 领取团队奖励
     */
    function claimRewards() external nonReentrant {
        UserTeamInfo storage info = userTeamInfo[msg.sender];
        require(info.unclaimedRewards > 0, "No rewards");
        
        uint256 amount = info.unclaimedRewards;
        info.unclaimedRewards = 0;
        
        require(hcfToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit RewardsClaimed(msg.sender, amount);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户团队信息
     */
    function getUserTeamInfo(address user) external view returns (
        uint256 level,
        uint256 totalTeamStake,
        uint256 smallAreaStake,
        uint256 totalRewards,
        uint256 unclaimedRewards,
        string memory levelName
    ) {
        UserTeamInfo memory info = userTeamInfo[user];
        
        string[7] memory levelNames = ["None", "V1", "V2", "V3", "V4", "V5", "V6"];
        
        return (
            info.level,
            info.totalTeamStake,
            info.smallAreaStake,
            info.totalRewards,
            info.unclaimedRewards,
            levelNames[info.level]
        );
    }
    
    /**
     * @dev 获取团队等级要求
     */
    function getTeamLevelRequirement(uint256 level) external view returns (
        uint256 minStake,
        uint256 rewardRate,
        uint256 requiredSubTeams,
        uint256 requiredLevel
    ) {
        require(level >= 1 && level <= 6, "Invalid level");
        TeamLevel memory requirement = teamLevels[level];
        
        return (
            requirement.minStake,
            requirement.rewardRate,
            requirement.requiredSubTeams,
            requirement.requiredLevel
        );
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置操作员
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }
    
    /**
     * @dev 设置烧伤机制开关
     */
    function setBurnEnabled(bool _enabled) external onlyOwner {
        burnEnabled = _enabled;
    }
    
    /**
     * @dev 更新合约地址
     */
    function updateContracts(
        address _stakingContract,
        address _referralContract
    ) external onlyOwner {
        if (_stakingContract != address(0)) stakingContract = IHCFStaking(_stakingContract);
        if (_referralContract != address(0)) referralContract = IHCFReferral(_referralContract);
    }
    
    /**
     * @dev 批量更新用户团队信息
     */
    function batchUpdateTeamInfo(address[] calldata users) external onlyOperator {
        for (uint256 i = 0; i < users.length; i++) {
            updateUserTeamInfo(users[i]);
        }
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}