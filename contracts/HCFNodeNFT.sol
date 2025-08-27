// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IBSDTToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IPriceOracle {
    function getPrice() external view returns (uint256);
}

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

/**
 * @title HCFNodeNFT
 * @dev 节点NFT合约 - 99个限量节点，动态算力，多级分红
 */
contract HCFNodeNFT is ERC721, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_NODES = 99;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_COMPENSATION = 500 * 10**18;  // 最小补偿500 HCF
    
    // ============ 结构体 ============
    struct NodeData {
        address owner;              // 节点拥有者
        bool isActive;             // 是否激活
        uint256 activationTime;    // 激活时间
        uint256 lpHCFAmount;       // LP中HCF数量
        uint256 onlineRate;        // 在线率（基点）
        uint256 level;             // 节点等级
        uint256 lastUpdateTime;    // 最后更新时间
        uint256 totalDividends;    // 总分红
    }
    
    struct NodeLevel {
        string name;               // 等级名称
        uint256 minHolding;       // 最小持有量
        uint256 bonusRate;        // 奖励率（基点）
        uint256 voteMultiplier;   // 投票权重乘数
        uint256 rankingPoints;    // 排名积分
    }
    
    struct DividendPool {
        uint256 totalAmount;       // 池总量
        uint256 lastDistribution; // 上次分配时间
        uint256 accumulated;      // 累积待分配
    }
    
    // ============ 状态变量 ============
    
    // 节点数据
    uint256 public currentId;
    mapping(uint256 => NodeData) public nodes;
    mapping(address => uint256) public ownerToNodeId;
    
    // 费用设置
    uint256 public baseFee = 5000 * 10**18;        // 基础费用5000 BSDT
    uint256 public priceThreshold = 1300000;       // 价格阈值1.3U (6位小数)
    uint256 public activationFeeHCF = 1000 * 10**18;     // 激活费1000 HCF
    uint256 public activationFeeBSDT = 1000 * 10**18;    // 激活费1000 BSDT
    
    // 算力参数
    uint256 public maxLPHCF = 1000 * 10**18;      // LP最大HCF (初始1000)
    uint256 public minOnlineRate = 9000;          // 最小在线率90%
    
    // 等级配置
    NodeLevel[] public nodeLevels;
    
    // 分红池 (0:滑点 1:提现 2:入金 3:防暴)
    mapping(uint256 => DividendPool) public dividendPools;
    
    // 合约地址
    address public multiSigWallet;
    address public lpCollectionAddress;
    IHCFToken public hcfToken;
    IBSDTToken public bsdtToken;
    IPriceOracle public priceOracle;
    IPancakePair public lpPair;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event NodeApplied(address indexed user, uint256 indexed nodeId, string feeType);
    event NodeActivated(address indexed user, uint256 indexed nodeId);
    event PowerUpdated(uint256 indexed nodeId, uint256 newPower);
    event DividendsDistributed(uint256 indexed divType, uint256 totalAmount);
    event CompensationClaimed(address indexed user, uint256 amount);
    event ProposalVoted(uint256 indexed nodeId, uint256 indexed proposalId, bool vote, uint256 weight);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event EmergencyPauseSet(bool status);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier onlyNodeOwner(uint256 nodeId) {
        require(ownerOf(nodeId) == msg.sender, "Not node owner");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _priceOracle,
        address _multiSigWallet,
        address _lpCollectionAddress
    ) ERC721("HCF Node NFT", "HCFNODE") Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        priceOracle = IPriceOracle(_priceOracle);
        multiSigWallet = _multiSigWallet;
        lpCollectionAddress = _lpCollectionAddress;
        
        // 初始化节点等级
        _initializeLevels();
    }
    
    // ============ 初始化函数 ============
    function _initializeLevels() private {
        // 轻量级节点 - 1万HCF
        nodeLevels.push(NodeLevel({
            name: "Light",
            minHolding: 10000 * 10**18,
            bonusRate: 2000,  // 20%
            voteMultiplier: 100,
            rankingPoints: 100
        }));
        
        // 标准节点 - 5万HCF
        nodeLevels.push(NodeLevel({
            name: "Standard",
            minHolding: 50000 * 10**18,
            bonusRate: 2000,  // 20%
            voteMultiplier: 200,
            rankingPoints: 200
        }));
        
        // 高级节点 - 20万HCF
        nodeLevels.push(NodeLevel({
            name: "Advanced",
            minHolding: 200000 * 10**18,
            bonusRate: 2000,  // 20%
            voteMultiplier: 300,
            rankingPoints: 300
        }));
        
        // 超级节点 - 50万HCF
        nodeLevels.push(NodeLevel({
            name: "Super",
            minHolding: 500000 * 10**18,
            bonusRate: 2000,  // 20%
            voteMultiplier: 500,
            rankingPoints: 500
        }));
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 申请节点
     */
    function applyForNode() external nonReentrant notPaused returns (uint256) {
        require(currentId < MAX_NODES, "Max nodes reached");
        require(ownerToNodeId[msg.sender] == 0, "Already has node");
        
        // 检查价格决定费用类型
        uint256 currentPrice = priceOracle.getPrice();
        bool useHCF = currentPrice >= priceThreshold;
        
        if (useHCF) {
            // 价格>=1.3U，使用5000 HCF
            uint256 hcfFee = baseFee;
            require(hcfToken.transferFrom(msg.sender, multiSigWallet, hcfFee), "HCF transfer failed");
            emit NodeApplied(msg.sender, currentId + 1, "HCF");
        } else {
            // 价格<1.3U，使用5000 BSDT
            require(bsdtToken.transferFrom(msg.sender, multiSigWallet, baseFee), "BSDT transfer failed");
            emit NodeApplied(msg.sender, currentId + 1, "BSDT");
        }
        
        // Mint NFT
        currentId++;
        _safeMint(msg.sender, currentId);
        
        // 初始化节点数据
        nodes[currentId] = NodeData({
            owner: msg.sender,
            isActive: false,
            activationTime: 0,
            lpHCFAmount: 0,
            onlineRate: BASIS_POINTS,  // 初始100%
            level: 0,
            lastUpdateTime: block.timestamp,
            totalDividends: 0
        });
        
        ownerToNodeId[msg.sender] = currentId;
        
        return currentId;
    }
    
    /**
     * @dev 激活节点
     */
    function activateNode(uint256 nodeId) external nonReentrant notPaused onlyNodeOwner(nodeId) {
        NodeData storage node = nodes[nodeId];
        require(!node.isActive, "Already activated");
        
        // 收取激活费
        require(
            hcfToken.transferFrom(msg.sender, lpCollectionAddress, activationFeeHCF),
            "HCF transfer failed"
        );
        require(
            bsdtToken.transferFrom(msg.sender, lpCollectionAddress, activationFeeBSDT),
            "BSDT transfer failed"
        );
        
        // 激活节点
        node.isActive = true;
        node.activationTime = block.timestamp;
        node.onlineRate = BASIS_POINTS;  // 初始100%在线率
        
        // 更新算力
        _updateNodePower(nodeId);
        
        emit NodeActivated(msg.sender, nodeId);
    }
    
    /**
     * @dev 更新节点算力
     */
    function updateNodePower(uint256 nodeId) external {
        require(nodes[nodeId].isActive, "Node not active");
        _updateNodePower(nodeId);
    }
    
    /**
     * @dev 内部更新算力
     */
    function _updateNodePower(uint256 nodeId) internal {
        NodeData storage node = nodes[nodeId];
        
        // 获取LP中的HCF数量
        if (address(lpPair) != address(0)) {
            (uint112 reserve0, uint112 reserve1,) = lpPair.getReserves();
            // 假设token0是HCF
            node.lpHCFAmount = uint256(reserve0);
        }
        
        node.lastUpdateTime = block.timestamp;
        
        emit PowerUpdated(nodeId, _calculatePower(nodeId));
    }
    
    /**
     * @dev 计算节点算力
     */
    function _calculatePower(uint256 nodeId) internal view returns (uint256) {
        NodeData memory node = nodes[nodeId];
        if (!node.isActive || node.onlineRate < minOnlineRate) {
            return 0;
        }
        
        // 算力 = LP中HCF / 最大LP HCF * 100%
        uint256 basePower = (node.lpHCFAmount * BASIS_POINTS) / maxLPHCF;
        if (basePower > BASIS_POINTS) {
            basePower = BASIS_POINTS;  // 不超过100%
        }
        
        // 应用在线率
        uint256 finalPower = (basePower * node.onlineRate) / BASIS_POINTS;
        
        return finalPower;
    }
    
    /**
     * @dev 分配分红
     * @param divType 分红类型 (0:滑点 1:提现 2:入金 3:防暴)
     * @param amount 分红金额
     */
    function distributeDividends(uint256 divType, uint256 amount) external nonReentrant {
        require(divType < 4, "Invalid dividend type");
        
        DividendPool storage pool = dividendPools[divType];
        pool.accumulated += amount;
        
        // 计算总算力
        uint256 totalPower = 0;
        for (uint256 i = 1; i <= currentId; i++) {
            if (nodes[i].isActive && nodes[i].onlineRate >= minOnlineRate) {
                totalPower += _calculatePower(i);
            }
        }
        
        if (totalPower == 0) {
            return;  // 无有效节点
        }
        
        // 按算力分配
        for (uint256 i = 1; i <= currentId; i++) {
            if (!nodes[i].isActive || nodes[i].onlineRate < minOnlineRate) {
                continue;
            }
            
            uint256 nodePower = _calculatePower(i);
            if (nodePower > 0) {
                uint256 nodeShare = (amount * nodePower) / totalPower;
                nodes[i].totalDividends += nodeShare;
                
                // 转账给节点所有者
                hcfToken.transfer(nodes[i].owner, nodeShare);
            }
        }
        
        pool.totalAmount += amount;
        pool.lastDistribution = block.timestamp;
        pool.accumulated = 0;
        
        emit DividendsDistributed(divType, amount);
    }
    
    /**
     * @dev 申请无常损失补偿
     */
    function claimCompensation(uint256 nodeId) external nonReentrant notPaused onlyNodeOwner(nodeId) {
        NodeData storage node = nodes[nodeId];
        require(node.isActive, "Node not active");
        
        // 检查LP减少量
        uint256 currentLP = node.lpHCFAmount;
        uint256 previousLP = maxLPHCF;
        
        require(currentLP < previousLP, "No loss");
        
        uint256 loss = previousLP - currentLP;
        uint256 compensation = loss > MIN_COMPENSATION ? loss : MIN_COMPENSATION;
        
        // 节点优先补偿
        uint256 bonus = (compensation * 2000) / BASIS_POINTS;  // 20%额外奖励
        uint256 totalCompensation = compensation + bonus;
        
        // 执行补偿
        require(hcfToken.transfer(msg.sender, totalCompensation), "Compensation failed");
        
        // 恢复算力到100%
        node.lpHCFAmount = maxLPHCF;
        _updateNodePower(nodeId);
        
        emit CompensationClaimed(msg.sender, totalCompensation);
    }
    
    /**
     * @dev 治理投票
     */
    function voteOnProposal(uint256 nodeId, uint256 proposalId, bool vote) 
        external 
        onlyNodeOwner(nodeId) 
    {
        NodeData memory node = nodes[nodeId];
        require(node.isActive, "Node not active");
        
        // 计算投票权重
        uint256 nodePower = _calculatePower(nodeId);
        uint256 levelMultiplier = _getLevelMultiplier(nodeId);
        uint256 voteWeight = (nodePower * levelMultiplier) / 100;
        
        emit ProposalVoted(nodeId, proposalId, vote, voteWeight);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置费用（仅多签）
     */
    function setFees(
        uint256 _baseFee,
        uint256 _priceThreshold,
        uint256 _activationFeeHCF,
        uint256 _activationFeeBSDT
    ) external onlyMultiSig {
        baseFee = _baseFee;
        priceThreshold = _priceThreshold;
        activationFeeHCF = _activationFeeHCF;
        activationFeeBSDT = _activationFeeBSDT;
    }
    
    /**
     * @dev 设置最大LP HCF（仅多签）
     */
    function setMaxLPHCF(uint256 _maxLPHCF) external onlyMultiSig {
        require(_maxLPHCF > 0, "Invalid max LP");
        maxLPHCF = _maxLPHCF;
    }
    
    /**
     * @dev 设置最小在线率（仅多签）
     */
    function setMinOnlineRate(uint256 _minOnlineRate) external onlyMultiSig {
        require(_minOnlineRate <= BASIS_POINTS, "Invalid rate");
        minOnlineRate = _minOnlineRate;
    }
    
    /**
     * @dev 更新节点在线率
     */
    function updateOnlineRate(uint256 nodeId, uint256 onlineRate) external onlyMultiSig {
        require(nodeId > 0 && nodeId <= currentId, "Invalid node");
        require(onlineRate <= BASIS_POINTS, "Invalid rate");
        
        nodes[nodeId].onlineRate = onlineRate;
        
        if (onlineRate >= minOnlineRate) {
            _updateNodePower(nodeId);
        }
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
     * @dev 设置LP对地址
     */
    function setLPPair(address _lpPair) external onlyOwner {
        lpPair = IPancakePair(_lpPair);
    }
    
    /**
     * @dev 设置紧急暂停
     */
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPaused = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取节点信息
     */
    function getNodeInfo(uint256 nodeId) external view returns (
        address owner,
        bool isActive,
        uint256 activationTime,
        uint256 lpHCFAmount,
        uint256 onlineRate,
        uint256 level,
        uint256 totalDividends,
        uint256 power
    ) {
        NodeData memory node = nodes[nodeId];
        return (
            node.owner,
            node.isActive,
            node.activationTime,
            node.lpHCFAmount,
            node.onlineRate,
            node.level,
            node.totalDividends,
            _calculatePower(nodeId)
        );
    }
    
    /**
     * @dev 获取等级奖励信息
     */
    function getLevelBonus(uint256 nodeId) external view returns (
        uint256 bonusRate,
        uint256 voteMultiplier,
        uint256 rankingPoints
    ) {
        NodeData memory node = nodes[nodeId];
        if (!node.isActive || node.level >= nodeLevels.length) {
            return (0, 0, 0);
        }
        
        NodeLevel memory level = nodeLevels[node.level];
        return (
            level.bonusRate,
            level.voteMultiplier,
            level.rankingPoints
        );
    }
    
    /**
     * @dev 获取等级乘数
     */
    function _getLevelMultiplier(uint256 nodeId) internal view returns (uint256) {
        NodeData memory node = nodes[nodeId];
        if (!node.isActive || node.level >= nodeLevels.length) {
            return 100;  // 默认1x
        }
        return nodeLevels[node.level].voteMultiplier;
    }
    
    /**
     * @dev 获取节点数量
     */
    function getTotalNodes() external view returns (uint256 total, uint256 active) {
        total = currentId;
        active = 0;
        for (uint256 i = 1; i <= currentId; i++) {
            if (nodes[i].isActive) {
                active++;
            }
        }
    }
    
    /**
     * @dev 获取分红池信息
     */
    function getDividendPoolInfo(uint256 divType) external view returns (
        uint256 totalAmount,
        uint256 lastDistribution,
        uint256 accumulated
    ) {
        DividendPool memory pool = dividendPools[divType];
        return (pool.totalAmount, pool.lastDistribution, pool.accumulated);
    }
    
    /**
     * @dev 检查用户是否有节点
     */
    function hasNode(address user) external view returns (bool) {
        return ownerToNodeId[user] != 0;
    }
    
    /**
     * @dev 获取用户节点ID
     */
    function getUserNodeId(address user) external view returns (uint256) {
        return ownerToNodeId[user];
    }
}