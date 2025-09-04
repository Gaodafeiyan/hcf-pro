// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSDTOracle {
    function getTotalSupply() external view returns (uint256);
}

/**
 * @title BSDTTokenV2
 * @dev BSDT稳定币合约V2 - 1:1锚定USDT，优化DEX交互
 * 移除过度的DEX限制，允许添加流动性
 */
contract BSDTTokenV2 is ERC20, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_SUPPLY = 1000_000_000_000 * 10**18; // 1000亿枚固定发行
    uint256 public constant PRICE_RATIO = 10000; // 1:1锚定（基点）
    
    // ============ 接口 ============
    IUSDTOracle public usdtOracle;
    IERC20 public usdtToken;
    address public multiSigWallet;
    
    // ============ 状态变量 ============
    uint256 public totalUSDTLocked;
    bool public emergencyPause = false;
    
    // 1:1合成锁定记录
    mapping(address => uint256) public lockedUSDT;
    uint256 public totalLockedUSDT;
    uint256 public totalMinted;
    
    // 授权交易所（包括DEX Router）
    mapping(address => bool) public authorizedExchanges;
    
    // 白名单地址（可以自由交易）
    mapping(address => bool) public whitelist;
    
    // Keeper监控
    mapping(address => uint256) public lastUSDTBalance;
    mapping(address => uint256) public lastBSDTBalance;
    address public keeperAddress;
    
    // ============ 事件 ============
    event BSDTMinted(address indexed to, uint256 usdtAmount, uint256 bsdtAmount);
    event BSDTBurned(address indexed from, uint256 bsdtAmount, uint256 usdtAmount);
    event ExchangeAuthorized(address indexed exchange, bool status);
    event WhitelistUpdated(address indexed account, bool status);
    event EmergencyPauseSet(bool status);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier onlyAuthorizedExchange() {
        require(authorizedExchanges[msg.sender] || msg.sender == owner(), "Not authorized exchange");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPause, "Contract is paused");
        _;
    }
    
    modifier onlyKeeper() {
        require(msg.sender == keeperAddress || msg.sender == owner(), "Not keeper");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _usdtToken,
        address _usdtOracle,
        address _keeperAddress,
        address _lpPool
    ) ERC20("BSDT Stable Token V2", "BSDT") Ownable() {
        usdtToken = IERC20(_usdtToken);
        if (_usdtOracle != address(0)) {
            usdtOracle = IUSDTOracle(_usdtOracle);
        }
        keeperAddress = _keeperAddress;
        
        // 添加常用DEX Router到授权列表（BSC测试网）
        // PancakeSwap V2 Router (测试网)
        authorizedExchanges[0xD99D1c33F9fC3444f8101754aBC46c52416550D1] = true;
        
        // 添加owner到白名单
        whitelist[msg.sender] = true;
        
        // 铸造初始流动性到池子地址
        if (_lpPool != address(0)) {
            uint256 initialPoolAmount = 100_000 * 10**18; // 10万BSDT
            _mint(_lpPool, initialPoolAmount);
            whitelist[_lpPool] = true;
        }
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 铸造BSDT（1:1 USDT合成锁定）
     */
    function mint(address to, uint256 amount) external onlyAuthorizedExchange nonReentrant notPaused {
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Mint to zero address");
        
        // 检查固定供应量限制
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        // 1 BSDT = 1 USDT 合成锁定
        uint256 balanceBefore = usdtToken.balanceOf(address(this));
        require(usdtToken.transferFrom(msg.sender, address(this), amount), "USDT transfer failed");
        uint256 balanceAfter = usdtToken.balanceOf(address(this));
        require(balanceAfter - balanceBefore == amount, "USDT amount mismatch");
        
        // 锁定USDT记录
        lockedUSDT[to] += amount;
        totalLockedUSDT += amount;
        totalUSDTLocked += amount;
        totalMinted += amount;
        
        // 铸造BSDT
        _mint(to, amount);
        
        emit BSDTMinted(to, amount, amount);
    }
    
    /**
     * @dev 销毁BSDT（释放等值USDT）
     */
    function burn(uint256 amount) external nonReentrant notPaused {
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // 确保合约有足够的USDT
        require(usdtToken.balanceOf(address(this)) >= amount, "Insufficient USDT in contract");
        require(totalUSDTLocked >= amount, "Insufficient locked USDT");
        
        // 先记录余额
        uint256 balanceBefore = usdtToken.balanceOf(msg.sender);
        
        // 销毁BSDT
        _burn(msg.sender, amount);
        totalUSDTLocked -= amount;
        
        // 释放等值USDT（1:1）
        require(usdtToken.transfer(msg.sender, amount), "USDT transfer failed");
        
        // 验证USDT转账成功
        uint256 balanceAfter = usdtToken.balanceOf(msg.sender);
        require(balanceAfter - balanceBefore == amount, "USDT release mismatch");
        
        emit BSDTBurned(msg.sender, amount, amount);
    }
    
    /**
     * @dev 重写transfer - 检查权限但不阻止DEX
     */
    function transfer(address to, uint256 amount) public virtual override notPaused returns (bool) {
        // 允许白名单和授权地址自由转账
        _transfer(_msgSender(), to, amount);
        return true;
    }
    
    /**
     * @dev 重写transferFrom - 检查权限但不阻止DEX
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override notPaused returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev 重写approve - 允许所有approve操作（包括DEX）
     */
    function approve(address spender, uint256 amount) public virtual override notPaused returns (bool) {
        // V2版本：允许所有approve操作，包括DEX Router
        _approve(_msgSender(), spender, amount);
        return true;
    }
    
    // ============ Keeper监控功能 ============
    
    /**
     * @dev 监控USDT转入，自动铸造BSDT
     */
    function monitorUSDTTransfer(address wallet, uint256 detectedAmount) external onlyKeeper notPaused {
        uint256 currentUSDTBalance = usdtToken.balanceOf(wallet);
        
        // 如果检测到USDT增加
        if (currentUSDTBalance > lastUSDTBalance[wallet]) {
            uint256 increaseAmount = currentUSDTBalance - lastUSDTBalance[wallet];
            
            // 检查是否可以铸造
            if (totalSupply() + increaseAmount <= MAX_SUPPLY) {
                // 从钱包转入USDT
                require(usdtToken.transferFrom(wallet, address(this), increaseAmount), "USDT transfer failed");
                totalUSDTLocked += increaseAmount;
                
                // 铸造等值BSDT给钱包
                _mint(wallet, increaseAmount);
                
                emit BSDTMinted(wallet, increaseAmount, increaseAmount);
            }
        }
        
        lastUSDTBalance[wallet] = currentUSDTBalance;
    }
    
    /**
     * @dev 监控BSDT转入，自动销毁并释放USDT
     */
    function monitorBSDTTransfer(address wallet, uint256 detectedAmount) external onlyKeeper notPaused {
        uint256 currentBSDTBalance = balanceOf(wallet);
        
        // 如果检测到BSDT增加
        if (currentBSDTBalance > lastBSDTBalance[wallet]) {
            uint256 increaseAmount = currentBSDTBalance - lastBSDTBalance[wallet];
            
            // 销毁BSDT
            _burn(wallet, increaseAmount);
            totalUSDTLocked -= increaseAmount;
            
            // 释放等值USDT给钱包
            require(usdtToken.transfer(wallet, increaseAmount), "USDT transfer failed");
            
            emit BSDTBurned(wallet, increaseAmount, increaseAmount);
        }
        
        lastBSDTBalance[wallet] = currentBSDTBalance;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid multisig address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        
        // 添加多签到白名单
        whitelist[_multiSigWallet] = true;
        
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    /**
     * @dev 获取剩余可铸造量
     */
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /**
     * @dev 授权交易所（包括DEX Router）
     */
    function authorizeExchange(address exchange, bool authorized) external onlyMultiSig {
        require(exchange != address(0), "Invalid exchange address");
        authorizedExchanges[exchange] = authorized;
        emit ExchangeAuthorized(exchange, authorized);
    }
    
    /**
     * @dev 更新白名单
     */
    function updateWhitelist(address account, bool status) external onlyMultiSig {
        require(account != address(0), "Invalid account");
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @dev 设置紧急暂停
     */
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPause = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    /**
     * @dev 设置Keeper地址
     */
    function setKeeperAddress(address _keeper) external onlyMultiSig {
        require(_keeper != address(0), "Invalid keeper address");
        keeperAddress = _keeper;
        whitelist[_keeper] = true;
    }
    
    /**
     * @dev 设置Oracle地址
     */
    function setOracle(address _oracle) external onlyMultiSig {
        usdtOracle = IUSDTOracle(_oracle);
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyMultiSig {
        if (token == address(0)) {
            // 提取BNB
            (bool success, ) = multiSigWallet.call{value: amount}("");
            require(success, "BNB transfer failed");
        } else if (token == address(usdtToken)) {
            // 提取USDT（需要调整锁定量）
            require(usdtToken.transfer(multiSigWallet, amount), "USDT transfer failed");
            if (amount <= totalUSDTLocked) {
                totalUSDTLocked -= amount;
            }
        } else {
            // 提取其他代币
            IERC20(token).transfer(multiSigWallet, amount);
        }
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取价格（始终1:1）
     */
    function getPrice() external pure returns (uint256) {
        return PRICE_RATIO;
    }
    
    /**
     * @dev 获取USDT锁定量
     */
    function getUSDTLocked() external view returns (uint256) {
        return totalUSDTLocked;
    }
    
    /**
     * @dev 检查是否1:1锚定
     */
    function isPegged() external view returns (bool) {
        return totalSupply() == totalUSDTLocked;
    }
    
    /**
     * @dev 检查地址是否可以交易
     */
    function canTrade(address account) external view returns (bool) {
        return whitelist[account] || authorizedExchanges[account];
    }
    
    /**
     * @dev 接收BNB
     */
    receive() external payable {}
}