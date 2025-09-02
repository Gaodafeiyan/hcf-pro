[dotenv@17.2.1] injecting env (15) from .env -- tip: 🔐 prevent committing .env to code: https://dotenvx.com/precommit
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


// File contracts/HCFToken.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;



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
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;  // 总量10亿（固定）
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
    uint256 public buyBurnRate = 2500;      // 25%销毁 (2% * 25% = 0.5%)
    uint256 public buyMarketingRate = 2500; // 25%营销 (2% * 25% = 0.5%)
    uint256 public buyLPRate = 2500;        // 25%LP (2% * 25% = 0.5%)
    uint256 public buyNodeRate = 2500;      // 25%节点 (2% * 25% = 0.5%)
    
    // 卖出税分配（占税的比例）
    uint256 public sellBurnRate = 4000;      // 40%销毁 (5% * 40% = 2%)
    uint256 public sellMarketingRate = 2000; // 20%营销 (5% * 20% = 1%)
    uint256 public sellLPRate = 2000;        // 20%LP (5% * 20% = 1%)
    uint256 public sellNodeRate = 2000;      // 20%节点 (5% * 20% = 1%)
    
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
    
    // ============ 事件 ============
    event TaxUpdated(uint256 buyTax, uint256 sellTax, uint256 transferTax);
    event FundsAdded(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event TaxDistributed(uint256 burnAmount, uint256 marketingAmount, uint256 lpAmount, uint256 nodeAmount);
    event BridgeTaxCollected(address indexed from, uint256 amount);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event ReserveFundTransferred(address indexed to, uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig wallet");
        _;
    }
    
    
    // ============ 构造函数 ============
    constructor(
        address _marketingWallet,
        address _nodePool,
        address _lpPool,
        address _bridgeAddress
    ) ERC20("HCF Token", "HCF") Ownable() {
        marketingWallet = _marketingWallet;
        nodePool = _nodePool;
        lpPool = _lpPool;
        bridgeAddress = _bridgeAddress;
        reserveWallet = address(this); // 初始储备在合约内
        
        // 铸造首发1000万给owner
        _mint(msg.sender, INITIAL_RELEASE);
        
        // 铸造900万储备金直接到owner（后续需设置多签）
        _mint(msg.sender, RESERVE_FUND);
        
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
    ) internal {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // 检查最小余额要求（发送方必须保留0.0001，无法转账/交易）
        if (from != address(this) && from != multiSigWallet && !isExcludedFromTax[from]) {
            require(balanceOf(from) >= amount + MIN_BALANCE, "Must keep minimum balance");
            // 如果余额接近最小值，禁止交易
            if (balanceOf(from) - amount <= MIN_BALANCE) {
                revert("Balance too low to transfer");
            }
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
        
        // 验证最小余额（0.0001 HCF）
        if (from != address(0) && from != address(this)) {
            require(balanceOf(from) >= MIN_BALANCE || balanceOf(from) == 0, "Must keep min balance or zero");
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
        // 只有当总供应量大于99万时才销毁
        if (totalSupply() > BURN_STOP_SUPPLY && amount > 0) {
            uint256 burnAmount = amount;
            // 如果销毁后会低于99万，调整销毁量
            if (totalSupply() - amount < BURN_STOP_SUPPLY) {
                burnAmount = totalSupply() - BURN_STOP_SUPPLY;
            }
            
            if (burnAmount > 0 && balanceOf(address(this)) >= burnAmount) {
                _burn(address(this), burnAmount);
                totalBurned += burnAmount;
            }
        }
        // 如果总供应量已经小于等于99万，不执行销毁
    }
    
    // ============ 领取收益功能 ============
    
    /**
     * @dev 领取收益时扣5% BNB到bridge
     * 用户发送BNB，其中5%作为税费发送到bridge地址
     */
    function claimRewards(uint256 amount) external payable nonReentrant {
        require(msg.value > 0, "Must send BNB for bridge tax");
        require(amount > 0, "Amount must be greater than zero");
        
        // 计算5%税费
        uint256 bridgeTax = (msg.value * claimTaxRate) / 10000;
        
        // 发送税费到bridge地址
        if (bridgeTax > 0) {
            (bool success, ) = bridgeAddress.call{value: bridgeTax}("");
            require(success, "Bridge tax transfer failed");
            emit BridgeTaxCollected(msg.sender, bridgeTax);
        }
        
        // 退还剩余BNB给用户
        uint256 returnAmount = msg.value - bridgeTax;
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
        
        // 转移储备金到多签钱包（如果owner持有储备金）
        if (balanceOf(msg.sender) >= RESERVE_FUND) {
            super._transfer(msg.sender, multiSigWallet, RESERVE_FUND);
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
