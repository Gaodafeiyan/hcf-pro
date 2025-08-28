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
 * 简化版本：仅多签控制更新，包含紧急暂停功能
 */
contract USDTOracle is Ownable {
    
    // ============ 状态变量 ============
    uint256 public totalSupply;         // USDT总供应量（不分链）
    uint256 public lastUpdateTime;      // 上次更新时间
    uint256 public minUpdateInterval = 1 hours;  // 最小更新间隔
    bool public emergencyPaused = false;  // 紧急暂停状态
    
    // 合约地址
    address public multiSigWallet;
    address public bsdtToken;
    
    // ============ 事件 ============
    event SupplyUpdated(uint256 totalSupply, uint256 timestamp);
    event UpdateIntervalChanged(uint256 newInterval);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event BSDTTokenSet(address indexed token);
    event EmergencyPauseToggled(bool paused);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(uint256 _initialSupply) Ownable() {
        totalSupply = _initialSupply;
        lastUpdateTime = block.timestamp;
    }
    
    // ============ 核心更新功能 ============
    
    /**
     * @dev 更新USDT总供应量（仅多签）
     */
    function updateMaxSupply(uint256 newSupply) external onlyMultiSig notPaused {
        // 检查更新间隔
        require(
            block.timestamp >= lastUpdateTime + minUpdateInterval,
            "Update interval not met"
        );
        
        // 更新供应量
        totalSupply = newSupply;
        lastUpdateTime = block.timestamp;
        
        emit SupplyUpdated(newSupply, block.timestamp);
        
        // 通知BSDT更新最大供应量
        if (bsdtToken != address(0)) {
            try IBSDTToken(bsdtToken).updateMaxSupply() {} catch {}
        }
    }
    
    // ============ 紧急控制 ============
    
    /**
     * @dev 切换紧急暂停状态（仅多签）
     */
    function toggleEmergencyPause() external onlyMultiSig {
        emergencyPaused = !emergencyPaused;
        emit EmergencyPauseToggled(emergencyPaused);
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
     * @dev 检查是否可以提交更新
     */
    function canSubmitUpdate() external view returns (bool) {
        return !emergencyPaused && (block.timestamp >= lastUpdateTime + minUpdateInterval);
    }
}