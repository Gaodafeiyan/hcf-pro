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
        
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

contract HCFAutoSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // 代币地址
    IERC20 public bsdtToken;
    IERC20 public usdtToken;
    IERC20 public hcfToken;
    IPancakeRouter public pancakeRouter;
    
    // 配置参数
    uint256 public swapFee = 300; // 3% = 300/10000
    uint256 public minSwapAmount = 10 * 10**18; // 最小10个代币
    address public treasury; // 手续费接收地址
    
    // 统计数据
    uint256 public totalBSDTtoUSDT;
    uint256 public totalUSDTtoBSDT;
    uint256 public totalFeesCollected;
    
    // 事件
    event SwapBSDTtoUSDT(
        address indexed user,
        uint256 bsdtAmount,
        uint256 usdtAmount,
        uint256 fee
    );
    
    event SwapUSDTtoBSDT(
        address indexed user,
        uint256 usdtAmount,
        uint256 bsdtAmount
    );
    
    event SwapHCFtoBSDT(
        address indexed user,
        uint256 hcfAmount,
        uint256 bsdtAmount
    );
    
    event SwapBSDTtoHCF(
        address indexed user,
        uint256 bsdtAmount,
        uint256 hcfAmount
    );
    
    event ConfigUpdated(uint256 swapFee, uint256 minSwapAmount);
    
    constructor(
        address _bsdtToken,
        address _usdtToken,
        address _hcfToken,
        address _pancakeRouter
    ) {
        bsdtToken = IERC20(_bsdtToken);
        usdtToken = IERC20(_usdtToken);
        hcfToken = IERC20(_hcfToken);
        pancakeRouter = IPancakeRouter(_pancakeRouter);
        treasury = msg.sender;
    }
    
    // BSDT兑换USDT (扣3%手续费)
    function swapBSDTtoUSDT(uint256 bsdtAmount) external nonReentrant {
        require(bsdtAmount >= minSwapAmount, "Amount too small");
        
        // 接收用户的BSDT
        bsdtToken.safeTransferFrom(msg.sender, address(this), bsdtAmount);
        
        // 计算手续费
        uint256 fee = (bsdtAmount * swapFee) / 10000;
        uint256 amountAfterFee = bsdtAmount - fee;
        
        // 发送手续费到treasury
        if (fee > 0) {
            bsdtToken.safeTransfer(treasury, fee);
            totalFeesCollected += fee;
        }
        
        // 1:1兑换USDT给用户
        require(usdtToken.balanceOf(address(this)) >= amountAfterFee, "Insufficient USDT");
        usdtToken.safeTransfer(msg.sender, amountAfterFee);
        
        totalBSDTtoUSDT += bsdtAmount;
        
        emit SwapBSDTtoUSDT(msg.sender, bsdtAmount, amountAfterFee, fee);
    }
    
    // USDT兑换BSDT (1:1无手续费)
    function swapUSDTtoBSDT(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount >= minSwapAmount, "Amount too small");
        
        // 接收用户的USDT
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // 1:1兑换BSDT给用户
        require(bsdtToken.balanceOf(address(this)) >= usdtAmount, "Insufficient BSDT");
        bsdtToken.safeTransfer(msg.sender, usdtAmount);
        
        totalUSDTtoBSDT += usdtAmount;
        
        emit SwapUSDTtoBSDT(msg.sender, usdtAmount, usdtAmount);
    }
    
    // HCF兑换BSDT (通过PancakeSwap)
    function swapHCFtoBSDT(uint256 hcfAmount, uint256 minBSDT) external nonReentrant {
        require(hcfAmount > 0, "Invalid amount");
        
        // 接收用户的HCF
        hcfToken.safeTransferFrom(msg.sender, address(this), hcfAmount);
        
        // 授权Router
        hcfToken.approve(address(pancakeRouter), hcfAmount);
        
        // 设置交换路径
        address[] memory path = new address[](2);
        path[0] = address(hcfToken);
        path[1] = address(bsdtToken);
        
        // 执行交换
        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            hcfAmount,
            minBSDT,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit SwapHCFtoBSDT(msg.sender, hcfAmount, amounts[1]);
    }
    
    // BSDT兑换HCF (通过PancakeSwap)
    function swapBSDTtoHCF(uint256 bsdtAmount, uint256 minHCF) external nonReentrant {
        require(bsdtAmount > 0, "Invalid amount");
        
        // 接收用户的BSDT
        bsdtToken.safeTransferFrom(msg.sender, address(this), bsdtAmount);
        
        // 授权Router
        bsdtToken.approve(address(pancakeRouter), bsdtAmount);
        
        // 设置交换路径
        address[] memory path = new address[](2);
        path[0] = address(bsdtToken);
        path[1] = address(hcfToken);
        
        // 执行交换
        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            bsdtAmount,
            minHCF,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit SwapBSDTtoHCF(msg.sender, bsdtAmount, amounts[1]);
    }
    
    // 获取兑换预估
    function getSwapEstimate(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        try pancakeRouter.getAmountsOut(amountIn, path) returns (uint[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }
    
    // 管理功能
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= 1000, "Fee too high"); // 最大10%
        swapFee = _swapFee;
        emit ConfigUpdated(swapFee, minSwapAmount);
    }
    
    function setMinSwapAmount(uint256 _minAmount) external onlyOwner {
        minSwapAmount = _minAmount;
        emit ConfigUpdated(swapFee, minSwapAmount);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }
    
    // 紧急提取功能
    function emergencyWithdraw(address token) external onlyOwner {
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }
    
    // 添加流动性功能
    function depositLiquidity(uint256 bsdtAmount, uint256 usdtAmount) external onlyOwner {
        bsdtToken.safeTransferFrom(msg.sender, address(this), bsdtAmount);
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
    }
    
    // 查看合约储备
    function getReserves() external view returns (
        uint256 bsdtReserve,
        uint256 usdtReserve,
        uint256 hcfReserve
    ) {
        bsdtReserve = bsdtToken.balanceOf(address(this));
        usdtReserve = usdtToken.balanceOf(address(this));
        hcfReserve = hcfToken.balanceOf(address(this));
    }
}