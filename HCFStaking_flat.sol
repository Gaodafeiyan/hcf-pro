[dotenv@17.2.1] injecting env (15) from .env -- tip: 📡 auto-backup env with Radar: https://dotenvx.com/radar
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


// File contracts/HCFStaking.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;



interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

interface IBSDTToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IHCFReferral {
    function getUserData(address user) external view returns (
        address referrer,
        uint256 directCount,
        uint256 teamLevel,
        uint256 personalVolume,
        uint256 teamVolume,
        uint256 totalReferralReward,
        uint256 totalTeamReward,
        bool isActive,
        uint256 joinTime,
        uint256 lastRewardTime
    );
    function distributeRewards(address user, uint256 amount) external;
}

interface IHCFImpermanentLossProtection {
    function recordInitialLP(address user, bool isEquity) external;
    function claimCompensation() external returns (uint256);
    function onLPChange(address user, uint256 oldAmount, uint256 newAmount) external returns (uint256);
}

interface IHCFNodeNFT {
    function hasNode(address user) external view returns (bool);
}

interface IHCFBurnMechanism {
    function applyBurn(uint256 burnType, uint256 amount, address user) external;
}

/**
 * @title HCFStaking
 * @dev 质押挖矿合约 - 5等级质押，双循环LP，衰减机制
 */
