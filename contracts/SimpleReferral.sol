// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IStaking {
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint256 level,
        uint256 pending,
        uint256 totalClaimed,
        uint256 lpType,
        uint256 dailyOutput
    );
}

/**
 * @title SimpleReferral
 * @dev 简化版推荐合约 - 入金奖励、静态奖励、团队奖励、排名奖
 */
contract SimpleReferral is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ 结构体 ============
    struct UserInfo {
        address referrer;           // 推荐人
        uint256 directCount;        // 直推数量
        uint256 teamLevel;          // 团队等级(V1-V6)
        uint256 personalStake;      // 个人质押量
        uint256 teamStake;          // 团队质押量
        uint256 totalEntryReward;   // 总入金奖励
        uint256 totalStaticReward;  // 总静态奖励
        uint256 totalTeamReward;    // 总团队奖励
        bool isActive;              // 是否激活
        uint256 joinTime;           // 加入时间
        uint256 ranking;            // 排名
        uint256 smallAreaStake;     // 小区业绩
    }
    
    struct RewardRates {
        // 入金奖励
        uint256 entryGen1;    // 一代5%
        uint256 entryGen2;    // 二代3%
        
        // 静态奖励
        uint256 staticGen1;   // 一代20%
        uint256 staticGen2;   // 二代10%
        uint256 staticGen3_8; // 3-8代5%
        uint256 staticGen9_15;// 9-15代3%
        uint256 staticGen16_20;// 16-20代2%
        
        // 团队奖励V1-V6: 6%, 12%, 18%, 24%, 30%, 36%
        uint256[6] teamRates;
    }
    
    struct TeamRequirement {
        uint256 minStake;      // 最小质押量
        uint256 subLevels;     // 需要的下级等级数
    }
    
    // ============ 状态变量 ============
    mapping(address => UserInfo) public userInfo;
    mapping(address => address[]) public directReferrals;
    mapping(address => mapping(uint256 => uint256)) public levelCounts; // 各级V数量
    
    RewardRates public rates;
    TeamRequirement[6] public teamRequirements;
    
    IHCFToken public hcfToken;
    IStaking public stakingContract;
    
    mapping(address => bool) public authorized;
    
    // 排名系统
    address[] public stakeRanking;       // 质押排名
    address[] public areaRanking;        // 小区业绩排名
    
    // ============ 事件 ============
    event UserRegistered(address indexed user, address indexed referrer);
    event EntryReward(address indexed to, uint256 amount, uint256 generation);
    event StaticReward(address indexed to, uint256 amount, uint256 generation);
    event TeamReward(address indexed to, uint256 amount, uint256 level);
    event RankingReward(address indexed to, uint256 amount, string rankType);
    event TeamLevelUpgraded(address indexed user, uint256 oldLevel, uint256 newLevel);
    
    // ============ 构造函数 ============
    constructor(address _hcfToken) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        
        // 初始化奖励率
        rates.entryGen1 = 500;     // 5%
        rates.entryGen2 = 300;     // 3%
        rates.staticGen1 = 2000;   // 20%
        rates.staticGen2 = 1000;   // 10%
        rates.staticGen3_8 = 500;  // 5%
        rates.staticGen9_15 = 300; // 3%
        rates.staticGen16_20 = 200;// 2%
        rates.teamRates = [600, 1200, 1800, 2400, 3000, 3600]; // 6%-36%
        
        // 初始化团队要求
        _initTeamRequirements();
    }
    
    function _initTeamRequirements() private {
        teamRequirements[0] = TeamRequirement(2000 * 10**18, 0);      // V1: 2000枚
        teamRequirements[1] = TeamRequirement(20000 * 10**18, 2);     // V2: 2万枚, 2个V1
        teamRequirements[2] = TeamRequirement(100000 * 10**18, 2);    // V3: 10万枚, 2个V2
        teamRequirements[3] = TeamRequirement(500000 * 10**18, 3);    // V4: 50万枚, 3个V3
        teamRequirements[4] = TeamRequirement(3000000 * 10**18, 3);   // V5: 300万枚, 3个V4
        teamRequirements[5] = TeamRequirement(20000000 * 10**18, 3);  // V6: 2000万枚, 3个V5
    }
    
    // ============ 注册功能 ============
    
    /**
     * @dev 用户注册
     */
    function register(address referrer) external {
        require(userInfo[msg.sender].referrer == address(0), "Already registered");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referrer != address(0), "Invalid referrer");
        
        UserInfo storage user = userInfo[msg.sender];
        user.referrer = referrer;
        user.isActive = true;
        user.joinTime = block.timestamp;
        
        // 更新推荐人直推数
        userInfo[referrer].directCount++;
        directReferrals[referrer].push(msg.sender);
        
        emit UserRegistered(msg.sender, referrer);
    }
    
    // ============ 入金奖励 ============
    
    /**
     * @dev 分发入金奖励（不封顶）
     */
    function distributeEntryRewards(address user, uint256 amount) external onlyAuthorized {
        address referrer = userInfo[user].referrer;
        if (referrer == address(0)) return;
        
        // 一代5%
        uint256 gen1Reward = (amount * rates.entryGen1) / BASIS_POINTS;
        if (gen1Reward > 0) {
            hcfToken.transfer(referrer, gen1Reward);
            userInfo[referrer].totalEntryReward += gen1Reward;
            emit EntryReward(referrer, gen1Reward, 1);
        }
        
        // 二代3%
        address gen2Referrer = userInfo[referrer].referrer;
        if (gen2Referrer != address(0)) {
            uint256 gen2Reward = (amount * rates.entryGen2) / BASIS_POINTS;
            if (gen2Reward > 0) {
                hcfToken.transfer(gen2Referrer, gen2Reward);
                userInfo[gen2Referrer].totalEntryReward += gen2Reward;
                emit EntryReward(gen2Referrer, gen2Reward, 2);
            }
        }
        
        // 更新质押量
        userInfo[user].personalStake = amount;
        _updateTeamStake(user, amount);
    }
    
    // ============ 静态奖励 ============
    
    /**
     * @dev 分发静态产出奖励（烧伤机制）
     */
    function distributeStaticRewards(address user, uint256 staticOutput) external onlyAuthorized {
        address current = userInfo[user].referrer;
        uint256 generation = 1;
        
        while (current != address(0) && generation <= 20) {
            uint256 rate = _getStaticRate(current, generation);
            if (rate > 0) {
                uint256 reward = (staticOutput * rate) / BASIS_POINTS;
                
                // 烧伤检查（上级收益不能超过下级）
                if (address(stakingContract) != address(0)) {
                    (,,,,,uint256 upperDaily) = stakingContract.getUserInfo(current);
                    (,,,,,uint256 lowerDaily) = stakingContract.getUserInfo(user);
                    
                    if (upperDaily < lowerDaily) {
                        reward = (reward * upperDaily) / lowerDaily;
                    }
                }
                
                if (reward > 0) {
                    hcfToken.transfer(current, reward);
                    userInfo[current].totalStaticReward += reward;
                    emit StaticReward(current, reward, generation);
                }
            }
            
            current = userInfo[current].referrer;
            generation++;
        }
    }
    
    function _getStaticRate(address user, uint256 generation) internal view returns (uint256) {
        UserInfo memory info = userInfo[user];
        
        // 直推几个拿几代
        if (generation > info.directCount) return 0;
        
        if (generation == 1) return rates.staticGen1;
        if (generation == 2) return rates.staticGen2;
        if (generation >= 3 && generation <= 8) return rates.staticGen3_8;
        if (generation >= 9 && generation <= 15) {
            return info.teamLevel >= 3 ? rates.staticGen9_15 : 0;  // V3以上
        }
        if (generation >= 16 && generation <= 20) {
            return info.teamLevel >= 4 ? rates.staticGen16_20 : 0; // V4以上
        }
        return 0;
    }
    
    // ============ 团队奖励 ============
    
    /**
     * @dev 分发团队奖励（烧伤机制）
     */
    function distributeTeamRewards(address user) external onlyAuthorized {
        UserInfo storage info = userInfo[user];
        if (info.teamLevel == 0) return;
        
        // 计算小区业绩（扣除最大区）
        uint256 smallArea = _calculateSmallArea(user);
        info.smallAreaStake = smallArea;
        
        // 检查团队等级要求
        TeamRequirement memory req = teamRequirements[info.teamLevel - 1];
        if (smallArea < req.minStake) return;
        
        // 计算团队奖励
        uint256 rate = rates.teamRates[info.teamLevel - 1];
        uint256 teamReward = (smallArea * rate) / BASIS_POINTS / 30; // 日化
        
        // 烧伤机制
        if (address(stakingContract) != address(0)) {
            (,,,,,uint256 dailyOutput) = stakingContract.getUserInfo(user);
            if (teamReward > dailyOutput) {
                teamReward = dailyOutput;
            }
        }
        
        if (teamReward > 0) {
            hcfToken.transfer(user, teamReward);
            info.totalTeamReward += teamReward;
            emit TeamReward(user, teamReward, info.teamLevel);
        }
    }
    
    // ============ 排名奖励 ============
    
    /**
     * @dev 分发小区业绩排名奖
     */
    function distributeAreaRankingRewards() external onlyAuthorized {
        _updateAreaRanking();
        
        for (uint256 i = 0; i < areaRanking.length && i < 299; i++) {
            address user = areaRanking[i];
            if (address(stakingContract) != address(0)) {
                (,,,,,uint256 dailyOutput) = stakingContract.getUserInfo(user);
                
                uint256 bonus;
                if (i < 100) {
                    bonus = (dailyOutput * 2000) / BASIS_POINTS;  // 20%
                } else {
                    bonus = (dailyOutput * 1000) / BASIS_POINTS;  // 10%
                }
                
                if (bonus > 0) {
                    hcfToken.transfer(user, bonus);
                    emit RankingReward(user, bonus, "area");
                }
            }
        }
    }
    
    /**
     * @dev 分发质押排名奖
     */
    function distributeStakeRankingRewards() external onlyAuthorized {
        _updateStakeRanking();
        
        for (uint256 i = 0; i < stakeRanking.length && i < 2000; i++) {
            address user = stakeRanking[i];
            if (address(stakingContract) != address(0)) {
                (,,,,,uint256 dailyOutput) = stakingContract.getUserInfo(user);
                
                uint256 bonus;
                if (i < 100) {
                    bonus = (dailyOutput * 2000) / BASIS_POINTS;  // 20%
                } else if (i < 500) {
                    bonus = (dailyOutput * 1500) / BASIS_POINTS;  // 15%
                } else {
                    bonus = (dailyOutput * 1000) / BASIS_POINTS;  // 10%
                }
                
                if (bonus > 0) {
                    hcfToken.transfer(user, bonus);
                    emit RankingReward(user, bonus, "stake");
                }
            }
        }
    }
    
    // ============ 内部功能 ============
    
    function _updateTeamStake(address user, uint256 amount) internal {
        address current = userInfo[user].referrer;
        
        while (current != address(0)) {
            userInfo[current].teamStake += amount;
            _checkTeamLevel(current);
            current = userInfo[current].referrer;
        }
    }
    
    function _checkTeamLevel(address user) internal {
        UserInfo storage info = userInfo[user];
        uint256 oldLevel = info.teamLevel;
        
        // 根据小区业绩和下级V等级判断
        uint256 smallArea = info.smallAreaStake;
        
        for (uint256 i = 5; i >= 0; i--) {
            TeamRequirement memory req = teamRequirements[i];
            bool qualifies = smallArea >= req.minStake;
            
            if (i > 0 && req.subLevels > 0) {
                qualifies = qualifies && levelCounts[user][i] >= req.subLevels;
            }
            
            if (qualifies) {
                info.teamLevel = i + 1;
                break;
            }
            if (i == 0) break;
        }
        
        if (info.teamLevel > oldLevel) {
            // 更新上级的V计数
            if (info.referrer != address(0)) {
                if (oldLevel > 0) {
                    levelCounts[info.referrer][oldLevel]--;
                }
                levelCounts[info.referrer][info.teamLevel]++;
            }
            emit TeamLevelUpgraded(user, oldLevel, info.teamLevel);
        }
    }
    
    function _calculateSmallArea(address user) internal view returns (uint256) {
        address[] memory directs = directReferrals[user];
        if (directs.length == 0) return 0;
        
        uint256 maxArea = 0;
        uint256 totalArea = 0;
        
        for (uint256 i = 0; i < directs.length; i++) {
            uint256 area = userInfo[directs[i]].teamStake + userInfo[directs[i]].personalStake;
            totalArea += area;
            if (area > maxArea) {
                maxArea = area;
            }
        }
        
        return totalArea - maxArea;  // 扣除最大区
    }
    
    function _updateAreaRanking() internal {
        // 简化实现：实际应该用更高效的排序算法
        // 这里仅作示例
    }
    
    function _updateStakeRanking() internal {
        // 简化实现：实际应该用更高效的排序算法
        // 这里仅作示例
    }
    
    // ============ 管理功能 ============
    
    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
    }
    
    function setStakingContract(address _staking) external onlyOwner {
        stakingContract = IStaking(_staking);
    }
    
    function getUserReferrer(address user) external view returns (address) {
        return userInfo[user].referrer;
    }
}