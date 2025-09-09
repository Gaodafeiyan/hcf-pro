// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPancakeRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

interface IBSDTGateway {
    function exchangeUSDTtoBSDT(uint256 usdtAmount) external;
}

/**
 * @title HCFSwapRouter
 * @dev HCF交易路由合约，处理HCF的买卖
 */
contract HCFSwapRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable hcfToken;
    IERC20 public immutable bsdtToken;
    IERC20 public immutable usdtToken;
    IPancakeRouter public immutable pancakeRouter;
    IBSDTGateway public bsdtGateway;
    
    // 卖出HCF时的手续费（3%）
    uint256 public sellFeeRate = 300; // 300/10000 = 3%
    address public treasury;
    
    // 统计
    uint256 public totalHCFBought;
    uint256 public totalHCFSold;
    uint256 public totalFeesCollected;
    
    // 事件
    event BuyHCF(address indexed user, uint256 usdtIn, uint256 hcfOut);
    event SellHCF(address indexed user, uint256 hcfIn, uint256 usdtOut, uint256 fee);
    event FeesCollected(uint256 amount);
    
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _usdtToken,
        address _pancakeRouter,
        address _bsdtGateway
    ) {
        hcfToken = IERC20(_hcfToken);
        bsdtToken = IERC20(_bsdtToken);
        usdtToken = IERC20(_usdtToken);
        pancakeRouter = IPancakeRouter(_pancakeRouter);
        bsdtGateway = IBSDTGateway(_bsdtGateway);
        treasury = msg.sender;
    }
    
    /**
     * @dev 买入HCF（USDT → BSDT → HCF）
     */
    function buyHCF(uint256 usdtAmount, uint256 minHCFOut) external nonReentrant {
        require(usdtAmount > 0, "Invalid amount");
        
        // 1. 接收用户的USDT
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // 2. USDT换BSDT（通过Gateway，1:1）
        usdtToken.approve(address(bsdtGateway), usdtAmount);
        bsdtGateway.exchangeUSDTtoBSDT(usdtAmount);
        
        // 3. BSDT换HCF（通过PancakeSwap）
        uint256 bsdtAmount = usdtAmount; // 1:1兑换
        bsdtToken.approve(address(pancakeRouter), bsdtAmount);
        
        address[] memory path = new address[](2);
        path[0] = address(bsdtToken);
        path[1] = address(hcfToken);
        
        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            bsdtAmount,
            minHCFOut,
            path,
            msg.sender, // HCF直接发给用户
            block.timestamp + 300
        );
        
        totalHCFBought += amounts[1];
        emit BuyHCF(msg.sender, usdtAmount, amounts[1]);
    }
    
    /**
     * @dev 卖出HCF（HCF → BSDT → USDT）
     * 注意：卖出时扣3%手续费
     */
    function sellHCF(uint256 hcfAmount, uint256 minUSDTOut) external nonReentrant {
        require(hcfAmount > 0, "Invalid amount");
        
        // 1. 接收用户的HCF
        hcfToken.safeTransferFrom(msg.sender, address(this), hcfAmount);
        
        // 2. HCF换BSDT（通过PancakeSwap）
        hcfToken.approve(address(pancakeRouter), hcfAmount);
        
        address[] memory path = new address[](2);
        path[0] = address(hcfToken);
        path[1] = address(bsdtToken);
        
        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            hcfAmount,
            0, // 暂不设置最小值，后面会检查
            path,
            address(this), // BSDT先发到合约
            block.timestamp + 300
        );
        
        uint256 bsdtReceived = amounts[1];
        
        // 3. 计算手续费
        uint256 fee = (bsdtReceived * sellFeeRate) / 10000;
        uint256 bsdtAfterFee = bsdtReceived - fee;
        
        // 4. 检查是否满足最小USDT输出
        require(bsdtAfterFee >= minUSDTOut, "Insufficient output");
        
        // 5. BSDT当作USDT发给用户（1:1价值）
        // 注意：用户收到的是BSDT，但价值等同于USDT
        // 如果有USDT储备，则发USDT
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        
        if (usdtBalance >= bsdtAfterFee) {
            // 有足够USDT，直接发USDT
            usdtToken.safeTransfer(msg.sender, bsdtAfterFee);
        } else {
            // 没有USDT，发BSDT（用户需要自己处理）
            bsdtToken.safeTransfer(msg.sender, bsdtAfterFee);
        }
        
        // 6. 手续费转到treasury
        if (fee > 0) {
            bsdtToken.safeTransfer(treasury, fee);
            totalFeesCollected += fee;
        }
        
        totalHCFSold += hcfAmount;
        emit SellHCF(msg.sender, hcfAmount, bsdtAfterFee, fee);
    }
    
    /**
     * @dev 获取买入HCF的预估
     */
    function getBuyEstimate(uint256 usdtAmount) external view returns (uint256) {
        // USDT → BSDT是1:1
        uint256 bsdtAmount = usdtAmount;
        
        // BSDT → HCF通过PancakeSwap
        address[] memory path = new address[](2);
        path[0] = address(bsdtToken);
        path[1] = address(hcfToken);
        
        try pancakeRouter.getAmountsOut(bsdtAmount, path) returns (uint[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }
    
    /**
     * @dev 获取卖出HCF的预估（扣除手续费后）
     */
    function getSellEstimate(uint256 hcfAmount) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(hcfToken);
        path[1] = address(bsdtToken);
        
        try pancakeRouter.getAmountsOut(hcfAmount, path) returns (uint[] memory amounts) {
            uint256 bsdtAmount = amounts[1];
            uint256 fee = (bsdtAmount * sellFeeRate) / 10000;
            return bsdtAmount - fee; // 返回扣除手续费后的USDT等值
        } catch {
            return 0;
        }
    }
    
    // ========== 管理功能 ==========
    
    function setSellFeeRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Fee too high"); // 最高10%
        sellFeeRate = _rate;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }
    
    function setBSDTGateway(address _gateway) external onlyOwner {
        bsdtGateway = IBSDTGateway(_gateway);
    }
    
    /**
     * @dev 补充USDT储备（用于卖出HCF时支付）
     */
    function depositUSDT(uint256 amount) external onlyOwner {
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev 提取积累的BSDT
     */
    function withdrawBSDT(uint256 amount) external onlyOwner {
        bsdtToken.safeTransfer(owner(), amount);
    }
}