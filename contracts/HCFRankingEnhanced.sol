// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFRankingRewards.sol";

/**
 * @title HCFRankingEnhanced
 * @dev 排名奖励增强版 - 补充缺失功能
 */
contract HCFRankingEnhanced is HCFRankingRewards {
    
    // ============ 新增状态变量 ============
    
    // 完整排名配置（Top 2000）
    struct ExtendedRankConfig {
        uint256 top300Bonus;       // 300-500名奖励
        uint256 top500Bonus;       // 501-1000名奖励  
        uint256 top1000Bonus;      // 1001-1500名奖励
        uint256 top1500Bonus;      // 1501-2000名奖励
    }
    
    ExtendedRankConfig public extendedConfig;
    
    // 周期重置配置
    enum ResetCycle { DAILY, WEEKLY, MONTHLY }
    
    struct CycleConfig {
        ResetCycle stakingCycle;       // 质押排名周期
        ResetCycle communityCycle;     // 小区排名周期
        uint256 lastDailyReset;        // 上次日重置
        uint256 lastWeeklyReset;       // 上次周重置
        uint256 lastMonthlyReset;      // 上次月重置
    }
    
    CycleConfig public cycleConfig;
    
    // 两项独立累加
    struct DualRankingBonus {
        uint256 stakingBonus;          // 质押排名奖励
        uint256 communityBonus;        // 小区排名奖励
        uint256 totalBonus;            // 总奖励（累加）
        bool stakingQualified;         // 质押排名资格
        bool communityQualified;       // 小区排名资格
    }
    
    mapping(address => DualRankingBonus) public userDualBonus;
    
    // 基于静态产出的具体计算
    mapping(address => uint256) public userStaticOutput;      // 用户静态产出
    mapping(address => uint256) public userRankingRewards;    // 排名奖励
    
    // 扩展排名列表（支持2000名）
    address[] public extendedStakingRanking;   // 质押排名Top 2000
    address[] public extendedCommunityRanking; // 小区排名Top 2000
    
    // ============ 事件 ============
    event ExtendedRankingUpdated(uint256 stakingCount, uint256 communityCount);
    event CycleReset(ResetCycle cycle, uint256 timestamp);
    event DualBonusCalculated(address indexed user, uint256 stakingBonus, uint256 communityBonus, uint256 total);
    event StaticOutputBasedReward(address indexed user, uint256 staticOutput, uint256 rankingReward);
    
    // ============ 构造函数 ============
    constructor(
        address _multiSig,
        address _stakingContract
    ) HCFRankingRewards(_multiSig, _stakingContract) {
        // 初始化扩展排名配置
        extendedConfig = ExtendedRankConfig({
            top300Bonus: 1200,     // 12%（300-500名）
            top500Bonus: 1100,     // 11%（501-1000名）
            top1000Bonus: 1000,    // 10%（1001-1500名）
            top1500Bonus: 1000     // 10%（1501-2000名）
        });
        
        // 初始化周期配置（默认日周期）
        cycleConfig = CycleConfig({
            stakingCycle: ResetCycle.DAILY,
            communityCycle: ResetCycle.DAILY,
            lastDailyReset: block.timestamp,
            lastWeeklyReset: block.timestamp,
            lastMonthlyReset: block.timestamp
        });
    }
    
    // ============ 完整Top 2000排名 ============
    
    /**
     * @dev 更新扩展排名（支持2000名）
     */
    function updateExtendedRankings() public {
        require(
            block.timestamp >= lastUpdateTime + updateInterval,
            "Update interval not met"
        );
        
        // 获取所有用户并排序（质押排名）
        address[] memory allUsers = _getAllUsers();
        uint256 userCount = allUsers.length;
        
        // 质押排名 - 基于个人静态产出
        UserScore[] memory stakingScores = new UserScore[](userCount);
        for (uint256 i = 0; i < userCount; i++) {
            uint256 staticOutput = _getUserStaticOutput(allUsers[i]);
            stakingScores[i] = UserScore({
                user: allUsers[i],
                score: staticOutput
            });
        }
        
        // 排序并取Top 2000
        _sortScores(stakingScores);
        delete extendedStakingRanking;
        
        uint256 stakingLimit = userCount < 2000 ? userCount : 2000;
        for (uint256 i = 0; i < stakingLimit; i++) {
            if (stakingScores[i].score > 0) {
                extendedStakingRanking.push(stakingScores[i].user);
            }
        }
        
        // 小区排名 - 基于团队业绩（非单条线）
        UserScore[] memory communityScores = new UserScore[](userCount);
        for (uint256 i = 0; i < userCount; i++) {
            uint256 teamPerformance = _getTeamPerformance(allUsers[i]);
            bool isNotSingleLine = _checkNotSingleLine(allUsers[i]);
            
            communityScores[i] = UserScore({
                user: allUsers[i],
                score: isNotSingleLine ? teamPerformance : 0
            });
        }
        
        // 排序并取Top 2000
        _sortScores(communityScores);
        delete extendedCommunityRanking;
        
        uint256 communityLimit = userCount < 2000 ? userCount : 2000;
        for (uint256 i = 0; i < communityLimit; i++) {
            if (communityScores[i].score > 0) {
                extendedCommunityRanking.push(communityScores[i].user);
            }
        }
        
        lastUpdateTime = block.timestamp;
        
        emit ExtendedRankingUpdated(extendedStakingRanking.length, extendedCommunityRanking.length);
    }
    
    /**
     * @dev 获取用户排名奖励（支持2000名）
     */
    function getUserExtendedBonus(address user) public view returns (uint256) {
        uint256 stakingRank = _getUserRankInList(user, extendedStakingRanking);
        uint256 communityRank = _getUserRankInList(user, extendedCommunityRanking);
        
        uint256 stakingBonus = _getBonusByRank(stakingRank);
        uint256 communityBonus = _getBonusByRank(communityRank);
        
        // 两项独立累加
        return stakingBonus + communityBonus;
    }
    
    /**
     * @dev 根据排名获取奖励率（扩展到2000名）
     */
    function _getBonusByRank(uint256 rank) internal view returns (uint256) {
        if (rank == 0) return 0;
        
        if (rank <= 100) {
            return top100Bonus;     // 20%
        } else if (rank <= 299) {
            return top299Bonus;     // 10%
        } else if (rank <= 500) {
            return extendedConfig.top300Bonus;    // 12%
        } else if (rank <= 1000) {
            return extendedConfig.top500Bonus;    // 11%
        } else if (rank <= 1500) {
            return extendedConfig.top1000Bonus;   // 10%
        } else if (rank <= 2000) {
            return extendedConfig.top1500Bonus;   // 10%
        }
        
        return 0;
    }
    
    // ============ 周期重置机制 ============
    
    /**
     * @dev 检查并执行周期重置
     */
    function checkAndResetCycles() public {
        uint256 currentTime = block.timestamp;
        
        // 日重置
        if (currentTime >= cycleConfig.lastDailyReset + 1 days) {
            _resetDaily();
        }
        
        // 周重置
        if (currentTime >= cycleConfig.lastWeeklyReset + 7 days) {
            _resetWeekly();
        }
        
        // 月重置（30天）
        if (currentTime >= cycleConfig.lastMonthlyReset + 30 days) {
            _resetMonthly();
        }
    }
    
    /**
     * @dev 日重置
     */
    function _resetDaily() internal {
        if (cycleConfig.stakingCycle == ResetCycle.DAILY) {
            delete extendedStakingRanking;
            delete stakingRanking;
        }
        
        if (cycleConfig.communityCycle == ResetCycle.DAILY) {
            delete extendedCommunityRanking;
            delete communityRanking;
        }
        
        cycleConfig.lastDailyReset = block.timestamp;
        emit CycleReset(ResetCycle.DAILY, block.timestamp);
    }
    
    /**
     * @dev 周重置
     */
    function _resetWeekly() internal {
        if (cycleConfig.stakingCycle == ResetCycle.WEEKLY) {
            delete extendedStakingRanking;
            delete stakingRanking;
        }
        
        if (cycleConfig.communityCycle == ResetCycle.WEEKLY) {
            delete extendedCommunityRanking;
            delete communityRanking;
        }
        
        cycleConfig.lastWeeklyReset = block.timestamp;
        emit CycleReset(ResetCycle.WEEKLY, block.timestamp);
    }
    
    /**
     * @dev 月重置
     */
    function _resetMonthly() internal {
        if (cycleConfig.stakingCycle == ResetCycle.MONTHLY) {
            delete extendedStakingRanking;
            delete stakingRanking;
        }
        
        if (cycleConfig.communityCycle == ResetCycle.MONTHLY) {
            delete extendedCommunityRanking;
            delete communityRanking;
        }
        
        cycleConfig.lastMonthlyReset = block.timestamp;
        emit CycleReset(ResetCycle.MONTHLY, block.timestamp);
    }
    
    // ============ 两项独立累加机制 ============
    
    /**
     * @dev 计算用户双排名奖励（独立累加）
     */
    function calculateDualRankingBonus(address user) public returns (DualRankingBonus memory) {
        // 检查周期重置
        checkAndResetCycles();
        
        DualRankingBonus storage bonus = userDualBonus[user];
        
        // 质押排名奖励
        uint256 stakingRank = _getUserRankInList(user, extendedStakingRanking);
        if (stakingRank > 0 && stakingRank <= 2000) {
            bonus.stakingBonus = _getBonusByRank(stakingRank);
            bonus.stakingQualified = true;
        } else {
            bonus.stakingBonus = 0;
            bonus.stakingQualified = false;
        }
        
        // 小区排名奖励
        uint256 communityRank = _getUserRankInList(user, extendedCommunityRanking);
        if (communityRank > 0 && communityRank <= 2000) {
            bonus.communityBonus = _getBonusByRank(communityRank);
            bonus.communityQualified = true;
        } else {
            bonus.communityBonus = 0;
            bonus.communityQualified = false;
        }
        
        // 两项累加
        bonus.totalBonus = bonus.stakingBonus + bonus.communityBonus;
        
        emit DualBonusCalculated(user, bonus.stakingBonus, bonus.communityBonus, bonus.totalBonus);
        
        return bonus;
    }
    
    /**
     * @dev 应用排名奖励到用户（两项独立）
     */
    function applyDualRankingRewards(address user) external returns (uint256) {
        DualRankingBonus memory bonus = calculateDualRankingBonus(user);
        
        if (bonus.totalBonus == 0) {
            return 0;
        }
        
        // 获取用户静态产出
        uint256 staticOutput = _getUserStaticOutput(user);
        
        // 计算排名奖励（基于静态产出）
        uint256 rankingReward = (staticOutput * bonus.totalBonus) / BASIS_POINTS;
        
        // 记录奖励
        userRankingRewards[user] += rankingReward;
        totalRewardsDistributed += rankingReward;
        
        emit StaticOutputBasedReward(user, staticOutput, rankingReward);
        emit RewardDistributed(user, rankingReward);
        
        return rankingReward;
    }
    
    // ============ 基于静态产出的具体计算 ============
    
    /**
     * @dev 获取用户静态产出
     */
    function _getUserStaticOutput(address user) internal view returns (uint256) {
        if (address(stakingContract) != address(0)) {
            try stakingContract.getUserStaticOutput(user) returns (uint256 output) {
                return output;
            } catch {
                return userStaticOutput[user]; // 使用缓存
            }
        }
        return 0;
    }
    
    /**
     * @dev 获取团队业绩
     */
    function _getTeamPerformance(address user) internal view returns (uint256) {
        if (address(referralContract) != address(0)) {
            try referralContract.getUserTeamVolume(user) returns (uint256 volume) {
                return volume;
            } catch {
                return 0;
            }
        }
        return 0;
    }
    
    /**
     * @dev 检查是否非单条线
     */
    function _checkNotSingleLine(address user) internal view returns (bool) {
        if (address(referralContract) != address(0)) {
            try referralContract.isNotSingleLine(user) returns (bool notSingle) {
                return notSingle;
            } catch {
                return false;
            }
        }
        return false;
    }
    
    /**
     * @dev 获取用户在列表中的排名
     */
    function _getUserRankInList(address user, address[] memory rankList) 
        internal 
        pure 
        returns (uint256) 
    {
        for (uint256 i = 0; i < rankList.length; i++) {
            if (rankList[i] == user) {
                return i + 1; // 排名从1开始
            }
        }
        return 0; // 未上榜
    }
    
    // ============ 管理函数 ============
    
    /**
     * @dev 设置排名周期（多签）
     */
    function setRankingCycles(
        ResetCycle stakingCycle,
        ResetCycle communityCycle
    ) external onlyMultiSig {
        cycleConfig.stakingCycle = stakingCycle;
        cycleConfig.communityCycle = communityCycle;
    }
    
    /**
     * @dev 设置扩展排名奖励（多签）
     */
    function setExtendedBonuses(
        uint256 top300,
        uint256 top500,
        uint256 top1000,
        uint256 top1500
    ) external onlyMultiSig {
        extendedConfig.top300Bonus = top300;
        extendedConfig.top500Bonus = top500;
        extendedConfig.top1000Bonus = top1000;
        extendedConfig.top1500Bonus = top1500;
    }
    
    /**
     * @dev 更新用户静态产出缓存
     */
    function updateUserStaticOutput(address user, uint256 output) 
        external 
        onlyAuthorized 
    {
        userStaticOutput[user] = output;
    }
    
    /**
     * @dev 手动触发周期重置（多签）
     */
    function manualResetCycle(ResetCycle cycle) external onlyMultiSig {
        if (cycle == ResetCycle.DAILY) {
            _resetDaily();
        } else if (cycle == ResetCycle.WEEKLY) {
            _resetWeekly();
        } else if (cycle == ResetCycle.MONTHLY) {
            _resetMonthly();
        }
    }
    
    /**
     * @dev 获取用户完整排名信息
     */
    function getUserFullRankingInfo(address user) 
        external 
        view 
        returns (
            uint256 stakingRank,
            uint256 communityRank,
            uint256 stakingBonus,
            uint256 communityBonus,
            uint256 totalBonus,
            uint256 staticOutput,
            uint256 totalRewards
        ) 
    {
        stakingRank = _getUserRankInList(user, extendedStakingRanking);
        communityRank = _getUserRankInList(user, extendedCommunityRanking);
        
        DualRankingBonus memory bonus = userDualBonus[user];
        stakingBonus = bonus.stakingBonus;
        communityBonus = bonus.communityBonus;
        totalBonus = bonus.totalBonus;
        
        staticOutput = _getUserStaticOutput(user);
        totalRewards = userRankingRewards[user];
    }
    
    /**
     * @dev 获取排名列表（支持分页）
     */
    function getRankingList(
        bool isStaking,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory users, uint256[] memory scores) {
        address[] storage ranking = isStaking ? extendedStakingRanking : extendedCommunityRanking;
        
        uint256 end = offset + limit;
        if (end > ranking.length) {
            end = ranking.length;
        }
        
        uint256 length = end - offset;
        users = new address[](length);
        scores = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            users[i] = ranking[offset + i];
            scores[i] = isStaking ? 
                _getUserStaticOutput(users[i]) : 
                _getTeamPerformance(users[i]);
        }
    }
}