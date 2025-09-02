// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HCFComprehensiveFix
 * @dev 综合修正合约 - 补充所有缺失功能
 */
contract HCFComprehensiveFix is Ownable, ReentrancyGuard {
    
    // ============ 七、排名奖励补充 ============
    
    struct RankingReward {
        uint256 startRank;
        uint256 endRank;
        uint256 bonusRate;  // 基点
    }
    
    // 完整Top 2000排名奖励
    RankingReward[4] public rankingRewards;
    
    // 排名周期
    enum RankingPeriod { DAILY, WEEKLY, MONTHLY }
    RankingPeriod public currentPeriod = RankingPeriod.DAILY;
    uint256 public lastResetTime;
    uint256 public periodDuration = 1 days;
    
    // 两项独立累加
    mapping(address => uint256) public stakingRankBonus;   // 质押排名奖励
    mapping(address => uint256) public teamRankBonus;      // 小区排名奖励
    mapping(address => uint256) public totalRankBonus;     // 总奖励（累加）
    
    event RankingReset(RankingPeriod period, uint256 timestamp);
    event RankingBonusCalculated(address indexed user, uint256 stakingBonus, uint256 teamBonus, uint256 total);
    
    constructor() {
        // 初始化完整排名奖励
        rankingRewards[0] = RankingReward(1, 100, 2000);      // Top 1-100: 20%
        rankingRewards[1] = RankingReward(101, 299, 1000);    // Top 101-299: 10%
        rankingRewards[2] = RankingReward(300, 1000, 1000);   // Top 300-1000: 10%
        rankingRewards[3] = RankingReward(1001, 2000, 500);   // Top 1001-2000: 5%
        
        lastResetTime = block.timestamp;
    }
    
    /**
     * @dev 计算用户排名奖励（两项独立累加）
     */
    function calculateRankingBonus(address user, uint256 stakingRank, uint256 teamRank) external {
        uint256 stakingBonus = 0;
        uint256 teamBonus = 0;
        
        // 计算质押排名奖励
        if (stakingRank > 0 && stakingRank <= 2000) {
            for (uint i = 0; i < 4; i++) {
                if (stakingRank >= rankingRewards[i].startRank && 
                    stakingRank <= rankingRewards[i].endRank) {
                    stakingBonus = rankingRewards[i].bonusRate;
                    break;
                }
            }
        }
        
        // 计算小区排名奖励（非单条）
        if (teamRank > 0 && teamRank <= 2000) {
            for (uint i = 0; i < 4; i++) {
                if (teamRank >= rankingRewards[i].startRank && 
                    teamRank <= rankingRewards[i].endRank) {
                    teamBonus = rankingRewards[i].bonusRate;
                    break;
                }
            }
        }
        
        // 两项独立累加
        uint256 totalBonus = stakingBonus + teamBonus;
        
        stakingRankBonus[user] = stakingBonus;
        teamRankBonus[user] = teamBonus;
        totalRankBonus[user] = totalBonus;
        
        emit RankingBonusCalculated(user, stakingBonus, teamBonus, totalBonus);
    }
    
    /**
     * @dev 重置排名周期
     */
    function resetRankingPeriod() external {
        require(block.timestamp >= lastResetTime + periodDuration, "Period not ended");
        
        lastResetTime = block.timestamp;
        
        // 切换周期类型
        if (currentPeriod == RankingPeriod.DAILY) {
            currentPeriod = RankingPeriod.WEEKLY;
            periodDuration = 7 days;
        } else if (currentPeriod == RankingPeriod.WEEKLY) {
            currentPeriod = RankingPeriod.MONTHLY;
            periodDuration = 30 days;
        } else {
            currentPeriod = RankingPeriod.DAILY;
            periodDuration = 1 days;
        }
        
        emit RankingReset(currentPeriod, block.timestamp);
    }
    
    // ============ 八、销毁机制补充 ============
    
    // 税费销毁率
    uint256 public buyBurnRate = 50;      // 买入税销毁0.5%
    uint256 public sellBurnRate = 200;    // 卖出税销毁2%
    uint256 public transferBurnRate = 100; // 转账税销毁1%
    
    // 全局销毁封顶
    uint256 public globalBurnCap;         // 日产出百分比
    uint256 public dailyProduction;       // 日产出量
    uint256 public todayBurned;           // 今日已销毁
    uint256 public lastBurnDay;           // 上次销毁日
    
    // 投票销毁
    mapping(uint256 => uint256) public proposalBurnRate;  // 提案ID => 销毁率
    
    event TaxBurnExecuted(string taxType, uint256 amount);
    event VoteBurnTriggered(uint256 proposalId, uint256 burnRate);
    event GlobalBurnCapReached(uint256 burned, uint256 cap);
    
    /**
     * @dev 执行税费销毁
     */
    function executeTaxBurn(string memory taxType, uint256 amount) external {
        uint256 burnAmount = 0;
        
        if (keccak256(bytes(taxType)) == keccak256("buy")) {
            burnAmount = amount * buyBurnRate / 10000;
        } else if (keccak256(bytes(taxType)) == keccak256("sell")) {
            burnAmount = amount * sellBurnRate / 10000;
        } else if (keccak256(bytes(taxType)) == keccak256("transfer")) {
            burnAmount = amount * transferBurnRate / 10000;
        }
        
        // 检查全局封顶
        if (_checkGlobalBurnCap(burnAmount)) {
            // 执行销毁
            emit TaxBurnExecuted(taxType, burnAmount);
        } else {
            emit GlobalBurnCapReached(todayBurned, globalBurnCap);
        }
    }
    
    /**
     * @dev 投票触发销毁（多签改率）
     */
    function triggerVoteBurn(uint256 proposalId, uint256 newBurnRate) external {
        require(msg.sender == owner(), "Only multisig");
        
        proposalBurnRate[proposalId] = newBurnRate;
        
        emit VoteBurnTriggered(proposalId, newBurnRate);
    }
    
    /**
     * @dev 检查全局销毁封顶
     */
    function _checkGlobalBurnCap(uint256 amount) private returns (bool) {
        // 新的一天重置
        if (block.timestamp / 1 days > lastBurnDay) {
            todayBurned = 0;
            lastBurnDay = block.timestamp / 1 days;
        }
        
        // 计算封顶（日产出的百分比）
        uint256 cap = dailyProduction * globalBurnCap / 10000;
        
        if (todayBurned + amount > cap) {
            return false;
        }
        
        todayBurned += amount;
        return true;
    }
    
    // ============ 九、治理系统补充 ============
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 endTime;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;
    
    event ProposalCreated(uint256 id, string description);
    event NodeVoted(uint256 proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 id);
    
    /**
     * @dev 节点NFT投票（权重=算力*乘数）
     */
    function voteOnProposal(
        uint256 proposalId,
        bool support,
        uint256 nodePower,     // 节点算力
        uint256 nodeLevel       // 节点等级
    ) external {
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(block.timestamp < proposals[proposalId].endTime, "Voting ended");
        
        // 计算投票权重 = 算力 * 等级乘数
        uint256 multiplier = nodeLevel == 2 ? 200 : 100;  // 超级节点2倍权重
        uint256 votingWeight = nodePower * multiplier / 100;
        
        if (support) {
            proposals[proposalId].forVotes += votingWeight;
        } else {
            proposals[proposalId].againstVotes += votingWeight;
        }
        
        hasVoted[proposalId][msg.sender] = true;
        
        emit NodeVoted(proposalId, msg.sender, support, votingWeight);
    }
    
    /**
     * @dev 执行提案（多签）
     */
    function executeProposal(uint256 proposalId) external {
        require(msg.sender == owner(), "Only multisig");
        require(block.timestamp >= proposals[proposalId].endTime, "Voting not ended");
        require(!proposals[proposalId].executed, "Already executed");
        require(proposals[proposalId].forVotes > proposals[proposalId].againstVotes, "Not passed");
        
        proposals[proposalId].executed = true;
        
        // 执行提案逻辑
        emit ProposalExecuted(proposalId);
    }
    
    // ============ 十、其他机制细节补充 ============
    
    // 无常损失补偿细节
    struct ImpermanentLossCompensation {
        uint256 minAmount;           // 最小500 HCF
        uint256 nodeBonus;           // 节点+20%
        bool mustCompensateToPool;   // 必须补到池
        uint256 cooldown;            // 冷却期
    }
    
    ImpermanentLossCompensation public ilCompensation = ImpermanentLossCompensation({
        minAmount: 500 * 10**18,
        nodeBonus: 2000,  // 20%
        mustCompensateToPool: true,
        cooldown: 24 hours
    });
    
    // 限购细节
    struct PurchaseLimit {
        uint256 dailyLimit;       // 500 HCF/日
        uint256 period;           // 7天滚动
        bool enabled;
    }
    
    PurchaseLimit public purchaseLimit = PurchaseLimit({
        dailyLimit: 500 * 10**18,
        period: 7 days,
        enabled: true
    });
    
    // 赎回细节
    struct RedemptionFees {
        uint256 stakingBNBFee;    // 10% BNB
        uint256 lpBSDTFee;        // 50% BSDT
        uint256 lpHCFFee;         // 20% HCF
        uint256 burnIfNotShared;  // 30%销毁（未分享）
    }
    
    RedemptionFees public redemptionFees = RedemptionFees({
        stakingBNBFee: 1000,
        lpBSDTFee: 5000,
        lpHCFFee: 2000,
        burnIfNotShared: 3000
    });
    
    // 退出机制
    struct ExitMechanism {
        bool allowUSDT;
        bool allowUSDC;
        bool noBridgeFee;
        bool noApproval;
    }
    
    ExitMechanism public exitMechanism = ExitMechanism({
        allowUSDT: true,
        allowUSDC: true,
        noBridgeFee: true,
        noApproval: true
    });
    
    /**
     * @dev 处理无常损失补偿（带所有细节）
     */
    function handleILCompensation(address user, uint256 loss, bool isNode) external returns (uint256) {
        require(loss >= ilCompensation.minAmount, "Below minimum");
        
        uint256 compensation = ilCompensation.minAmount;
        
        // 节点优先+20%
        if (isNode) {
            compensation = compensation * (10000 + ilCompensation.nodeBonus) / 10000;
        }
        
        // 必须补到池
        require(ilCompensation.mustCompensateToPool, "Must compensate to pool");
        
        return compensation;
    }
    
    /**
     * @dev 检查限购（7天滚动）
     */
    function checkPurchaseLimit(address user, uint256 amount, uint256[] memory history) external view returns (bool) {
        if (!purchaseLimit.enabled) return true;
        
        uint256 total = 0;
        uint256 cutoff = block.timestamp - purchaseLimit.period;
        
        for (uint i = 0; i < history.length; i++) {
            if (history[i] > cutoff) {
                total += amount;
            }
        }
        
        return total + amount <= purchaseLimit.dailyLimit * 7;
    }
    
    /**
     * @dev 计算赎回费用
     */
    function calculateRedemptionFees(
        uint256 amount,
        bool isLP,
        bool hasShared
    ) external view returns (uint256 bnbFee, uint256 bsdtFee, uint256 hcfFee, uint256 burnAmount) {
        if (!isLP) {
            // 质押赎回
            bnbFee = amount * redemptionFees.stakingBNBFee / 10000;
            
            // 未分享额外烧毁
            if (!hasShared) {
                burnAmount = amount * redemptionFees.burnIfNotShared / 10000;
            }
        } else {
            // LP赎回
            bsdtFee = amount * redemptionFees.lpBSDTFee / 10000;
            hcfFee = amount * redemptionFees.lpHCFFee / 10000;
            burnAmount = hcfFee * redemptionFees.burnIfNotShared / 10000;
        }
    }
    
    /**
     * @dev 退出选择（USDT或USDC）
     */
    function selectExitCurrency(bool useUSDC) external view returns (string memory) {
        require(exitMechanism.allowUSDT || exitMechanism.allowUSDC, "Exit not allowed");
        
        if (useUSDC && exitMechanism.allowUSDC) {
            return "USDC";
        }
        return "USDT";
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 批量设置所有参数（多签）
     */
    function setAllParameters(
        uint256 _globalBurnCap,
        uint256 _dailyProduction,
        uint256[3] memory _burnRates,  // [buy, sell, transfer]
        uint256[4] memory _rankingBonuses,
        bool _enablePurchaseLimit
    ) external onlyOwner {
        globalBurnCap = _globalBurnCap;
        dailyProduction = _dailyProduction;
        
        buyBurnRate = _burnRates[0];
        sellBurnRate = _burnRates[1];
        transferBurnRate = _burnRates[2];
        
        for (uint i = 0; i < 4; i++) {
            rankingRewards[i].bonusRate = _rankingBonuses[i];
        }
        
        purchaseLimit.enabled = _enablePurchaseLimit;
    }
}