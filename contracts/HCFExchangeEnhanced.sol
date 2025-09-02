// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFExchangeV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPancakeRouter02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    
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
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IKeeper {
    function monitorAndExecute() external;
}

/**
 * @title HCFExchangeEnhanced
 * @dev 增强版交易所 - 集成Pancake、Keeper监控、无常损失补偿
 */
contract HCFExchangeEnhanced is HCFExchangeV2 {
    
    // ============ 新增状态变量 ============
    IPancakeRouter02 public pancakeRouter;
    address public keeperAddress;
    
    // 无常损失补偿
    uint256 public constant MIN_COMPENSATION = 500 * 10**18;  // 最小补偿500 HCF
    mapping(address => uint256) public impermanentLoss;
    mapping(address => bool) public hasCompensated;
    
    // 大额限制
    uint256 public largeAmountThreshold = 100000 * 10**18;  // 10万限制
    
    // USDC桥接
    address public usdcBridge;
    
    // ============ 事件 ============
    event PancakeSwap(address indexed user, uint256 amountIn, uint256 amountOut);
    event ImpermanentLossCompensated(address indexed user, uint256 amount);
    event LargeTransactionQueued(address indexed user, uint256 amount);
    event KeeperExecuted(uint256 timestamp);
    event USDCBridged(address indexed user, uint256 amount);
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _usdtToken,
        address _usdcToken,
        address _nodeContract,
        address _marketingWallet,
        address _pancakeRouter,
        address _usdcBridge
    ) HCFExchangeV2(
        _hcfToken,
        _bsdtToken,
        _usdtToken,
        _usdcToken,
        _nodeContract,
        _marketingWallet
    ) {
        pancakeRouter = IPancakeRouter02(_pancakeRouter);
        usdcBridge = _usdcBridge;
        
        // 修正费用分配（原错误30/50/20，应该更合理）
        burnRatio = 4000;       // 40%销毁
        nodeRatio = 3000;       // 30%节点
        marketingRatio = 3000;  // 30%营销
    }
    
    // ============ Pancake集成 ============
    
    /**
     * @dev 通过Pancake添加流动性
     */
    function addLiquidityViaPancake(
        uint256 hcfAmount,
        uint256 bsdtAmount,
        uint256 slippage
    ) external nonReentrant returns (uint256) {
        require(hcfAmount > 0 && bsdtAmount > 0, "Invalid amounts");
        
        // 转入代币
        hcfToken.transferFrom(msg.sender, address(this), hcfAmount);
        bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount);
        
        // 批准Pancake Router
        hcfToken.approve(address(pancakeRouter), hcfAmount);
        IERC20(address(bsdtToken)).approve(address(pancakeRouter), bsdtAmount);
        
        // 计算最小值（考虑滑点）
        uint256 amountAMin = hcfAmount * (10000 - slippage) / 10000;
        uint256 amountBMin = bsdtAmount * (10000 - slippage) / 10000;
        
        // 添加流动性
        (uint256 amountA, uint256 amountB, uint256 liquidity) = pancakeRouter.addLiquidity(
            address(hcfToken),
            address(bsdtToken),
            hcfAmount,
            bsdtAmount,
            amountAMin,
            amountBMin,
            msg.sender,
            block.timestamp + 300
        );
        
        // 记录LP变化，检查无常损失
        _checkImpermanentLoss(msg.sender);
        
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
        
        return liquidity;
    }
    
    /**
     * @dev 通过Pancake交换
     */
    function swapViaPancake(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256) {
        require(amountIn > 0, "Invalid amount");
        
        // 大额检查
        if (amountIn > largeAmountThreshold) {
            require(msg.sender == multiSigWallet, "Large amount needs multisig");
            emit LargeTransactionQueued(msg.sender, amountIn);
        }
        
        // 转入代币
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(pancakeRouter), amountIn);
        
        // 设置路径
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // 执行交换
        uint256[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit PancakeSwap(msg.sender, amountIn, amounts[1]);
        
        return amounts[1];
    }
    
    // ============ 无常损失补偿 ============
    
    /**
     * @dev 检查并记录无常损失
     */
    function _checkImpermanentLoss(address user) private {
        LPInfo memory info = lpInfo[user];
        if (info.lpTokens == 0) return;
        
        // 计算当前价值
        uint256 currentValue = _calculateLPValue(info.lpTokens);
        uint256 initialValue = info.hcfAmount + info.bsdtAmount;
        
        // 如果损失超过阈值，记录
        if (initialValue > currentValue) {
            uint256 loss = initialValue - currentValue;
            if (loss >= MIN_COMPENSATION) {
                impermanentLoss[user] = loss;
            }
        }
    }
    
    /**
     * @dev 领取无常损失补偿
     */
    function claimImpermanentLossCompensation() external nonReentrant {
        uint256 loss = impermanentLoss[msg.sender];
        require(loss >= MIN_COMPENSATION, "Loss below minimum");
        require(!hasCompensated[msg.sender], "Already compensated");
        
        // 补偿500 HCF或实际损失（取较小值）
        uint256 compensation = loss > MIN_COMPENSATION ? MIN_COMPENSATION : loss;
        
        // 节点优先+20%
        if (_isNodeHolder(msg.sender)) {
            compensation = compensation * 120 / 100;
        }
        
        hasCompensated[msg.sender] = true;
        impermanentLoss[msg.sender] = 0;
        
        hcfToken.transfer(msg.sender, compensation);
        
        emit ImpermanentLossCompensated(msg.sender, compensation);
    }
    
    // ============ 退出机制增强 ============
    
    /**
     * @dev 退出时选择USDT或USDC
     */
    function withdrawWithChoice(
        uint256 lpTokens,
        bool useUSDC
    ) external nonReentrant returns (uint256, uint256) {
        // 先执行标准退出
        (uint256 hcfReturned, uint256 bsdtReturned) = this.removeLiquidity(lpTokens);
        
        if (useUSDC && bsdtReturned > 0) {
            // 通过桥转换为USDC
            bsdtToken.burn(bsdtReturned);
            
            // 调用USDC桥
            _bridgeToUSDC(msg.sender, bsdtReturned);
            
            emit USDCBridged(msg.sender, bsdtReturned);
        }
        
        return (hcfReturned, bsdtReturned);
    }
    
    // ============ Keeper监控 ============
    
    /**
     * @dev Keeper自动监控和执行
     */
    function keeperMonitor() external {
        require(msg.sender == keeperAddress, "Only keeper");
        
        // 检查价格范围
        uint256 currentPrice = getHCFPrice();
        require(currentPrice >= minPrice && currentPrice <= maxPrice, "Price out of range");
        
        // 检查底池平衡
        _checkPoolBalance();
        
        // 触发无常损失检查
        _checkAllLPHolders();
        
        emit KeeperExecuted(block.timestamp);
    }
    
    /**
     * @dev 检查底池平衡
     */
    function _checkPoolBalance() private view {
        // 确保底池不变原则
        require(hcfReserve >= INITIAL_HCF * 90 / 100, "HCF reserve too low");
        require(bsdtReserve >= INITIAL_BSDT * 90 / 100, "BSDT reserve too low");
    }
    
    /**
     * @dev 检查所有LP持有者
     */
    function _checkAllLPHolders() private {
        // 实际实现需要遍历所有LP持有者
        // 这里简化处理
    }
    
    /**
     * @dev 桥接到USDC
     */
    function _bridgeToUSDC(address user, uint256 amount) private {
        // 调用USDC桥合约
        // 简化实现
        usdcToken.transfer(user, amount);
    }
    
    /**
     * @dev 检查是否为节点持有者
     */
    function _isNodeHolder(address user) private view returns (bool) {
        // 简化检查 - 实际需要调用节点合约的balanceOf
        return false; // 暂时返回false，避免编译错误
    }
    
    /**
     * @dev 计算LP价值
     */
    function _calculateLPValue(uint256 lpTokens) private view returns (uint256) {
        if (totalLPTokens == 0) return 0;
        
        uint256 hcfValue = (lpTokens * hcfReserve) / totalLPTokens;
        uint256 bsdtValue = (lpTokens * bsdtReserve) / totalLPTokens;
        
        // 简化计算：HCF按当前价格换算
        uint256 hcfInBsdt = (hcfValue * getHCFPrice()) / 10**18;
        
        return hcfInBsdt + bsdtValue;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置Keeper地址
     */
    function setKeeper(address _keeper) external onlyMultiSig {
        keeperAddress = _keeper;
    }
    
    /**
     * @dev 设置大额阈值
     */
    function setLargeAmountThreshold(uint256 threshold) external onlyMultiSig {
        largeAmountThreshold = threshold;
    }
    
    /**
     * @dev 设置USDC桥
     */
    function setUSDCBridge(address bridge) external onlyMultiSig {
        usdcBridge = bridge;
    }
}