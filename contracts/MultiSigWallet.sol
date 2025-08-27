// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultiSigWallet
 * @dev 多签钱包合约 - 3/5签名控制
 * 控制底池资金、税率调整、参数设置等关键操作
 */
contract MultiSigWallet is Ownable, ReentrancyGuard {
    
    // ============ 结构体 ============
    struct Transaction {
        address to;              // 目标地址
        uint256 value;          // 转账金额
        bytes data;             // 调用数据
        bool executed;          // 是否已执行
        uint256 confirmations;  // 确认数量
        uint256 timeLock;       // 时间锁（执行时间）
    }
    
    // ============ 状态变量 ============
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    mapping(address => bool) public isSigner;
    address[] public signers;
    
    uint256 public requiredConfirmations = 3;
    uint256 public transactionCount;
    uint256 public constant TIMELOCK_DURATION = 48 hours; // 48小时延迟
    
    // 重要操作标识（需要时间锁）
    mapping(bytes4 => bool) public importantFunctions;
    
    // ============ 事件 ============
    event TransactionSubmitted(uint256 indexed transactionId, address indexed sender, address indexed to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed transactionId, address indexed sender);
    event ConfirmationRevoked(uint256 indexed transactionId, address indexed sender);
    event TransactionExecuted(uint256 indexed transactionId);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event RequiredConfirmationsChanged(uint256 required);
    event Deposit(address indexed sender, uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }
    
    modifier txExists(uint256 transactionId) {
        require(transactions[transactionId].to != address(0), "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 transactionId) {
        require(!transactions[transactionId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 transactionId) {
        require(!confirmations[transactionId][msg.sender], "Transaction already confirmed");
        _;
    }
    
    modifier confirmed(uint256 transactionId) {
        require(confirmations[transactionId][msg.sender], "Transaction not confirmed");
        _;
    }
    
    modifier onlyMultiSig() {
        require(msg.sender == address(this), "Only multisig can call");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(address[] memory _signers) Ownable(msg.sender) {
        require(_signers.length == 5, "Must have exactly 5 signers");
        
        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Invalid signer address");
            require(!isSigner[_signers[i]], "Duplicate signer");
            
            isSigner[_signers[i]] = true;
            signers.push(_signers[i]);
        }
        
        // 标记重要函数（需要时间锁）
        importantFunctions[bytes4(keccak256("setTaxRates(uint256,uint256,uint256)"))] = true;
        importantFunctions[bytes4(keccak256("withdrawFunds(address,uint256)"))] = true;
        importantFunctions[bytes4(keccak256("emergencyWithdraw(address,uint256)"))] = true;
        importantFunctions[bytes4(keccak256("setMultiSigWallet(address)"))] = true;
        importantFunctions[bytes4(keccak256("updateMaxSupply()"))] = true;
    }
    
    // ============ 交易管理功能 ============
    
    /**
     * @dev 提交交易
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes memory data
    ) public onlySigner returns (uint256) {
        require(to != address(0), "Invalid target address");
        
        uint256 transactionId = transactionCount;
        
        // 检查是否为重要函数，设置时间锁
        uint256 timeLock = block.timestamp;
        if (data.length >= 4) {
            bytes4 functionSelector = bytes4(data);
            if (importantFunctions[functionSelector]) {
                timeLock = block.timestamp + TIMELOCK_DURATION;
            }
        }
        
        transactions[transactionId] = Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmations: 0,
            timeLock: timeLock
        });
        
        transactionCount++;
        
        emit TransactionSubmitted(transactionId, msg.sender, to, value, data);
        
        // 提交者自动确认
        confirmTransaction(transactionId);
        
        return transactionId;
    }
    
    /**
     * @dev 确认交易
     */
    function confirmTransaction(uint256 transactionId) 
        public 
        onlySigner 
        txExists(transactionId) 
        notExecuted(transactionId) 
        notConfirmed(transactionId) 
    {
        confirmations[transactionId][msg.sender] = true;
        transactions[transactionId].confirmations++;
        
        emit TransactionConfirmed(transactionId, msg.sender);
        
        // 如果达到所需确认数且时间锁已过，自动执行
        if (transactions[transactionId].confirmations >= requiredConfirmations &&
            block.timestamp >= transactions[transactionId].timeLock) {
            executeTransaction(transactionId);
        }
    }
    
    /**
     * @dev 撤销确认
     */
    function revokeConfirmation(uint256 transactionId) 
        public 
        onlySigner 
        txExists(transactionId) 
        notExecuted(transactionId) 
        confirmed(transactionId) 
    {
        confirmations[transactionId][msg.sender] = false;
        transactions[transactionId].confirmations--;
        
        emit ConfirmationRevoked(transactionId, msg.sender);
    }
    
    /**
     * @dev 执行交易
     */
    function executeTransaction(uint256 transactionId) 
        public 
        onlySigner 
        txExists(transactionId) 
        notExecuted(transactionId) 
        nonReentrant 
    {
        Transaction storage txn = transactions[transactionId];
        
        require(txn.confirmations >= requiredConfirmations, "Insufficient confirmations");
        require(block.timestamp >= txn.timeLock, "Time lock not expired");
        
        txn.executed = true;
        
        // 执行交易
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(transactionId);
    }
    
    // ============ 签名者管理 ============
    
    /**
     * @dev 添加签名者（仅owner或多签）
     */
    function addSigner(address signer) public {
        require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
        require(signer != address(0), "Invalid signer address");
        require(!isSigner[signer], "Already a signer");
        require(signers.length < 10, "Too many signers");
        
        isSigner[signer] = true;
        signers.push(signer);
        
        emit SignerAdded(signer);
    }
    
    /**
     * @dev 移除签名者（仅owner或多签）
     */
    function removeSigner(address signer) public {
        require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
        require(isSigner[signer], "Not a signer");
        require(signers.length > requiredConfirmations, "Cannot go below required confirmations");
        
        isSigner[signer] = false;
        
        // 从数组中移除
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer);
    }
    
    /**
     * @dev 设置所需确认数（仅多签）
     */
    function setRequiredConfirmations(uint256 _required) public onlyMultiSig {
        require(_required > 0 && _required <= signers.length, "Invalid required confirmations");
        requiredConfirmations = _required;
        
        emit RequiredConfirmationsChanged(_required);
    }
    
    // ============ 底池控制功能 ============
    
    /**
     * @dev 添加资金到底池
     */
    function addFunds() public payable {
        require(msg.value > 0, "Must send funds");
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev 提取底池资金（仅多签）
     */
    function withdrawFunds(address to, uint256 amount) public onlyMultiSig nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev 紧急提取（仅多签）
     */
    function emergencyWithdraw(address token, uint256 amount) public onlyMultiSig nonReentrant {
        if (token == address(0)) {
            // 提取BNB
            require(amount <= address(this).balance, "Insufficient BNB balance");
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "BNB transfer failed");
        } else {
            // 提取代币
            (bool success, bytes memory data) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount)
            );
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        }
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取交易信息
     */
    function getTransactionInfo(uint256 transactionId) public view returns (
        address to,
        uint256 value,
        bytes memory data,
        bool executed,
        uint256 numConfirmations,
        uint256 timeLock
    ) {
        Transaction storage txn = transactions[transactionId];
        return (
            txn.to,
            txn.value,
            txn.data,
            txn.executed,
            txn.confirmations,
            txn.timeLock
        );
    }
    
    /**
     * @dev 获取待执行交易
     */
    function getPendingTransactions() public view returns (uint256[] memory) {
        uint256 pendingCount = 0;
        
        // 计算待执行交易数量
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed) {
                pendingCount++;
            }
        }
        
        uint256[] memory pendingIds = new uint256[](pendingCount);
        uint256 index = 0;
        
        // 填充待执行交易ID
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed) {
                pendingIds[index] = i;
                index++;
            }
        }
        
        return pendingIds;
    }
    
    /**
     * @dev 获取交易确认状态
     */
    function getConfirmationStatus(uint256 transactionId, address signer) public view returns (bool) {
        return confirmations[transactionId][signer];
    }
    
    /**
     * @dev 获取签名者列表
     */
    function getSigners() public view returns (address[] memory) {
        return signers;
    }
    
    /**
     * @dev 获取签名者数量
     */
    function getSignerCount() public view returns (uint256) {
        return signers.length;
    }
    
    /**
     * @dev 检查是否可以执行交易
     */
    function canExecute(uint256 transactionId) public view returns (bool) {
        Transaction storage txn = transactions[transactionId];
        return !txn.executed && 
               txn.confirmations >= requiredConfirmations && 
               block.timestamp >= txn.timeLock;
    }
    
    /**
     * @dev 设置重要函数标记
     */
    function setImportantFunction(bytes4 functionSelector, bool isImportant) public onlyMultiSig {
        importantFunctions[functionSelector] = isImportant;
    }
    
    // ============ 接收函数 ============
    
    /**
     * @dev 接收BNB
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev 回退函数
     */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}