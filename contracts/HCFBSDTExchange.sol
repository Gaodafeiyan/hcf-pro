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
    function burn(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IBSDTToken {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUSDT {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUSDC {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPancakeRouter02 {
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
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function transfer(address to, uint value) external returns (bool);
    function approve(address spender, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);
}

interface IHCFImpermanentLossProtection {
    function claimCompensation() external returns (uint256);
}

interface IHCFBurnMechanism {
    function applyBurn(uint256 burnType, uint256 amount, address user) external;
}

interface IHCFNodeNFT {
    function distributeDividends(uint256 divType, uint256 amount) external;
}

/**
 * @title HCFBSDTExchange
 * @dev 兑换合约 - USDT/HCF/BSDT兑换，Pancake集成，Keeper监控
 */
contract HCFBSDTExchange is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_COMPENSATION = 500 * 10**18;
    
    // ============ 状态变量 ============
    
    // 费率配置
    uint256 public sellFeeRate = 300;  // 3%卖出费
    uint256 public minSlippage = 9900; // 最小滑点0.99
    uint256 public maxSlippage = 10000; // 最大滑点1.0
    
    // 费用分配比例（多签控制）
    uint256 public burnFeeRate = 4000;      // 40%销毁
    uint256 public nodeFeeRate = 3000;      // 30%节点
    uint256 public marketingFeeRate = 3000; // 30%营销
    
    // 大额交易阈值（需要多签）
    uint256 public largeAmountThreshold = 100000 * 10**18; // 10万以上需要多签
    
    // LP监控
    uint256 public lastLPReserve0;
    uint256 public lastLPReserve1;
    address public lpCollectionAddress; // 股权LP归集地址
    
    // 大额交易批准
    mapping(address => mapping(uint256 => bool)) public largeAmountApprovals;
    
    // 合约地址
    address public multiSigWallet;
    address public bridgeAddress;
    IHCFToken public hcfToken;
    IBSDTToken public bsdtToken;
    IUSDT public usdtToken;
    IUSDC public usdcToken;
    IPancakeRouter02 public pancakeRouter;
    IPancakePair public hcfBsdtPair;
    IHCFImpermanentLossProtection public impermanentLossProtection;
    IHCFBurnMechanism public burnMechanism;
    IHCFNodeNFT public nodeContract;
    
    // 监控数据
    mapping(address => uint256) public lastUSDTBalance;
    mapping(address => uint256) public lastBSDTBalance;
    
    // 统计数据
    uint256 public totalSwapVolume;
    uint256 public totalFeesCollected;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event SwapExecuted(address indexed user, uint256 fromAmount, uint256 toAmount, bool isBuy);
    event Withdrawal(address indexed user, uint256 bsdtAmount, uint256 outputAmount, bool useUSDC);
    event LiquidityAdded(address indexed user, uint256 hcfAmount, uint256 bsdtAmount);
    event LiquidityRemoved(address indexed user, uint256 lpAmount, uint256 hcfAmount, uint256 bsdtAmount);
    event FeeHandled(uint256 fee);
    event MonitorTriggered(string monitorType, address indexed user, uint256 amount);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event EmergencyPauseSet(bool status);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier validSlippage(uint256 slippage) {
        require(slippage >= minSlippage && slippage <= maxSlippage, "Slippage out of range");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _usdtToken,
        address _multiSigWallet,
        address _pancakeRouter,
        address _bridgeAddress
    ) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        usdtToken = IUSDT(_usdtToken);
        multiSigWallet = _multiSigWallet;
        pancakeRouter = IPancakeRouter02(_pancakeRouter);
        bridgeAddress = _bridgeAddress;
    }
    
    // ============ 兑换功能 ============
    
    /**
     * @dev USDT兑换HCF（0%费用）
     */
    function swapUSDTToHCF(uint256 usdtAmount) 
        external 
        nonReentrant 
        notPaused 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");
        
        // 大额交易检查（需要多签预批准）
        if (usdtAmount >= largeAmountThreshold) {
            require(
                _isLargeAmountApproved(msg.sender, usdtAmount),
                "Large amount requires multisig approval"
            );
        }
        
        // 1. 收取USDT
        require(usdtToken.transferFrom(msg.sender, address(this), usdtAmount), "USDT transfer failed");
        
        // 2. 1:1铸造BSDT
        bsdtToken.mint(address(this), usdtAmount);
        
        // 3. 通过池全额swap到HCF
        uint256 hcfAmount = _swapBSDTToHCF(usdtAmount);
        
        // 4. 转HCF给用户
        require(hcfToken.transfer(msg.sender, hcfAmount), "HCF transfer failed");
        
        totalSwapVolume += usdtAmount;
        
        emit SwapExecuted(msg.sender, usdtAmount, hcfAmount, true);
        
        return hcfAmount;
    }
    
    /**
     * @dev HCF兑换USDT（3%费用）
     */
    function swapHCFToUSDT(uint256 hcfAmount) 
        external 
        nonReentrant 
        notPaused 
        returns (uint256) 
    {
        require(hcfAmount > 0, "Amount must be > 0");
        
        // 1. 收取HCF
        require(hcfToken.transferFrom(msg.sender, address(this), hcfAmount), "HCF transfer failed");
        
        // 2. Swap到BSDT
        uint256 bsdtAmount = _swapHCFToBSDT(hcfAmount);
        
        // 3. 扣除3%费用
        uint256 fee = (bsdtAmount * sellFeeRate) / BASIS_POINTS;
        uint256 netAmount = bsdtAmount - fee;
        
        // 4. 处理费用
        _handleFee(fee);
        
        // 5. 烧毁BSDT，释放USDT
        bsdtToken.burn(netAmount);
        require(usdtToken.transfer(msg.sender, netAmount), "USDT transfer failed");
        
        totalSwapVolume += hcfAmount;
        totalFeesCollected += fee;
        
        emit SwapExecuted(msg.sender, hcfAmount, netAmount, false);
        
        return netAmount;
    }
    
    /**
     * @dev 退单（BSDT换USDT或USDC）
     */
    function withdraw(uint256 bsdtAmount, bool useUSDCBridge) 
        external 
        nonReentrant 
        notPaused 
        returns (uint256) 
    {
        require(bsdtAmount > 0, "Amount must be > 0");
        
        // 1. 收取BSDT
        require(bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount), "BSDT transfer failed");
        
        // 2. 检查LP变化，如果减少则触发补偿
        uint256 lpChange = _checkLPChange();
        if (lpChange > 0) {
            // LP减少，需要补偿至少500 HCF
            require(
                _triggerCompensation(lpChange), 
                "Must compensate min 500 HCF for LP loss"
            );
        }
        
        uint256 outputAmount;
        
        if (useUSDCBridge) {
            // 3a. 通过桥换到USDC
            outputAmount = _bridgeToUSDC(bsdtAmount);
            require(usdcToken.transfer(msg.sender, outputAmount), "USDC transfer failed");
        } else {
            // 3b. 直接烧毁BSDT换USDT
            bsdtToken.burn(bsdtAmount);
            outputAmount = bsdtAmount;
            require(usdtToken.transfer(msg.sender, outputAmount), "USDT transfer failed");
        }
        
        emit Withdrawal(msg.sender, bsdtAmount, outputAmount, useUSDCBridge);
        
        return outputAmount;
    }
    
    // ============ 流动性功能 ============
    
    /**
     * @dev 添加流动性（股权LP自动归集）
     */
    function addLiquidity(uint256 hcfAmount, uint256 bsdtAmount, bool isEquityLP) 
        external 
        nonReentrant 
        notPaused 
        returns (uint256 liquidity) 
    {
        require(hcfAmount > 0 && bsdtAmount > 0, "Amounts must be > 0");
        
        // 收取代币
        require(hcfToken.transferFrom(msg.sender, address(this), hcfAmount), "HCF transfer failed");
        require(bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount), "BSDT transfer failed");
        
        // 授权Router
        hcfToken.approve(address(pancakeRouter), hcfAmount);
        bsdtToken.approve(address(pancakeRouter), bsdtAmount);
        
        // 确定接收地址
        address lpRecipient = isEquityLP && lpCollectionAddress != address(0) 
            ? lpCollectionAddress  // 股权LP直接归集
            : msg.sender;          // 普通LP给用户
        
        // 添加流动性
        (uint256 amountA, uint256 amountB, uint256 liquidityAmount) = pancakeRouter.addLiquidity(
            address(hcfToken),
            address(bsdtToken),
            hcfAmount,
            bsdtAmount,
            (hcfAmount * 95) / 100,  // 5%滑点
            (bsdtAmount * 95) / 100,
            lpRecipient,              // LP代币发给归集地址或用户
            block.timestamp + 300
        );
        
        // 退回多余代币
        if (hcfAmount > amountA) {
            hcfToken.transfer(msg.sender, hcfAmount - amountA);
        }
        if (bsdtAmount > amountB) {
            bsdtToken.transfer(msg.sender, bsdtAmount - amountB);
        }
        
        // 更新LP储备记录
        _updateLPReserves();
        
        emit LiquidityAdded(msg.sender, amountA, amountB);
        
        return liquidityAmount;
    }
    
    /**
     * @dev 移除流动性
     */
    function removeLiquidity(uint256 lpAmount) 
        external 
        nonReentrant 
        notPaused 
        returns (uint256 hcfAmount, uint256 bsdtAmount) 
    {
        require(lpAmount > 0, "Amount must be > 0");
        require(hcfBsdtPair != IPancakePair(address(0)), "Pair not set");
        
        // 收取LP代币
        require(hcfBsdtPair.transferFrom(msg.sender, address(this), lpAmount), "LP transfer failed");
        
        // 授权Router
        hcfBsdtPair.approve(address(pancakeRouter), lpAmount);
        
        // 移除流动性
        (uint256 amountA, uint256 amountB) = pancakeRouter.removeLiquidity(
            address(hcfToken),
            address(bsdtToken),
            lpAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );
        
        emit LiquidityRemoved(msg.sender, lpAmount, amountA, amountB);
        
        return (amountA, amountB);
    }
    
    // ============ Keeper监控功能 ============
    
    /**
     * @dev 监控USDT转账（Keeper调用）
     */
    function monitorUSDTTransfer(address user) external {
        uint256 currentBalance = usdtToken.balanceOf(user);
        uint256 lastBalance = lastUSDTBalance[user];
        
        if (currentBalance > lastBalance) {
            uint256 newDeposit = currentBalance - lastBalance;
            
            // 自动铸造BSDT并转给用户
            bsdtToken.mint(user, newDeposit);
            
            lastUSDTBalance[user] = currentBalance;
            
            emit MonitorTriggered("USDT", user, newDeposit);
        }
    }
    
    /**
     * @dev 监控BSDT转账（Keeper调用）
     */
    function monitorBSDTTransfer(address user) external {
        uint256 currentBalance = bsdtToken.balanceOf(user);
        uint256 lastBalance = lastBSDTBalance[user];
        
        if (currentBalance < lastBalance) {
            uint256 withdrawal = lastBalance - currentBalance;
            
            // 自动烧毁BSDT并转USDT给用户
            if (currentBalance >= withdrawal) {
                bsdtToken.burn(withdrawal);
                usdtToken.transfer(user, withdrawal);
            }
            
            lastBSDTBalance[user] = currentBalance;
            
            emit MonitorTriggered("BSDT", user, withdrawal);
        }
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev BSDT换HCF（验证滑点范围）
     */
    function _swapBSDTToHCF(uint256 bsdtAmount) internal returns (uint256) {
        require(address(pancakeRouter) != address(0), "Router not set");
        
        // 授权Router
        bsdtToken.approve(address(pancakeRouter), bsdtAmount);
        
        // 设置路径
        address[] memory path = new address[](2);
        path[0] = address(bsdtToken);
        path[1] = address(hcfToken);
        
        // 计算预期输出和滑点
        uint256[] memory amounts = pancakeRouter.getAmountsOut(bsdtAmount, path);
        uint256 expectedAmount = amounts[1];
        uint256 amountOutMin = (expectedAmount * minSlippage) / BASIS_POINTS;
        
        // 执行swap
        uint256[] memory results = pancakeRouter.swapExactTokensForTokens(
            bsdtAmount,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 300
        );
        
        // 验证实际滑点在允许范围内
        uint256 actualSlippage = _calculateSlippage(expectedAmount, results[1]);
        require(
            actualSlippage >= minSlippage && actualSlippage <= maxSlippage,
            "Slippage out of acceptable range"
        );
        
        return results[1];
    }
    
    /**
     * @dev HCF换BSDT（验证滑点范围）
     */
    function _swapHCFToBSDT(uint256 hcfAmount) internal returns (uint256) {
        require(address(pancakeRouter) != address(0), "Router not set");
        
        // 授权Router
        hcfToken.approve(address(pancakeRouter), hcfAmount);
        
        // 设置路径
        address[] memory path = new address[](2);
        path[0] = address(hcfToken);
        path[1] = address(bsdtToken);
        
        // 计算预期输出和滑点
        uint256[] memory amounts = pancakeRouter.getAmountsOut(hcfAmount, path);
        uint256 expectedAmount = amounts[1];
        uint256 amountOutMin = (expectedAmount * minSlippage) / BASIS_POINTS;
        
        // 执行swap
        uint256[] memory results = pancakeRouter.swapExactTokensForTokens(
            hcfAmount,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 300
        );
        
        // 验证实际滑点在允许范围内
        uint256 actualSlippage = _calculateSlippage(expectedAmount, results[1]);
        require(
            actualSlippage >= minSlippage && actualSlippage <= maxSlippage,
            "Slippage out of acceptable range"
        );
        
        return results[1];
    }
    
    /**
     * @dev 桥接到USDC
     */
    function _bridgeToUSDC(uint256 amount) internal returns (uint256) {
        // 简化实现：1:1兑换
        // 实际需要通过跨链桥或DEX路由
        return amount;
    }
    
    /**
     * @dev 处理费用（使用可调整比例）
     */
    function _handleFee(uint256 fee) internal {
        if (fee == 0) return;
        
        // 使用可配置的费用分配比例
        uint256 burnAmount = (fee * burnFeeRate) / BASIS_POINTS;
        uint256 nodeAmount = (fee * nodeFeeRate) / BASIS_POINTS;
        uint256 marketingAmount = (fee * marketingFeeRate) / BASIS_POINTS;
        
        // 处理四舍五入差异
        uint256 total = burnAmount + nodeAmount + marketingAmount;
        if (total < fee) {
            marketingAmount += fee - total;
        }
        
        // 烧毁部分
        if (burnAmount > 0) {
            bsdtToken.burn(burnAmount);
            if (address(burnMechanism) != address(0)) {
                burnMechanism.applyBurn(2, burnAmount, address(this));
            }
        }
        
        // 节点分红
        if (nodeAmount > 0 && address(nodeContract) != address(0)) {
            bsdtToken.approve(address(nodeContract), nodeAmount);
            nodeContract.distributeDividends(1, nodeAmount);
        }
        
        // 营销费用
        if (marketingAmount > 0) {
            bsdtToken.transfer(multiSigWallet, marketingAmount);
        }
        
        emit FeeHandled(fee);
    }
    
    /**
     * @dev 检查LP变化
     */
    function _checkLPChange() internal returns (uint256) {
        if (address(hcfBsdtPair) == address(0)) return 0;
        
        (uint112 reserve0, uint112 reserve1,) = hcfBsdtPair.getReserves();
        
        uint256 lpChange = 0;
        if (lastLPReserve0 > 0 && lastLPReserve1 > 0) {
            // 计算LP减少量
            if (reserve0 < lastLPReserve0 || reserve1 < lastLPReserve1) {
                uint256 change0 = lastLPReserve0 > reserve0 ? lastLPReserve0 - reserve0 : 0;
                uint256 change1 = lastLPReserve1 > reserve1 ? lastLPReserve1 - reserve1 : 0;
                lpChange = change0 > change1 ? change0 : change1;
            }
        }
        
        // 更新记录
        lastLPReserve0 = reserve0;
        lastLPReserve1 = reserve1;
        
        return lpChange;
    }
    
    /**
     * @dev 触发补偿
     */
    function _triggerCompensation(uint256 lpChange) internal returns (bool) {
        if (address(impermanentLossProtection) == address(0)) return false;
        
        try impermanentLossProtection.claimCompensation() returns (uint256 compensation) {
            // 检查补偿是否达到最低要求
            if (compensation >= MIN_COMPENSATION) {
                // 补偿发给归集地址
                if (lpCollectionAddress != address(0)) {
                    hcfToken.transfer(lpCollectionAddress, compensation);
                }
                return true;
            }
        } catch {
            // 补偿失败
        }
        
        return false;
    }
    
    /**
     * @dev 更新LP储备记录
     */
    function _updateLPReserves() internal {
        if (address(hcfBsdtPair) != address(0)) {
            (uint112 reserve0, uint112 reserve1,) = hcfBsdtPair.getReserves();
            lastLPReserve0 = reserve0;
            lastLPReserve1 = reserve1;
        }
    }
    
    /**
     * @dev 计算滑点
     */
    function _calculateSlippage(uint256 expectedAmount, uint256 actualAmount) 
        internal 
        pure 
        returns (uint256) 
    {
        if (expectedAmount == 0) return 0;
        return (actualAmount * BASIS_POINTS) / expectedAmount;
    }
    
    /**
     * @dev 检查大额交易是否批准
     */
    function _isLargeAmountApproved(address user, uint256 amount) 
        internal 
        view 
        returns (bool) 
    {
        return largeAmountApprovals[user][amount];
    }
    
    /**
     * @dev 批准大额交易（仅多签）
     */
    function approveLargeAmount(address user, uint256 amount) 
        external 
        onlyMultiSig 
    {
        largeAmountApprovals[user][amount] = true;
    }
    
    /**
     * @dev 撤销大额交易批准（仅多签）
     */
    function revokeLargeAmountApproval(address user, uint256 amount) 
        external 
        onlyMultiSig 
    {
        largeAmountApprovals[user][amount] = false;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置滑点范围（仅多签）
     */
    function setSlippageRange(uint256 _minSlippage, uint256 _maxSlippage) external onlyMultiSig {
        require(_minSlippage <= _maxSlippage, "Invalid range");
        require(_maxSlippage <= BASIS_POINTS, "Max slippage too high");
        minSlippage = _minSlippage;
        maxSlippage = _maxSlippage;
    }
    
    /**
     * @dev 设置卖出费率（仅多签）
     */
    function setSellFeeRate(uint256 _rate) external onlyMultiSig {
        require(_rate <= 1000, "Fee rate too high");  // 最高10%
        sellFeeRate = _rate;
    }
    
    /**
     * @dev 设置费用分配比例（仅多签）
     */
    function setFeeAllocation(
        uint256 _burnRate, 
        uint256 _nodeRate, 
        uint256 _marketingRate
    ) external onlyMultiSig {
        require(
            _burnRate + _nodeRate + _marketingRate == BASIS_POINTS, 
            "Total must equal 100%"
        );
        burnFeeRate = _burnRate;
        nodeFeeRate = _nodeRate;
        marketingFeeRate = _marketingRate;
    }
    
    /**
     * @dev 设置大额交易阈值（仅多签）
     */
    function setLargeAmountThreshold(uint256 _threshold) external onlyMultiSig {
        require(_threshold > 0, "Invalid threshold");
        largeAmountThreshold = _threshold;
    }
    
    /**
     * @dev 设置LP归集地址（仅多签）
     */
    function setLPCollectionAddress(address _lpCollection) external onlyMultiSig {
        require(_lpCollection != address(0), "Invalid address");
        lpCollectionAddress = _lpCollection;
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
     * @dev 设置桥地址
     */
    function setBridgeAddress(address _bridgeAddress) external onlyMultiSig {
        require(_bridgeAddress != address(0), "Invalid address");
        bridgeAddress = _bridgeAddress;
    }
    
    /**
     * @dev 设置Pancake Router
     */
    function setPancakeRouter(address _router) external onlyMultiSig {
        require(_router != address(0), "Invalid address");
        pancakeRouter = IPancakeRouter02(_router);
    }
    
    /**
     * @dev 设置HCF-BSDT交易对
     */
    function setHCFBSDTPair(address _pair) external onlyMultiSig {
        require(_pair != address(0), "Invalid address");
        hcfBsdtPair = IPancakePair(_pair);
    }
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _usdc,
        address _impermanentLoss,
        address _burnMechanism,
        address _nodeContract
    ) external onlyOwner {
        if (_usdc != address(0)) usdcToken = IUSDC(_usdc);
        if (_impermanentLoss != address(0)) impermanentLossProtection = IHCFImpermanentLossProtection(_impermanentLoss);
        if (_burnMechanism != address(0)) burnMechanism = IHCFBurnMechanism(_burnMechanism);
        if (_nodeContract != address(0)) nodeContract = IHCFNodeNFT(_nodeContract);
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPaused = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取预估兑换数量
     */
    function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) 
        external 
        view 
        returns (uint256) 
    {
        if (address(pancakeRouter) == address(0)) return 0;
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        try pancakeRouter.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }
    
    /**
     * @dev 获取池子储备
     */
    function getReserves() external view returns (uint256 hcfReserve, uint256 bsdtReserve) {
        if (address(hcfBsdtPair) == address(0)) return (0, 0);
        
        (uint112 reserve0, uint112 reserve1,) = hcfBsdtPair.getReserves();
        
        if (hcfBsdtPair.token0() == address(hcfToken)) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }
    
    /**
     * @dev 获取统计信息
     */
    function getStats() external view returns (
        uint256 volume,
        uint256 fees,
        uint256 currentSellFee,
        uint256 minSlip,
        uint256 maxSlip
    ) {
        return (
            totalSwapVolume,
            totalFeesCollected,
            sellFeeRate,
            minSlippage,
            maxSlippage
        );
    }
}