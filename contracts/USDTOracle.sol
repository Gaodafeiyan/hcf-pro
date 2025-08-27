// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IBSDTToken {
    function updateMaxSupply() external;
}

/**
 * @title USDTOracle
 * @dev USDT总量预言机 - 跟踪USDT总供应量，限制BSDT发行
 * 实现多提供者验证、更新间隔控制、多签管理
 */
contract USDTOracle is Ownable {
    
    // ============ 结构体 ============
    struct PendingUpdate {
        uint256 newSupply;              // 新的总供应量
        uint256 confirmations;          // 确认数量
        mapping(address => bool) confirmed; // 提供者确认状态
        bool executed;                  // 是否已执行
        uint256 timestamp;              // 提交时间
    }
    
    // ============ 状态变量 ============
    uint256 public totalSupply;         // USDT总供应量（不分链）
    uint256 public lastUpdateTime;      // 上次更新时间
    uint256 public minUpdateInterval = 1 hours;  // 最小更新间隔
    uint256 public maxChangeLimit = 1_000_000_000 * 10**6; // 最大变化限制10亿USDT（6位小数）
    
    // 多提供者机制
    mapping(address => bool) public isProvider;
    address[] public providers;
    uint256 public requiredProviders = 1;  // 所需确认数
    
    // 待处理更新
    uint256 public updateNonce;
    mapping(uint256 => PendingUpdate) public pendingUpdates;
    
    // 合约地址
    address public multiSigWallet;
    address public bsdtToken;
    
    // ============ 事件 ============
    event SupplyUpdated(uint256 totalSupply, uint256 timestamp);
    event ProviderAdded(address indexed provider);
    event ProviderRemoved(address indexed provider);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event UpdateConfirmed(uint256 indexed nonce, address indexed provider);
    event UpdateSubmitted(uint256 indexed nonce, uint256 newSupply, address indexed provider);
    event UpdateExecuted(uint256 indexed nonce, uint256 newSupply);
    event RequiredProvidersChanged(uint256 newRequired);
    event UpdateIntervalChanged(uint256 newInterval);
    event MaxChangeChanged(uint256 newLimit);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event BSDTTokenSet(address indexed token);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier onlyProvider() {
        require(isProvider[msg.sender], "Not a provider");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == multiSigWallet || 
            msg.sender == owner() || 
            isProvider[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    // ============ 构造函数 ============
    constructor(uint256 _initialSupply) Ownable() {
        totalSupply = _initialSupply;
        lastUpdateTime = block.timestamp;
        
        // 初始化owner为第一个提供者
        isProvider[msg.sender] = true;
        providers.push(msg.sender);
    }
    
    // ============ 核心更新功能 ============
    
    /**
     * @dev 提交供应量更新
     */
    function submitUpdate(uint256 newSupply) external onlyProvider returns (uint256) {
        // 检查更新间隔
        require(
            block.timestamp >= lastUpdateTime + minUpdateInterval,
            "Update interval not met"
        );
        
        // 检查变化限制
        uint256 change = newSupply > totalSupply ? 
            newSupply - totalSupply : 
            totalSupply - newSupply;
        require(change <= maxChangeLimit, "Change exceeds limit");
        
        // 创建待处理更新
        uint256 nonce = updateNonce++;
        PendingUpdate storage update = pendingUpdates[nonce];
        update.newSupply = newSupply;
        update.confirmations = 0;
        update.executed = false;
        update.timestamp = block.timestamp;
        
        emit UpdateSubmitted(nonce, newSupply, msg.sender);
        
        // 提交者自动确认
        confirmUpdate(nonce);
        
        return nonce;
    }
    
    /**
     * @dev 确认更新
     */
    function confirmUpdate(uint256 nonce) public onlyProvider {
        PendingUpdate storage update = pendingUpdates[nonce];
        
        require(update.timestamp > 0, "Update does not exist");
        require(!update.executed, "Update already executed");
        require(!update.confirmed[msg.sender], "Already confirmed");
        
        update.confirmed[msg.sender] = true;
        update.confirmations++;
        
        emit UpdateConfirmed(nonce, msg.sender);
        
        // 如果达到所需确认数，自动执行
        if (update.confirmations >= requiredProviders) {
            executeUpdate(nonce);
        }
    }
    
    /**
     * @dev 执行更新
     */
    function executeUpdate(uint256 nonce) public onlyAuthorized {
        PendingUpdate storage update = pendingUpdates[nonce];
        
        require(update.timestamp > 0, "Update does not exist");
        require(!update.executed, "Update already executed");
        require(update.confirmations >= requiredProviders, "Insufficient confirmations");
        
        // 再次检查更新间隔
        require(
            block.timestamp >= lastUpdateTime + minUpdateInterval,
            "Update interval not met"
        );
        
        // 再次检查变化限制
        uint256 change = update.newSupply > totalSupply ? 
            update.newSupply - totalSupply : 
            totalSupply - update.newSupply;
        require(change <= maxChangeLimit, "Change exceeds limit");
        
        // 执行更新
        _executeUpdate(update.newSupply);
        update.executed = true;
        
        emit UpdateExecuted(nonce, update.newSupply);
    }
    
    /**
     * @dev 内部执行更新
     */
    function _executeUpdate(uint256 newSupply) internal {
        totalSupply = newSupply;
        lastUpdateTime = block.timestamp;
        
        emit SupplyUpdated(newSupply, block.timestamp);
        
        // 通知BSDT更新最大供应量
        if (bsdtToken != address(0)) {
            try IBSDTToken(bsdtToken).updateMaxSupply() {} catch {}
        }
    }
    
    /**
     * @dev 直接更新最大供应量（仅多签）
     */
    function updateMaxSupply(uint256 newSupply) external onlyMultiSig {
        // 检查变化限制
        uint256 change = newSupply > totalSupply ? 
            newSupply - totalSupply : 
            totalSupply - newSupply;
        require(change <= maxChangeLimit, "Change exceeds limit");
        
        _executeUpdate(newSupply);
        emit MaxSupplyUpdated(newSupply);
    }
    
    // ============ 提供者管理 ============
    
    /**
     * @dev 添加数据提供者（仅多签）
     */
    function addProvider(address provider) external onlyMultiSig {
        require(provider != address(0), "Invalid provider address");
        require(!isProvider[provider], "Already a provider");
        
        isProvider[provider] = true;
        providers.push(provider);
        
        emit ProviderAdded(provider);
    }
    
    /**
     * @dev 移除数据提供者（仅多签）
     */
    function removeProvider(address provider) external onlyMultiSig {
        require(isProvider[provider], "Not a provider");
        require(providers.length > requiredProviders, "Cannot go below required providers");
        
        isProvider[provider] = false;
        
        // 从数组中移除
        for (uint256 i = 0; i < providers.length; i++) {
            if (providers[i] == provider) {
                providers[i] = providers[providers.length - 1];
                providers.pop();
                break;
            }
        }
        
        emit ProviderRemoved(provider);
    }
    
    /**
     * @dev 设置所需提供者数量（仅多签）
     */
    function setRequiredProviders(uint256 _required) external onlyMultiSig {
        require(_required > 0 && _required <= providers.length, "Invalid required count");
        requiredProviders = _required;
        
        emit RequiredProvidersChanged(_required);
    }
    
    // ============ 参数设置 ============
    
    /**
     * @dev 设置最小更新间隔（仅多签）
     */
    function setMinUpdateInterval(uint256 _interval) external onlyMultiSig {
        require(_interval >= 1 hours, "Interval too short");
        require(_interval <= 24 hours, "Interval too long");
        minUpdateInterval = _interval;
        
        emit UpdateIntervalChanged(_interval);
    }
    
    /**
     * @dev 设置最大变化限制（仅多签）
     */
    function setMaxChangeLimit(uint256 _limit) external onlyMultiSig {
        require(_limit >= 100_000_000 * 10**6, "Limit too low"); // 至少1亿USDT
        maxChangeLimit = _limit;
        
        emit MaxChangeChanged(_limit);
    }
    
    /**
     * @dev 设置多签钱包地址
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid multisig address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    /**
     * @dev 设置BSDT代币地址
     */
    function setBSDTToken(address _bsdtToken) external onlyMultiSig {
        require(_bsdtToken != address(0), "Invalid BSDT address");
        bsdtToken = _bsdtToken;
        
        // 立即通知BSDT更新
        try IBSDTToken(bsdtToken).updateMaxSupply() {} catch {}
        
        emit BSDTTokenSet(_bsdtToken);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取当前供应量信息
     */
    function getCurrentSupply() external view returns (
        uint256 supply,
        uint256 lastUpdate,
        uint256 nextUpdateTime
    ) {
        return (
            totalSupply,
            lastUpdateTime,
            lastUpdateTime + minUpdateInterval
        );
    }
    
    /**
     * @dev 获取USDT总供应量（供BSDT调用）
     */
    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * @dev 获取待处理更新信息
     */
    function getPendingUpdateInfo(uint256 nonce) external view returns (
        uint256 newSupply,
        uint256 confirmations,
        bool executed,
        uint256 timestamp
    ) {
        PendingUpdate storage update = pendingUpdates[nonce];
        return (
            update.newSupply,
            update.confirmations,
            update.executed,
            update.timestamp
        );
    }
    
    /**
     * @dev 检查提供者是否已确认
     */
    function hasConfirmed(uint256 nonce, address provider) external view returns (bool) {
        return pendingUpdates[nonce].confirmed[provider];
    }
    
    /**
     * @dev 获取提供者列表
     */
    function getProviders() external view returns (address[] memory) {
        return providers;
    }
    
    /**
     * @dev 获取提供者数量
     */
    function getProviderCount() external view returns (uint256) {
        return providers.length;
    }
    
    /**
     * @dev 检查是否可以提交更新
     */
    function canSubmitUpdate() external view returns (bool) {
        return block.timestamp >= lastUpdateTime + minUpdateInterval;
    }
    
    /**
     * @dev 检查更新是否可执行
     */
    function canExecuteUpdate(uint256 nonce) external view returns (bool) {
        PendingUpdate storage update = pendingUpdates[nonce];
        
        if (update.timestamp == 0 || update.executed) {
            return false;
        }
        
        if (update.confirmations < requiredProviders) {
            return false;
        }
        
        if (block.timestamp < lastUpdateTime + minUpdateInterval) {
            return false;
        }
        
        uint256 change = update.newSupply > totalSupply ? 
            update.newSupply - totalSupply : 
            totalSupply - update.newSupply;
            
        return change <= maxChangeLimit;
    }
}