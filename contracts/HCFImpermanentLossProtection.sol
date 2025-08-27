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
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IHCFNodeNFT {
    function hasNode(address user) external view returns (bool);
    function nodes(uint256 nodeId) external view returns (
        address owner,
        bool isActive,
        uint256 activationTime,
        uint256 lpHCFAmount,
        uint256 onlineRate,
        uint256 level,
        uint256 lastUpdateTime,
        uint256 totalDividends
    );
    function getUserNodeId(address user) external view returns (uint256);
}

interface IHCFStaking {
    function userInfo(address user) external view returns (
        uint256 amount,
        uint256 level,
        uint256 pending,
        uint256 totalClaimed,
        bool isLP,
        uint256 compoundCount,
        bool isEquityLP,
        uint256 lpHCFAmount,
        uint256 lpBSDTAmount,
        uint256 lastUpdate,
        uint256[7] memory buyHistory,
        uint256 sharingTotal,
        uint256 stakingTime
    );
}

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

/**
 * @title HCFImpermanentLossProtection
 * @dev 无常损失保护合约 - 最小500 HCF补偿，节点优先
 */
contract HCFImpermanentLossProtection is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;  // 24小时冷却期
    uint256 public constant NODE_BONUS_RATE = 2000;  // 节点额外20%奖励
    
    // ============ 结构体 ============
    struct UserData {
        uint256 lastClaimTime;      // 上次领取时间
        uint256 totalCompensated;   // 总补偿金额
        uint256 initialLPAmount;    // 初始LP数量
    }
    
    // ============ 状态变量 ============
    
    // 补偿配置
    uint256 public lossThreshold = 500 * 10**18;  // 最小补偿500 HCF
    uint256 public maxCompensation = 10000 * 10**18;  // 最大补偿10000 HCF（可选）
    uint256 public compensationPool;  // 补偿池余额
    
    // 用户数据
    mapping(address => UserData) public userData;
    
    // 合约地址
    address public multiSigWallet;
    IHCFToken public hcfToken;
    IHCFNodeNFT public nodeContract;
    IHCFStaking public stakingContract;
    IPancakePair public lpPair;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // 统计数据
    uint256 public totalCompensated;
    uint256 public totalClaims;
    
    // ============ 事件 ============
    event CompensationClaimed(address indexed user, uint256 amount, bool isPriority);
    event PoolAdded(uint256 amount);
    event ThresholdUpdated(uint256 newThreshold);
    event MaxCompensationUpdated(uint256 newMax);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event EmergencyPauseSet(bool status);
    event InitialLPRecorded(address indexed user, uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier cooldownCheck() {
        UserData storage user = userData[msg.sender];
        require(
            block.timestamp >= user.lastClaimTime + COOLDOWN_PERIOD,
            "Cooldown period not met"
        );
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _multiSigWallet
    ) Ownable(msg.sender) {
        hcfToken = IHCFToken(_hcfToken);
        multiSigWallet = _multiSigWallet;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 申请无常损失补偿
     */
    function claimCompensation() 
        external 
        nonReentrant 
        notPaused 
        cooldownCheck 
        returns (uint256) 
    {
        // 获取用户LP信息
        uint256 currentLPAmount = _getCurrentLPAmount(msg.sender);
        uint256 initialLPAmount = _getInitialLPAmount(msg.sender);
        
        // 检查是否有损失
        require(initialLPAmount > 0, "No LP position");
        require(currentLPAmount < initialLPAmount, "No impermanent loss");
        
        // 计算损失
        uint256 loss = initialLPAmount - currentLPAmount;
        
        // 计算补偿金额（至少补偿最小阈值）
        uint256 compensation = loss > lossThreshold ? loss : lossThreshold;
        
        // 应用最大补偿限制
        if (maxCompensation > 0 && compensation > maxCompensation) {
            compensation = maxCompensation;
        }
        
        // 检查是否是节点用户（优先补偿）
        bool isNodeUser = _isNodeUser(msg.sender);
        if (isNodeUser) {
            // 节点用户额外20%奖励
            uint256 bonus = (compensation * NODE_BONUS_RATE) / BASIS_POINTS;
            compensation += bonus;
        }
        
        // 检查补偿池余额
        require(compensationPool >= compensation, "Insufficient pool balance");
        
        // 执行补偿
        _applyCompensation(msg.sender, compensation, isNodeUser);
        
        return compensation;
    }
    
    /**
     * @dev 记录初始LP数量（用户首次提供流动性时调用）
     */
    function recordInitialLP(address user) external {
        require(msg.sender == address(stakingContract) || msg.sender == user, "Unauthorized");
        
        UserData storage data = userData[user];
        if (data.initialLPAmount == 0) {
            uint256 lpAmount = _getCurrentLPAmount(user);
            if (lpAmount > 0) {
                data.initialLPAmount = lpAmount;
                emit InitialLPRecorded(user, lpAmount);
            }
        }
    }
    
    /**
     * @dev 添加资金到补偿池（多签调用）
     */
    function addToPool(uint256 amount) external onlyMultiSig {
        require(amount > 0, "Amount must be > 0");
        
        // 从多签钱包转入资金
        require(
            hcfToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        compensationPool += amount;
        
        emit PoolAdded(amount);
    }
    
    /**
     * @dev 从财库添加资金（内部调用）
     */
    function addFromTreasury(uint256 amount) external {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Unauthorized");
        require(amount > 0, "Amount must be > 0");
        
        compensationPool += amount;
        
        emit PoolAdded(amount);
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 执行补偿
     */
    function _applyCompensation(
        address user,
        uint256 amount,
        bool isPriority
    ) internal {
        UserData storage data = userData[user];
        
        // 更新用户数据
        data.lastClaimTime = block.timestamp;
        data.totalCompensated += amount;
        
        // 更新补偿池
        compensationPool -= amount;
        
        // 更新统计
        totalCompensated += amount;
        totalClaims++;
        
        // 转账补偿
        require(hcfToken.transfer(user, amount), "Compensation transfer failed");
        
        // 恢复用户的产出率到100%（通过质押合约处理）
        _restoreUserRate(user);
        
        emit CompensationClaimed(user, amount, isPriority);
    }
    
    /**
     * @dev 获取用户当前LP数量
     */
    function _getCurrentLPAmount(address user) internal view returns (uint256) {
        if (address(stakingContract) == address(0)) return 0;
        
        // 从质押合约获取LP信息
        (
            ,,,, 
            bool isLP,
            ,
            ,
            uint256 lpHCFAmount,
            ,
            ,
            ,
            ,
        ) = stakingContract.userInfo(user);
        
        if (!isLP) return 0;
        
        return lpHCFAmount;
    }
    
    /**
     * @dev 获取用户初始LP数量
     */
    function _getInitialLPAmount(address user) internal view returns (uint256) {
        UserData memory data = userData[user];
        
        // 如果有记录的初始值，使用记录值
        if (data.initialLPAmount > 0) {
            return data.initialLPAmount;
        }
        
        // 否则从质押合约获取当前质押量作为初始值
        if (address(stakingContract) != address(0)) {
            (uint256 amount,,,,bool isLP,,,,,,,,) = stakingContract.userInfo(user);
            if (isLP && amount > 0) {
                return amount;
            }
        }
        
        return 0;
    }
    
    /**
     * @dev 检查是否是节点用户
     */
    function _isNodeUser(address user) internal view returns (bool) {
        if (address(nodeContract) == address(0)) return false;
        return nodeContract.hasNode(user);
    }
    
    /**
     * @dev 恢复用户产出率
     */
    function _restoreUserRate(address user) internal {
        // 这里可以调用质押合约的恢复函数
        // 实际实现需要质押合约提供相应接口
    }
    
    /**
     * @dev 获取LP池中的HCF储备量
     */
    function _getLPReserves() internal view returns (uint256 hcfReserve) {
        if (address(lpPair) == address(0)) return 0;
        
        (uint112 reserve0, uint112 reserve1,) = lpPair.getReserves();
        
        // 判断HCF是token0还是token1
        if (lpPair.token0() == address(hcfToken)) {
            hcfReserve = uint256(reserve0);
        } else {
            hcfReserve = uint256(reserve1);
        }
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置损失阈值（仅多签）
     */
    function setThreshold(uint256 _threshold) external onlyMultiSig {
        require(_threshold > 0, "Threshold must be > 0");
        lossThreshold = _threshold;
        emit ThresholdUpdated(_threshold);
    }
    
    /**
     * @dev 设置最大补偿（仅多签）
     */
    function setMaxCompensation(uint256 _max) external onlyMultiSig {
        maxCompensation = _max;
        emit MaxCompensationUpdated(_max);
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
        address _nodeContract,
        address _stakingContract,
        address _lpPair
    ) external onlyOwner {
        if (_nodeContract != address(0)) {
            nodeContract = IHCFNodeNFT(_nodeContract);
        }
        if (_stakingContract != address(0)) {
            stakingContract = IHCFStaking(_stakingContract);
        }
        if (_lpPair != address(0)) {
            lpPair = IPancakePair(_lpPair);
        }
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPaused = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    /**
     * @dev 提取补偿池资金（仅多签，紧急情况）
     */
    function emergencyWithdraw(uint256 amount) external onlyMultiSig {
        require(emergencyPaused, "Not in emergency");
        require(amount <= compensationPool, "Insufficient pool");
        
        compensationPool -= amount;
        require(hcfToken.transfer(multiSigWallet, amount), "Transfer failed");
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户数据
     */
    function getUserData(address user) external view returns (
        uint256 lastClaimTime,
        uint256 totalCompensatedAmount,
        uint256 initialLP,
        uint256 currentLP,
        bool canClaim,
        uint256 estimatedCompensation
    ) {
        UserData memory data = userData[user];
        uint256 currentLPAmount = _getCurrentLPAmount(user);
        uint256 initialLPAmount = _getInitialLPAmount(user);
        
        bool eligible = block.timestamp >= data.lastClaimTime + COOLDOWN_PERIOD &&
                       initialLPAmount > 0 &&
                       currentLPAmount < initialLPAmount &&
                       !emergencyPaused;
        
        uint256 compensation = 0;
        if (eligible) {
            uint256 loss = initialLPAmount - currentLPAmount;
            compensation = loss > lossThreshold ? loss : lossThreshold;
            
            if (maxCompensation > 0 && compensation > maxCompensation) {
                compensation = maxCompensation;
            }
            
            if (_isNodeUser(user)) {
                compensation += (compensation * NODE_BONUS_RATE) / BASIS_POINTS;
            }
        }
        
        return (
            data.lastClaimTime,
            data.totalCompensated,
            initialLPAmount,
            currentLPAmount,
            eligible && compensationPool >= compensation,
            compensation
        );
    }
    
    /**
     * @dev 获取补偿池余额
     */
    function getPoolBalance() external view returns (uint256) {
        return compensationPool;
    }
    
    /**
     * @dev 获取合约统计信息
     */
    function getStats() external view returns (
        uint256 poolBalance,
        uint256 totalCompensatedAmount,
        uint256 totalClaimsCount,
        uint256 threshold,
        uint256 maxComp
    ) {
        return (
            compensationPool,
            totalCompensated,
            totalClaims,
            lossThreshold,
            maxCompensation
        );
    }
    
    /**
     * @dev 检查用户是否可以申请补偿
     */
    function canClaimCompensation(address user) external view returns (bool) {
        UserData memory data = userData[user];
        
        // 检查冷却期
        if (block.timestamp < data.lastClaimTime + COOLDOWN_PERIOD) {
            return false;
        }
        
        // 检查LP损失
        uint256 currentLP = _getCurrentLPAmount(user);
        uint256 initialLP = _getInitialLPAmount(user);
        
        if (initialLP == 0 || currentLP >= initialLP) {
            return false;
        }
        
        // 计算补偿金额
        uint256 loss = initialLP - currentLP;
        uint256 compensation = loss > lossThreshold ? loss : lossThreshold;
        
        if (maxCompensation > 0 && compensation > maxCompensation) {
            compensation = maxCompensation;
        }
        
        if (_isNodeUser(user)) {
            compensation += (compensation * NODE_BONUS_RATE) / BASIS_POINTS;
        }
        
        // 检查池余额
        return compensationPool >= compensation && !emergencyPaused;
    }
    
    /**
     * @dev 获取下次可领取时间
     */
    function getNextClaimTime(address user) external view returns (uint256) {
        UserData memory data = userData[user];
        if (data.lastClaimTime == 0) {
            return block.timestamp;
        }
        return data.lastClaimTime + COOLDOWN_PERIOD;
    }
}