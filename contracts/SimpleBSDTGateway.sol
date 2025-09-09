// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimpleBSDTGateway
 * @dev USDT到SimpleBSDT的单向兑换网关，保持1:1锚定
 * 只允许USDT→BSDT，不允许反向
 */
contract SimpleBSDTGateway is Ownable, ReentrancyGuard {
    
    IERC20 public immutable USDT;
    IERC20 public immutable BSDT;
    
    // 兑换比率：1 USDT = 1 BSDT (BSC的USDT是18位精度)
    uint256 public constant EXCHANGE_RATE = 1e18;
    
    // 统计
    uint256 public totalExchanged;
    mapping(address => uint256) public userExchanged;
    
    // 事件
    event Exchange(address indexed user, uint256 usdtAmount, uint256 bsdtAmount);
    event BSDTDeposited(uint256 amount);
    event USDTWithdrawn(address indexed to, uint256 amount);
    
    constructor(address _usdt, address _bsdt) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_bsdt != address(0), "Invalid BSDT address");
        
        USDT = IERC20(_usdt);
        BSDT = IERC20(_bsdt);
    }
    
    /**
     * @dev 用USDT兑换BSDT (1:1固定比率)
     * @param usdtAmount 要兑换的USDT数量
     */
    function exchangeToBSDT(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "Amount must be greater than 0");
        
        // 1:1兑换
        uint256 bsdtAmount = usdtAmount;
        
        // 检查Gateway的BSDT余额
        uint256 bsdtBalance = BSDT.balanceOf(address(this));
        require(bsdtBalance >= bsdtAmount, "Insufficient BSDT in gateway");
        
        // 从用户转入USDT
        require(USDT.transferFrom(msg.sender, address(this), usdtAmount), "USDT transfer failed");
        
        // 发送BSDT给用户
        require(BSDT.transfer(msg.sender, bsdtAmount), "BSDT transfer failed");
        
        // 更新统计
        totalExchanged += usdtAmount;
        userExchanged[msg.sender] += usdtAmount;
        
        emit Exchange(msg.sender, usdtAmount, bsdtAmount);
    }
    
    /**
     * @dev 查询可兑换的BSDT数量
     */
    function availableBSDT() external view returns (uint256) {
        return BSDT.balanceOf(address(this));
    }
    
    /**
     * @dev 查询已收集的USDT数量
     */
    function collectedUSDT() external view returns (uint256) {
        return USDT.balanceOf(address(this));
    }
    
    /**
     * @dev Owner存入BSDT供兑换
     */
    function depositBSDT(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(BSDT.transferFrom(msg.sender, address(this), amount), "BSDT transfer failed");
        emit BSDTDeposited(amount);
    }
    
    /**
     * @dev Owner提取收集的USDT
     */
    function withdrawUSDT(uint256 amount) external onlyOwner {
        uint256 balance = USDT.balanceOf(address(this));
        require(balance >= amount, "Insufficient USDT");
        
        require(USDT.transfer(owner(), amount), "USDT transfer failed");
        emit USDTWithdrawn(owner(), amount);
    }
    
    /**
     * @dev 紧急提取所有资金（仅Owner）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 bsdtBalance = BSDT.balanceOf(address(this));
        uint256 usdtBalance = USDT.balanceOf(address(this));
        
        if (bsdtBalance > 0) {
            BSDT.transfer(owner(), bsdtBalance);
        }
        
        if (usdtBalance > 0) {
            USDT.transfer(owner(), usdtBalance);
        }
    }
}