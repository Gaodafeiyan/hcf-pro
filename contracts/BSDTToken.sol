// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSDTOracle {
    function getTotalSupply() external view returns (uint256);
}

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IDEXPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function factory() external view returns (address);
}

interface IDEXRouter {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

/**
 * @title BSDTToken
 * @dev BSDT稳定币合约 - 1:1锚定USDT，严格禁止非授权交易
 * 实现Oracle限制、DEX检测、Keeper监控、多签控制
 */
contract BSDTToken is ERC20, Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant PRICE_RATIO = 10000; // 1:1锚定（基点）
    
    // ============ 接口 ============
    IUSDTOracle public usdtOracle;
    IERC20 public usdtToken;
    address public multiSigWallet;
    
    // ============ 状态变量 ============
    uint256 public maxSupplyFromOracle;
    uint256 public totalUSDTLocked;
    bool public emergencyPause = false;
    
    // 授权交易所
    mapping(address => bool) public authorizedExchanges;
    
    // DEX黑名单
    mapping(address => bool) public blacklistedDEX;
    address[] public knownDEXRouters;
    address[] public knownDEXFactories;
    
    // Keeper监控
    mapping(address => uint256) public lastUSDTBalance;
    mapping(address => uint256) public lastBSDTBalance;
    address public keeperAddress;
    
