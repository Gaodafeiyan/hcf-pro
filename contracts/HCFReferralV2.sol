// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IHCFStaking {
    function getUserInfo(address user) external view returns (
        uint256 staked,
        uint256 lp,
        uint256 level,
        uint256 pending,
        uint256 rate
    );
}

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

/**
 * @title HCFReferralV2
 * @dev 推荐系统V2 - 20代奖励、团队V级、排名奖、动态收益控制
 */
contract HCFReferralV2 is ReentrancyGuard, Ownable {
    
    // ============ 常量 ============
    uint256 public constant PRECISION = 10000;
    uint256 public constant MAX_REFERRAL_LEVELS = 20;
    uint256 public constant MAX_RANKING = 2000;
    
    // 20代静态奖励比例（基点）
    uint256[20] public STATIC_RATES = [
        2000, // 1代: 20%
        1000, // 2代: 10%
        500,  // 3-8代: 5% (无需V等级)
        500,  // 4代: 5%
        500,  // 5代: 5%
        500,  // 6代: 5%
        500,  // 7代: 5%
        500,  // 8代: 5%
        300,  // 9-15代: 3% (需要V3+)
        300,  // 10代: 3%
        300,  // 11代: 3%
        300,  // 12代: 3%
        300,  // 13代: 3%
        300,  // 14代: 3%
        300,  // 15代: 3%
        200,  // 16-20代: 2% (需要V4+)
        200,  // 17代: 2%
        200,  // 18代: 2%
        200,  // 19代: 2%
        200   // 20代: 2%
    ];
    
    // 入金奖励比例
    uint256[2] public DEPOSIT_RATES = [
        500,  // 一代: 5%
        300   // 二代: 3%
    ];
    
    // 团队V级要求
    struct TeamRequirement {
        uint256 minSmallZone;     // 小区最低业绩
        uint256 minSubordinateV;  // 需要下级V等级
        uint256 rewardRate;       // 奖励比例（基点）
    }
    
    TeamRequirement[6] public teamRequirements;
    
    // ============ 状态变量 ============
    IERC20 public hcfToken;
    IHCFStaking public stakingContract;
    address public multiSigWallet;
    
    // 推荐关系
    mapping(address => address) public referrer;
    mapping(address => address[]) public directReferrals;
    mapping(address => uint256) public totalTeamSize;
    
    // 团队数据
    mapping(address => uint256) public teamLevel;        // V0-V6
    mapping(address => uint256) public smallZonePerformance;
    mapping(address => uint256) public totalPerformance;
    
    // 奖励数据
    mapping(address => uint256) public depositRewards;   // 入金奖励
    mapping(address => uint256) public staticRewards;    // 静态产出奖励
    mapping(address => uint256) public teamRewards;      // 团队奖励
    mapping(address => uint256) public rankingRewards;   // 排名奖励
    mapping(address => uint256) public totalBurned;      // 总销毁
    
    // 排名系统
    struct RankingInfo {
        address user;
        uint256 value;
        uint256 bonus;
    }
    
    RankingInfo[MAX_RANKING] public stakingRanking;     // 质押排名
    RankingInfo[MAX_RANKING] public teamRanking;        // 小区排名
    uint256 public lastRankingUpdate;
    uint256 public rankingPeriod = 1 days;              // 排名周期
    
    // 动态收益控制
    uint256 public dynamicYieldRatio = 7000;            // 70% (50%-100%)
    uint256 public burnCap;                             // 销毁封顶（质押日产出%）
    
    // 销毁率
    uint256 public depositBurnRate = 0;                 // 入金销毁率（销毁限）
    uint256 public staticBurnRate = 1000;               // 推荐焼伤10%
    uint256 public teamBurnRate = 500;                  // 团队焼伤5%
    uint256 public variableBurnRate = 500;              // 波动销毁5%
    uint256 public transactionBurnRate = 100;           // 交易销毁1%
    uint256 public scheduledBurnRate = 100;             // 定时销毁1%
    
    // 直推解锁（直推几个拿几代）
    mapping(address => uint256) public directReferralCount;
    mapping(address => uint256) public unlockedLevels;      // 解锁的代数
    
    // 全局封顶
    uint256 public dailyProductionCap;                      // 日产出封顶
    uint256 public todayBurned;                            // 今日已销毁
    uint256 public lastBurnDay;                            // 上次销毁日
    
    // ============ 事件 ============
    event ReferralSet(address indexed user, address indexed referrer);
    event DepositRewarded(address indexed user, address indexed referrer, uint256 amount, uint256 level);
    event StaticRewarded(address indexed user, address indexed referrer, uint256 amount, uint256 level);
    event TeamRewarded(address indexed user, uint256 level, uint256 amount);
    event RankingRewarded(address indexed user, uint256 position, uint256 amount);
    event BurnExecuted(address indexed user, uint256 amount, string reason);
    event TeamLevelUpgraded(address indexed user, uint256 oldLevel, uint256 newLevel);
    event DynamicYieldUpdated(uint256 oldRatio, uint256 newRatio);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    modifier updateRanking() {
        if (block.timestamp >= lastRankingUpdate + rankingPeriod) {
            _updateRankings();
        }
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _stakingContract
    ) {
        hcfToken = IERC20(_hcfToken);
        stakingContract = IHCFStaking(_stakingContract);
        
        // 初始化团队V级要求（修正版）
        teamRequirements[0] = TeamRequirement(2000 * 10**18, 0, 600);          // V1: 小区2000, 6%焼5%
        teamRequirements[1] = TeamRequirement(20000 * 10**18, 2, 1200);        // V2: 2万+2个V1, 12%焼5%
        teamRequirements[2] = TeamRequirement(100000 * 10**18, 2, 1800);       // V3: 10万+2个V2, 18%焼5%
        teamRequirements[3] = TeamRequirement(500000 * 10**18, 3, 2400);       // V4: 50万+3个V3, 24%焼5%
        teamRequirements[4] = TeamRequirement(3000000 * 10**18, 3, 3000);      // V5: 300万+3个V4, 30%焼5%
        teamRequirements[5] = TeamRequirement(20000000 * 10**18, 3, 3600);     // V6: 2000万+3个V5, 36%焼5%
    }
    
    // ============ 推荐功能 ============
    
    /**
     * @dev 设置推荐人
     */
    function setReferrer(address _referrer) external {
        require(referrer[msg.sender] == address(0), "Referrer already set");
        require(_referrer != address(0) && _referrer != msg.sender, "Invalid referrer");
        
        referrer[msg.sender] = _referrer;
        directReferrals[_referrer].push(msg.sender);
        
        // 更新直推数量（用于解锁代数）
        directReferralCount[_referrer]++;
        unlockedLevels[_referrer] = directReferralCount[_referrer]; // 直推几个拿几代
        
        // 更新团队人数
        address current = _referrer;
        for (uint256 i = 0; i < MAX_REFERRAL_LEVELS && current != address(0); i++) {
            totalTeamSize[current]++;
            current = referrer[current];
        }
        
        emit ReferralSet(msg.sender, _referrer);
    }
    
    /**
     * @dev 入金奖励分配
     */
    function distributeDepositReward(address user, uint256 depositAmount) external nonReentrant {
        require(msg.sender == address(stakingContract), "Only staking contract");
        
        address firstGen = referrer[user];
        address secondGen = firstGen != address(0) ? referrer[firstGen] : address(0);
        
        // 一代5%（使用DEPOSIT_RATES）
        if (firstGen != address(0)) {
            uint256 reward = depositAmount * DEPOSIT_RATES[0] / PRECISION;
            
            // 检查销毁封顶
            uint256 actualReward = _applyBurnCap(firstGen, reward);
            depositRewards[firstGen] += actualReward;
            
            // 销毁多余部分
            if (reward > actualReward) {
                _burn(reward - actualReward, "Deposit cap");
            }
            
            emit DepositRewarded(user, firstGen, actualReward, 1);
        }
        
        // 二代3%（使用DEPOSIT_RATES）
        if (secondGen != address(0)) {
            uint256 reward = depositAmount * DEPOSIT_RATES[1] / PRECISION;
            
            // 检查销毁封顶
            uint256 actualReward = _applyBurnCap(secondGen, reward);
            depositRewards[secondGen] += actualReward;
            
            // 销毁多余部分
            if (reward > actualReward) {
                _burn(reward - actualReward, "Deposit cap");
            }
            
            emit DepositRewarded(user, secondGen, actualReward, 2);
        }
    }
    
    /**
     * @dev 静态产出奖励分配（20代）
     */
    function distributeStaticReward(address user, uint256 staticYield) external nonReentrant updateRanking {
        require(msg.sender == address(stakingContract), "Only staking contract");
        
        // 应用动态收益比例
        uint256 adjustedYield = staticYield * dynamicYieldRatio / PRECISION;
        
        address current = referrer[user];
        uint256 directCount = directReferrals[user].length;
        
        for (uint256 level = 0; level < MAX_REFERRAL_LEVELS && current != address(0); level++) {
            // 检查代数解锁条件
            if (!_isLevelUnlocked(current, level, directCount)) {
                current = referrer[current];
                continue;
            }
            
            // 计算奖励（使用静态奖励率）
            uint256 rate = STATIC_RATES[level];
            uint256 reward = adjustedYield * rate / PRECISION;
            
            // 扣除10%销毁
            uint256 burnAmount = reward * staticBurnRate / PRECISION;
            uint256 netReward = reward - burnAmount;
            
            // 检查销毁封顶
            netReward = _applyBurnCap(current, netReward);
            
            staticRewards[current] += netReward;
            _burn(burnAmount, "Static burn");
            
            emit StaticRewarded(user, current, netReward, level + 1);
            
            current = referrer[current];
        }
    }
    
    /**
     * @dev 团队奖励分配（V1-V6）
     */
    function distributeTeamReward(address user) external nonReentrant {
        uint256 level = teamLevel[user];
        require(level > 0, "Not qualified for team reward");
        
        // 检查小区业绩和下级V要求
        TeamRequirement memory req = teamRequirements[level - 1];
        require(smallZonePerformance[user] >= req.minSmallZone, "Small zone not qualified");
        require(_hasSubordinateV(user, req.minSubordinateV), "Need subordinate V");
        
        // 计算团队奖励（基于小区业绩）
        uint256 reward = smallZonePerformance[user] * req.rewardRate / PRECISION;
        
        // 扣除5%销毁
        uint256 burnAmount = reward * teamBurnRate / PRECISION;
        uint256 netReward = reward - burnAmount;
        
        teamRewards[user] += netReward;
        _burn(burnAmount, "Team burn");
        
        emit TeamRewarded(user, level, netReward);
    }
    
    /**
     * @dev 排名奖励分配
     */
    function distributeRankingRewards() external nonReentrant updateRanking {
        // 质押排名奖励
        for (uint256 i = 0; i < MAX_RANKING; i++) {
            if (stakingRanking[i].user == address(0)) break;
            
            address user = stakingRanking[i].user;
            uint256 bonus = stakingRanking[i].bonus;
            
            if (bonus > 0) {
                // 计算额外奖励
                (uint256 staked, , , , ) = stakingContract.getUserInfo(user);
                uint256 reward = staked * bonus / PRECISION;
                
                rankingRewards[user] += reward;
                emit RankingRewarded(user, i + 1, reward);
            }
        }
        
        // 小区排名奖励（只有业绩>0的可以进入）
        for (uint256 i = 0; i < MAX_RANKING; i++) {
            if (teamRanking[i].user == address(0)) break;
            
            address user = teamRanking[i].user;
            uint256 bonus = teamRanking[i].bonus;
            
            if (bonus > 0 && smallZonePerformance[user] > 0) {
                uint256 reward = smallZonePerformance[user] * bonus / PRECISION;
                
                rankingRewards[user] += reward;
                emit RankingRewarded(user, i + 1, reward);
            }
        }
    }
    
    /**
     * @dev 领取所有奖励
     */
    function claimRewards() external nonReentrant {
        uint256 total = depositRewards[msg.sender] + 
                       staticRewards[msg.sender] + 
                       teamRewards[msg.sender] + 
                       rankingRewards[msg.sender];
        
        require(total > 0, "No rewards");
        
        // 重置奖励
        depositRewards[msg.sender] = 0;
        staticRewards[msg.sender] = 0;
        teamRewards[msg.sender] = 0;
        rankingRewards[msg.sender] = 0;
        
        // 转账
        hcfToken.transfer(msg.sender, total);
    }
    
    // ============ 团队管理 ============
    
    /**
     * @dev 升级团队等级
     */
    function upgradeTeamLevel() external {
        _updateSmallZone(msg.sender);
        
        uint256 currentLevel = teamLevel[msg.sender];
        uint256 newLevel = _calculateTeamLevel(msg.sender);
        
        if (newLevel > currentLevel) {
            teamLevel[msg.sender] = newLevel;
            emit TeamLevelUpgraded(msg.sender, currentLevel, newLevel);
        }
    }
    
    /**
     * @dev 更新小区业绩
     */
    function _updateSmallZone(address user) private {
        uint256 totalPerf = 0;
        uint256 maxBranch = 0;
        
        // 计算所有直推的业绩
        for (uint256 i = 0; i < directReferrals[user].length; i++) {
            address ref = directReferrals[user][i];
            uint256 branchPerf = _calculateBranchPerformance(ref);
            
            totalPerf += branchPerf;
            if (branchPerf > maxBranch) {
                maxBranch = branchPerf;
            }
        }
        
        // 小区业绩 = 总业绩 - 最大分支
        smallZonePerformance[user] = totalPerf - maxBranch;
        totalPerformance[user] = totalPerf;
    }
    
    /**
     * @dev 计算分支业绩
     */
    function _calculateBranchPerformance(address user) private view returns (uint256) {
        (uint256 staked, uint256 lp, , , ) = stakingContract.getUserInfo(user);
        uint256 performance = staked + lp;
        
        // 递归计算下级业绩
        for (uint256 i = 0; i < directReferrals[user].length; i++) {
            performance += _calculateBranchPerformance(directReferrals[user][i]);
        }
        
        return performance;
    }
    
    /**
     * @dev 计算团队等级
     */
    function _calculateTeamLevel(address user) private view returns (uint256) {
        for (uint256 i = 5; i >= 0; i--) {
            TeamRequirement memory req = teamRequirements[i];
            
            if (smallZonePerformance[user] >= req.minSmallZone &&
                _hasSubordinateV(user, req.minSubordinateV)) {
                return i + 1;
            }
            
            if (i == 0) break;
        }
        
        return 0;
    }
    
    /**
     * @dev 检查是否有指定等级的下级V（需要多个）
     */
    function _hasSubordinateV(address user, uint256 requiredV) private view returns (bool) {
        if (requiredV == 0) return true;
        
        uint256 count = 0;
        uint256 requiredCount = requiredV <= 2 ? 2 : 3; // V1-V3需要2个，V4-V6需要3个
        
        for (uint256 i = 0; i < directReferrals[user].length; i++) {
            if (teamLevel[directReferrals[user][i]] >= requiredV) {
                count++;
                if (count >= requiredCount) return true;
            }
        }
        
        return false;
    }
    
    
    // ============ 排名系统 ============
    
    /**
     * @dev 更新排名
     */
    function _updateRankings() private {
        lastRankingUpdate = block.timestamp;
        
        // 重置排名
        for (uint256 i = 0; i < MAX_RANKING; i++) {
            stakingRanking[i] = RankingInfo(address(0), 0, 0);
            teamRanking[i] = RankingInfo(address(0), 0, 0);
        }
        
        // TODO: 实际项目中需要遍历所有用户并排序
        // 这里仅为示例，实际需要链下计算或使用Oracle
        
        // 设置排名奖励
        // 1-100名: 20%
        for (uint256 i = 0; i < 100 && i < MAX_RANKING; i++) {
            stakingRanking[i].bonus = 2000;
            teamRanking[i].bonus = 2000;
        }
        
        // 101-299名: 10%
        for (uint256 i = 100; i < 299 && i < MAX_RANKING; i++) {
            stakingRanking[i].bonus = 1000;
            teamRanking[i].bonus = 1000;
        }
    }
    
    // ============ 销毁机制 ============
    
    /**
     * @dev 检查代数解锁（直推几个拿几代）
     */
    function _isLevelUnlocked(address user, uint256 level, uint256 directCount) private view returns (bool) {
        // 前2代无条件
        if (level < 2) return true;
        
        // 3-8代: 5%（无需V等级）
        if (level >= 2 && level <= 7) {
            return directReferralCount[user] >= (level + 1); // 需要3-8个直推
        }
        
        // 9-15代: 3%（需要V3+）
        if (level >= 8 && level <= 14) {
            return teamLevel[user] >= 3 && directReferralCount[user] >= (level + 1);
        }
        
        // 16-20代: 2%（需要V4+）
        if (level >= 15 && level <= 19) {
            return teamLevel[user] >= 4 && directReferralCount[user] >= (level + 1);
        }
        
        return false;
    }
    
    /**
     * @dev 计算动态奖金（50%-100%）
     */
    function calculateDynamicBonus(address user, uint256 baseReward) public view returns (uint256) {
        // 动态收益 = 基础奖励 * (50%-100%)
        uint256 dynamicReward = baseReward * dynamicYieldRatio / PRECISION;
        
        // 应用到静态20代
        return dynamicReward;
    }
    
    /**
     * @dev 获取动态显示（前端）
     */
    function getDynamicDisplay(address user) external view returns (string memory) {
        uint256 ratio = dynamicYieldRatio;
        uint256 percentage = ratio / 100;
        
        // 返回格式化的百分比字符串
        return string(abi.encodePacked(
            "Dynamic Yield: ",
            uint2str(percentage),
            "% (", 
            uint2str(ratio),
            "/10000)"
        ));
    }
    
    /**
     * @dev 应用特定销毁（波动/交易/定时/投票）
     */
    function applySpecificBurn(uint256 amount, string memory burnType) external nonReentrant {
        require(msg.sender == multiSigWallet || msg.sender == address(stakingContract), "Unauthorized");
        
        uint256 burnAmount = 0;
        
        if (keccak256(bytes(burnType)) == keccak256(bytes("fluctuation"))) {
            // 波动销毁5%
            burnAmount = amount * variableBurnRate / PRECISION;
        } else if (keccak256(bytes(burnType)) == keccak256(bytes("transaction"))) {
            // 交易销毁1%
            burnAmount = amount * transactionBurnRate / PRECISION;
        } else if (keccak256(bytes(burnType)) == keccak256(bytes("scheduled"))) {
            // 定时销毁1%
            burnAmount = amount * scheduledBurnRate / PRECISION;
        } else if (keccak256(bytes(burnType)) == keccak256(bytes("vote"))) {
            // 投票调整（多签）
            require(msg.sender == multiSigWallet, "Only multisig for vote");
            burnAmount = amount; // 多签决定的数量
        }
        
        // 检查全局封顶
        if (_checkGlobalBurnCap(burnAmount)) {
            _burn(burnAmount, burnType);
        }
    }
    
    /**
     * @dev 检查全局销毁封顶（日产出%）
     */
    function _checkGlobalBurnCap(uint256 amount) private returns (bool) {
        // 新的一天重置
        if (block.timestamp / 1 days > lastBurnDay) {
            todayBurned = 0;
            lastBurnDay = block.timestamp / 1 days;
        }
        
        // 检查是否超过日产出封顶
        if (dailyProductionCap > 0) {
            if (todayBurned + amount > dailyProductionCap) {
                return false;
            }
        }
        
        todayBurned += amount;
        return true;
    }
    
    /**
     * @dev 应用销毁封顶
     */
    function _applyBurnCap(address user, uint256 reward) private view returns (uint256) {
        if (burnCap == 0) return reward;
        
        // 获取用户质押日产出
        (uint256 staked, , , , uint256 rate) = stakingContract.getUserInfo(user);
        uint256 dailyYield = staked * rate / PRECISION;
        uint256 cap = dailyYield * burnCap / PRECISION;
        
        return reward > cap ? cap : reward;
    }
    
    /**
     * @dev 执行销毁
     */
    function _burn(uint256 amount, string memory reason) private {
        if (amount == 0) return;
        
        totalBurned[msg.sender] += amount;
        hcfToken.transfer(address(0xdead), amount);
        
        emit BurnExecuted(msg.sender, amount, reason);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSig) external onlyOwner {
        multiSigWallet = _multiSig;
    }
    
    /**
     * @dev 设置动态收益比例（多签）
     */
    function setDynamicYieldRatio(uint256 ratio) external onlyMultiSig {
        require(ratio >= 5000 && ratio <= 10000, "Must be 50%-100%");
        
        uint256 oldRatio = dynamicYieldRatio;
        dynamicYieldRatio = ratio;
        
        emit DynamicYieldUpdated(oldRatio, ratio);
    }
    
    /**
     * @dev 设置销毁封顶（多签）
     */
    function setBurnCap(uint256 cap) external onlyMultiSig {
        burnCap = cap;
    }
    
    /**
     * @dev 设置销毁率（多签）
     */
    function setBurnRates(
        uint256 _deposit,
        uint256 _static,
        uint256 _team,
        uint256 _variable,
        uint256 _transaction,
        uint256 _scheduled
    ) external onlyMultiSig {
        depositBurnRate = _deposit;
        staticBurnRate = _static;
        teamBurnRate = _team;
        variableBurnRate = _variable;
        transactionBurnRate = _transaction;
        scheduledBurnRate = _scheduled;
    }
    
    /**
     * @dev 设置排名周期（多签）
     */
    function setRankingPeriod(uint256 period) external onlyMultiSig {
        rankingPeriod = period;
    }
    
    /**
     * @dev 定时销毁（多签触发）
     */
    function scheduledBurn(uint256 amount) external onlyMultiSig {
        _burn(amount * scheduledBurnRate / PRECISION, "Scheduled");
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户推荐信息
     */
    function getUserReferralInfo(address user) external view returns (
        address ref,
        uint256 directCount,
        uint256 teamSize,
        uint256 teamLv,
        uint256 smallZone,
        uint256 totalPerf
    ) {
        return (
            referrer[user],
            directReferrals[user].length,
            totalTeamSize[user],
            teamLevel[user],
            smallZonePerformance[user],
            totalPerformance[user]
        );
    }
    
    /**
     * @dev 获取用户奖励信息
     */
    function getUserRewards(address user) external view returns (
        uint256 deposit,
        uint256 static_,
        uint256 team,
        uint256 ranking,
        uint256 burned
    ) {
        return (
            depositRewards[user],
            staticRewards[user],
            teamRewards[user],
            rankingRewards[user],
            totalBurned[user]
        );
    }
    
    /**
     * @dev 获取直推列表
     */
    function getDirectReferrals(address user) external view returns (address[] memory) {
        return directReferrals[user];
    }
    
    /**
     * @dev 计算实际动态收益
     */
    function calculateActualDynamicYield(uint256 baseAmount) external view returns (uint256) {
        return baseAmount * dynamicYieldRatio / PRECISION;
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
    
    // ============ 辅助函数 ============
    
    /**
     * @dev uint转字符串
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}