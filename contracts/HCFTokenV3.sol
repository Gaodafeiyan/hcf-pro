// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HCFTokenV3
 * @dev 正确的10亿总量HCF代币合约
 */
contract HCFTokenV3 is ERC20, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;  // 总量10亿
    uint256 public constant INITIAL_RELEASE = 10_000_000 * 10**18;  // 首发1000万（流通）
    uint256 public constant MINING_RESERVE = 990_000_000 * 10**18;  // 挖矿储备9.9亿
    uint256 public constant BURN_STOP_SUPPLY = 990_000 * 10**18;    // 销毁停止在99万
    uint256 public constant MIN_BALANCE = 1;                        // 最小保留余额0.0001 HCF
    
    // ============ 税率（基点，100 = 1%） ============
    uint256 public buyTaxRate = 200;      // 买入税2%
    uint256 public sellTaxRate = 500;     // 卖出税5%
    uint256 public transferTaxRate = 100; // 转账税1%
    
    // 税费分配比例（基点，10000 = 100%）
    struct TaxDistribution {
        uint256 burnRate;      // 销毁
        uint256 marketingRate; // 营销
        uint256 lpRate;        // LP
        uint256 nodeRate;      // 节点
    }
    
    TaxDistribution public buyTaxDist = TaxDistribution(2500, 2500, 2500, 2500);   // 各25%
    TaxDistribution public sellTaxDist = TaxDistribution(4000, 2000, 2000, 2000);  // 40%,20%,20%,20%
    
    // ============ 地址 ============
    address public marketingWallet;
    address public nodePool;
    address public lpPool;
    address public stakingContract;
    address public exchangeContract;
    
    // ============ 状态变量 ============
    uint256 public totalBurned;
    mapping(address => bool) public isExemptFromTax;
    mapping(address => bool) public isPair;
    
    // 限购机制
    uint256 public launchTime;
    uint256 public purchaseLimitDays = 7;
    uint256 public dailyPurchaseLimit = 1000 * 10**18;
    mapping(address => mapping(uint256 => uint256)) public dailyPurchases;
    
    // ============ 事件 ============
    event TaxCollected(uint256 amount, string taxType);
    event TokensBurned(uint256 amount);
    event TaxRatesUpdated(uint256 buyTax, uint256 sellTax, uint256 transferTax);
    
    constructor(
        address _marketingWallet,
        address _nodePool,
        address _lpPool
    ) ERC20("HCF Token", "HCF") {
        require(_marketingWallet != address(0), "Invalid marketing wallet");
        require(_nodePool != address(0), "Invalid node pool");
        require(_lpPool != address(0), "Invalid LP pool");
        
        marketingWallet = _marketingWallet;
        nodePool = _nodePool;
        lpPool = _lpPool;
        
        // 铸造10亿总量
        _mint(msg.sender, TOTAL_SUPPLY);
        
        // 设置免税地址
        isExemptFromTax[msg.sender] = true;
        isExemptFromTax[address(this)] = true;
        isExemptFromTax[marketingWallet] = true;
        isExemptFromTax[nodePool] = true;
        isExemptFromTax[lpPool] = true;
        
        launchTime = block.timestamp;
    }
    
    // ============ 转账函数重写 ============
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(sender != address(0), "Transfer from zero address");
        require(recipient != address(0), "Transfer to zero address");
        
        // 检查最小余额限制
        if (sender != address(this) && !isExemptFromTax[sender]) {
            require(balanceOf(sender) - amount >= MIN_BALANCE, "Must keep minimum balance");
        }
        
        // 检查限购（前7天）
        if (isPair[sender] && !isExemptFromTax[recipient]) {
            if (block.timestamp < launchTime + (purchaseLimitDays * 1 days)) {
                uint256 currentDay = (block.timestamp - launchTime) / 1 days;
                dailyPurchases[recipient][currentDay] += amount;
                require(
                    dailyPurchases[recipient][currentDay] <= dailyPurchaseLimit,
                    "Exceeds daily purchase limit"
                );
            }
        }
        
        uint256 taxAmount = 0;
        
        // 计算税费
        if (!isExemptFromTax[sender] && !isExemptFromTax[recipient]) {
            if (isPair[sender]) {
                // 买入
                taxAmount = (amount * buyTaxRate) / 10000;
                if (taxAmount > 0) {
                    _processBuyTax(sender, taxAmount);
                    emit TaxCollected(taxAmount, "BUY");
                }
            } else if (isPair[recipient]) {
                // 卖出
                taxAmount = (amount * sellTaxRate) / 10000;
                if (taxAmount > 0) {
                    _processSellTax(sender, taxAmount);
                    emit TaxCollected(taxAmount, "SELL");
                }
            } else {
                // 转账
                taxAmount = (amount * transferTaxRate) / 10000;
                if (taxAmount > 0) {
                    _processTransferTax(sender, taxAmount);
                    emit TaxCollected(taxAmount, "TRANSFER");
                }
            }
        }
        
        super._transfer(sender, recipient, amount - taxAmount);
    }
    
    // ============ 税费处理 ============
    function _processBuyTax(address sender, uint256 taxAmount) private {
        uint256 burnAmount = (taxAmount * buyTaxDist.burnRate) / 10000;
        uint256 marketingAmount = (taxAmount * buyTaxDist.marketingRate) / 10000;
        uint256 lpAmount = (taxAmount * buyTaxDist.lpRate) / 10000;
        uint256 nodeAmount = taxAmount - burnAmount - marketingAmount - lpAmount;
        
        if (burnAmount > 0 && totalSupply() - burnAmount >= BURN_STOP_SUPPLY) {
            _burn(sender, burnAmount);
            totalBurned += burnAmount;
        }
        
        if (marketingAmount > 0) super._transfer(sender, marketingWallet, marketingAmount);
        if (lpAmount > 0) super._transfer(sender, lpPool, lpAmount);
        if (nodeAmount > 0) super._transfer(sender, nodePool, nodeAmount);
    }
    
    function _processSellTax(address sender, uint256 taxAmount) private {
        uint256 burnAmount = (taxAmount * sellTaxDist.burnRate) / 10000;
        uint256 marketingAmount = (taxAmount * sellTaxDist.marketingRate) / 10000;
        uint256 lpAmount = (taxAmount * sellTaxDist.lpRate) / 10000;
        uint256 nodeAmount = taxAmount - burnAmount - marketingAmount - lpAmount;
        
        if (burnAmount > 0 && totalSupply() - burnAmount >= BURN_STOP_SUPPLY) {
            _burn(sender, burnAmount);
            totalBurned += burnAmount;
        }
        
        if (marketingAmount > 0) super._transfer(sender, marketingWallet, marketingAmount);
        if (lpAmount > 0) super._transfer(sender, lpPool, lpAmount);
        if (nodeAmount > 0) super._transfer(sender, nodePool, nodeAmount);
    }
    
    function _processTransferTax(address sender, uint256 taxAmount) private {
        // 转账税100%销毁
        if (totalSupply() - taxAmount >= BURN_STOP_SUPPLY) {
            _burn(sender, taxAmount);
            totalBurned += taxAmount;
        }
    }
    
    // ============ 管理函数 ============
    function setTaxRates(uint256 _buyTax, uint256 _sellTax, uint256 _transferTax) external onlyOwner {
        require(_buyTax <= 1000, "Buy tax too high");      // 最高10%
        require(_sellTax <= 1000, "Sell tax too high");    // 最高10%
        require(_transferTax <= 500, "Transfer tax too high"); // 最高5%
        
        buyTaxRate = _buyTax;
        sellTaxRate = _sellTax;
        transferTaxRate = _transferTax;
        
        emit TaxRatesUpdated(_buyTax, _sellTax, _transferTax);
    }
    
    function setBuyTaxDistribution(
        uint256 _burnRate,
        uint256 _marketingRate,
        uint256 _lpRate,
        uint256 _nodeRate
    ) external onlyOwner {
        require(_burnRate + _marketingRate + _lpRate + _nodeRate == 10000, "Must equal 100%");
        buyTaxDist = TaxDistribution(_burnRate, _marketingRate, _lpRate, _nodeRate);
    }
    
    function setSellTaxDistribution(
        uint256 _burnRate,
        uint256 _marketingRate,
        uint256 _lpRate,
        uint256 _nodeRate
    ) external onlyOwner {
        require(_burnRate + _marketingRate + _lpRate + _nodeRate == 10000, "Must equal 100%");
        sellTaxDist = TaxDistribution(_burnRate, _marketingRate, _lpRate, _nodeRate);
    }
    
    function setExemptFromTax(address account, bool exempt) external onlyOwner {
        isExemptFromTax[account] = exempt;
    }
    
    function setPair(address pair, bool isPair_) external onlyOwner {
        isPair[pair] = isPair_;
    }
    
    function setContracts(address _staking, address _exchange) external onlyOwner {
        stakingContract = _staking;
        exchangeContract = _exchange;
        
        // 设置合约免税
        if (_staking != address(0)) isExemptFromTax[_staking] = true;
        if (_exchange != address(0)) isExemptFromTax[_exchange] = true;
    }
    
    function setPurchaseLimit(uint256 _days, uint256 _dailyLimit) external onlyOwner {
        purchaseLimitDays = _days;
        dailyPurchaseLimit = _dailyLimit;
    }
    
    // ============ 查询函数 ============
    function getCirculatingSupply() external view returns (uint256) {
        return totalSupply() - balanceOf(address(this));
    }
    
    function getRemainingBurnAmount() external view returns (uint256) {
        if (totalSupply() <= BURN_STOP_SUPPLY) {
            return 0;
        }
        return totalSupply() - BURN_STOP_SUPPLY;
    }
}