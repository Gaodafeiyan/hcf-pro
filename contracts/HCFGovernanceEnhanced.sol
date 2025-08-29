// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IHCFNodeNFT {
    function hasNode(address user) returns (bool);
    function getNodeInfo(uint256 nodeId) returns (
        address owner,
        uint256 lpHCFAmount,
        uint256 lpBSDTAmount,
        uint256 totalDividends,
        uint256 onlineRate,
        uint256 level,
        bool isActive
    );
    function calculatePower(uint256 nodeId) returns (uint256);
    function getLevelMultiplier(uint256 nodeId) returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) returns (uint256);
}

interface IMultiSigWallet {
    function submitTransaction(
        address destination,
        uint256 value,
        bytes memory data,
        string memory description
    ) external returns (uint256);
}

/**
 * @title HCFGovernanceEnhanced
 * @dev 治理系统增强版 - 补充节点投票功能
 */
contract HCFGovernanceEnhanced is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    uint256 public constant MIN_PROPOSAL_DURATION = 3 days;
    uint256 public constant MAX_PROPOSAL_DURATION = 30 days;
    
    // ============ 结构体 ============
    
    // 提案类型
    enum ProposalType {
        PARAMETER_CHANGE,    // 参数修改
        CONTRACT_UPGRADE,    // 合约升级
        FUND_ALLOCATION,     // 资金分配
        EMERGENCY_ACTION,    // 紧急操作
        NODE_GOVERNANCE      // 节点治理
    }
    
    // 提案状态
    enum ProposalStatus {
        PENDING,            // 待投票
        VOTING,             // 投票中
        PASSED,             // 通过
        REJECTED,           // 拒绝
        QUEUED,             // 排队等待执行
        EXECUTED,           // 已执行
        CANCELLED           // 已取消
    }
    
    // 提案结构
    struct Proposal {
        uint256 id;                     // 提案ID
        address proposer;               // 提案者
        ProposalType proposalType;      // 提案类型
        string title;                   // 标题
        string description;             // 描述
        address target;                 // 目标合约
        uint256 value;                  // ETH数量
        bytes callData;                 // 调用数据
        uint256 startTime;              // 开始时间
        uint256 endTime;                // 结束时间
        uint256 executionTime;          // 执行时间（时间锁）
        uint256 forVotes;               // 赞成票
        uint256 againstVotes;           // 反对票
        uint256 abstainVotes;           // 弃权票
        ProposalStatus status;          // 状态
        bool multiSigRequired;          // 是否需要多签
        uint256 multiSigTxId;           // 多签交易ID
    }
    
    // 投票记录
    struct VoteRecord {
        bool hasVoted;          // 是否已投票
        uint8 support;          // 0=反对, 1=赞成, 2=弃权
        uint256 votingPower;    // 投票权重
        uint256 nodeId;         // 使用的节点ID（如果有）
    }
    
    // 节点投票配置
    struct NodeVotingConfig {
        bool enabled;                   // 是否启用节点投票
        uint256 powerMultiplier;        // 算力倍数（基点）
        uint256 levelMultiplier;        // 等级倍数（基点）
        uint256 minPowerRequired;       // 最小算力要求
        bool useQuadraticVoting;        // 是否使用二次投票
    }
    
    // ============ 状态变量 ============
    
    // 提案相关
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => VoteRecord)) public voteRecords;
    uint256 public proposalCount;
    uint256 public quorumPercentage = 3000;    // 30%法定人数
    uint256 public passingPercentage = 5100;   // 51%通过率
    
    // 节点投票配置
    NodeVotingConfig public nodeVotingConfig;
    
    // 合约地址
    IHCFNodeNFT public nodeNFT;
    IMultiSigWallet public multiSigWallet;
    
    // 权限管理
    mapping(address => bool) public proposers;     // 可以发起提案的地址
    mapping(address => bool) public executors;     // 可以执行提案的地址
    
    // 统计数据
    uint256 public totalVotingPower;              // 总投票权
    mapping(address => uint256) public userVotingPower;  // 用户投票权
    
    // ============ 事件 ============
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string title
    );
    
    event VoteCasted(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 votingPower,
        uint256 nodeId
    );
    
    event ProposalQueued(uint256 indexed proposalId, uint256 executionTime);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event NodeVotingConfigUpdated(NodeVotingConfig config);
    
    // ============ 修饰符 ============
    
    modifier onlyProposer() {
        require(proposers[msg.sender] || msg.sender == owner(), "Not proposer");
        _;
    }
    
    modifier onlyExecutor() {
        require(executors[msg.sender] || msg.sender == owner(), "Not executor");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _nodeNFT,
        address _multiSigWallet
    ) {
        nodeNFT = IHCFNodeNFT(_nodeNFT);
        multiSigWallet = IMultiSigWallet(_multiSigWallet);
        
        // 初始化节点投票配置
        nodeVotingConfig = NodeVotingConfig({
            enabled: true,
            powerMultiplier: 10000,    // 1x算力权重
            levelMultiplier: 10000,    // 1x等级权重
            minPowerRequired: 100,      // 最小100算力
            useQuadraticVoting: false  // 线性投票
        });
        
        // 设置初始提案者和执行者
        proposers[msg.sender] = true;
        executors[msg.sender] = true;
    }
    
    // ============ 提案创建 ============
    
    /**
     * @dev 创建提案
     */
    function createProposal(
        ProposalType proposalType,
        string memory title,
        string memory description,
        address target,
        uint256 value,
        bytes memory callData,
        uint256 votingDuration,
        bool requireMultiSig
    ) external onlyProposer returns (uint256) {
        require(votingDuration >= MIN_PROPOSAL_DURATION, "Duration too short");
        require(votingDuration <= MAX_PROPOSAL_DURATION, "Duration too long");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            title: title,
            description: description,
            target: target,
            value: value,
            callData: callData,
            startTime: block.timestamp,
            endTime: block.timestamp + votingDuration,
            executionTime: 0,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            status: ProposalStatus.VOTING,
            multiSigRequired: requireMultiSig,
            multiSigTxId: 0
        });
        
        emit ProposalCreated(proposalId, msg.sender, proposalType, title);
        
        return proposalId;
    }
    
    // ============ 节点投票功能 ============
    
    /**
     * @dev 使用节点NFT投票
     */
    function voteWithNode(
        uint256 proposalId,
        uint8 support,  // 0=反对, 1=赞成, 2=弃权
        uint256 nodeId
    ) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.VOTING, "Not in voting period");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!voteRecords[proposalId][msg.sender].hasVoted, "Already voted");
        require(support <= 2, "Invalid vote type");
        
        // 验证节点所有权
        require(nodeNFT.hasNode(msg.sender), "No node owned");
        uint256 userNodeId = nodeNFT.tokenOfOwnerByIndex(msg.sender, 0);
        require(userNodeId == nodeId, "Not node owner");
        
        // 获取节点信息
        (
            address owner,
            uint256 lpHCFAmount,
            ,
            ,
            uint256 onlineRate,
            uint256 level,
            bool isActive
        ) = nodeNFT.getNodeInfo(nodeId);
        
        require(owner == msg.sender, "Not node owner");
        require(isActive, "Node not active");
        
        // 计算投票权重（算力 * 等级乘数）
        uint256 nodePower = nodeNFT.calculatePower(nodeId);
        uint256 levelMultiplier = nodeNFT.getLevelMultiplier(nodeId);
        
        // 应用配置的倍数
        uint256 votingPower = (nodePower * nodeVotingConfig.powerMultiplier / BASIS_POINTS) * 
                             (levelMultiplier * nodeVotingConfig.levelMultiplier / BASIS_POINTS) / 
                             BASIS_POINTS;
        
        // 检查最小算力要求
        require(nodePower >= nodeVotingConfig.minPowerRequired, "Insufficient node power");
        
        // 二次投票（如果启用）
        if (nodeVotingConfig.useQuadraticVoting) {
            votingPower = sqrt(votingPower);
        }
        
        // 记录投票
        voteRecords[proposalId][msg.sender] = VoteRecord({
            hasVoted: true,
            support: support,
            votingPower: votingPower,
            nodeId: nodeId
        });
        
        // 更新票数
        if (support == 0) {
            proposal.againstVotes += votingPower;
        } else if (support == 1) {
            proposal.forVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        // 更新总投票权
        totalVotingPower += votingPower;
        userVotingPower[msg.sender] += votingPower;
        
        emit VoteCasted(proposalId, msg.sender, support, votingPower, nodeId);
    }
    
    /**
     * @dev 普通投票（非节点用户）
     */
    function vote(
        uint256 proposalId,
        uint8 support
    ) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.VOTING, "Not in voting period");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!voteRecords[proposalId][msg.sender].hasVoted, "Already voted");
        require(support <= 2, "Invalid vote type");
        
        // 基础投票权重（可以基于其他因素，如质押量）
        uint256 votingPower = 1;
        
        // 记录投票
        voteRecords[proposalId][msg.sender] = VoteRecord({
            hasVoted: true,
            support: support,
            votingPower: votingPower,
            nodeId: 0
        });
        
        // 更新票数
        if (support == 0) {
            proposal.againstVotes += votingPower;
        } else if (support == 1) {
            proposal.forVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        totalVotingPower += votingPower;
        userVotingPower[msg.sender] += votingPower;
        
        emit VoteCasted(proposalId, msg.sender, support, votingPower, 0);
    }
    
    // ============ 提案执行 ============
    
    /**
     * @dev 将提案加入执行队列
     */
    function queueProposal(uint256 proposalId) external onlyExecutor {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.VOTING, "Not in voting status");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        
        // 检查是否达到法定人数
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        require(totalVotes >= (totalVotingPower * quorumPercentage) / BASIS_POINTS, "Quorum not reached");
        
        // 检查是否通过
        uint256 passingVotes = (proposal.forVotes * BASIS_POINTS) / totalVotes;
        require(passingVotes >= passingPercentage, "Proposal not passed");
        
        proposal.status = ProposalStatus.QUEUED;
        proposal.executionTime = block.timestamp + TIMELOCK_DURATION;
        
        // 如果需要多签，提交到多签钱包
        if (proposal.multiSigRequired) {
            proposal.multiSigTxId = multiSigWallet.submitTransaction(
                proposal.target,
                proposal.value,
                proposal.callData,
                proposal.title
            );
        }
        
        emit ProposalQueued(proposalId, proposal.executionTime);
    }
    
    /**
     * @dev 执行提案
     */
    function executeProposal(uint256 proposalId) external onlyExecutor nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.QUEUED, "Not queued");
        require(block.timestamp >= proposal.executionTime, "Timelock not expired");
        
        proposal.status = ProposalStatus.EXECUTED;
        
        // 如果不需要多签，直接执行
        if (!proposal.multiSigRequired) {
            (bool success,) = proposal.target.call{value: proposal.value}(proposal.callData);
            require(success, "Execution failed");
        }
        // 多签执行由多签钱包处理
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev 取消提案
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized"
        );
        require(
            proposal.status == ProposalStatus.VOTING || 
            proposal.status == ProposalStatus.QUEUED,
            "Cannot cancel"
        );
        
        proposal.status = ProposalStatus.CANCELLED;
        
        emit ProposalCancelled(proposalId);
    }
    
    // ============ 配置管理 ============
    
    /**
     * @dev 设置节点投票配置（仅owner）
     */
    function setNodeVotingConfig(
        bool enabled,
        uint256 powerMultiplier,
        uint256 levelMultiplier,
        uint256 minPowerRequired,
        bool useQuadraticVoting
    ) external onlyOwner {
        nodeVotingConfig = NodeVotingConfig({
            enabled: enabled,
            powerMultiplier: powerMultiplier,
            levelMultiplier: levelMultiplier,
            minPowerRequired: minPowerRequired,
            useQuadraticVoting: useQuadraticVoting
        });
        
        emit NodeVotingConfigUpdated(nodeVotingConfig);
    }
    
    /**
     * @dev 设置投票参数（仅owner）
     */
    function setVotingParameters(
        uint256 _quorumPercentage,
        uint256 _passingPercentage
    ) external onlyOwner {
        require(_quorumPercentage <= 5000, "Quorum too high");  // 最高50%
        require(_passingPercentage >= 5000 && _passingPercentage <= 7500, "Invalid passing percentage");
        
        quorumPercentage = _quorumPercentage;
        passingPercentage = _passingPercentage;
    }
    
    /**
     * @dev 添加/移除提案者
     */
    function setProposer(address account, bool status) external onlyOwner {
        proposers[account] = status;
    }
    
    /**
     * @dev 添加/移除执行者
     */
    function setExecutor(address account, bool status) external onlyOwner {
        executors[account] = status;
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取提案详情
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        returns (Proposal memory) 
    {
        return proposals[proposalId];
    }
    
    /**
     * @dev 获取用户投票记录
     */
    function getUserVote(uint256 proposalId, address user) 
        external 
        view 
        returns (VoteRecord memory) 
    {
        return voteRecords[proposalId][user];
    }
    
    /**
     * @dev 获取提案投票统计
     */
    function getProposalVotes(uint256 proposalId) 
        external 
        view 
        returns (
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            uint256 totalVotes
        ) 
    {
        Proposal memory proposal = proposals[proposalId];
        uint256 total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        
        return (
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            total
        );
    }
    
    /**
     * @dev 计算节点投票权重
     */
    function calculateNodeVotingPower(uint256 nodeId) 
        external 
        view 
        returns (uint256) 
    {
        uint256 nodePower = nodeNFT.calculatePower(nodeId);
        uint256 levelMultiplier = nodeNFT.getLevelMultiplier(nodeId);
        
        uint256 votingPower = (nodePower * nodeVotingConfig.powerMultiplier / BASIS_POINTS) * 
                             (levelMultiplier * nodeVotingConfig.levelMultiplier / BASIS_POINTS) / 
                             BASIS_POINTS;
        
        if (nodeVotingConfig.useQuadraticVoting) {
            votingPower = sqrt(votingPower);
        }
        
        return votingPower;
    }
    
    // ============ 辅助函数 ============
    
    /**
     * @dev 计算平方根（用于二次投票）
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}