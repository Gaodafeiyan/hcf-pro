[dotenv@17.2.2] injecting env (27) from .env -- tip: 📡 observe env with Radar: https://dotenvx.com/radar
// Sources flattened with hardhat v2.26.3 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v4.9.6

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.4) (utils/Context.sol)

pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v4.9.6

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v4.9.6

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol@v4.9.6

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts v4.4.1 (token/ERC20/extensions/IERC20Metadata.sol)

pragma solidity ^0.8.0;

/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 *
 * _Available since v4.1._
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}


// File @openzeppelin/contracts/token/ERC20/ERC20.sol@v4.9.6

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.0;



/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20PresetMinterPauser}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.openzeppelin.com/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * The default value of {decimals} is 18. To change this, you should override
 * this function so it returns a different value.
 *
 * We have followed general OpenZeppelin Contracts guidelines: functions revert
 * instead returning `false` on failure. This behavior is nonetheless
 * conventional and does not conflict with the expectations of ERC20
 * applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the default value returned by this function, unless
     * it's overridden.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * NOTE: If `amount` is the maximum `uint256`, the allowance is not updated on
     * `transferFrom`. This is semantically equivalent to an infinite approval.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     *
     * Requirements:
     *
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `amount`.
     * - the caller must have allowance for ``from``'s tokens of at least
     * `amount`.
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, allowance(owner, spender) + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = allowance(owner, spender);
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    /**
     * @dev Moves `amount` of tokens from `from` to `to`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `from` must have a balance of at least `amount`.
     */
    function _transfer(address from, address to, uint256 amount) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(from, to, amount);

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        unchecked {
            // Overflow not possible: balance + amount is at most totalSupply + amount, which is checked above.
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
            // Overflow not possible: amount <= accountBalance <= totalSupply.
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Updates `owner` s allowance for `spender` based on spent `amount`.
     *
     * Does not update the allowance amount in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Might emit an {Approval} event.
     */
    function _spendAllowance(address owner, address spender, uint256 amount) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {}

    /**
     * @dev Hook that is called after any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * has been transferred to `to`.
     * - when `from` is zero, `amount` tokens have been minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens have been burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual {}
}


// File @openzeppelin/contracts/security/ReentrancyGuard.sol@v4.9.6

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (security/ReentrancyGuard.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be _NOT_ENTERED
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == _ENTERED;
    }
}


// File contracts/BSDTToken.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;




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
    event USDTLocked(address indexed user, uint256 amount);
    event Minted(address indexed to, uint256 amount);
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
        
        // 无需Oracle供应量，使用固定总量
        
        // 铸造1000亿BSDT到底池（无需USDT锁定，初始流动性）
        if (_lpPool != address(0)) {
            uint256 initialPoolAmount = 100_000_000_000 * 10**18; // 1000亿BSDT
            _mint(_lpPool, initialPoolAmount);
            // 将底池地址加入授权交易所
            authorizedExchanges[_lpPool] = true;
        }
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 铸造BSDT（1:1 USDT合成锁定，严格禁止买卖）
     */
    function mint(address to, uint256 amount) external onlyAuthorizedExchange nonReentrant notPaused {
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Mint to zero address");
        
        // 严格检查固定供应量限制
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
            if (totalSupply() + increaseAmount <= MAX_SUPPLY) {
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
     * @dev 获取剩余可铸造量
     */
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
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
     * @dev 设置Oracle地址（仅用于价格读取）
     */
    function setOracle(address _oracle) external onlyMultiSig {
        usdtOracle = IUSDTOracle(_oracle);
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
