// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBSDTToken {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IHCFNodeNFT {
    function addDividend(uint256 amount, string memory source) external;
}

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

/**
 * @title HCFExchangeV2
 * @dev 交易所合约 - USDT/BSDT/HCF交换、LP管理、退出机制
 */
contract HCFExchangeV2 is ReentrancyGuard, Ownable {
    
    // ============ 常量 ============
    uint256 public constant PRECISION = 10000;
    uint256 public constant INITIAL_HCF = 1_000_000 * 10**18;     // 初始100万HCF
    uint256 public constant INITIAL_BSDT = 100_000 * 10**18;      // 初始10万BSDT
    uint256 public constant INITIAL_PRICE = 0.1 * 10**18;         // 初始价格0.1 USD
    uint256 public constant SELL_FEE = 300;                       // 卖出费3%
    uint256 public constant LP_REDEMPTION_FEE = 6000;             // LP赎回扣60% HCF
    
    // ============ 状态变量 ============
    IERC20 public hcfToken;
    IBSDTToken public bsdtToken;
    IERC20 public usdtToken;
    IERC20 public usdcToken;
    IHCFNodeNFT public nodeContract;
    address public multiSigWallet;
    address public marketingWallet;
    address public burnAddress = address(0xdead);
    
    // 底池储备
    uint256 public hcfReserve;
    uint256 public bsdtReserve;
    
    // LP信息
    struct LPInfo {
        uint256 hcfAmount;
        uint256 bsdtAmount;
        uint256 lpTokens;
        uint256 timestamp;
    }
    
    mapping(address => LPInfo) public lpInfo;
    uint256 public totalLPTokens;
    
    // 费用分配比例
    uint256 public burnRatio = 3000;       // 30%销毁
    uint256 public nodeRatio = 5000;       // 50%节点
    uint256 public marketingRatio = 2000;  // 20%营销
    
    // 价格范围控制
    uint256 public minPrice = 0.99 * 10**18;  // 最低0.99 USD
    uint256 public maxPrice = 1.0 * 10**18;   // 最高1.0 USD
    
    // ============ 事件 ============
    event TokensPurchased(address indexed buyer, uint256 usdtAmount, uint256 hcfAmount);
    event TokensSold(address indexed seller, uint256 hcfAmount, uint256 usdtReceived, uint256 fee);
    event LiquidityAdded(address indexed provider, uint256 hcfAmount, uint256 bsdtAmount, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 hcfReturned, uint256 bsdtReturned, uint256 hcfFee);
    event ReservesUpdated(uint256 hcfReserve, uint256 bsdtReserve);
    event FundsAdded(uint256 hcfAmount);
    event FeeDistributed(uint256 burned, uint256 toNodes, uint256 toMarketing);
    event PriceUpdated(uint256 newPrice);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig");
        _;
    }
    
    modifier updateReserves() {
        _;
        hcfReserve = hcfToken.balanceOf(address(this));
        bsdtReserve = bsdtToken.balanceOf(address(this));
        emit ReservesUpdated(hcfReserve, bsdtReserve);
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _usdtToken,
        address _usdcToken,
        address _nodeContract,
        address _marketingWallet
    ) {
        hcfToken = IERC20(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        usdtToken = IERC20(_usdtToken);
        usdcToken = IERC20(_usdcToken);
        nodeContract = IHCFNodeNFT(_nodeContract);
        marketingWallet = _marketingWallet;
        
        // 初始化底池（需要后续通过多签添加）
        hcfReserve = 0;
        bsdtReserve = 0;
    }
    
    // ============ 初始化底池 ============
    
    /**
     * @dev 初始化底池（仅一次）
     */
    function initializePool() external onlyOwner {
        require(hcfReserve == 0 && bsdtReserve == 0, "Already initialized");
        
        // 转入初始流动性
        hcfToken.transferFrom(msg.sender, address(this), INITIAL_HCF);
        bsdtToken.transferFrom(msg.sender, address(this), INITIAL_BSDT);
        
        hcfReserve = INITIAL_HCF;
        bsdtReserve = INITIAL_BSDT;
        
        emit ReservesUpdated(hcfReserve, bsdtReserve);
    }
    
    // ============ 买入HCF (USDT → BSDT → HCF) ============
    
    /**
     * @dev 买入HCF（0%费用）
     */
    function buyHCF(uint256 usdtAmount) external nonReentrant updateReserves returns (uint256) {
        require(usdtAmount > 0, "Amount must be > 0");
        require(hcfReserve > 0 && bsdtReserve > 0, "No liquidity");
        
        // 1. 转入USDT
        usdtToken.transferFrom(msg.sender, address(this), usdtAmount);
        
        // 2. 铸造等量BSDT (1:1)
        bsdtToken.mint(address(this), usdtAmount);
        
        // 3. 通过AMM计算HCF输出量
        uint256 hcfAmount = getAmountOut(usdtAmount, bsdtReserve, hcfReserve);
        require(hcfAmount > 0, "Insufficient output");
        
        // 4. 检查价格稳定（0.99-1.0）
        uint256 newPrice = getHCFPrice();
        require(newPrice >= minPrice && newPrice <= maxPrice, "Price out of range");
        
        // 5. 更新储备
        bsdtReserve += usdtAmount;
        hcfReserve -= hcfAmount;
        
        // 6. 转出HCF给买家
        hcfToken.transfer(msg.sender, hcfAmount);
        
        emit TokensPurchased(msg.sender, usdtAmount, hcfAmount);
        emit PriceUpdated(newPrice);
        
        return hcfAmount;
    }
    
    // ============ 卖出HCF (HCF → BSDT → USDT) ============
    
    /**
     * @dev 卖出HCF（3%费用）
     */
    function sellHCF(uint256 hcfAmount) external nonReentrant updateReserves returns (uint256) {
        require(hcfAmount > 0, "Amount must be > 0");
        require(hcfReserve > 0 && bsdtReserve > 0, "No liquidity");
        
        // 1. 转入HCF
        hcfToken.transferFrom(msg.sender, address(this), hcfAmount);
        
        // 2. 通过AMM计算BSDT输出量
        uint256 bsdtAmount = getAmountOut(hcfAmount, hcfReserve, bsdtReserve);
        require(bsdtAmount > 0, "Insufficient output");
        
        // 3. 扣除3%费用
        uint256 fee = (bsdtAmount * SELL_FEE) / PRECISION;
        uint256 netBsdtAmount = bsdtAmount - fee;
        
        // 4. 分配费用
        _distributeFee(fee);
        
        // 5. 更新储备
        hcfReserve += hcfAmount;
        bsdtReserve -= bsdtAmount;
        
        // 6. 销毁BSDT并转出等量USDT
        bsdtToken.burn(netBsdtAmount);
        usdtToken.transfer(msg.sender, netBsdtAmount);
        
        emit TokensSold(msg.sender, hcfAmount, netBsdtAmount, fee);
        
        return netBsdtAmount;
    }
    
    // ============ LP管理 ============
    
    /**
     * @dev 添加流动性
     */
    function addLiquidity(uint256 hcfAmount, uint256 bsdtAmount) external nonReentrant updateReserves returns (uint256) {
        require(hcfAmount > 0 && bsdtAmount > 0, "Amounts must be > 0");
        
        uint256 lpTokens;
        
        if (totalLPTokens == 0) {
            // 首次添加流动性
            lpTokens = sqrt(hcfAmount * bsdtAmount);
        } else {
            // 按比例添加
            uint256 hcfRatio = (hcfAmount * totalLPTokens) / hcfReserve;
            uint256 bsdtRatio = (bsdtAmount * totalLPTokens) / bsdtReserve;
            lpTokens = hcfRatio < bsdtRatio ? hcfRatio : bsdtRatio;
        }
        
        require(lpTokens > 0, "Insufficient LP tokens");
        
        // 转入代币
        hcfToken.transferFrom(msg.sender, address(this), hcfAmount);
        bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount);
        
        // 更新LP信息
        lpInfo[msg.sender].hcfAmount += hcfAmount;
        lpInfo[msg.sender].bsdtAmount += bsdtAmount;
        lpInfo[msg.sender].lpTokens += lpTokens;
        lpInfo[msg.sender].timestamp = block.timestamp;
        
        totalLPTokens += lpTokens;
        hcfReserve += hcfAmount;
        bsdtReserve += bsdtAmount;
        
        emit LiquidityAdded(msg.sender, hcfAmount, bsdtAmount, lpTokens);
        
        return lpTokens;
    }
    
    /**
     * @dev 移除流动性（LP赎回）
     */
    function removeLiquidity(uint256 lpTokens) external nonReentrant updateReserves returns (uint256, uint256) {
        require(lpTokens > 0 && lpTokens <= lpInfo[msg.sender].lpTokens, "Invalid LP amount");
        
        // 计算应得份额
        uint256 hcfAmount = (lpTokens * hcfReserve) / totalLPTokens;
        uint256 bsdtAmount = (lpTokens * bsdtReserve) / totalLPTokens;
        
        // LP赎回扣60% HCF（防止砸盘）
        uint256 hcfFee = (hcfAmount * LP_REDEMPTION_FEE) / PRECISION;
        uint256 hcfReturned = hcfAmount - hcfFee;
        
        // BSDT不扣费
        uint256 bsdtReturned = bsdtAmount;
        
        // 更新LP信息
        lpInfo[msg.sender].lpTokens -= lpTokens;
        if (lpInfo[msg.sender].lpTokens == 0) {
            lpInfo[msg.sender].hcfAmount = 0;
            lpInfo[msg.sender].bsdtAmount = 0;
        } else {
            lpInfo[msg.sender].hcfAmount -= (lpInfo[msg.sender].hcfAmount * lpTokens) / lpInfo[msg.sender].lpTokens;
            lpInfo[msg.sender].bsdtAmount -= (lpInfo[msg.sender].bsdtAmount * lpTokens) / lpInfo[msg.sender].lpTokens;
        }
        
        // 更新储备
        totalLPTokens -= lpTokens;
        hcfReserve -= hcfAmount;
        bsdtReserve -= bsdtAmount;
        
        // 转出代币
        hcfToken.transfer(msg.sender, hcfReturned);
        
        // BSDT可选择转为USDT或USDC
        _handleBSDTRedemption(msg.sender, bsdtReturned);
        
        // 扣除的HCF费用留在池中稳定价格
        hcfReserve += hcfFee;
        
        emit LiquidityRemoved(msg.sender, hcfReturned, bsdtReturned, hcfFee);
        
        return (hcfReturned, bsdtReturned);
    }
    
    /**
     * @dev 处理BSDT赎回（转为USDT或USDC）
     */
    function _handleBSDTRedemption(address user, uint256 amount) private {
        // 默认转为USDT
        bsdtToken.burn(amount);
        usdtToken.transfer(user, amount);
        
        // TODO: 实现USDC桥接选项
    }
    
    // ============ 多签管理功能 ============
    
    /**
     * @dev 添加资金稳定价格（仅多签，无限制）
     */
    function addFunds(uint256 hcfAmount) external onlyMultiSig updateReserves {
        require(hcfAmount > 0, "Amount must be > 0");
        
        // 从多签转入HCF
        hcfToken.transferFrom(msg.sender, address(this), hcfAmount);
        
        // 更新储备
        hcfReserve += hcfAmount;
        
        emit FundsAdded(hcfAmount);
        emit PriceUpdated(getHCFPrice());
    }
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSig) external onlyOwner {
        multiSigWallet = _multiSig;
    }
    
    /**
     * @dev 设置费用分配比例（多签）
     */
    function setFeeDistribution(uint256 _burn, uint256 _node, uint256 _marketing) external onlyMultiSig {
        require(_burn + _node + _marketing == PRECISION, "Must sum to 100%");
        
        burnRatio = _burn;
        nodeRatio = _node;
        marketingRatio = _marketing;
    }
    
    /**
     * @dev 设置价格范围（多签）
     */
    function setPriceRange(uint256 _min, uint256 _max) external onlyMultiSig {
        require(_min < _max, "Invalid range");
        minPrice = _min;
        maxPrice = _max;
    }
    
    // ============ 内部功能 ============
    
    /**
     * @dev AMM计算输出量
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * 997;  // 0.3%手续费
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    /**
     * @dev 分配费用
     */
    function _distributeFee(uint256 fee) private {
        uint256 burnAmount = (fee * burnRatio) / PRECISION;
        uint256 nodeAmount = (fee * nodeRatio) / PRECISION;
        uint256 marketingAmount = (fee * marketingRatio) / PRECISION;
        
        // 销毁
        if (burnAmount > 0) {
            bsdtToken.burn(burnAmount);
        }
        
        // 转给节点分红
        if (nodeAmount > 0) {
            // 转换为HCF后发给节点
            uint256 hcfForNodes = getAmountOut(nodeAmount, bsdtReserve, hcfReserve);
            if (hcfForNodes > 0 && hcfForNodes <= hcfReserve) {
                hcfReserve -= hcfForNodes;
                bsdtReserve += nodeAmount;
                hcfToken.transfer(address(nodeContract), hcfForNodes);
                nodeContract.addDividend(hcfForNodes, "Trading fee");
            }
        }
        
        // 营销
        if (marketingAmount > 0) {
            bsdtToken.burn(marketingAmount);
            usdtToken.transfer(marketingWallet, marketingAmount);
        }
        
        emit FeeDistributed(burnAmount, nodeAmount, marketingAmount);
    }
    
    /**
     * @dev 平方根计算（用于LP代币）
     */
    function sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取HCF当前价格
     */
    function getHCFPrice() public view returns (uint256) {
        if (hcfReserve == 0 || bsdtReserve == 0) {
            return INITIAL_PRICE;
        }
        // 价格 = BSDT储备 / HCF储备
        return (bsdtReserve * 10**18) / hcfReserve;
    }
    
    /**
     * @dev 获取买入预估
     */
    function getBuyEstimate(uint256 usdtAmount) external view returns (uint256) {
        if (hcfReserve == 0 || bsdtReserve == 0) return 0;
        return getAmountOut(usdtAmount, bsdtReserve, hcfReserve);
    }
    
    /**
     * @dev 获取卖出预估
     */
    function getSellEstimate(uint256 hcfAmount) external view returns (uint256) {
        if (hcfReserve == 0 || bsdtReserve == 0) return 0;
        
        uint256 bsdtAmount = getAmountOut(hcfAmount, hcfReserve, bsdtReserve);
        uint256 fee = (bsdtAmount * SELL_FEE) / PRECISION;
        
        return bsdtAmount - fee;
    }
    
    /**
     * @dev 获取池子信息
     */
    function getPoolInfo() external view returns (
        uint256 hcfRes,
        uint256 bsdtRes,
        uint256 price,
        uint256 totalLP
    ) {
        return (hcfReserve, bsdtReserve, getHCFPrice(), totalLPTokens);
    }
    
    /**
     * @dev 获取用户LP信息
     */
    function getUserLPInfo(address user) external view returns (
        uint256 hcfAmount,
        uint256 bsdtAmount,
        uint256 lpTokens,
        uint256 share
    ) {
        LPInfo memory info = lpInfo[user];
        uint256 sharePercent = totalLPTokens > 0 ? (info.lpTokens * PRECISION) / totalLPTokens : 0;
        
        return (info.hcfAmount, info.bsdtAmount, info.lpTokens, sharePercent);
    }
    
    /**
     * @dev 紧急提取（多签）
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyMultiSig {
        if (token == address(0)) {
            (bool success, ) = multiSigWallet.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).transfer(multiSigWallet, amount);
        }
    }
}