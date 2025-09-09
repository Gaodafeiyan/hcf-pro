// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BSDTGateway
 * @dev USDT单向兑换BSDT的网关合约（只进不出）
 */
contract BSDTGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable usdtToken;
    IERC20 public immutable bsdtToken;
    
    // 兑换比例 1:1
    uint256 public constant EXCHANGE_RATE = 1;
    
    // 最小兑换金额
    uint256 public minExchangeAmount = 10 * 10**18; // 10 USDT
    uint256 public maxExchangeAmount = 100000 * 10**18; // 100,000 USDT
    
    // 统计
    uint256 public totalUSDTReceived;
    uint256 public totalBSDTIssued;
    mapping(address => uint256) public userExchangeAmount;
    
    // 事件
    event USDTtoBSDT(
        address indexed user,
        uint256 usdtAmount,
        uint256 bsdtAmount,
        uint256 timestamp
    );
    
    event LimitsUpdated(uint256 minAmount, uint256 maxAmount);
    
    constructor(address _usdtToken, address _bsdtToken) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_bsdtToken != address(0), "Invalid BSDT address");
        
        usdtToken = IERC20(_usdtToken);
        bsdtToken = IERC20(_bsdtToken);
    }
    
    /**
     * @dev USDT兑换BSDT（单向，1:1）
     * 注意：BSDT不能换回USDT，只能用于购买HCF
     */
    function exchangeUSDTtoBSDT(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount >= minExchangeAmount, "Amount too small");
        require(usdtAmount <= maxExchangeAmount, "Amount too large");
        
        // 接收用户的USDT
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // 检查BSDT余额
        uint256 bsdtAmount = usdtAmount * EXCHANGE_RATE;
        require(bsdtToken.balanceOf(address(this)) >= bsdtAmount, "Insufficient BSDT reserve");
        
        // 发送BSDT给用户（1:1兑换）
        bsdtToken.safeTransfer(msg.sender, bsdtAmount);
        
        // 更新统计
        totalUSDTReceived += usdtAmount;
        totalBSDTIssued += bsdtAmount;
        userExchangeAmount[msg.sender] += usdtAmount;
        
        emit USDTtoBSDT(msg.sender, usdtAmount, bsdtAmount, block.timestamp);
    }
    
    /**
     * @dev 查询用户可兑换的BSDT数量
     */
    function calculateBSDTAmount(uint256 usdtAmount) external pure returns (uint256) {
        return usdtAmount * EXCHANGE_RATE;
    }
    
    /**
     * @dev 查询合约BSDT储备
     */
    function getBSDTReserve() external view returns (uint256) {
        return bsdtToken.balanceOf(address(this));
    }
    
    /**
     * @dev 查询合约USDT余额
     */
    function getUSDTBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
    
    // ========== 管理功能 ==========
    
    /**
     * @dev 设置兑换限额
     */
    function setExchangeLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount > 0, "Min amount must be greater than 0");
        require(_maxAmount > _minAmount, "Max must be greater than min");
        
        minExchangeAmount = _minAmount;
        maxExchangeAmount = _maxAmount;
        
        emit LimitsUpdated(_minAmount, _maxAmount);
    }
    
    /**
     * @dev 补充BSDT储备
     */
    function depositBSDT(uint256 amount) external onlyOwner {
        bsdtToken.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev 提取USDT收益（项目方提取）
     */
    function withdrawUSDT(uint256 amount) external onlyOwner {
        require(amount <= usdtToken.balanceOf(address(this)), "Insufficient balance");
        usdtToken.safeTransfer(owner(), amount);
    }
    
    /**
     * @dev 紧急提取BSDT（仅紧急情况）
     */
    function emergencyWithdrawBSDT() external onlyOwner {
        uint256 balance = bsdtToken.balanceOf(address(this));
        bsdtToken.safeTransfer(owner(), balance);
    }
}