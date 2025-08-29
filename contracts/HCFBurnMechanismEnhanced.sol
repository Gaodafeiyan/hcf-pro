// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFBurnMechanism.sol";

/**
 * @title HCFBurnMechanismEnhanced
 * @dev 销毁机制增强版 - 补充缺失功能
 */
contract HCFBurnMechanismEnhanced is HCFBurnMechanism {
    
    // ============ 新增状态变量 ============
    
    // 投票烧伤配置
    struct VoteBurnConfig {
        uint256 proposalId;             // 当前提案ID
        uint256 yesVotes;               // 赞成票
        uint256 noVotes;                // 反对票
        uint256 votingEndTime;          // 投票结束时间
        uint256 proposedRate;           // 提议的烧伤率
        string burnType;                // 烧伤类型
        bool executed;                  // 是否已执行
    }
    
    mapping(uint256 => VoteBurnConfig) public voteBurnProposals;
    uint256 public currentProposalId;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    
    // 税烧配置（来自HCFToken的税费）
    struct TaxBurnConfig {
        uint256 buyTaxBurnRate;        // 买入税烧 0.5%
        uint256 sellTaxBurnRate;       // 卖出税烧 2%
        uint256 transferTaxBurnRate;   // 转账税烧 1%（100%）
        uint256 totalTaxBurned;        // 总税烧量
    }
    
    TaxBurnConfig public taxBurnConfig;
    
    // 全局封顶精确计算
    struct GlobalCapConfig {
        mapping(address => uint256) userDailyProduction;   // 用户日产出
        mapping(address => uint256) userBurnedToday;       // 今日已烧
        mapping(address => uint256) lastProductionUpdate;  // 上次产出更新
        uint256 globalDailyProduction;                     // 全局日产出
        uint256 globalBurnedToday;                         // 全局今日已烧
        uint256 lastGlobalUpdate;                          // 上次全局更新
        uint256 maxBurnPercentage;                         // 最大烧伤百分比（相对于产出）
    }
    
    GlobalCapConfig public globalCap;
    
    // 定时烧改进（移除24小时限制）
    struct TimedBurnImproved {
        uint256 rate;                   // 烧伤率 1%
        uint256 interval;               // 间隔（可调，默认无限制）
        uint256 lastBurnTime;           // 上次烧伤时间
        bool requireInterval;           // 是否需要间隔
    }
    
    TimedBurnImproved public timedBurnImproved;
    
    // ============ 事件 ============
    event VoteBurnProposed(uint256 indexed proposalId, string burnType, uint256 rate);
    event VoteCasted(uint256 indexed proposalId, address voter, bool support);
    event VoteBurnExecuted(uint256 indexed proposalId, string burnType, uint256 newRate);
    event TaxBurnApplied(uint256 amount, string taxType);
    event GlobalCapReached(address user, uint256 attempted, uint256 actual);
    event TimedBurnTriggered(uint256 amount, uint256 timestamp);
    
    // ============ 构造函数 ============
    constructor(
        address _multiSig,
        address _hcfToken,
        address _stakingContract
    ) HCFBurnMechanism(_multiSig, _hcfToken, _stakingContract) {
        // 初始化税烧配置（与HCFToken一致）
        taxBurnConfig = TaxBurnConfig({
            buyTaxBurnRate: 50,         // 0.5%（买入税2%的25%）
            sellTaxBurnRate: 200,        // 2%（卖出税5%的40%）
            transferTaxBurnRate: 100,    // 1%（转账税1%的100%）
            totalTaxBurned: 0
        });
        
        // 初始化全局封顶
        globalCap.maxBurnPercentage = 10000;  // 100%（默认不超过日产出）
        globalCap.lastGlobalUpdate = block.timestamp;
        
        // 初始化定时烧（无间隔限制）
        timedBurnImproved = TimedBurnImproved({
            rate: 100,                  // 1%
            interval: 0,                 // 无间隔
            lastBurnTime: 0,
            requireInterval: false       // 不需要间隔
        });
    }
    
    // ============ 投票烧伤机制 ============
    
    /**
     * @dev 发起烧伤率调整投票（多签）
     */
    function proposeVoteBurn(
        string memory burnType,
        uint256 newRate,
        uint256 votingDuration
    ) external onlyMultiSig returns (uint256) {
        require(newRate <= 5000, "Max 50% burn rate");
        require(votingDuration >= 1 days, "Min 1 day voting");
        
        currentProposalId++;
        
        voteBurnProposals[currentProposalId] = VoteBurnConfig({
            proposalId: currentProposalId,
            yesVotes: 0,
            noVotes: 0,
            votingEndTime: block.timestamp + votingDuration,
            proposedRate: newRate,
            burnType: burnType,
            executed: false
        });
        
        emit VoteBurnProposed(currentProposalId, burnType, newRate);
        
        return currentProposalId;
    }
    
    /**
     * @dev 投票
     */
    function voteOnBurnProposal(uint256 proposalId, bool support) external {
        VoteBurnConfig storage proposal = voteBurnProposals[proposalId];
        
        require(block.timestamp < proposal.votingEndTime, "Voting ended");
        require(!hasVoted[msg.sender][proposalId], "Already voted");
        require(!proposal.executed, "Already executed");
        
        hasVoted[msg.sender][proposalId] = true;
        
        // 获取投票权重（可以基于质押量或节点）
        uint256 votingPower = _getVotingPower(msg.sender);
        
        if (support) {
            proposal.yesVotes += votingPower;
        } else {
            proposal.noVotes += votingPower;
        }
        
        emit VoteCasted(proposalId, msg.sender, support);
    }
    
    /**
     * @dev 执行投票结果
     */
    function executeVoteBurn(uint256 proposalId) external {
        VoteBurnConfig storage proposal = voteBurnProposals[proposalId];
        
        require(block.timestamp >= proposal.votingEndTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.yesVotes > proposal.noVotes, "Proposal rejected");
        
        proposal.executed = true;
        
        // 更新对应的烧伤率
        if (keccak256(bytes(proposal.burnType)) == keccak256(bytes("referral"))) {
            referralBurnRate = proposal.proposedRate;
        } else if (keccak256(bytes(proposal.burnType)) == keccak256(bytes("team"))) {
            teamBurnRate = proposal.proposedRate;
        } else if (keccak256(bytes(proposal.burnType)) == keccak256(bytes("redeem"))) {
            redeemBurnRate = proposal.proposedRate;
        } else if (keccak256(bytes(proposal.burnType)) == keccak256(bytes("volatility"))) {
            volatilityBurnRate = proposal.proposedRate;
        } else if (keccak256(bytes(proposal.burnType)) == keccak256(bytes("trading"))) {
            tradingBurnRate = proposal.proposedRate;
        } else if (keccak256(bytes(proposal.burnType)) == keccak256(bytes("timed"))) {
            timedBurnImproved.rate = proposal.proposedRate;
        }
        
        emit VoteBurnExecuted(proposalId, proposal.burnType, proposal.proposedRate);
    }
    
    /**
     * @dev 获取投票权重
     */
    function _getVotingPower(address voter) internal view returns (uint256) {
        uint256 power = 1; // 基础1票
        
        // 基于质押量
        if (address(stakingContract) != address(0)) {
            try stakingContract.userInfo(voter) returns (
                uint256 amount,
                uint256,
                uint256,
                uint256,
                uint256
            ) {
                power += amount / (1000 * 10**18); // 每1000 HCF = 1票
            } catch {}
        }
        
        // 节点用户额外权重
        if (address(nodeContract) != address(0)) {
            try nodeContract.hasNode(voter) returns (bool hasNode) {
                if (hasNode) {
                    power += 100; // 节点用户+100票
                }
            } catch {}
        }
        
        return power;
    }
    
    // ============ 税烧机制 ============
    
    /**
     * @dev 应用买入税烧（0.5%）
     */
    function applyBuyTaxBurn(uint256 amount) external onlyAuthorized returns (uint256) {
        uint256 burnAmount = (amount * taxBurnConfig.buyTaxBurnRate) / 10000;
        
        if (burnAmount > 0) {
            _executeBurn(burnAmount);
            taxBurnConfig.totalTaxBurned += burnAmount;
            
            emit TaxBurnApplied(burnAmount, "buy_tax");
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 应用卖出税烧（2%）
     */
    function applySellTaxBurn(uint256 amount) external onlyAuthorized returns (uint256) {
        uint256 burnAmount = (amount * taxBurnConfig.sellTaxBurnRate) / 10000;
        
        if (burnAmount > 0) {
            _executeBurn(burnAmount);
            taxBurnConfig.totalTaxBurned += burnAmount;
            
            emit TaxBurnApplied(burnAmount, "sell_tax");
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 应用转账税烧（1%，100%烧毁）
     */
    function applyTransferTaxBurn(uint256 amount) external onlyAuthorized returns (uint256) {
        uint256 burnAmount = (amount * taxBurnConfig.transferTaxBurnRate) / 10000;
        
        if (burnAmount > 0) {
            _executeBurn(burnAmount);
            taxBurnConfig.totalTaxBurned += burnAmount;
            
            emit TaxBurnApplied(burnAmount, "transfer_tax");
        }
        
        return burnAmount;
    }
    
    // ============ 全局封顶精确计算 ============
    
    /**
     * @dev 更新用户日产出（从质押合约同步）
     */
    function updateUserDailyProduction(address user) public {
        uint256 today = block.timestamp / 1 days;
        
        if (globalCap.lastProductionUpdate[user] != today) {
            // 重置今日烧伤
            globalCap.userBurnedToday[user] = 0;
            globalCap.lastProductionUpdate[user] = today;
        }
        
        // 从质押合约获取日产出
        if (address(stakingContract) != address(0)) {
            try stakingContract.calculateDailyRewards(user) returns (uint256 dailyReward) {
                globalCap.userDailyProduction[user] = dailyReward;
            } catch {
                // 使用缓存值
            }
        }
    }
    
    /**
     * @dev 应用烧伤（带全局封顶检查）
     */
    function applyBurnWithGlobalCap(
        uint256 burnType,
        uint256 amount,
        address user
    ) public override onlyAuthorized returns (uint256) {
        // 更新产出
        updateUserDailyProduction(user);
        
        // 计算烧伤量
        uint256 burnAmount = _calculateBurnAmount(burnType, amount);
        
        // 检查全局封顶（不超过日产出）
        uint256 maxAllowedBurn = (globalCap.userDailyProduction[user] * globalCap.maxBurnPercentage) / 10000;
        uint256 remainingAllowance = maxAllowedBurn > globalCap.userBurnedToday[user] ? 
                                     maxAllowedBurn - globalCap.userBurnedToday[user] : 0;
        
        if (burnAmount > remainingAllowance) {
            burnAmount = remainingAllowance;
            emit GlobalCapReached(user, amount, burnAmount);
        }
        
        if (burnAmount > 0) {
            // 更新已烧伤量
            globalCap.userBurnedToday[user] += burnAmount;
            globalCap.globalBurnedToday += burnAmount;
            
            // 执行烧伤
            _executeBurn(burnAmount);
            
            emit BurnApplied(user, burnAmount, burnType);
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 获取用户剩余烧伤额度
     */
    function getUserRemainingBurnAllowance(address user) external view returns (uint256) {
        uint256 maxAllowedBurn = (globalCap.userDailyProduction[user] * globalCap.maxBurnPercentage) / 10000;
        
        if (maxAllowedBurn > globalCap.userBurnedToday[user]) {
            return maxAllowedBurn - globalCap.userBurnedToday[user];
        }
        
        return 0;
    }
    
    // ============ 定时烧改进（无间隔限制） ============
    
    /**
     * @dev 触发定时烧（1%，可无间隔）
     */
    function triggerTimedBurn(uint256 amount) external onlyAuthorized returns (uint256) {
        // 检查间隔（如果启用）
        if (timedBurnImproved.requireInterval) {
            require(
                block.timestamp >= timedBurnImproved.lastBurnTime + timedBurnImproved.interval,
                "Interval not met"
            );
        }
        
        uint256 burnAmount = (amount * timedBurnImproved.rate) / 10000;
        
        if (burnAmount > 0) {
            _executeBurn(burnAmount);
            timedBurnImproved.lastBurnTime = block.timestamp;
            
            emit TimedBurnTriggered(burnAmount, block.timestamp);
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 设置定时烧参数（多签）
     */
    function setTimedBurnConfig(
        uint256 rate,
        uint256 interval,
        bool requireInterval
    ) external onlyMultiSig {
        timedBurnImproved.rate = rate;
        timedBurnImproved.interval = interval;
        timedBurnImproved.requireInterval = requireInterval;
    }
    
    // ============ 辅助函数 ============
    
    /**
     * @dev 计算烧伤量
     */
    function _calculateBurnAmount(uint256 burnType, uint256 amount) 
        internal 
        view 
        returns (uint256) 
    {
        if (burnType == 1) {
            return (amount * referralBurnRate) / BASIS_POINTS;    // 推荐烧
        } else if (burnType == 2) {
            return (amount * teamBurnRate) / BASIS_POINTS;         // 团队烧
        } else if (burnType == 3) {
            return (amount * redeemBurnRate) / BASIS_POINTS;       // 赎回烧
        } else if (burnType == 4) {
            return (amount * volatilityBurnRate) / BASIS_POINTS;   // 波动烧
        } else if (burnType == 5) {
            return (amount * tradingBurnRate) / BASIS_POINTS;      // 交易烧
        } else if (burnType == 6) {
            return (amount * timedBurnImproved.rate) / BASIS_POINTS; // 定时烧
        }
        
        return 0;
    }
    
    /**
     * @dev 执行实际烧毁
     */
    function _executeBurn(uint256 amount) internal {
        if (amount > 0 && address(hcfToken) != address(0)) {
            // 检查是否达到停止供应量
            if (hcfToken.totalSupply() > hcfToken.BURN_STOP_SUPPLY()) {
                uint256 burnAmount = amount;
                
                // 如果烧毁后低于停止供应量，只烧到停止点
                if (hcfToken.totalSupply() - amount < hcfToken.BURN_STOP_SUPPLY()) {
                    burnAmount = hcfToken.totalSupply() - hcfToken.BURN_STOP_SUPPLY();
                }
                
                if (burnAmount > 0) {
                    hcfToken.burn(burnAmount);
                    totalBurned += burnAmount;
                }
            }
        }
    }
    
    // ============ 管理函数 ============
    
    /**
     * @dev 设置全局封顶百分比（多签）
     */
    function setGlobalCapPercentage(uint256 percentage) external onlyMultiSig {
        require(percentage <= 10000, "Max 100%");
        globalCap.maxBurnPercentage = percentage;
    }
    
    /**
     * @dev 设置税烧率（多签）
     */
    function setTaxBurnRates(
        uint256 buyRate,
        uint256 sellRate,
        uint256 transferRate
    ) external onlyMultiSig {
        taxBurnConfig.buyTaxBurnRate = buyRate;
        taxBurnConfig.sellTaxBurnRate = sellRate;
        taxBurnConfig.transferTaxBurnRate = transferRate;
    }
    
    /**
     * @dev 获取烧伤统计
     */
    function getBurnStatistics() external view returns (
        uint256 totalBurnedAmount,
        uint256 taxBurnedAmount,
        uint256 globalTodayBurned,
        uint256 proposalCount
    ) {
        return (
            totalBurned,
            taxBurnConfig.totalTaxBurned,
            globalCap.globalBurnedToday,
            currentProposalId
        );
    }
    
    /**
     * @dev 获取提案信息
     */
    function getProposalInfo(uint256 proposalId) 
        external 
        view 
        returns (VoteBurnConfig memory) 
    {
        return voteBurnProposals[proposalId];
    }
}