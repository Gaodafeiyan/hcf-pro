// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HCFNode
 * @dev 节点NFT系统 - 限量99个节点
 */
contract HCFNode is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_NODES = 99;
    uint256 public constant APPLICATION_FEE = 5000 * 10**18; // 5000 BSDT
    uint256 public constant ACTIVATION_HCF = 1000 * 10**18;  // 1000 HCF
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ 结构体 ============
    struct NodeInfo {
        bool isActive;              // 是否激活
        uint256 activationTime;     // 激活时间
        uint256 totalRewards;       // 总收益
        uint256 unclaimedRewards;   // 未领取收益
        uint256 weight;             // 权重（用于加权分红）
        string name;                // 节点名称
    }
    
    struct RewardPool {
        uint256 slippageRewards;    // 滑点分红池
        uint256 withdrawFeeRewards; // 提现手续费分红池
        uint256 entryFeeRewards;    // 入单分红池
        uint256 antiDumpRewards;    // 防暴跌分红池
    }
    
    // ============ 状态变量 ============
    
    // 节点信息
    mapping(uint256 => NodeInfo) public nodeInfo;
    uint256 public currentNodeId;
    uint256 public totalActiveNodes;
    
    // 奖励池
    RewardPool public rewardPool;
    uint256 public totalDistributed;
    
    // 费用分配
    uint256 public slippageShareRate = 2000;      // 滑点分红20%
    uint256 public withdrawFeeShareRate = 2000;   // 提现手续费2%
    uint256 public entryFeeShareRate = 200;       // 全网入单2%
    
    // 合约地址
    IERC20 public bsdtToken;
    IERC20 public hcfToken;
    address public stakingContract;
    address public antiDumpContract;
    
    // 白名单和黑名单
    mapping(address => bool) public whitelist;
    mapping(address => bool) public blacklist;
    
    mapping(address => bool) public operators;
    
    // ============ 事件 ============
    event NodeApplied(address indexed applicant, uint256 nodeId);
    event NodeActivated(uint256 indexed nodeId, address indexed owner);
    event RewardsDistributed(uint256 amount, string rewardType);
    event RewardsClaimed(uint256 indexed nodeId, uint256 amount);
    event NodeTransferred(uint256 indexed nodeId, address from, address to);
    
    // ============ 修饰符 ============
    modifier onlyNodeOwner(uint256 nodeId) {
        require(ownerOf(nodeId) == msg.sender, "Not node owner");
        _;
    }
    
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == stakingContract || 
            msg.sender == antiDumpContract ||
            operators[msg.sender] ||
            msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _bsdtToken,
        address _hcfToken
    ) ERC721("HCF Node", "HCFNODE") Ownable() {
        bsdtToken = IERC20(_bsdtToken);
        hcfToken = IERC20(_hcfToken);
    }
    
    // ============ 节点申请和激活 ============
    
    /**
     * @dev 申请节点
     */
    function applyForNode() external nonReentrant {
        require(currentNodeId < MAX_NODES, "All nodes allocated");
        require(!blacklist[msg.sender], "Blacklisted");
        require(balanceOf(msg.sender) == 0, "Already own a node");
        
        // 收取申请费用
        require(
            bsdtToken.transferFrom(msg.sender, address(this), APPLICATION_FEE),
            "BSDT transfer failed"
        );
        
        // 铸造节点NFT
        currentNodeId++;
        _safeMint(msg.sender, currentNodeId);
        
        // 初始化节点信息
        nodeInfo[currentNodeId] = NodeInfo({
            isActive: false,
            activationTime: 0,
            totalRewards: 0,
            unclaimedRewards: 0,
            weight: 100, // 默认权重100
            name: string(abi.encodePacked("Node #", _toString(currentNodeId)))
        });
        
        emit NodeApplied(msg.sender, currentNodeId);
    }
    
    /**
     * @dev 激活节点
     */
    function activateNode(uint256 nodeId) external onlyNodeOwner(nodeId) nonReentrant {
        NodeInfo storage node = nodeInfo[nodeId];
        require(!node.isActive, "Already active");
        
        // 收取激活费用：1000 HCF + 等值HCF/BSDT LP
        require(
            hcfToken.transferFrom(msg.sender, address(this), ACTIVATION_HCF),
            "HCF transfer failed"
        );
        
        // 这里简化处理，实际需要验证LP代币
        // TODO: 验证LP代币
        
        node.isActive = true;
        node.activationTime = block.timestamp;
        totalActiveNodes++;
        
        emit NodeActivated(nodeId, msg.sender);
    }
    
    // ============ 分红功能 ============
    
    /**
     * @dev 分发滑点分红
     */
    function distributeSlippageRewards(uint256 amount) external onlyAuthorized {
        if (totalActiveNodes == 0) return;
        
        rewardPool.slippageRewards += amount;
        _distributeToNodes(amount, "slippage");
    }
    
    /**
     * @dev 分发提现手续费分红
     */
    function distributeWithdrawFeeRewards(uint256 amount) external onlyAuthorized {
        if (totalActiveNodes == 0) return;
        
        rewardPool.withdrawFeeRewards += amount;
        _distributeToNodes(amount, "withdrawFee");
    }
    
    /**
     * @dev 分发入单分红
     */
    function distributeEntryRewards(uint256 amount) external onlyAuthorized {
        if (totalActiveNodes == 0) return;
        
        rewardPool.entryFeeRewards += amount;
        _distributeToNodes(amount, "entry");
    }
    
    /**
     * @dev 分发防暴跌分红
     */
    function distributeAntiDumpRewards(uint256 amount) external onlyAuthorized {
        if (totalActiveNodes == 0) return;
        
        rewardPool.antiDumpRewards += amount;
        _distributeToNodes(amount, "antiDump");
    }
    
    /**
     * @dev 统一分发接口
     */
    function distributeDividends(uint256 amount) external onlyAuthorized {
        if (totalActiveNodes == 0) return;
        
        _distributeToNodes(amount, "general");
    }
    
    /**
     * @dev 内部分发到节点
     */
    function _distributeToNodes(uint256 amount, string memory rewardType) internal {
        uint256 totalWeight = _getTotalWeight();
        if (totalWeight == 0) return;
        
        for (uint256 i = 1; i <= currentNodeId; i++) {
            if (nodeInfo[i].isActive) {
                uint256 nodeShare = (amount * nodeInfo[i].weight) / totalWeight;
                nodeInfo[i].unclaimedRewards += nodeShare;
                nodeInfo[i].totalRewards += nodeShare;
            }
        }
        
        totalDistributed += amount;
        emit RewardsDistributed(amount, rewardType);
    }
    
    /**
     * @dev 获取总权重
     */
    function _getTotalWeight() internal view returns (uint256) {
        uint256 totalWeight = 0;
        for (uint256 i = 1; i <= currentNodeId; i++) {
            if (nodeInfo[i].isActive) {
                totalWeight += nodeInfo[i].weight;
            }
        }
        return totalWeight;
    }
    
    /**
     * @dev 领取奖励
     */
    function claimRewards(uint256 nodeId) external onlyNodeOwner(nodeId) nonReentrant {
        NodeInfo storage node = nodeInfo[nodeId];
        require(node.isActive, "Node not active");
        
        uint256 rewards = node.unclaimedRewards;
        require(rewards > 0, "No rewards");
        
        node.unclaimedRewards = 0;
        
        require(hcfToken.transfer(msg.sender, rewards), "Transfer failed");
        
        emit RewardsClaimed(nodeId, rewards);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取节点详情
     */
    function getNodeDetails(uint256 nodeId) external view returns (
        address owner,
        bool isActive,
        uint256 activationTime,
        uint256 totalRewards,
        uint256 unclaimedRewards,
        uint256 weight,
        string memory name
    ) {
        require(_exists(nodeId), "Node not exists");
        NodeInfo memory node = nodeInfo[nodeId];
        
        return (
            ownerOf(nodeId),
            node.isActive,
            node.activationTime,
            node.totalRewards,
            node.unclaimedRewards,
            node.weight,
            node.name
        );
    }
    
    /**
     * @dev 获取用户的节点
     */
    function getUserNode(address user) external view returns (uint256) {
        if (balanceOf(user) > 0) {
            return tokenOfOwnerByIndex(user, 0);
        }
        return 0;
    }
    
    /**
     * @dev 获取所有活跃节点
     */
    function getActiveNodes() external view returns (uint256[] memory) {
        uint256[] memory activeNodes = new uint256[](totalActiveNodes);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= currentNodeId; i++) {
            if (nodeInfo[i].isActive) {
                activeNodes[index] = i;
                index++;
            }
        }
        
        return activeNodes;
    }
    
    /**
     * @dev 获取奖励池状态
     */
    function getRewardPoolStatus() external view returns (
        uint256 slippage,
        uint256 withdrawFee,
        uint256 entry,
        uint256 antiDump,
        uint256 total
    ) {
        return (
            rewardPool.slippageRewards,
            rewardPool.withdrawFeeRewards,
            rewardPool.entryFeeRewards,
            rewardPool.antiDumpRewards,
            totalDistributed
        );
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _stakingContract,
        address _antiDumpContract
    ) external onlyOwner {
        if (_stakingContract != address(0)) stakingContract = _stakingContract;
        if (_antiDumpContract != address(0)) antiDumpContract = _antiDumpContract;
    }
    
    /**
     * @dev 设置操作员
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }
    
    /**
     * @dev 更新节点权重
     */
    function updateNodeWeight(uint256 nodeId, uint256 weight) external onlyOperator {
        require(_exists(nodeId), "Node not exists");
        require(weight > 0 && weight <= 1000, "Invalid weight");
        
        nodeInfo[nodeId].weight = weight;
    }
    
    /**
     * @dev 更新节点名称
     */
    function updateNodeName(uint256 nodeId, string memory name) external onlyNodeOwner(nodeId) {
        nodeInfo[nodeId].name = name;
    }
    
    /**
     * @dev 设置白名单
     */
    function setWhitelist(address user, bool status) external onlyOperator {
        whitelist[user] = status;
    }
    
    /**
     * @dev 设置黑名单
     */
    function setBlacklist(address user, bool status) external onlyOperator {
        blacklist[user] = status;
    }
    
    /**
     * @dev 更新费率
     */
    function updateFeeRates(
        uint256 _slippageRate,
        uint256 _withdrawRate,
        uint256 _entryRate
    ) external onlyOperator {
        slippageShareRate = _slippageRate;
        withdrawFeeShareRate = _withdrawRate;
        entryFeeShareRate = _entryRate;
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // ============ 内部函数 ============
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // ============ 重写函数 ============
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // 转移时检查黑名单
        if (to != address(0)) {
            require(!blacklist[to], "Recipient blacklisted");
            require(balanceOf(to) == 0, "Already owns a node");
        }
        
        if (from != address(0) && to != address(0)) {
            emit NodeTransferred(tokenId, from, to);
        }
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}