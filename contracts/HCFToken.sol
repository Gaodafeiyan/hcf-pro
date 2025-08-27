// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

/**
 * @title HCFToken
 * @dev HCF DeFi项目核心代币合约
 * 实现代币发行、税费机制、分配机制、销毁机制、多签控制
 */
contract HCFToken is ERC20, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;  // 总量10亿
    uint256 public constant INITIAL_RELEASE = 10_000_000 * 10**18;  // 首发1000万
    uint256 public constant RESERVE_FUND = 9_000_000 * 10**18;     // 储备底池900万
    uint256 public constant BURN_STOP_SUPPLY = 990_000 * 10**18;   // 销毁停止在99万
    uint256 public constant MIN_BALANCE = 0.0001 * 10**18;         // 最小保留余额0.0001
    
    // ============ 税率（基点） ============
    uint256 public buyTaxRate = 200;      // 买入税2%
    uint256 public sellTaxRate = 500;     // 卖出税5%
    uint256 public transferTaxRate = 100; // 转账税1%
    uint256 public claimTaxRate = 500;    // 领取收益税5%
    
    // 买入税分配（占税的比例）
    uint256 public buyBurnRate = 2500;      // 25%销毁
    uint256 public buyMarketingRate = 2500; // 25%营销
    uint256 public buyLPRate = 2500;        // 25%LP
    uint256 public buyNodeRate = 2500;      // 25%节点
    
    // 卖出税分配（占税的比例）
    uint256 public sellBurnRate = 4000;      // 40%销毁
    uint256 public sellMarketingRate = 2000; // 20%营销
    uint256 public sellLPRate = 2000;        // 20%LP
    uint256 public sellNodeRate = 2000;      // 20%节点
    
    // 转账税分配
    uint256 public transferBurnRate = 10000; // 100%销毁
    
    // ============ 地址 ============
    address public multiSigWallet;
    address public marketingWallet;
    address public nodePool;
    address public lpPool;
    address public reserveWallet;
    address public bridgeAddress;
    
    // ============ 状态变量 ============
    uint256 public totalBurned;
    mapping(address => bool) public isExcludedFromTax;
    mapping(address => bool) public isDEXPair;
    bool public tradingEnabled = false;
    
    // ============ 事件 ============
    event TaxUpdated(uint256 buyTax, uint256 sellTax, uint256 transferTax);
    event FundsAdded(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event TaxDistributed(uint256 burnAmount, uint256 marketingAmount, uint256 lpAmount, uint256 nodeAmount);
    event BridgeTaxCollected(address indexed from, uint256 amount);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event ReserveFundTransferred(address indexed to, uint256 amount);
    event TradingEnabled();
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig wallet");
        _;
    }
    
    modifier tradingActive() {
        require(tradingEnabled || msg.sender == owner() || msg.sender == multiSigWallet, "Trading not enabled");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _marketingWallet,
        address _nodePool,
        address _lpPool,
        address _bridgeAddress
    ) ERC20("HCF Token", "HCF") Ownable(msg.sender) {
        marketingWallet = _marketingWallet;
        nodePool = _nodePool;
        lpPool = _lpPool;
        bridgeAddress = _bridgeAddress;
        reserveWallet = address(this); // 初始储备在合约内
        
        // 铸造首发1000万给owner
        _mint(msg.sender, INITIAL_RELEASE);
        
        // 铸造900万储备金到合约（后续转到多签）
        _mint(address(this), RESERVE_FUND);
        
        // 设置免税地址
        isExcludedFromTax[msg.sender] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[marketingWallet] = true;
        isExcludedFromTax[nodePool] = true;
        isExcludedFromTax[lpPool] = true;
        isExcludedFromTax[bridgeAddress] = true;
    }
    
    // ============ 核心转账功能 ============
    
    /**
     * @dev 重写公共transfer函数，调用我们的税费逻辑
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _transferWithTax(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev 重写transferFrom函数，调用我们的税费逻辑
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transferWithTax(from, to, amount);
        return true;
    }
    
    /**
     * @dev 重写转账函数，加入税费机制和最小余额检查
     */
    function _transferWithTax(
        address from,
        address to,
        uint256 amount
    ) internal tradingActive {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // 检查最小余额要求（发送方必须保留0.0001）
        if (from != address(this) && from != multiSigWallet) {
            require(balanceOf(from) - amount >= MIN_BALANCE, "Must keep minimum balance");
        }
        
        uint256 taxAmount = 0;
        uint256 transferAmount = amount;
        
        // 如果不是免税地址，计算税费
        if (!isExcludedFromTax[from] && !isExcludedFromTax[to]) {
            if (isDEXPair[to]) {
                // 卖出
                taxAmount = (amount * sellTaxRate) / 10000;
                _distributeSellTax(taxAmount);
            } else if (isDEXPair[from]) {
                // 买入
                taxAmount = (amount * buyTaxRate) / 10000;
                _distributeBuyTax(taxAmount);
            } else {
                // 普通转账
                taxAmount = (amount * transferTaxRate) / 10000;
                _distributeTransferTax(taxAmount);
            }
            
            transferAmount = amount - taxAmount;
        }
        
        // 执行转账
        super._transfer(from, to, transferAmount);
        
        // 如果有税费，从发送方扣除并分配
        if (taxAmount > 0) {
            super._transfer(from, address(this), taxAmount);
        }
    }
    
    /**
     * @dev 分配买入税
     */
    function _distributeBuyTax(uint256 taxAmount) private {
        uint256 burnAmount = (taxAmount * buyBurnRate) / 10000;
        uint256 marketingAmount = (taxAmount * buyMarketingRate) / 10000;
        uint256 lpAmount = (taxAmount * buyLPRate) / 10000;
        uint256 nodeAmount = (taxAmount * buyNodeRate) / 10000;
        
        _burnTokens(burnAmount);
        if (marketingAmount > 0) super._transfer(address(this), marketingWallet, marketingAmount);
        if (lpAmount > 0) super._transfer(address(this), lpPool, lpAmount);
        if (nodeAmount > 0) super._transfer(address(this), nodePool, nodeAmount);
        
        emit TaxDistributed(burnAmount, marketingAmount, lpAmount, nodeAmount);
    }
    
    /**
     * @dev 分配卖出税
     */
    function _distributeSellTax(uint256 taxAmount) private {
        uint256 burnAmount = (taxAmount * sellBurnRate) / 10000;
        uint256 marketingAmount = (taxAmount * sellMarketingRate) / 10000;
        uint256 lpAmount = (taxAmount * sellLPRate) / 10000;
        uint256 nodeAmount = (taxAmount * sellNodeRate) / 10000;
        
        _burnTokens(burnAmount);
        if (marketingAmount > 0) super._transfer(address(this), marketingWallet, marketingAmount);
        if (lpAmount > 0) super._transfer(address(this), lpPool, lpAmount);
        if (nodeAmount > 0) super._transfer(address(this), nodePool, nodeAmount);
        
        emit TaxDistributed(burnAmount, marketingAmount, lpAmount, nodeAmount);
    }
    
    /**
     * @dev 分配转账税（100%销毁）
     */
    function _distributeTransferTax(uint256 taxAmount) private {
        _burnTokens(taxAmount);
        emit TaxDistributed(taxAmount, 0, 0, 0);
    }
    
    /**
     * @dev 销毁代币（检查99万限制）
     */
    function _burnTokens(uint256 amount) private {
        if (totalSupply() > BURN_STOP_SUPPLY && amount > 0) {
            uint256 burnAmount = amount;
            // 如果销毁后低于99万，调整销毁量
            if (totalSupply() - amount < BURN_STOP_SUPPLY) {
                burnAmount = totalSupply() - BURN_STOP_SUPPLY;
            }
            
            if (burnAmount > 0) {
                _burn(address(this), burnAmount);
                totalBurned += burnAmount;
            }
        }
    }
    
    // ============ 领取收益功能 ============
    
    /**
     * @dev 领取收益时扣5% BNB到bridge
     */
    function claimRewards() external payable nonReentrant {
        require(msg.value > 0, "Must send BNB for bridge tax");
        
        uint256 bridgeTax = (msg.value * claimTaxRate) / 10000;
        uint256 returnAmount = msg.value - bridgeTax;
        
        // 发送税费到bridge地址
        if (bridgeTax > 0) {
            (bool success, ) = bridgeAddress.call{value: bridgeTax}("");
            require(success, "Bridge tax transfer failed");
            emit BridgeTaxCollected(msg.sender, bridgeTax);
        }
        
        // 退还剩余BNB
        if (returnAmount > 0) {
            (bool success, ) = msg.sender.call{value: returnAmount}("");
            require(success, "BNB return failed");
        }
    }
    
    // ============ 多签管理功能 ============
    
    /**
     * @dev 设置多签钱包并转移储备金
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid multisig address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        
        // 转移储备金到多签钱包
        if (balanceOf(address(this)) >= RESERVE_FUND) {
            super._transfer(address(this), multiSigWallet, RESERVE_FUND);
            reserveWallet = multiSigWallet;
            emit ReserveFundTransferred(multiSigWallet, RESERVE_FUND);
        }
        
        // 设置多签为免税
        isExcludedFromTax[multiSigWallet] = true;
        
        emit MultiSigWalletSet(oldWallet, multiSigWallet);
    }
    
    /**
     * @dev 添加资金（仅多签）
     */
    function addFunds(uint256 amount) external onlyMultiSig {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        super._transfer(msg.sender, address(this), amount);
        emit FundsAdded(msg.sender, amount);
    }
    
    /**
     * @dev 提取资金（仅多签）
     */
    function withdrawFunds(address to, uint256 amount) external onlyMultiSig {
        require(balanceOf(address(this)) >= amount, "Insufficient contract balance");
        super._transfer(address(this), to, amount);
        emit FundsWithdrawn(to, amount);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置税率（仅多签）
     */
    function setTaxRates(
        uint256 _buyTax,
        uint256 _sellTax,
        uint256 _transferTax
    ) external onlyMultiSig {
        require(_buyTax <= 1000, "Buy tax too high");     // 最高10%
        require(_sellTax <= 1000, "Sell tax too high");   // 最高10%
        require(_transferTax <= 500, "Transfer tax too high"); // 最高5%
        
        buyTaxRate = _buyTax;
        sellTaxRate = _sellTax;
        transferTaxRate = _transferTax;
        
        emit TaxUpdated(_buyTax, _sellTax, _transferTax);
    }
    
    /**
     * @dev 设置买入税分配（仅多签）
     */
    function setBuyTaxDistribution(
        uint256 _burnRate,
        uint256 _marketingRate,
        uint256 _lpRate,
        uint256 _nodeRate
    ) external onlyMultiSig {
        require(_burnRate + _marketingRate + _lpRate + _nodeRate == 10000, "Must equal 100%");
        
        buyBurnRate = _burnRate;
        buyMarketingRate = _marketingRate;
        buyLPRate = _lpRate;
        buyNodeRate = _nodeRate;
    }
    
    /**
     * @dev 设置卖出税分配（仅多签）
     */
    function setSellTaxDistribution(
        uint256 _burnRate,
        uint256 _marketingRate,
        uint256 _lpRate,
        uint256 _nodeRate
    ) external onlyMultiSig {
        require(_burnRate + _marketingRate + _lpRate + _nodeRate == 10000, "Must equal 100%");
        
        sellBurnRate = _burnRate;
        sellMarketingRate = _marketingRate;
        sellLPRate = _lpRate;
        sellNodeRate = _nodeRate;
    }
    
    /**
     * @dev 设置钱包地址（仅多签）
     */
    function setWalletAddresses(
        address _marketing,
        address _nodePool,
        address _lpPool,
        address _bridge
    ) external onlyMultiSig {
        marketingWallet = _marketing;
        nodePool = _nodePool;
        lpPool = _lpPool;
        bridgeAddress = _bridge;
        
        // 更新免税状态
        isExcludedFromTax[_marketing] = true;
        isExcludedFromTax[_nodePool] = true;
        isExcludedFromTax[_lpPool] = true;
        isExcludedFromTax[_bridge] = true;
    }
    
    /**
     * @dev 设置DEX交易对地址
     */
    function setDEXPair(address pair, bool isPair) external onlyOwner {
        isDEXPair[pair] = isPair;
    }
    
    /**
     * @dev 设置免税地址
     */
    function setExcludedFromTax(address account, bool excluded) external onlyMultiSig {
        isExcludedFromTax[account] = excluded;
    }
    
    /**
     * @dev 启用交易
     */
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled();
    }
    
    /**
     * @dev 紧急提取（仅多签）
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyMultiSig {
        if (token == address(0)) {
            // 提取BNB
            (bool success, ) = multiSigWallet.call{value: amount}("");
            require(success, "BNB transfer failed");
        } else {
            // 提取代币
            IERC20(token).transfer(multiSigWallet, amount);
        }
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取流通量（扣除销毁）
     */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }
    
    /**
     * @dev 接收BNB
     */
    receive() external payable {}
}