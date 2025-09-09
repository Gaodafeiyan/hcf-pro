// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title SimpleNodeNFT
 * @dev 简化版节点NFT - 99个节点，固定费用，分红机制
 */
contract SimpleNodeNFT is ERC721, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_NODES = 99;
    uint256 public constant APPLICATION_FEE = 5000 * 10**18;  // 5000 BSDT
    uint256 public constant ACTIVATION_HCF = 1000 * 10**18;   // 1000 HCF
    uint256 public constant ACTIVATION_LP = 1000 * 10**18;    // 1000 HCF/BSDT LP
    
    // ============ 结构体 ============
    struct NodeInfo {
        address owner;           // 节点拥有者
        bool isActive;          // 是否激活
        uint256 activationTime; // 激活时间
        uint256 totalDividends; // 总分红
        uint256 lpAmount;       // LP数量
    }
    
    struct DividendPool {
        uint256 slippage;       // 滑点分红池
        uint256 withdrawal;     // 提现手续费池
        uint256 entry;          // 入金分红池
        uint256 antiDump;       // 防暴跌分红池
    }
    
    // ============ 状态变量 ============
    uint256 public currentNodeId;
    mapping(uint256 => NodeInfo) public nodes;
    mapping(address => uint256) public ownerToNodeId;
    
    DividendPool public dividendPool;
    uint256 public totalActiveNodes;
    
    IERC20 public bsdtToken;
    IERC20 public hcfToken;
    address public collectionAddress;
    
    // ============ 事件 ============
    event NodeApplied(address indexed user, uint256 indexed nodeId);
    event NodeActivated(address indexed user, uint256 indexed nodeId);
    event DividendsDistributed(string poolType, uint256 amount, uint256 perNode);
    event DividendsClaimed(address indexed user, uint256 amount);
    
    // ============ 构造函数 ============
    constructor(
        address _bsdtToken,
        address _hcfToken,
        address _collectionAddress
    ) ERC721("HCF Node", "HCFNODE") Ownable() {
        bsdtToken = IERC20(_bsdtToken);
        hcfToken = IERC20(_hcfToken);
        collectionAddress = _collectionAddress;
    }
    
    // ============ 节点功能 ============
    
    /**
     * @dev 申请节点
     */
    function applyForNode() external nonReentrant returns (uint256) {
        require(currentNodeId < MAX_NODES, "Max nodes reached");
        require(ownerToNodeId[msg.sender] == 0, "Already has node");
        
        // 收取5000 BSDT申请费
        require(
            bsdtToken.transferFrom(msg.sender, collectionAddress, APPLICATION_FEE),
            "BSDT transfer failed"
        );
        
        // 铸造NFT
        currentNodeId++;
        _safeMint(msg.sender, currentNodeId);
        
        // 初始化节点信息
        nodes[currentNodeId] = NodeInfo({
            owner: msg.sender,
            isActive: false,
            activationTime: 0,
            totalDividends: 0,
            lpAmount: 0
        });
        
        ownerToNodeId[msg.sender] = currentNodeId;
        
        emit NodeApplied(msg.sender, currentNodeId);
        return currentNodeId;
    }
    
    /**
     * @dev 激活节点
     */
    function activateNode() external nonReentrant {
        uint256 nodeId = ownerToNodeId[msg.sender];
        require(nodeId > 0, "No node");
        require(!nodes[nodeId].isActive, "Already activated");
        
        // 收取1000 HCF + 1000 HCF/BSDT LP
        require(
            hcfToken.transferFrom(msg.sender, collectionAddress, ACTIVATION_HCF),
            "HCF transfer failed"
        );
        
        require(
            hcfToken.transferFrom(msg.sender, collectionAddress, ACTIVATION_LP),
            "HCF LP transfer failed"
        );
        
        require(
            bsdtToken.transferFrom(msg.sender, collectionAddress, ACTIVATION_LP),
            "BSDT LP transfer failed"
        );
        
        // 激活节点
        nodes[nodeId].isActive = true;
        nodes[nodeId].activationTime = block.timestamp;
        nodes[nodeId].lpAmount = ACTIVATION_LP;
        totalActiveNodes++;
        
        emit NodeActivated(msg.sender, nodeId);
    }
    
    // ============ 分红功能 ============
    
    /**
     * @dev 添加滑点分红
     */
    function addSlippageDividend(uint256 amount) external {
        dividendPool.slippage += amount;
    }
    
    /**
     * @dev 添加提现手续费分红（2%）
     */
    function addWithdrawalDividend(uint256 amount) external {
        dividendPool.withdrawal += amount;
    }
    
    /**
     * @dev 添加入金分红（2%）
     */
    function addEntryDividend(uint256 amount) external {
        dividendPool.entry += amount;
    }
    
    /**
     * @dev 添加防暴跌分红
     */
    function addAntiDumpDividend(uint256 amount) external {
        dividendPool.antiDump += amount;
    }
    
    /**
     * @dev 分发所有分红
     */
    function distributeAllDividends() external onlyOwner {
        if (totalActiveNodes == 0) return;
        
        // 分发滑点分红
        if (dividendPool.slippage > 0) {
            _distributeDividend("slippage", dividendPool.slippage);
            dividendPool.slippage = 0;
        }
        
        // 分发提现手续费分红
        if (dividendPool.withdrawal > 0) {
            _distributeDividend("withdrawal", dividendPool.withdrawal);
            dividendPool.withdrawal = 0;
        }
        
        // 分发入金分红
        if (dividendPool.entry > 0) {
            _distributeDividend("entry", dividendPool.entry);
            dividendPool.entry = 0;
        }
        
        // 分发防暴跌分红
        if (dividendPool.antiDump > 0) {
            _distributeDividend("antiDump", dividendPool.antiDump);
            dividendPool.antiDump = 0;
        }
    }
    
    /**
     * @dev 内部分发分红
     */
    function _distributeDividend(string memory poolType, uint256 totalAmount) internal {
        uint256 perNodeAmount = totalAmount / totalActiveNodes;
        
        for (uint256 i = 1; i <= currentNodeId; i++) {
            if (nodes[i].isActive) {
                nodes[i].totalDividends += perNodeAmount;
            }
        }
        
        emit DividendsDistributed(poolType, totalAmount, perNodeAmount);
    }
    
    /**
     * @dev 领取分红
     */
    function claimDividends() external nonReentrant {
        uint256 nodeId = ownerToNodeId[msg.sender];
        require(nodeId > 0, "No node");
        require(nodes[nodeId].isActive, "Node not active");
        
        uint256 dividends = nodes[nodeId].totalDividends;
        require(dividends > 0, "No dividends");
        
        nodes[nodeId].totalDividends = 0;
        
        require(hcfToken.transfer(msg.sender, dividends), "Transfer failed");
        
        emit DividendsClaimed(msg.sender, dividends);
    }
    
    // ============ 防暴跌机制集成 ============
    
    /**
     * @dev 处理防暴跌滑点增加
     * @param dropPercent 下跌百分比（10, 30, 50）
     */
    function handleAntiDumpSlippage(uint256 dropPercent, uint256 slippageAmount) external onlyOwner {
        uint256 burnAmount;
        uint256 nodeAmount;
        
        if (dropPercent >= 50) {
            // 下跌50%：20%销毁，10%节点
            burnAmount = (slippageAmount * 20) / 30;
            nodeAmount = (slippageAmount * 10) / 30;
        } else if (dropPercent >= 30) {
            // 下跌30%：10%销毁，5%节点
            burnAmount = (slippageAmount * 10) / 15;
            nodeAmount = (slippageAmount * 5) / 15;
        } else if (dropPercent >= 10) {
            // 下跌10%：3%销毁，2%节点
            burnAmount = (slippageAmount * 3) / 5;
            nodeAmount = (slippageAmount * 2) / 5;
        }
        
        if (burnAmount > 0) {
            hcfToken.transfer(address(0), burnAmount);  // 销毁
        }
        
        if (nodeAmount > 0) {
            dividendPool.antiDump += nodeAmount;
        }
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取节点信息
     */
    function getNodeInfo(uint256 nodeId) external view returns (
        address owner,
        bool isActive,
        uint256 activationTime,
        uint256 totalDividends,
        uint256 lpAmount
    ) {
        NodeInfo memory node = nodes[nodeId];
        return (
            node.owner,
            node.isActive,
            node.activationTime,
            node.totalDividends,
            node.lpAmount
        );
    }
    
    /**
     * @dev 获取用户节点ID
     */
    function getUserNodeId(address user) external view returns (uint256) {
        return ownerToNodeId[user];
    }
    
    /**
     * @dev 检查用户是否有节点
     */
    function hasNode(address user) external view returns (bool) {
        return ownerToNodeId[user] > 0;
    }
    
    /**
     * @dev 获取分红池信息
     */
    function getDividendPools() external view returns (
        uint256 slippage,
        uint256 withdrawal,
        uint256 entry,
        uint256 antiDump
    ) {
        return (
            dividendPool.slippage,
            dividendPool.withdrawal,
            dividendPool.entry,
            dividendPool.antiDump
        );
    }
    
    /**
     * @dev 获取节点统计
     */
    function getNodeStats() external view returns (
        uint256 total,
        uint256 active,
        uint256 remaining
    ) {
        return (
            currentNodeId,
            totalActiveNodes,
            MAX_NODES - currentNodeId
        );
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置归集地址
     */
    function setCollectionAddress(address _collection) external onlyOwner {
        collectionAddress = _collection;
    }
    
    /**
     * @dev 紧急提取（仅用于紧急情况）
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev 覆盖转移函数，禁止节点NFT转移
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // 只允许铸造和销毁，不允许转移
        require(
            from == address(0) || to == address(0),
            "Node NFT cannot be transferred"
        );
    }
}