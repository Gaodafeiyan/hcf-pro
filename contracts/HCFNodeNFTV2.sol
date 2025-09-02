// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IHCFStaking {
    function addExtraYield(address user, uint256 amount) external;
}

interface IHCFExchange {
    function getHCFPrice() external view returns (uint256);
}

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

/**
 * @title HCFNodeNFTV2
 * @dev 节点NFT系统 - 限量99个，申请激活、算力分红、等级权益
 */
contract HCFNodeNFTV2 is ERC721, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    // ============ 常量 ============
    uint256 public constant MAX_NODES = 99;                     // 最大节点数
    uint256 public constant PRECISION = 10000;                  // 精度
    uint256 public constant PRICE_THRESHOLD = 1.3 * 10**18;     // 价格阈值1.3U
    uint256 public constant DEFAULT_MAX_LP = 1000 * 10**18;     // 默认最大LP 1000 HCF
    
    // 节点等级门槛
    uint256[4] public LEVEL_THRESHOLDS = [
        10000 * 10**18,    // 轻量级: 1万 HCF
        50000 * 10**18,    // 中级: 5万 HCF
        200000 * 10**18,   // 高级: 20万 HCF
        500000 * 10**18    // 超级: 50万 HCF
    ];
    
    // 等级名称
    string[4] public LEVEL_NAMES = ["Light", "Medium", "Advanced", "Super"];
    
    // ============ 状态变量 ============
    IERC20 public hcfToken;
    IERC20 public bsdtToken;
    IHCFStaking public stakingContract;
    IHCFExchange public exchangeContract;
    address public multiSigWallet;
    address public poolAddress;      // 归集池地址
    
    Counters.Counter private _tokenIdCounter;
    
    // 节点参数
    uint256 public applicationFeeHCF = 5000 * 10**18;    // HCF申请费
    uint256 public applicationFeeBSDT = 5000 * 10**18;   // BSDT申请费
    uint256 public activationFeeHCF = 1000 * 10**18;     // 激活费HCF
    uint256 public activationFeeLP = 1000 * 10**18;      // 激活费LP
    uint256 public maxLPPerNode = DEFAULT_MAX_LP;        // 每节点最大LP
    uint256 public minOnlineRate = 9000;                  // 最小在线率90%
    
    // 分红池
    uint256 public totalDividendPool;      // 总分红池
    uint256 public lastDividendTime;       // 上次分红时间
    
    // 节点信息结构
    struct NodeInfo {
        uint256 lpAmount;           // LP数量
        uint256 onlineRate;         // 在线率（基点）
        uint256 computingPower;     // 算力（基点）
        uint256 activationTime;     // 激活时间
        uint256 lastClaimTime;      // 上次领取时间
        uint256 pendingDividends;   // 待领取分红
        uint256 totalClaimed;       // 总领取
        uint256 level;              // 节点等级
        bool isActive;              // 是否激活
    }
    
    // 映射
    mapping(uint256 => NodeInfo) public nodeInfo;
    mapping(address => uint256[]) public userNodes;
    mapping(address => uint256) public userHCFBalance;    // 用户HCF余额（用于等级判定）
    
    // 分红记录
    struct DividendRecord {
        uint256 amount;
        uint256 timestamp;
        string source;    // 来源：tax/withdrawal/deposit/slippage
    }
    
    DividendRecord[] public dividendHistory;
    
    // ============ 事件 ============
    event NodeMinted(address indexed owner, uint256 tokenId, uint256 fee, string currency);
    event NodeActivated(uint256 indexed tokenId, uint256 lpAmount);
    event ComputingPowerUpdated(uint256 indexed tokenId, uint256 oldPower, uint256 newPower);
    event DividendDistributed(uint256 amount, string source);
    event DividendClaimed(uint256 indexed tokenId, uint256 amount);
    event ExtraYieldAdded(address indexed owner, uint256 amount);
    event NodeLevelUpdated(uint256 indexed tokenId, uint256 oldLevel, uint256 newLevel);
    event OnlineRateUpdated(uint256 indexed tokenId, uint256 rate);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    modifier onlyNodeOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not node owner");
        _;
    }
    
    modifier updateDividends(uint256 tokenId) {
        if (nodeInfo[tokenId].isActive) {
            _updatePendingDividends(tokenId);
        }
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _stakingContract,
        address _exchangeContract,
        address _poolAddress
    ) ERC721("HCF Node NFT", "HCFNODE") {
        hcfToken = IERC20(_hcfToken);
        bsdtToken = IERC20(_bsdtToken);
        stakingContract = IHCFStaking(_stakingContract);
        exchangeContract = IHCFExchange(_exchangeContract);
        poolAddress = _poolAddress;
        lastDividendTime = block.timestamp;
    }
    
    // ============ 节点申请 ============
    
    /**
     * @dev 申请节点NFT
     */
    function mintNode() external nonReentrant returns (uint256) {
        require(_tokenIdCounter.current() < MAX_NODES, "All nodes minted");
        
        // 获取HCF价格
        uint256 hcfPrice = exchangeContract.getHCFPrice();
        
        // 决定使用哪种货币支付
        if (hcfPrice >= PRICE_THRESHOLD) {
            // 价格>=1.3U，使用HCF支付
            require(hcfToken.balanceOf(msg.sender) >= applicationFeeHCF, "Insufficient HCF");
            hcfToken.transferFrom(msg.sender, poolAddress, applicationFeeHCF);
            emit NodeMinted(msg.sender, _tokenIdCounter.current(), applicationFeeHCF, "HCF");
        } else {
            // 价格<1.3U，使用BSDT支付
            require(bsdtToken.balanceOf(msg.sender) >= applicationFeeBSDT, "Insufficient BSDT");
            bsdtToken.transferFrom(msg.sender, poolAddress, applicationFeeBSDT);
            emit NodeMinted(msg.sender, _tokenIdCounter.current(), applicationFeeBSDT, "BSDT");
        }
        
        // 铸造NFT
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, newTokenId);
        
        // 初始化节点信息
        nodeInfo[newTokenId] = NodeInfo({
            lpAmount: 0,
            onlineRate: 10000,    // 初始100%在线率
            computingPower: 0,
            activationTime: 0,
            lastClaimTime: block.timestamp,
            pendingDividends: 0,
            totalClaimed: 0,
            level: 0,
            isActive: false
        });
        
        userNodes[msg.sender].push(newTokenId);
        
        return newTokenId;
    }
    
    /**
     * @dev 激活节点
     */
    function activateNode(uint256 tokenId) external nonReentrant onlyNodeOwner(tokenId) {
        NodeInfo storage node = nodeInfo[tokenId];
        require(!node.isActive, "Already activated");
        
        // 收取激活费：1000 HCF + 1000 HCF/BSDT LP
        require(hcfToken.balanceOf(msg.sender) >= activationFeeHCF, "Insufficient HCF");
        require(bsdtToken.balanceOf(msg.sender) >= activationFeeLP, "Insufficient BSDT for LP");
        
        // 转入归集池（无分配）
        hcfToken.transferFrom(msg.sender, poolAddress, activationFeeHCF);
        bsdtToken.transferFrom(msg.sender, poolAddress, activationFeeLP);
        
        // 设置节点信息
        node.lpAmount = activationFeeLP;
        node.onlineRate = 10000;    // 初始100%在线率
        node.isActive = true;
        node.activationTime = block.timestamp;
        
        // 更新算力
        _updateComputingPower(tokenId);
        
        // 更新节点等级
        _updateNodeLevel(tokenId);
        
        emit NodeActivated(tokenId, activationFeeLP);
    }
    
    // ============ 算力管理 ============
    
    /**
     * @dev 更新节点算力
     */
    function updateNodePower(uint256 tokenId) external onlyNodeOwner(tokenId) updateDividends(tokenId) {
        _updateComputingPower(tokenId);
    }
    
    /**
     * @dev 内部更新算力
     */
    function _updateComputingPower(uint256 tokenId) private {
        NodeInfo storage node = nodeInfo[tokenId];
        if (!node.isActive) return;
        
        uint256 oldPower = node.computingPower;
        
        // 算力 = LP / maxLP * 100%
        uint256 powerFromLP = (node.lpAmount * PRECISION) / maxLPPerNode;
        if (powerFromLP > PRECISION) {
            powerFromLP = PRECISION;
        }
        
        // 在线率影响
        if (node.onlineRate < minOnlineRate) {
            // 低于最小在线率，算力为0
            node.computingPower = 0;
        } else {
            node.computingPower = powerFromLP;
        }
        
        // 如果LP超过最大值，增加质押产出
        if (node.lpAmount > maxLPPerNode) {
            uint256 excess = node.lpAmount - maxLPPerNode;
            stakingContract.addExtraYield(ownerOf(tokenId), excess);
            emit ExtraYieldAdded(ownerOf(tokenId), excess);
        }
        
        emit ComputingPowerUpdated(tokenId, oldPower, node.computingPower);
    }
    
    /**
     * @dev 补充LP恢复算力
     */
    function supplementLP(uint256 tokenId, uint256 amount) external nonReentrant onlyNodeOwner(tokenId) updateDividends(tokenId) {
        NodeInfo storage node = nodeInfo[tokenId];
        require(node.isActive, "Node not active");
        
        // 转入LP
        hcfToken.transferFrom(msg.sender, poolAddress, amount);
        bsdtToken.transferFrom(msg.sender, poolAddress, amount);
        
        // 更新LP数量
        node.lpAmount += amount;
        
        // 更新算力
        _updateComputingPower(tokenId);
    }
    
    /**
     * @dev 设置在线率（系统调用）
     */
    function setOnlineRate(uint256 tokenId, uint256 rate) external onlyMultiSig {
        require(rate <= PRECISION, "Invalid rate");
        nodeInfo[tokenId].onlineRate = rate;
        
        // 更新算力
        _updateComputingPower(tokenId);
        
        emit OnlineRateUpdated(tokenId, rate);
    }
    
    // ============ 分红机制 ============
    
    /**
     * @dev 添加分红（从税费、提现费等）
     */
    function addDividend(uint256 amount, string memory source) external {
        require(
            msg.sender == address(hcfToken) || 
            msg.sender == address(stakingContract) ||
            msg.sender == multiSigWallet,
            "Unauthorized"
        );
        
        totalDividendPool += amount;
        
        dividendHistory.push(DividendRecord({
            amount: amount,
            timestamp: block.timestamp,
            source: source
        }));
        
        emit DividendDistributed(amount, source);
    }
    
    /**
     * @dev 分配分红到所有节点
     */
    function distributeDividends() external nonReentrant {
        require(totalDividendPool > 0, "No dividends");
        
        uint256 totalPower = _getTotalComputingPower();
        require(totalPower > 0, "No active nodes");
        
        uint256 toDistribute = totalDividendPool;
        totalDividendPool = 0;
        
        // 按算力加权分配
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (nodeInfo[i].isActive && nodeInfo[i].computingPower > 0) {
                uint256 share = (toDistribute * nodeInfo[i].computingPower) / totalPower;
                nodeInfo[i].pendingDividends += share;
            }
        }
        
        lastDividendTime = block.timestamp;
    }
    
    /**
     * @dev 领取分红
     */
    function claimDividends(uint256 tokenId) external nonReentrant onlyNodeOwner(tokenId) updateDividends(tokenId) {
        NodeInfo storage node = nodeInfo[tokenId];
        require(node.isActive, "Node not active");
        require(node.pendingDividends > 0, "No dividends");
        
        uint256 amount = node.pendingDividends;
        node.pendingDividends = 0;
        node.lastClaimTime = block.timestamp;
        node.totalClaimed += amount;
        
        // 应用节点等级加成
        uint256 bonus = _getLevelBonus(node.level);
        uint256 totalAmount = amount + (amount * bonus / PRECISION);
        
        hcfToken.transfer(msg.sender, totalAmount);
        
        emit DividendClaimed(tokenId, totalAmount);
    }
    
    /**
     * @dev 更新待领取分红
     */
    function _updatePendingDividends(uint256 tokenId) private {
        NodeInfo storage node = nodeInfo[tokenId];
        
        // 自动分配期间产生的分红
        if (totalDividendPool > 0 && block.timestamp > lastDividendTime) {
            uint256 totalPower = _getTotalComputingPower();
            if (totalPower > 0 && node.computingPower > 0) {
                uint256 share = (totalDividendPool * node.computingPower) / totalPower;
                node.pendingDividends += share;
            }
        }
    }
    
    // ============ 等级权益 ============
    
    /**
     * @dev 更新节点等级
     */
    function _updateNodeLevel(uint256 tokenId) private {
        NodeInfo storage node = nodeInfo[tokenId];
        address owner = ownerOf(tokenId);
        uint256 balance = hcfToken.balanceOf(owner);
        
        uint256 oldLevel = node.level;
        
        // 根据持币量确定等级
        if (balance >= LEVEL_THRESHOLDS[3]) {
            node.level = 4;    // 超级
        } else if (balance >= LEVEL_THRESHOLDS[2]) {
            node.level = 3;    // 高级
        } else if (balance >= LEVEL_THRESHOLDS[1]) {
            node.level = 2;    // 中级
        } else if (balance >= LEVEL_THRESHOLDS[0]) {
            node.level = 1;    // 轻量
        } else {
            node.level = 0;    // 无等级
        }
        
        if (oldLevel != node.level) {
            emit NodeLevelUpdated(tokenId, oldLevel, node.level);
        }
    }
    
    /**
     * @dev 获取等级加成
     */
    function _getLevelBonus(uint256 level) private pure returns (uint256) {
        if (level == 0) return 0;
        if (level == 1) return 500;     // +5%
        if (level == 2) return 1000;    // +10%
        if (level == 3) return 1500;    // +15%
        if (level == 4) return 2000;    // +20%
        return 0;
    }
    
    /**
     * @dev 获取投票权重
     */
    function getVotingPower(uint256 tokenId) external view returns (uint256) {
        NodeInfo memory node = nodeInfo[tokenId];
        if (!node.isActive) return 0;
        
        // 投票权重 = 算力 * 等级乘数
        uint256 multiplier = 100 + (node.level * 25);    // 1.0x, 1.25x, 1.5x, 1.75x, 2.0x
        return (node.computingPower * multiplier) / 100;
    }
    
    /**
     * @dev 获取排名加分
     */
    function getRankingBonus(uint256 tokenId) external view returns (uint256) {
        NodeInfo memory node = nodeInfo[tokenId];
        if (!node.isActive) return 0;
        
        // 超级节点+500分
        if (node.level == 4) return 500;
        // 高级节点+300分
        if (node.level == 3) return 300;
        // 中级节点+150分
        if (node.level == 2) return 150;
        // 轻量节点+50分
        if (node.level == 1) return 50;
        
        return 0;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取总算力
     */
    function _getTotalComputingPower() private view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (nodeInfo[i].isActive) {
                total += nodeInfo[i].computingPower;
            }
        }
        return total;
    }
    
    /**
     * @dev 获取节点详细信息
     */
    function getNodeDetails(uint256 tokenId) external view returns (
        address owner,
        uint256 lpAmount,
        uint256 onlineRate,
        uint256 computingPower,
        uint256 level,
        string memory levelName,
        uint256 pendingDividends,
        uint256 totalClaimed,
        bool isActive
    ) {
        NodeInfo memory node = nodeInfo[tokenId];
        address nodeOwner = _exists(tokenId) ? ownerOf(tokenId) : address(0);
        
        string memory lName = node.level > 0 ? LEVEL_NAMES[node.level - 1] : "None";
        
        return (
            nodeOwner,
            node.lpAmount,
            node.onlineRate,
            node.computingPower,
            node.level,
            lName,
            node.pendingDividends,
            node.totalClaimed,
            node.isActive
        );
    }
    
    /**
     * @dev 获取用户所有节点
     */
    function getUserNodes(address user) external view returns (uint256[] memory) {
        return userNodes[user];
    }
    
    /**
     * @dev 获取活跃节点数
     */
    function getActiveNodeCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (nodeInfo[i].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 获取分红历史
     */
    function getDividendHistory(uint256 offset, uint256 limit) external view returns (DividendRecord[] memory) {
        uint256 total = dividendHistory.length;
        if (offset >= total) {
            return new DividendRecord[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        DividendRecord[] memory result = new DividendRecord[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            result[i] = dividendHistory[offset + i];
        }
        
        return result;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSig) external onlyOwner {
        multiSigWallet = _multiSig;
    }
    
    /**
     * @dev 设置申请费用（多签）
     */
    function setApplicationFees(uint256 hcfFee, uint256 bsdtFee) external onlyMultiSig {
        applicationFeeHCF = hcfFee;
        applicationFeeBSDT = bsdtFee;
    }
    
    /**
     * @dev 设置激活费用（多签）
     */
    function setActivationFees(uint256 hcfFee, uint256 lpFee) external onlyMultiSig {
        activationFeeHCF = hcfFee;
        activationFeeLP = lpFee;
    }
    
    /**
     * @dev 设置最大LP和最小在线率（多签）
     */
    function setNodeParameters(uint256 maxLP, uint256 minOnline) external onlyMultiSig {
        maxLPPerNode = maxLP;
        minOnlineRate = minOnline;
        
        // 更新所有节点算力
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (nodeInfo[i].isActive) {
                _updateComputingPower(i);
            }
        }
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
    
    /**
     * @dev 检查tokenId是否存在
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev 获取token所有者
     */
    function _ownerOf(uint256 tokenId) internal view returns (address) {
        try this.ownerOf(tokenId) returns (address owner) {
            return owner;
        } catch {
            return address(0);
        }
    }
}