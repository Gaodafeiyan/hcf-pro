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
}

interface IHCFStaking {
    function getUserStakingInfo(address user) external view returns (uint256 amount, uint256 dailyReward);
    function getStaticOutput(address user) external view returns (uint256);
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
}

/**
 * @title HCFRanking
 * @dev 排名奖励机制合约
 * 实现质押排名和小区排名，Top2000额外奖励，周期重设
 */
contract HCFRanking is Ownable, ReentrancyGuard {
    
    // ============ 枚举 ============
    enum Cycle { DAY, WEEK, MONTH }
    enum RankType { STAKING, COMMUNITY }
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_TOP_RANKS = 2000;
    uint256 public constant TOP_100 = 100;
    uint256 public constant TOP_299 = 299;
    
    // ============ 结构体 ============
    struct RankingConfig {
        uint256 top100Bonus;       // 1-100名: 20%
        uint256 top299Bonus;       // 101-299名: 10%
        uint256 updateInterval;    // 更新间隔
        Cycle currentCycle;        // 当前周期
        bool enabled;              // 是否启用
    }
    
    struct UserRankData {
        uint256 stakingRank;           // 质押排名
        uint256 communityRank;         // 小区排名
        uint256 staticOutput;          // 个人静态产出
        uint256 communityOutput;       // 小区产出
        uint256 stakingBonus;          // 质押排名奖励
        uint256 communityBonus;        // 小区排名奖励
        uint256 lastUpdateTime;        // 最后更新时间
        bool hasValidCommunity;        // 是否有有效小区
    }
    
    struct RankEntry {
        address user;
        uint256 value;
    }
    
    // ============ 状态变量 ============
    
    // 配置
    RankingConfig public rankingConfig;
    
    // 用户排名数据
    mapping(address => UserRankData) public userRankData;
    
    // 排名列表
    RankEntry[] public stakingRankList;    // 质押排名列表
    RankEntry[] public communityRankList;  // 小区排名列表
    
    // 周期管理
    uint256 public currentCycleNumber;
    uint256 public lastUpdateTime;
    uint256 public cycleStartTime;
    
    // 合约地址
    address public multiSigWallet;
    IHCFToken public hcfToken;
    IHCFStaking public stakingContract;
    IHCFReferral public referralContract;
    
    // 授权合约
    mapping(address => bool) public authorizedContracts;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event RankingUpdated(uint256 rankType, uint256 timestamp);
    event BonusDistributed(address indexed user, uint256 amount, uint256 rankType);
    event CycleReset(uint256 cycleNumber);
    event ConfigUpdated(RankingConfig config);
    event EmergencyPauseSet(bool status);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedContracts[msg.sender] || 
            msg.sender == owner() || 
            msg.sender == multiSigWallet,
            "Not authorized"
        );
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier updateAllowed() {
        require(block.timestamp >= lastUpdateTime + rankingConfig.updateInterval, "Update interval not met");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _multiSigWallet
    ) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        multiSigWallet = _multiSigWallet;
        
        // 初始化配置
        rankingConfig = RankingConfig({
            top100Bonus: 2000,         // 20%
            top299Bonus: 1000,         // 10%
            updateInterval: 1 days,    // 默认每日
            currentCycle: Cycle.DAY,   // 默认日周期
            enabled: true
        });
        
        cycleStartTime = block.timestamp;
        lastUpdateTime = block.timestamp;
    }
    
    // ============ 排名更新功能 ============
    
    /**
     * @dev 更新排名（质押和小区）
     */
    function updateRanking() 
        external 
        onlyAuthorized 
        notPaused 
        updateAllowed 
    {
        require(rankingConfig.enabled, "Ranking disabled");
        
        // 更新质押排名
        _updateStakingRanking();
        
        // 更新小区排名
        _updateCommunityRanking();
        
        lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev 更新质押排名（基于个人静态产出）
     */
    function _updateStakingRanking() internal {
        // 清空旧排名
        delete stakingRankList;
        
        // 这里需要获取所有用户的静态产出并排序
        // 实际实现中可能需要链下索引或限制用户数量
        // 示例：假设有一个用户列表
        
        emit RankingUpdated(uint256(RankType.STAKING), block.timestamp);
    }
    
    /**
     * @dev 更新小区排名（基于团队业绩）
     */
    function _updateCommunityRanking() internal {
        // 清空旧排名
        delete communityRankList;
        
        // 获取有效小区用户并排序
        // 实际实现中需要遍历或维护活跃用户列表
        
        emit RankingUpdated(uint256(RankType.COMMUNITY), block.timestamp);
    }
    
    /**
     * @dev 更新用户排名数据
     */
    function updateUserRankData(
        address user,
        uint256 stakingRank,
        uint256 communityRank,
        uint256 staticOutput,
        uint256 communityOutput
    ) 
        external 
        onlyAuthorized 
        notPaused 
    {
        UserRankData storage data = userRankData[user];
        
        // 更新排名
        data.stakingRank = stakingRank;
        data.staticOutput = staticOutput;
        
        // 检查是否有有效小区（业绩>0且非单条线）
        bool hasValidCommunity = _checkValidCommunity(user);
        
        if (hasValidCommunity && communityOutput > 0) {
            data.communityRank = communityRank;
            data.communityOutput = communityOutput;
            data.hasValidCommunity = true;
        } else {
            data.communityRank = 0;
            data.communityOutput = 0;
            data.hasValidCommunity = false;
        }
        
        // 计算奖励
        data.stakingBonus = _calculateBonus(stakingRank, staticOutput);
        data.communityBonus = hasValidCommunity ? 
            _calculateBonus(communityRank, communityOutput) : 0;
        
        data.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev 批量更新用户排名
     */
    function batchUpdateUserRanks(
        address[] memory users,
        uint256[] memory stakingRanks,
        uint256[] memory communityRanks,
        uint256[] memory staticOutputs,
        uint256[] memory communityOutputs
    ) 
        external 
        onlyAuthorized 
        notPaused 
    {
        require(users.length == stakingRanks.length, "Length mismatch");
        require(users.length == communityRanks.length, "Length mismatch");
        require(users.length == staticOutputs.length, "Length mismatch");
        require(users.length == communityOutputs.length, "Length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            UserRankData storage data = userRankData[users[i]];
            
            data.stakingRank = stakingRanks[i];
            data.staticOutput = staticOutputs[i];
            
            bool hasValidCommunity = _checkValidCommunity(users[i]);
            
            if (hasValidCommunity && communityOutputs[i] > 0) {
                data.communityRank = communityRanks[i];
                data.communityOutput = communityOutputs[i];
                data.hasValidCommunity = true;
            } else {
                data.communityRank = 0;
                data.communityOutput = 0;
                data.hasValidCommunity = false;
            }
            
            data.stakingBonus = _calculateBonus(stakingRanks[i], staticOutputs[i]);
            data.communityBonus = hasValidCommunity ? 
                _calculateBonus(communityRanks[i], communityOutputs[i]) : 0;
            
            data.lastUpdateTime = block.timestamp;
        }
    }
    
    // ============ 奖励分发功能 ============
    
    /**
     * @dev 分发奖励
     */
    function distributeBonus(address user) 
        external 
        notPaused 
        nonReentrant 
    {
        UserRankData storage data = userRankData[user];
        require(data.lastUpdateTime > 0, "No rank data");
        
        uint256 totalBonus = 0;
        
        // 质押排名奖励
        if (data.stakingBonus > 0) {
            totalBonus += data.stakingBonus;
            emit BonusDistributed(user, data.stakingBonus, uint256(RankType.STAKING));
            data.stakingBonus = 0;
        }
        
        // 小区排名奖励
        if (data.communityBonus > 0) {
            totalBonus += data.communityBonus;
            emit BonusDistributed(user, data.communityBonus, uint256(RankType.COMMUNITY));
            data.communityBonus = 0;
        }
        
        if (totalBonus > 0) {
            require(hcfToken.transfer(user, totalBonus), "Transfer failed");
        }
    }
    
    /**
     * @dev 批量分发奖励
     */
    function batchDistributeBonus(address[] memory users) 
        external 
        notPaused 
        nonReentrant 
    {
        for (uint256 i = 0; i < users.length; i++) {
            UserRankData storage data = userRankData[users[i]];
            
            if (data.lastUpdateTime == 0) continue;
            
            uint256 totalBonus = data.stakingBonus + data.communityBonus;
            
            if (totalBonus > 0) {
                require(hcfToken.transfer(users[i], totalBonus), "Transfer failed");
                
                if (data.stakingBonus > 0) {
                    emit BonusDistributed(users[i], data.stakingBonus, uint256(RankType.STAKING));
                    data.stakingBonus = 0;
                }
                
                if (data.communityBonus > 0) {
                    emit BonusDistributed(users[i], data.communityBonus, uint256(RankType.COMMUNITY));
                    data.communityBonus = 0;
                }
            }
        }
    }
    
    // ============ 周期管理 ============
    
    /**
     * @dev 重置周期（仅多签）
     */
    function resetCycle() external onlyMultiSig notPaused {
        // 清空排名列表
        delete stakingRankList;
        delete communityRankList;
        
        // 增加周期号
        currentCycleNumber++;
        cycleStartTime = block.timestamp;
        lastUpdateTime = block.timestamp;
        
        emit CycleReset(currentCycleNumber);
    }
    
    /**
     * @dev 设置周期间隔（仅多签）
     */
    function setCycleInterval(Cycle newCycle) external onlyMultiSig {
        rankingConfig.currentCycle = newCycle;
        
        if (newCycle == Cycle.DAY) {
            rankingConfig.updateInterval = 1 days;
        } else if (newCycle == Cycle.WEEK) {
            rankingConfig.updateInterval = 7 days;
        } else if (newCycle == Cycle.MONTH) {
            rankingConfig.updateInterval = 30 days;
        }
        
        emit ConfigUpdated(rankingConfig);
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 计算奖励
     */
    function _calculateBonus(uint256 rank, uint256 baseAmount) internal view returns (uint256) {
        if (!rankingConfig.enabled || rank == 0 || rank > MAX_TOP_RANKS) {
            return 0;
        }
        
        uint256 bonusRate = 0;
        
        if (rank <= TOP_100) {
            bonusRate = rankingConfig.top100Bonus; // 20%
        } else if (rank <= TOP_299) {
            bonusRate = rankingConfig.top299Bonus; // 10%
        } else {
            return 0; // 300名以外无奖励
        }
        
        // 额外代币 = 静态产出 * 加成%
        return (baseAmount * bonusRate) / BASIS_POINTS;
    }
    
    /**
     * @dev 检查是否有有效小区
     */
    function _checkValidCommunity(address user) internal view returns (bool) {
        if (address(referralContract) == address(0)) return false;
        
        (
            ,
            uint256 directCount,
            ,
            ,
            uint256 teamVolume,
            ,
            ,
            ,
            ,
        ) = referralContract.getUserData(user);
        
        // 有效小区：业绩>0且非单条线（至少2个直推）
        return teamVolume > 0 && directCount >= 2;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置排名配置（仅多签）
     */
    function setRankingConfig(
        uint256 top100Bonus,
        uint256 top299Bonus,
        uint256 updateInterval,
        bool enabled
    ) external onlyMultiSig {
        require(top100Bonus <= 5000, "Top100 bonus too high");  // 最多50%
        require(top299Bonus <= 3000, "Top299 bonus too high");  // 最多30%
        require(updateInterval >= 1 hours, "Interval too short");
        
        rankingConfig.top100Bonus = top100Bonus;
        rankingConfig.top299Bonus = top299Bonus;
        rankingConfig.updateInterval = updateInterval;
        rankingConfig.enabled = enabled;
        
        emit ConfigUpdated(rankingConfig);
    }
    
    /**
     * @dev 设置奖励率（仅多签）
     */
    function setBonusRates(uint256 top100Rate, uint256 top299Rate) external onlyMultiSig {
        require(top100Rate <= 5000, "Top100 rate too high");
        require(top299Rate <= 3000, "Top299 rate too high");
        
        rankingConfig.top100Bonus = top100Rate;
        rankingConfig.top299Bonus = top299Rate;
        
        emit ConfigUpdated(rankingConfig);
    }
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _staking,
        address _referral
    ) external onlyOwner {
        if (_staking != address(0)) stakingContract = IHCFStaking(_staking);
        if (_referral != address(0)) referralContract = IHCFReferral(_referral);
    }
    
    /**
     * @dev 设置授权合约
     */
    function setAuthorizedContract(address contract_, bool authorized) external onlyOwner {
        authorizedContracts[contract_] = authorized;
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function setEmergencyPause(bool pause) external onlyMultiSig {
        emergencyPaused = pause;
        emit EmergencyPauseSet(pause);
    }
    
    /**
     * @dev 手动添加排名条目
     */
    function addRankEntry(
        bool isStaking,
        address user,
        uint256 value
    ) external onlyAuthorized {
        RankEntry memory entry = RankEntry({
            user: user,
            value: value
        });
        
        if (isStaking) {
            stakingRankList.push(entry);
        } else {
            communityRankList.push(entry);
        }
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户排名数据
     */
    function getUserRankData(address user) external view returns (
        uint256 stakingRank,
        uint256 communityRank,
        uint256 staticOutput,
        uint256 communityOutput,
        uint256 stakingBonus,
        uint256 communityBonus,
        bool hasValidCommunity
    ) {
        UserRankData memory data = userRankData[user];
        return (
            data.stakingRank,
            data.communityRank,
            data.staticOutput,
            data.communityOutput,
            data.stakingBonus,
            data.communityBonus,
            data.hasValidCommunity
        );
    }
    
    /**
     * @dev 获取Top排名
     */
    function getTopRanks(bool isStaking, uint256 count) external view returns (
        address[] memory users,
        uint256[] memory values
    ) {
        RankEntry[] storage rankList = isStaking ? stakingRankList : communityRankList;
        
        uint256 length = rankList.length < count ? rankList.length : count;
        users = new address[](length);
        values = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            users[i] = rankList[i].user;
            values[i] = rankList[i].value;
        }
        
        return (users, values);
    }
    
    /**
     * @dev 获取当前周期信息
     */
    function getCycleInfo() external view returns (
        uint256 cycleNumber,
        uint256 startTime,
        uint256 nextUpdateTime,
        Cycle currentCycle
    ) {
        return (
            currentCycleNumber,
            cycleStartTime,
            lastUpdateTime + rankingConfig.updateInterval,
            rankingConfig.currentCycle
        );
    }
    
    /**
     * @dev 获取配置
     */
    function getConfig() external view returns (RankingConfig memory) {
        return rankingConfig;
    }
    
    /**
     * @dev 获取排名列表长度
     */
    function getRankListLength(bool isStaking) external view returns (uint256) {
        return isStaking ? stakingRankList.length : communityRankList.length;
    }
}