    // ============ 事件 ============
    event BSDTMinted(address indexed to, uint256 usdtAmount, uint256 bsdtAmount);
    event BSDTBurned(address indexed from, uint256 bsdtAmount, uint256 usdtAmount);
    event UnauthorizedAttempt(address indexed from, address indexed to, string reason);
    event DEXBlacklisted(address indexed dex, bool status);
    event ExchangeAuthorized(address indexed exchange, bool status);
    event MaxSupplyUpdated(uint256 oldSupply, uint256 newSupply);
    event EmergencyPauseSet(bool status);
    event KeeperTransferDetected(address indexed wallet, uint256 amount, string tokenType);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig wallet");
        _;
    }
    
    modifier onlyAuthorizedExchange() {
        require(authorizedExchanges[msg.sender], "Not authorized exchange");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPause, "Contract is paused");
        _;
    }
    
    modifier onlyKeeper() {
        require(msg.sender == keeperAddress, "Not keeper");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _usdtToken,
        address _usdtOracle,
        address _keeperAddress,
        address _lpPool
    ) ERC20("BSDT Stable Token", "BSDT") Ownable() {
        usdtToken = IERC20(_usdtToken);
        usdtOracle = IUSDTOracle(_usdtOracle);
        keeperAddress = _keeperAddress;
        
        // 初始化常见DEX地址（BSC主网）
        // PancakeSwap V2
        knownDEXRouters.push(0x10ED43C718714eb63d5aA57B78B54704E256024E);
        knownDEXFactories.push(0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73);
        
        // Biswap
        knownDEXRouters.push(0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8);
        knownDEXFactories.push(0x858E3312ed3A876947EA49d572A7C42DE08af7EE);
        
        // 将已知DEX加入黑名单
        for(uint i = 0; i < knownDEXRouters.length; i++) {
            blacklistedDEX[knownDEXRouters[i]] = true;
        }
        for(uint i = 0; i < knownDEXFactories.length; i++) {
            blacklistedDEX[knownDEXFactories[i]] = true;
        }
        
        // 获取初始Oracle供应量
        _updateMaxSupplyFromOracle();
        
        // 铸造10万BSDT到底池（无需USDT锁定，初始流动性）
        if (_lpPool != address(0)) {
            uint256 initialPoolAmount = 100_000 * 10**18; // 10万BSDT
            _mint(_lpPool, initialPoolAmount);
            // 将底池地址加入授权交易所
            authorizedExchanges[_lpPool] = true;
        }
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 铸造BSDT（需要1:1锁定USDT）
     */
    function mint(address to, uint256 amount) external onlyAuthorizedExchange nonReentrant notPaused {
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Mint to zero address");
        
        // 更新Oracle供应量
        _updateMaxSupplyFromOracle();
        
        // 严格检查Oracle供应量限制
        require(totalSupply() + amount <= maxSupplyFromOracle, "Exceeds max supply from Oracle");
        
        // 转入等值USDT（1:1锁定）- 必须先锁定USDT
        uint256 balanceBefore = usdtToken.balanceOf(address(this));
        require(usdtToken.transferFrom(msg.sender, address(this), amount), "USDT transfer failed");
        uint256 balanceAfter = usdtToken.balanceOf(address(this));
        require(balanceAfter - balanceBefore == amount, "USDT amount mismatch");
        
        totalUSDTLocked += amount;
        
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
     * @dev 重写transfer - 严格限制只允许授权地址
     */
    function transfer(address to, uint256 amount) public virtual override notPaused returns (bool) {
        address from = _msgSender();
        
        // DEX检测和限制
        if (!_isAuthorizedTransfer(from, to)) {
            emit UnauthorizedAttempt(from, to, "Unauthorized transfer");
            revert("BSDT: Transfer not authorized");
        }
        
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev 重写transferFrom - 严格限制只允许授权地址
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override notPaused returns (bool) {
        address spender = _msgSender();
        
        // DEX检测和限制
        if (!_isAuthorizedTransfer(from, to)) {
            emit UnauthorizedAttempt(from, to, "Unauthorized transferFrom");
            revert("BSDT: TransferFrom not authorized");
        }
        
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev 重写approve - 严格限制只允许授权地址
     */
    function approve(address spender, uint256 amount) public virtual override notPaused returns (bool) {
        address owner = _msgSender();
        
        // 检测是否为DEX
        if (blacklistedDEX[spender] || _isDEXContract(spender)) {
            emit UnauthorizedAttempt(owner, spender, "Cannot approve to DEX");
            revert("BSDT: Cannot approve to DEX");
        }
        
        // 只允许授权地址（移除owner == spender的条件）
        require(
            authorizedExchanges[spender] || 
            spender == multiSigWallet || 
            spender == address(this),
            "BSDT: Approval not authorized"
        );
        
        _approve(owner, spender, amount);
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
            if (totalSupply() + increaseAmount <= maxSupplyFromOracle) {
                // 从钱包转入USDT
                require(usdtToken.transferFrom(wallet, address(this), increaseAmount), "USDT transfer failed");
                totalUSDTLocked += increaseAmount;
                
                // 铸造等值BSDT给钱包
                _mint(wallet, increaseAmount);
                
                emit BSDTMinted(wallet, increaseAmount, increaseAmount);
                emit KeeperTransferDetected(wallet, increaseAmount, "USDT");
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
            emit KeeperTransferDetected(wallet, increaseAmount, "BSDT");
        }
        
        lastBSDTBalance[wallet] = currentBSDTBalance;
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 检查是否为授权转账
     */
    function _isAuthorizedTransfer(address from, address to) private view returns (bool) {
        // 检测DEX
        if (_isDEXPair(from) || _isDEXPair(to)) {
            return false;
        }
        
        if (blacklistedDEX[from] || blacklistedDEX[to]) {
            return false;
        }
        
        // 只允许授权交易所和多签钱包（移除owner权限）
        return authorizedExchanges[from] || 
               authorizedExchanges[to] || 
               from == multiSigWallet ||
               to == multiSigWallet ||
               from == address(this) ||
               to == address(this);
    }
    
    /**
     * @dev 检测是否为DEX Pair
     */
    function _isDEXPair(address account) private view returns (bool) {
        if (account.code.length == 0) return false;
        
        // 尝试调用DEX Pair接口
        try IDEXPair(account).token0() returns (address token0) {
            try IDEXPair(account).token1() returns (address token1) {
                // 如果包含BSDT，则是DEX pair
                return token0 == address(this) || token1 == address(this);
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }
    
    /**
     * @dev 检测是否为DEX合约
     */
    function _isDEXContract(address account) private view returns (bool) {
        if (account.code.length == 0) return false;
        
        // 检查已知的DEX合约
        if (blacklistedDEX[account]) return true;
        
        // 尝试调用Router接口
        try IDEXRouter(account).factory() returns (address) {
            return true;
        } catch {}
        
        // 尝试调用Pair接口
        try IDEXPair(account).factory() returns (address) {
            return true;
        } catch {}
        
        return false;
    }
    
    /**
     * @dev 更新Oracle最大供应量
     */
    function _updateMaxSupplyFromOracle() private {
        uint256 oldSupply = maxSupplyFromOracle;
        maxSupplyFromOracle = usdtOracle.getTotalSupply();
        
        if (oldSupply != maxSupplyFromOracle) {
            emit MaxSupplyUpdated(oldSupply, maxSupplyFromOracle);
        }
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid multisig address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        
        // 授权多签为可交易地址
        authorizedExchanges[_multiSigWallet] = true;
        
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    /**
     * @dev 更新最大供应量（仅多签）
     */
    function updateMaxSupply() external onlyMultiSig {
        _updateMaxSupplyFromOracle();
    }
    
    /**
     * @dev 授权交易所（仅多签）
     */
    function authorizeExchange(address exchange, bool authorized) external onlyMultiSig {
        require(exchange != address(0), "Invalid exchange address");
        authorizedExchanges[exchange] = authorized;
        emit ExchangeAuthorized(exchange, authorized);
    }
    
    /**
     * @dev 添加DEX到黑名单（仅多签）
     */
    function addDEXToBlacklist(address dex) external onlyMultiSig {
        require(dex != address(0), "Invalid DEX address");
        blacklistedDEX[dex] = true;
        emit DEXBlacklisted(dex, true);
    }
    
    /**
     * @dev 从黑名单移除DEX（仅多签）
     */
    function removeDEXFromBlacklist(address dex) external onlyMultiSig {
        blacklistedDEX[dex] = false;
        emit DEXBlacklisted(dex, false);
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPause = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    /**
     * @dev 设置Keeper地址（仅多签）
     */
    function setKeeperAddress(address _keeper) external onlyMultiSig {
        require(_keeper != address(0), "Invalid keeper address");
        keeperAddress = _keeper;
    }
    
    /**
     * @dev 设置Oracle地址
     */
    function setOracle(address _oracle) external onlyMultiSig {
        usdtOracle = IUSDTOracle(_oracle);
        _updateMaxSupplyFromOracle();
    }
    
    /**
     * @dev 紧急提取（仅多签）
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
        return authorizedExchanges[account] || account == owner() || account == multiSigWallet;
    }
    
    /**
     * @dev 接收BNB
     */
    receive() external payable {}
}