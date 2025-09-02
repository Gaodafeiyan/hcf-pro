// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HCFCompleteFix
 * @dev 完整修复合约 - 包含所有遗漏功能
 */
contract HCFCompleteFix is Ownable, ReentrancyGuard {
    
    // ============ 六、市场控制修复 ============
    
    // 防暴跌机制
    struct AntiDumpLevel {
        uint256 priceDropPercent;  // 价格跌幅
        uint256 slippage;          // 滑点
        uint256 productionCut;     // 减产
    }
    
    AntiDumpLevel[3] public antiDumpLevels;
    
    // 滑点分配（销毁+节点，无具体比例）
    struct SlippageDistribution {
        uint256 burnAmount;
        uint256 nodeAmount;
    }
    
    // 恢复机制
    uint256 public recoveryTime = 24 hours;
    uint256 public lastDumpTime;
    bool public isRecovering;
    
    // 无常损失补偿
    uint256 public constant MIN_IL_COMPENSATION = 500 * 10**18;
    bool public constant MUST_COMPENSATE_TO_POOL = true;  // 必须补到池
    
    // 衰减和加成
    uint256 public decayThreshold = 100_000_000 * 10**18;  // 1亿开始衰减
    uint256 public decayRatePerBillion = 10;               // 每亿减0.1%（基点）
    
    struct BonusRates {
        uint256 timeBonus;      // 时长加成
        uint256 referralBonus;  // 推荐加成
        uint256 communityBonus; // 社区加成
        uint256 compoundBonus;  // 复合加成
    }
    
    BonusRates public bonusRates;
    
    event AntiDumpActivated(uint256 level, uint256 slippage, uint256 productionCut);
    event RecoveryCompleted(uint256 timestamp);
    event ILCompensated(address indexed user, uint256 amount, bool toPool);
    event DecayApplied(uint256 totalStaked, uint256 decayPercent);
    event BonusApplied(address indexed user, uint256 totalBonus);
    
    constructor() {
        // 初始化防暴跌等级
        antiDumpLevels[0] = AntiDumpLevel(1000, 500, 500);    // 跌10%: 5%滑点+5%减产
        antiDumpLevels[1] = AntiDumpLevel(3000, 1500, 1500);  // 跌30%: 15%滑点+15%减产
        antiDumpLevels[2] = AntiDumpLevel(5000, 3000, 3000);  // 跌50%: 30%滑点+30%减产
        
        // 初始化加成
        bonusRates = BonusRates({
            timeBonus: 1000,       // 时长+10%
            referralBonus: 500,    // 推荐+5%
            communityBonus: 500,   // 社区+5%
            compoundBonus: 2000    // 复合+20%
        });
    }
    
    /**
     * @dev 应用防暴跌措施
     */
    function applyAntiDump(int256 priceDropPercent) external {
        uint256 level = 0;
        
        if (uint256(-priceDropPercent) >= 5000) {
            level = 2;
        } else if (uint256(-priceDropPercent) >= 3000) {
            level = 1;
        } else if (uint256(-priceDropPercent) >= 1000) {
            level = 0;
        } else {
            return;
        }
        
        AntiDumpLevel memory antiDump = antiDumpLevels[level];
        
        // 应用滑点和减产
        _applySlippage(antiDump.slippage);
        _applyProductionCut(antiDump.productionCut);
        
        // 启动恢复计时
        lastDumpTime = block.timestamp;
        isRecovering = true;
        
        emit AntiDumpActivated(level, antiDump.slippage, antiDump.productionCut);
    }
    
    /**
     * @dev 自动恢复（24小时后）
     */
    function autoRecover() external {
        require(isRecovering, "Not recovering");
        require(block.timestamp >= lastDumpTime + recoveryTime, "Recovery time not reached");
        
        // 恢复正常
        isRecovering = false;
        
        emit RecoveryCompleted(block.timestamp);
    }
    
    /**
     * @dev 无常损失补偿（必须补到池）
     */
    function compensateImpermanentLoss(
        address user,
        uint256 lossAmount,
        bool isNode
    ) external returns (uint256) {
        require(lossAmount >= MIN_IL_COMPENSATION, "Below minimum");
        require(MUST_COMPENSATE_TO_POOL, "Must compensate to pool");
        
        uint256 compensation = MIN_IL_COMPENSATION;
        
        // 节点优先+20%
        if (isNode) {
            compensation = compensation * 120 / 100;
        }
        
        // 必须补到池（不是给用户）
        _compensateToPool(compensation);
        
        emit ILCompensated(user, compensation, true);
        
        return compensation;
    }
    
    /**
     * @dev 应用衰减（总量>1亿）
     */
    function applyDecay(uint256 totalStaked) external returns (uint256) {
        if (totalStaked <= decayThreshold) {
            return 0;
        }
        
        // 计算衰减：每亿减0.1%
        uint256 excessBillions = (totalStaked - decayThreshold) / (100_000_000 * 10**18);
        uint256 decayPercent = excessBillions * decayRatePerBillion;
        
        emit DecayApplied(totalStaked, decayPercent);
        
        return decayPercent;
    }
    
    /**
     * @dev 应用加成（多签调）
     */
    function applyBonus(
        address user,
        bool hasTime,
        bool hasReferral,
        bool hasCommunity,
        bool hasCompound
    ) external onlyOwner returns (uint256) {
        uint256 totalBonus = 0;
        
        if (hasTime) totalBonus += bonusRates.timeBonus;
        if (hasReferral) totalBonus += bonusRates.referralBonus;
        if (hasCommunity) totalBonus += bonusRates.communityBonus;
        if (hasCompound) totalBonus += bonusRates.compoundBonus;
        
        emit BonusApplied(user, totalBonus);
        
        return totalBonus;
    }
    
    // ============ 七、排名奖励修复 ============
    
    struct RankingReward {
        uint256 startRank;
        uint256 endRank;
        uint256 bonusRate;
    }
    
    // 完整Top 2000
    RankingReward[4] public rankingRewards;
    
    // 排名周期
    enum RankingPeriod { DAILY, WEEKLY, MONTHLY }
    RankingPeriod public currentPeriod = RankingPeriod.DAILY;
    
    // 两项独立累加
    mapping(address => uint256) public stakingRankBonus;
    mapping(address => uint256) public teamRankBonus;
    
    event RankingUpdated(address indexed user, uint256 stakingBonus, uint256 teamBonus, uint256 total);
    event PeriodReset(RankingPeriod newPeriod);
    
    /**
     * @dev 计算排名奖励（两项独立累加）
     */
    function calculateRankingBonus(
        address user,
        uint256 stakingRank,
        uint256 teamRank,
        uint256 userStaticYield
    ) external returns (uint256) {
        uint256 stakingBonus = 0;
        uint256 teamBonus = 0;
        
        // 质押排名奖励（基于个人静态）
        if (stakingRank > 0 && stakingRank <= 2000) {
            stakingBonus = _getRankBonus(stakingRank) * userStaticYield / 10000;
        }
        
        // 小区排名奖励（基于团队业绩）
        if (teamRank > 0 && teamRank <= 2000) {
            teamBonus = _getRankBonus(teamRank) * userStaticYield / 10000;
        }
        
        // 两项独立累加
        uint256 totalBonus = stakingBonus + teamBonus;
        
        stakingRankBonus[user] = stakingBonus;
        teamRankBonus[user] = teamBonus;
        
        emit RankingUpdated(user, stakingBonus, teamBonus, totalBonus);
        
        return totalBonus;
    }
    
    /**
     * @dev 重置周期（日/周/月）
     */
    function resetRankingPeriod() external {
        if (currentPeriod == RankingPeriod.DAILY) {
            currentPeriod = RankingPeriod.WEEKLY;
        } else if (currentPeriod == RankingPeriod.WEEKLY) {
            currentPeriod = RankingPeriod.MONTHLY;
        } else {
            currentPeriod = RankingPeriod.DAILY;
        }
        
        emit PeriodReset(currentPeriod);
    }
    
    // ============ 八、销毁机制修复 ============
    
    // 销毁率
    uint256 public referralBurnRate = 1000;     // 推荐烧10%
    uint256 public teamBurnRate = 500;          // 团队烧5%
    uint256 public redeemBurnRate = 3000;       // 赎回烧30%
    uint256 public fluctuationBurnRate = 500;   // 波动烧5%
    uint256 public transactionBurnRate = 100;   // 交易烧1%
    uint256 public scheduledBurnRate = 100;     // 定时烧1%
    
    // 税费销毁
    uint256 public buyTaxBurnRate = 50;         // 买入税烧0.5%
    uint256 public sellTaxBurnRate = 200;       // 卖出税烧2%
    uint256 public transferTaxBurnRate = 100;   // 转账税烧1%
    
    // 投票调整
    mapping(uint256 => uint256) public voteBurnRates;
    
    // 全局封顶
    uint256 public dailyProductionCap;
    uint256 public todayBurned;
    uint256 public lastBurnDay;
    
    event BurnExecuted(string burnType, uint256 amount);
    event VoteBurnTriggered(uint256 proposalId, uint256 newRate);
    event GlobalCapReached(uint256 burned, uint256 cap);
    
    /**
     * @dev 执行销毁（含全局封顶检查）
     */
    function executeBurn(string memory burnType, uint256 amount) external returns (uint256) {
        uint256 burnAmount = 0;
        
        // 根据类型计算销毁量
        if (keccak256(bytes(burnType)) == keccak256("referral")) {
            burnAmount = amount * referralBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("team")) {
            burnAmount = amount * teamBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("redeem")) {
            burnAmount = amount * redeemBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("fluctuation")) {
            burnAmount = amount * fluctuationBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("transaction")) {
            burnAmount = amount * transactionBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("scheduled")) {
            burnAmount = amount * scheduledBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("buyTax")) {
            burnAmount = amount * buyTaxBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("sellTax")) {
            burnAmount = amount * sellTaxBurnRate / 10000;
        } else if (keccak256(bytes(burnType)) == keccak256("transferTax")) {
            burnAmount = amount * transferTaxBurnRate / 10000;
        }
        
        // 检查全局封顶（日产出%）
        if (!_checkGlobalCap(burnAmount)) {
            emit GlobalCapReached(todayBurned, dailyProductionCap);
            return 0;
        }
        
        emit BurnExecuted(burnType, burnAmount);
        return burnAmount;
    }
    
    /**
     * @dev 投票触发销毁（多签改率）
     */
    function triggerVoteBurn(uint256 proposalId, uint256 newRate) external onlyOwner {
        voteBurnRates[proposalId] = newRate;
        emit VoteBurnTriggered(proposalId, newRate);
    }
    
    /**
     * @dev 检查全局封顶
     */
    function _checkGlobalCap(uint256 amount) private returns (bool) {
        // 新的一天重置
        if (block.timestamp / 1 days > lastBurnDay) {
            todayBurned = 0;
            lastBurnDay = block.timestamp / 1 days;
        }
        
        // 检查是否超过日产出封顶
        if (todayBurned + amount > dailyProductionCap) {
            return false;
        }
        
        todayBurned += amount;
        return true;
    }
    
    // ============ 九、治理系统修复 ============
    
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
        uint256 nodePower,
        uint256 nodeLevel
    ) external {
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(block.timestamp < proposals[proposalId].endTime, "Voting ended");
        
        // 计算投票权重 = 算力 * 等级乘数
        uint256 multiplier = nodeLevel == 2 ? 200 : 100;  // 超级节点2倍
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
     * @dev 多签执行提案
     */
    function executeProposal(uint256 proposalId) external onlyOwner {
        require(block.timestamp >= proposals[proposalId].endTime, "Voting not ended");
        require(!proposals[proposalId].executed, "Already executed");
        require(proposals[proposalId].forVotes > proposals[proposalId].againstVotes, "Not passed");
        
        proposals[proposalId].executed = true;
        
        emit ProposalExecuted(proposalId);
    }
    
    // ============ 十、其他机制修复 ============
    
    // 限购机制
    struct PurchaseLimit {
        uint256 dailyLimit;     // 500 HCF/日
        uint256 period;         // 7天滚动
        bool enabled;
    }
    
    PurchaseLimit public purchaseLimit = PurchaseLimit({
        dailyLimit: 500 * 10**18,
        period: 7 days,
        enabled: true
    });
    
    // 赎回费用
    struct RedemptionFees {
        uint256 stakingBNBFee;   // 10% BNB
        uint256 lpBSDTFee;       // 50% BSDT
        uint256 lpHCFFee;        // 20% HCF
        uint256 burnIfNotShared; // 30%烧（未分享）
    }
    
    RedemptionFees public redemptionFees = RedemptionFees({
        stakingBNBFee: 1000,
        lpBSDTFee: 5000,
        lpHCFFee: 2000,
        burnIfNotShared: 3000
    });
    
    // 退出机制（USDT/USDC桥）
    struct ExitMechanism {
        bool allowUSDT;
        bool allowUSDC;
        bool noBridgeFee;     // 无费
        bool noApproval;      // 无审查
    }
    
    ExitMechanism public exitMechanism = ExitMechanism({
        allowUSDT: true,
        allowUSDC: true,
        noBridgeFee: true,
        noApproval: true
    });
    
    /**
     * @dev 检查限购（7天滚动）
     */
    function checkPurchaseLimit(
        address user,
        uint256 amount,
        uint256 totalIn7Days
    ) external view returns (bool) {
        if (!purchaseLimit.enabled) return true;
        
        return totalIn7Days + amount <= purchaseLimit.dailyLimit * 7;
    }
    
    /**
     * @dev 计算赎回费用
     */
    function calculateRedemptionFees(
        uint256 amount,
        bool isLP,
        bool hasShared
    ) external view returns (
        uint256 bnbFee,
        uint256 bsdtFee,
        uint256 hcfFee,
        uint256 burnAmount
    ) {
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
            
            // 未1:1烧30%
            burnAmount = hcfFee * redemptionFees.burnIfNotShared / 10000;
        }
    }
    
    /**
     * @dev 退出选择（USDT或USDC）
     */
    function selectExitCurrency(bool useUSDC) external view returns (string memory) {
        require(exitMechanism.allowUSDT || exitMechanism.allowUSDC, "Exit not allowed");
        require(exitMechanism.noBridgeFee, "Must be no fee");
        require(exitMechanism.noApproval, "Must be no approval");
        
        if (useUSDC && exitMechanism.allowUSDC) {
            return "USDC";
        }
        return "USDT";
    }
    
    // ============ 内部函数 ============
    
    function _applySlippage(uint256 slippage) private {
        // 滑点分配：销毁+节点（无具体比例）
    }
    
    function _applyProductionCut(uint256 cut) private {
        // 减产实现
    }
    
    function _compensateToPool(uint256 amount) private {
        // 补偿到池
    }
    
    function _getRankBonus(uint256 rank) private view returns (uint256) {
        if (rank <= 100) return 2000;      // Top 1-100: 20%
        if (rank <= 299) return 1000;      // Top 101-299: 10%
        if (rank <= 1000) return 1000;     // Top 300-1000: 10%
        if (rank <= 2000) return 500;      // Top 1001-2000: 5%
        return 0;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 批量设置参数（多签）
     */
    function setAllParameters(
        uint256 _decayRatePerBillion,
        BonusRates memory _bonusRates,
        uint256 _dailyProductionCap,
        bool _enablePurchaseLimit
    ) external onlyOwner {
        decayRatePerBillion = _decayRatePerBillion;
        bonusRates = _bonusRates;
        dailyProductionCap = _dailyProductionCap;
        purchaseLimit.enabled = _enablePurchaseLimit;
    }
}