contract HCFStaking is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DAILY_LIMIT = 500 * 10**18;
    uint256 public constant MIN_COMPENSATION = 500 * 10**18;
    uint256 public constant DECAY_RATE = 10;
    uint256 public constant HOLDING_BONUS_DAYS = 30;
    uint256 public constant COOLDOWN_PERIOD = 1 days;
    
    // ============ 结构体 ============
    struct LevelConfig {
        uint256 minStake;
        uint256 baseRate;
        uint256 lpRate;
        uint256 compoundUnit;
    }
    
    struct UserInfo {
        uint256 amount;
        uint256 level;
        uint256 pending;
        uint256 totalClaimed;
        bool isLP;
        uint256 compoundCount;
        bool isEquityLP;
        uint256 lpHCFAmount;
        uint256 lpBSDTAmount;
        uint256 lastUpdate;
        uint256[7] buyHistory;
        uint256 sharingTotal;
        uint256 lastClaimTime;
        uint256 stakingTime;
    }
    
    struct StakePosition {
        uint256 amount;
        uint256 rate;
        uint256 timestamp;
    }
    
    struct AddonRates {
        uint256 holdingBonus;
        uint256 referralBonus;
        uint256 communityBonus;
        uint256 compoundBonus;
    }
    
    // ============ 状态变量 ============
    
    // 等级配置
    LevelConfig[5] public levels;
    
    // 用户信息
    mapping(address => UserInfo) public userInfo;
    mapping(address => StakePosition[]) public userPositions;
    
    // 全局状态
    uint256 public totalStaked;
    uint256 public decayThreshold = 100_000_000 * 10**18;
    uint256 public globalDecayRate;
    
    // 加成配置
    AddonRates public addonRates;
    
    // 地址设置
    address public multiSigWallet;
    address public collectionAddress;
    address public bridgeAddress;
    IHCFToken public hcfToken;
    IBSDTToken public bsdtToken;
    IHCFReferral public referralContract;
    IHCFImpermanentLossProtection public impermanentLossProtection;
    IHCFBurnMechanism public burnMechanism;
    IHCFNodeNFT public nodeContract;
    
    // 配置
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event Staked(address indexed user, uint256 amount, uint256 level, bool isLP);
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 bnbFee);
    event DecayApplied(uint256 totalStake, uint256 reduction);
    event AddonApplied(address indexed user, string addonType, uint256 rate);
    event CompensationClaimed(address indexed user, uint256 amount);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event EmergencyPauseSet(bool status);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet, "Only multisig wallet");
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    modifier cooldownCheck() {
        require(
            block.timestamp >= userInfo[msg.sender].lastClaimTime + COOLDOWN_PERIOD,
            "Cooldown period active"
        );
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _multiSigWallet,
        address _collectionAddress,
        address _bridgeAddress
    ) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        multiSigWallet = _multiSigWallet;
        collectionAddress = _collectionAddress;
        bridgeAddress = _bridgeAddress;
        
        _initializeLevels();
        
        addonRates = AddonRates({
            holdingBonus: 1000,
            referralBonus: 500,
            communityBonus: 500,
            compoundBonus: 2000
        });
    }
    
    // ============ 初始化函数 ============
    function _initializeLevels() private {
        levels[0] = LevelConfig({
            minStake: 10 * 10**18,
            baseRate: 40,    // 0.4% daily
            lpRate: 80,      // 0.8% daily (2x for LP),
            compoundUnit: 10 * 10**18
        });
        
        levels[1] = LevelConfig({
            minStake: 100 * 10**18,
            baseRate: 50,    // 0.5% daily
            lpRate: 100,     // 1.0% daily (2x for LP),
            compoundUnit: 20 * 10**18
        });
        
        levels[2] = LevelConfig({
            minStake: 1000 * 10**18,
            baseRate: 60,    // 0.6% daily
            lpRate: 120,     // 1.2% daily (2x for LP),
            compoundUnit: 200 * 10**18
        });
        
        levels[3] = LevelConfig({
            minStake: 10000 * 10**18,
            baseRate: 70,    // 0.7% daily
            lpRate: 140,     // 1.4% daily (2x for LP),
            compoundUnit: 2000 * 10**18
        });
        
        levels[4] = LevelConfig({
            minStake: 100000 * 10**18,
            baseRate: 80,    // 0.8% daily
            lpRate: 160,     // 1.6% daily (2x for LP),
            compoundUnit: 20000 * 10**18
        });
    }
    
    // ============ 质押功能 ============
    
    /**
     * @dev 质押代币
     */
    function stake(uint256 amount, bool isLP, bool isEquity) external nonReentrant notPaused {
        require(amount > 0, "Amount must be > 0");
        
        _checkPurchaseLimit(msg.sender, amount);
        
        uint256 level = _getStakeLevel(amount + userInfo[msg.sender].amount);
        require(level > 0, "Amount too small");
        
        UserInfo storage user = userInfo[msg.sender];
        
        _updateRewards(msg.sender);
        
        if (isLP) {
            uint256 bsdtAmount = amount;
            
            if (isEquity) {
                // 股权LP - HCF+BSDT等额支付到归集地址
                require(hcfToken.transferFrom(msg.sender, collectionAddress, amount), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, collectionAddress, bsdtAmount), "BSDT transfer failed");
                user.isEquityLP = true;
                user.sharingTotal += amount; // 记录股权金额
            } else {
                require(hcfToken.transferFrom(msg.sender, address(this), amount), "HCF transfer failed");
                require(bsdtToken.transferFrom(msg.sender, address(this), bsdtAmount), "BSDT transfer failed");
            }
            
            user.lpHCFAmount += amount;
            user.lpBSDTAmount += bsdtAmount;
            user.isLP = true;
            
            if (address(impermanentLossProtection) != address(0)) {
                impermanentLossProtection.recordInitialLP(msg.sender, isEquity);
            }
        } else {
            require(hcfToken.transferFrom(msg.sender, address(this), amount), "HCF transfer failed");
        }
        
        // 双循环处理 - 1000+必须是100的倍数
        if (amount >= 1000 * 10**18) {
            require(amount % (100 * 10**18) == 0, "Amount must be multiple of 100 for dual cycle");
            
            uint256 units = amount / levels[level - 1].compoundUnit;
            for (uint256 i = 0; i < units; i++) {
                uint256 positionAmount = levels[level - 1].compoundUnit;
                uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
                
                // 复投倍数增益 (10-2万倍数)
                uint256 multiplier = 1;
                if (user.compoundCount > 0) {
                    if (positionAmount >= 10000 * 10**18) {
                        multiplier = 20000; // 2万倍
                    } else if (positionAmount >= 1000 * 10**18) {
                        multiplier = 2000;  // 2000倍
                    } else if (positionAmount >= 100 * 10**18) {
                        multiplier = 200;   // 200倍
                    } else if (positionAmount >= 10 * 10**18) {
                        multiplier = 10;    // 10倍
                    }
                    rate = (rate * multiplier) / 10;
                }
                
                // LP 1:5增益 - 每增加2个LP对应增加10枚HCF
                if (isLP && i > 0 && i % 2 == 0) {
                    rate = (rate * 150) / 100; // 增加50%收益
                    positionAmount += 10 * 10**18; // 增加10枚HCF
                }
                
                userPositions[msg.sender].push(StakePosition({
                    amount: positionAmount,
                    rate: rate,
                    timestamp: block.timestamp
                }));
            }
            
            uint256 remainder = amount % levels[level - 1].compoundUnit;
            if (remainder > 0) {
                uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
                userPositions[msg.sender].push(StakePosition({
                    amount: remainder,
                    rate: rate,
                    timestamp: block.timestamp
                }));
            }
        } else {
            uint256 rate = isLP ? levels[level - 1].lpRate : levels[level - 1].baseRate;
            userPositions[msg.sender].push(StakePosition({
                amount: amount,
                rate: rate,
                timestamp: block.timestamp
            }));
        }
        
        user.amount += amount;
        user.level = level;
        user.lastUpdate = block.timestamp;
        if (user.stakingTime == 0) {
            user.stakingTime = block.timestamp;
        }
        
        totalStaked += amount;
        
        _updateDecay();
        
        emit Staked(msg.sender, amount, level, isLP);
    }
    
    /**
     * @dev 提取质押
     */
    function withdraw(uint256 amount) external nonReentrant notPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "Insufficient balance");
        
        _updateRewards(msg.sender);
        
        uint256 withdrawFee = (amount * 1000) / BASIS_POINTS;
        uint256 netAmount = amount - withdrawFee;
        
        if (user.isLP) {
            uint256 lpBSDTFee = (user.lpBSDTAmount * amount / user.amount * 5000) / BASIS_POINTS;
            uint256 lpHCFFee = (user.lpHCFAmount * amount / user.amount * 2000) / BASIS_POINTS;
            uint256 lpBurnAmount = (user.lpHCFAmount * amount / user.amount * 3000) / BASIS_POINTS;
            
            if (lpBSDTFee > 0) {
                bsdtToken.transfer(multiSigWallet, lpBSDTFee);
            }
            if (lpHCFFee > 0) {
                hcfToken.transfer(multiSigWallet, lpHCFFee);
            }
            if (lpBurnAmount > 0) {
                hcfToken.burn(lpBurnAmount);
                if (address(burnMechanism) != address(0)) {
                    burnMechanism.applyBurn(3, lpBurnAmount, msg.sender);
                }
            }
            
            user.lpHCFAmount -= user.lpHCFAmount * amount / user.amount;
            user.lpBSDTAmount -= user.lpBSDTAmount * amount / user.amount;
        }
        
        if (user.sharingTotal > 0 && user.sharingTotal < amount) {
            uint256 burnAmount = (amount * 3000) / BASIS_POINTS;
            hcfToken.burn(burnAmount);
            netAmount -= burnAmount;
            if (address(burnMechanism) != address(0)) {
                burnMechanism.applyBurn(3, burnAmount, msg.sender);
            }
        }
        
        payable(bridgeAddress).transfer(withdrawFee);
        
        user.amount -= amount;
        if (user.amount == 0) {
            user.level = 0;
            user.isLP = false;
            user.isEquityLP = false;
            delete userPositions[msg.sender];
        }
        
        hcfToken.transfer(msg.sender, netAmount);
        
        totalStaked -= amount;
        
        emit Withdrawn(msg.sender, amount, withdrawFee);
    }
    
    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant notPaused cooldownCheck {
        UserInfo storage user = userInfo[msg.sender];
        
        _updateRewards(msg.sender);
        
        uint256 rewards = user.pending;
        require(rewards > 0, "No rewards");
        
        uint256 bnbFee = (rewards * 500) / BASIS_POINTS;
        uint256 netRewards = rewards - bnbFee;
        
        payable(bridgeAddress).transfer(bnbFee);
        
        user.pending = 0;
        user.totalClaimed += rewards;
        user.lastClaimTime = block.timestamp;
        
        hcfToken.transfer(msg.sender, netRewards);
        
        if (address(referralContract) != address(0)) {
            try referralContract.distributeRewards(msg.sender, rewards) {} catch {}
        }
        
        if (address(burnMechanism) != address(0)) {
            try burnMechanism.applyBurn(1, rewards / 100, msg.sender) {} catch {}
        }
        
        emit RewardsClaimed(msg.sender, rewards, bnbFee);
    }
    
    /**
     * @dev 复投
     */
    function compound() external nonReentrant notPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(user.pending > 0, "No rewards to compound");
        
        _updateRewards(msg.sender);
        
        uint256 compoundAmount = user.pending;
        user.pending = 0;
        
        user.compoundCount++;
        
        user.amount += compoundAmount;
        totalStaked += compoundAmount;
        
        uint256 rate = user.isLP ? levels[user.level - 1].lpRate : levels[user.level - 1].baseRate;
        userPositions[msg.sender].push(StakePosition({
            amount: compoundAmount,
            rate: rate,
            timestamp: block.timestamp
        }));
        
        emit Staked(msg.sender, compoundAmount, user.level, user.isLP);
    }
    
    /**
     * @dev 应用加成
     */
    function applyAddon(address userAddr) external {
        UserInfo storage user = userInfo[userAddr];
        require(user.amount > 0, "No stake");
        
        uint256 totalAddon = 0;
        
        if (block.timestamp >= user.stakingTime + HOLDING_BONUS_DAYS * 1 days) {
            totalAddon += addonRates.holdingBonus;
            emit AddonApplied(userAddr, "holding", addonRates.holdingBonus);
        }
        
        if (address(referralContract) != address(0)) {
            (, uint256 directCount,,,,,,,,) = referralContract.getUserData(userAddr);
            if (directCount > 3) {
                totalAddon += addonRates.referralBonus;
                emit AddonApplied(userAddr, "referral", addonRates.referralBonus);
            }
            
            (,,,, uint256 teamVolume,,,,,) = referralContract.getUserData(userAddr);
            if (teamVolume > 100000 * 10**18) {
                totalAddon += addonRates.communityBonus;
                emit AddonApplied(userAddr, "community", addonRates.communityBonus);
            }
        }
        
        if (user.compoundCount > 10) {
            totalAddon += addonRates.compoundBonus;
            emit AddonApplied(userAddr, "compound", addonRates.compoundBonus);
        }
        
        for (uint256 i = 0; i < userPositions[userAddr].length; i++) {
            userPositions[userAddr][i].rate += (userPositions[userAddr][i].rate * totalAddon) / BASIS_POINTS;
        }
    }
    
    /**
     * @dev 申请无常损失补偿（节点优先+20%）
     */
    function claimCompensation() external nonReentrant notPaused returns (uint256) {
        UserInfo storage user = userInfo[msg.sender];
        require(user.isLP, "Not LP staker");
        
        uint256 compensation = 0;
        
        if (address(impermanentLossProtection) != address(0)) {
            compensation = impermanentLossProtection.claimCompensation();
            
            // 节点用户额外20%补偿
            if (address(nodeContract) != address(0) && nodeContract.hasNode(msg.sender)) {
                compensation = (compensation * 120) / 100;
            }
            
            // 恢复产出率到100%
            for (uint256 i = 0; i < userPositions[msg.sender].length; i++) {
                if (user.isLP) {
                    userPositions[msg.sender][i].rate = levels[user.level - 1].lpRate;
                }
            }
            
            emit CompensationClaimed(msg.sender, compensation);
        }
        
        return compensation;
    }
    
    /**
     * @dev 更新衰减
     */
    function updateDecay() external {
        _updateDecay();
    }
    
    // ============ 内部函数 ============
    
    function _updateRewards(address userAddr) internal {
        UserInfo storage user = userInfo[userAddr];
        if (user.amount == 0) return;
        
        uint256 pending = _calculatePendingRewards(userAddr);
        user.pending += pending;
        user.lastUpdate = block.timestamp;
    }
    
    function _calculatePendingRewards(address userAddr) internal view returns (uint256) {
        UserInfo memory user = userInfo[userAddr];
        if (user.amount == 0 || user.lastUpdate >= block.timestamp) return 0;
        
        uint256 timeElapsed = block.timestamp - user.lastUpdate;
        uint256 daysElapsed = timeElapsed / 1 days;
        if (daysElapsed == 0) return 0;
        
        uint256 totalRewards = 0;
        
        for (uint256 i = 0; i < userPositions[userAddr].length; i++) {
            StakePosition memory position = userPositions[userAddr][i];
            uint256 dailyYield = (position.amount * position.rate) / BASIS_POINTS;
            
            if (totalStaked > decayThreshold) {
                uint256 decay = ((totalStaked / decayThreshold) * DECAY_RATE);
                if (decay > 0) {
                    dailyYield = (dailyYield * (BASIS_POINTS - decay)) / BASIS_POINTS;
                }
            }
            
            totalRewards += dailyYield * daysElapsed;
        }
        
        return totalRewards;
    }
    
    function _checkPurchaseLimit(address user, uint256 amount) internal {
        UserInfo storage info = userInfo[user];
        
        uint256 today = block.timestamp / 1 days;
        uint256 dayIndex = today % 7;
        
        for (uint256 i = 0; i < 7; i++) {
            if (i != dayIndex) {
                uint256 recordDay = info.buyHistory[i] / 10**36;
                if (recordDay > 0 && today - recordDay >= 7) {
                    info.buyHistory[i] = 0;
                }
            }
        }
        
        uint256 total7Days = 0;
        for (uint256 i = 0; i < 7; i++) {
            total7Days += info.buyHistory[i] % 10**36;
        }
        
        require(total7Days + amount <= DAILY_LIMIT * 7, "Exceeds 7-day limit");
        
        info.buyHistory[dayIndex] = (today * 10**36) + amount;
    }
    
    function _getStakeLevel(uint256 amount) internal view returns (uint256) {
        for (uint256 i = 4; i >= 0; i--) {
            if (amount >= levels[i].minStake) {
                return i + 1;
            }
            if (i == 0) break;
        }
        return 0;
    }
    
    function _updateDecay() internal {
        if (totalStaked > decayThreshold) {
            uint256 reduction = (totalStaked / decayThreshold) * DECAY_RATE;
            globalDecayRate = reduction;
            emit DecayApplied(totalStaked, reduction);
        } else {
            globalDecayRate = 0;
        }
    }
    
    // ============ 管理功能 ============
    
    function setLevelConfig(
        uint256 level,
        uint256 minStake,
        uint256 baseRate,
        uint256 lpRate,
        uint256 compoundUnit
    ) external onlyMultiSig {
        require(level > 0 && level <= 5, "Invalid level");
        levels[level - 1] = LevelConfig({
            minStake: minStake,
            baseRate: baseRate,
            lpRate: lpRate,
            compoundUnit: compoundUnit
        });
    }
    
    function setDecayThreshold(uint256 _threshold) external onlyMultiSig {
        require(_threshold >= 10_000_000 * 10**18, "Threshold too low");
        decayThreshold = _threshold;
    }
    
    function setAddonRates(
        uint256 holding,
        uint256 referral,
        uint256 community,
        uint256 compoundBonus
    ) external onlyMultiSig {
        addonRates = AddonRates({
            holdingBonus: holding,
            referralBonus: referral,
            communityBonus: community,
            compoundBonus: compoundBonus
        });
    }
    
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    function setAddresses(
        address _collectionAddress,
        address _bridgeAddress
    ) external onlyMultiSig {
        if (_collectionAddress != address(0)) collectionAddress = _collectionAddress;
        if (_bridgeAddress != address(0)) bridgeAddress = _bridgeAddress;
    }
    
    function setContracts(
        address _referral,
        address _impermanentLoss,
        address _burnMechanism,
        address _nodeContract
    ) external onlyOwner {
        if (_referral != address(0)) referralContract = IHCFReferral(_referral);
        if (_impermanentLoss != address(0)) impermanentLossProtection = IHCFImpermanentLossProtection(_impermanentLoss);
        if (_burnMechanism != address(0)) burnMechanism = IHCFBurnMechanism(_burnMechanism);
        if (_nodeContract != address(0)) nodeContract = IHCFNodeNFT(_nodeContract);
    }
    
    function setEmergencyPause(bool _pause) external onlyMultiSig {
        emergencyPaused = _pause;
        emit EmergencyPauseSet(_pause);
    }
    
    // ============ 查询功能 ============
    
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint256 level,
        uint256 pending,
        uint256 totalClaimed,
        bool isLP,
        uint256 compoundCount,
        bool isEquityLP,
        uint256 lpHCFAmount,
        uint256 lpBSDTAmount
    ) {
        UserInfo memory info = userInfo[user];
        uint256 pendingRewards = _calculatePendingRewards(user);
        
        return (
            info.amount,
            info.level,
            info.pending + pendingRewards,
            info.totalClaimed,
            info.isLP,
            info.compoundCount,
            info.isEquityLP,
            info.lpHCFAmount,
            info.lpBSDTAmount
        );
    }
    
    function getLevelInfo(uint256 level) external view returns (
        uint256 minStake,
        uint256 baseRate,
        uint256 lpRate,
        uint256 compoundUnit
    ) {
        require(level > 0 && level <= 5, "Invalid level");
        LevelConfig memory config = levels[level - 1];
        return (
            config.minStake,
            config.baseRate,
            config.lpRate,
            config.compoundUnit
        );
    }
    
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }
    
    function getDemux(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory rates
    ) {
        StakePosition[] memory positions = userPositions[user];
        amounts = new uint256[](positions.length);
        rates = new uint256[](positions.length);
        
        for (uint256 i = 0; i < positions.length; i++) {
            amounts[i] = positions[i].amount;
            rates[i] = positions[i].rate;
        }
        
        return (amounts, rates);
    }
    
    function getStaticOutput(address user) external view returns (uint256) {
        return _calculatePendingRewards(user);
    }
    
    function getUserStakingInfo(address user) external view returns (uint256 amount, uint256 dailyReward) {
        UserInfo memory info = userInfo[user];
        uint256 daily = 0;
        
        for (uint256 i = 0; i < userPositions[user].length; i++) {
            StakePosition memory position = userPositions[user][i];
            daily += (position.amount * position.rate) / BASIS_POINTS;
        }
        
        return (info.amount, daily);
    }
}
