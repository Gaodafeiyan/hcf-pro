// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

/**
 * @title HCFStakingFinal
 * @dev 最终版质押合约 - L3/L4/L5三级系统
 */
contract HCFStakingFinal is Ownable, ReentrancyGuard, Pausable {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DECIMALS = 10**18;
    address public constant COLLECTION_WALLET = 0x4bBaa8Ce8ddf4dd38A5799cedF0019eb5bCe82DC;
    
    // ============ 结构体 ============
    struct StakeInfo {
        uint256 amount;           // 质押数量
        uint256 level;           // 质押等级 (3, 4, 5)
        uint256 lpHCFAmount;      // LP中HCF数量
        uint256 lpBSDTAmount;     // LP中BSDT数量
        uint256 lpType;          // 0:无LP 1:普通LP 2:股权LP100天 3:股权LP300天
        uint256 lpEndTime;       // 股权LP结束时间
        uint256 lastClaim;       // 上次领取时间
        uint256 totalClaimed;    // 总领取量
        uint256 stakeTime;       // 质押时间
    }
    
    struct LevelConfig {
        uint256 minStake;        // 最小质押量
        uint256 dailyRate;       // 日产率(基点)
        uint256 lpHCFRequired;   // 需要的LP HCF数量
        uint256 compoundUnit;    // 复投单位
    }
    
    // ============ 状态变量 ============
    mapping(address => StakeInfo) public stakeInfo;
    mapping(address => uint256[7]) public purchaseHistory;
    
    mapping(uint256 => LevelConfig) public levels;
    
    uint256 public totalStaked;
    uint256 public launchTime;
    uint256 public dailyCap = 1000;  // 10%
    uint256 public limitPeriod = 7 days;
    uint256 public dailyLimit = 1000 * DECIMALS;
    
    IERC20 public hcfToken;
    IERC20 public bsdtToken;
    IPancakePair public hcfBsdtPair;
    address public feeReceiver;
    
    mapping(address => bool) public operators;
    
    // ============ 事件 ============
    event Staked(address indexed user, uint256 amount, uint256 level);
    event LPAdded(address indexed user, uint256 hcfAmount, uint256 bsdtAmount, uint256 lpType);
    event Claimed(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Compounded(address indexed user, uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _feeReceiver
    ) Ownable() {
        require(_hcfToken != address(0), "Invalid HCF");
        require(_bsdtToken != address(0), "Invalid BSDT");
        require(_feeReceiver != address(0), "Invalid fee receiver");
        
        hcfToken = IERC20(_hcfToken);
        bsdtToken = IERC20(_bsdtToken);
        feeReceiver = _feeReceiver;
        launchTime = block.timestamp;
        
        _initializeLevels();
    }
    
    function _initializeLevels() private {
        // Level 3: 1000 HCF
        levels[3] = LevelConfig({
            minStake: 1000 * DECIMALS,
            dailyRate: 60,  // 0.6%
            lpHCFRequired: 200 * DECIMALS,
            compoundUnit: 200 * DECIMALS
        });
        
        // Level 4: 10000 HCF
        levels[4] = LevelConfig({
            minStake: 10000 * DECIMALS,
            dailyRate: 70,  // 0.7%
            lpHCFRequired: 2000 * DECIMALS,
            compoundUnit: 2000 * DECIMALS
        });
        
        // Level 5: 100000 HCF
        levels[5] = LevelConfig({
            minStake: 100000 * DECIMALS,
            dailyRate: 80,  // 0.8%
            lpHCFRequired: 20000 * DECIMALS,
            compoundUnit: 2000 * DECIMALS
        });
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 获取HCF价格
     */
    function getHCFPrice() public view returns (uint256) {
        if (address(hcfBsdtPair) == address(0)) {
            return DECIMALS / 10;  // 默认0.1 BSDT
        }
        
        (uint112 reserve0, uint112 reserve1,) = hcfBsdtPair.getReserves();
        
        if (hcfBsdtPair.token0() == address(hcfToken)) {
            return (uint256(reserve1) * DECIMALS) / uint256(reserve0);
        } else {
            return (uint256(reserve0) * DECIMALS) / uint256(reserve1);
        }
    }
    
    /**
     * @dev 计算LP需求
     */
    function calculateLPRequirement(uint256 level) public view returns (uint256 hcfRequired, uint256 bsdtRequired) {
        require(level >= 3 && level <= 5, "Invalid level");
        
        LevelConfig memory config = levels[level];
        hcfRequired = config.lpHCFRequired;
        
        uint256 hcfPrice = getHCFPrice();
        bsdtRequired = (hcfRequired * hcfPrice) / DECIMALS;
        
        return (hcfRequired, bsdtRequired);
    }
    
    /**
     * @dev 质押
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        
        // 限购检查
        if (block.timestamp < launchTime + limitPeriod) {
            _checkDailyLimit(msg.sender, amount);
        }
        
        StakeInfo storage info = stakeInfo[msg.sender];
        uint256 newTotal = info.amount + amount;
        uint256 level = _getLevel(newTotal);
        require(level >= 3, "Below minimum");
        
        require(hcfToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        if (info.stakeTime == 0) {
            info.stakeTime = block.timestamp;
            info.lastClaim = block.timestamp;
        }
        info.amount = newTotal;
        info.level = level;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, level);
    }
    
    /**
     * @dev 添加LP
     */
    function addLP(uint256 lpType) external nonReentrant whenNotPaused {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        require(lpType >= 1 && lpType <= 3, "Invalid type");
        require(info.lpType == 0, "Already has LP");
        
        (uint256 requiredHCF, uint256 requiredBSDT) = calculateLPRequirement(info.level);
        
        address destination;
        if (lpType == 1) {
            destination = address(this);
        } else {
            destination = COLLECTION_WALLET;
            info.lpEndTime = block.timestamp + (lpType == 2 ? 100 days : 300 days);
        }
        
        require(hcfToken.transferFrom(msg.sender, destination, requiredHCF), "HCF failed");
        require(bsdtToken.transferFrom(msg.sender, destination, requiredBSDT), "BSDT failed");
        
        info.lpHCFAmount = requiredHCF;
        info.lpBSDTAmount = requiredBSDT;
        info.lpType = lpType;
        
        emit LPAdded(msg.sender, requiredHCF, requiredBSDT, lpType);
    }
    
    /**
     * @dev 领取收益
     */
    function claim() external nonReentrant whenNotPaused {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        
        uint256 pending = calculatePending(msg.sender);
        require(pending > 0, "No rewards");
        
        uint256 dailyMax = (info.amount * dailyCap) / BASIS_POINTS;
        if (pending > dailyMax) {
            pending = dailyMax;
        }
        
        info.lastClaim = block.timestamp;
        info.totalClaimed += pending;
        
        require(hcfToken.transfer(msg.sender, pending), "Transfer failed");
        
        emit Claimed(msg.sender, pending);
    }
    
    /**
     * @dev 复投
     */
    function compound() external nonReentrant whenNotPaused {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        
        uint256 pending = calculatePending(msg.sender);
        require(pending > 0, "No rewards");
        
        uint256 dailyMax = (info.amount * dailyCap) / BASIS_POINTS;
        if (pending > dailyMax) {
            pending = dailyMax;
        }
        
        LevelConfig memory config = levels[info.level];
        require(pending >= config.compoundUnit, "Below unit");
        
        uint256 compoundAmount = (pending / config.compoundUnit) * config.compoundUnit;
        
        info.amount += compoundAmount;
        info.lastClaim = block.timestamp;
        
        totalStaked += compoundAmount;
        
        uint256 newLevel = _getLevel(info.amount);
        if (newLevel > info.level) {
            info.level = newLevel;
        }
        
        emit Compounded(msg.sender, compoundAmount);
    }
    
    /**
     * @dev 赎回
     */
    function withdraw(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount >= amount, "Insufficient");
        
        if (info.lpType >= 2 && block.timestamp < info.lpEndTime) {
            revert("LP locked");
        }
        
        uint256 fee = (amount * 1000) / BASIS_POINTS;  // 10%
        uint256 netAmount = amount - fee;
        
        info.amount -= amount;
        totalStaked -= amount;
        
        if (info.amount == 0) {
            delete stakeInfo[msg.sender];
        } else {
            info.level = _getLevel(info.amount);
        }
        
        if (fee > 0) {
            require(hcfToken.transfer(feeReceiver, fee), "Fee failed");
        }
        
        require(hcfToken.transfer(msg.sender, netAmount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // ============ 内部功能 ============
    
    function _getLevel(uint256 amount) internal view returns (uint256) {
        if (amount >= levels[5].minStake) return 5;
        if (amount >= levels[4].minStake) return 4;
        if (amount >= levels[3].minStake) return 3;
        return 0;
    }
    
    function _checkDailyLimit(address user, uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        uint256 dayIndex = today % 7;
        
        for (uint256 i = 0; i < 7; i++) {
            if (i != dayIndex && purchaseHistory[user][i] > 0) {
                uint256 recordDay = purchaseHistory[user][i] / 10**36;
                if (today - recordDay >= 7) {
                    purchaseHistory[user][i] = 0;
                }
            }
        }
        
        uint256 todayAmount = purchaseHistory[user][dayIndex] % 10**36;
        require(todayAmount + amount <= dailyLimit, "Exceeds limit");
        
        purchaseHistory[user][dayIndex] = (today * 10**36) + todayAmount + amount;
    }
    
    /**
     * @dev 计算待领取
     */
    function calculatePending(address user) public view returns (uint256) {
        StakeInfo memory info = stakeInfo[user];
        if (info.amount == 0 || info.level < 3) return 0;
        
        uint256 timeElapsed = block.timestamp - info.lastClaim;
        if (timeElapsed == 0) return 0;
        
        LevelConfig memory config = levels[info.level];
        uint256 dailyBase = (info.amount * config.dailyRate) / BASIS_POINTS;
        
        // LP加成
        if (info.lpType == 1) {
            dailyBase = dailyBase * 2;  // 翻倍
        } else if (info.lpType == 2) {
            dailyBase = dailyBase * 12 / 10;  // +20%
        } else if (info.lpType == 3) {
            dailyBase = dailyBase * 14 / 10;  // +40%
        }
        
        uint256 rewards = (dailyBase * timeElapsed) / 1 days;
        return rewards;
    }
    
    /**
     * @dev 获取用户信息
     */
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint256 level,
        uint256 pending,
        uint256 lpType,
        uint256 dailyOutput
    ) {
        StakeInfo memory info = stakeInfo[user];
        pending = calculatePending(user);
        
        if (info.amount > 0 && info.level >= 3) {
            LevelConfig memory config = levels[info.level];
            dailyOutput = (info.amount * config.dailyRate) / BASIS_POINTS;
            
            if (info.lpType == 1) {
                dailyOutput = dailyOutput * 2;
            } else if (info.lpType == 2) {
                dailyOutput = dailyOutput * 12 / 10;
            } else if (info.lpType == 3) {
                dailyOutput = dailyOutput * 14 / 10;
            }
        }
        
        return (info.amount, info.level, pending, info.lpType, dailyOutput);
    }
    
    // ============ 管理功能 ============
    
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }
    
    function setHCFBSDTPair(address _pair) external onlyOwner {
        hcfBsdtPair = IPancakePair(_pair);
    }
    
    function setDailyCap(uint256 _cap) external onlyOperator {
        require(_cap >= 100 && _cap <= 5000, "Invalid");
        dailyCap = _cap;
    }
    
    function updateLevelConfig(
        uint256 level,
        uint256 minStake,
        uint256 dailyRate,
        uint256 lpHCFRequired,
        uint256 compoundUnit
    ) external onlyOperator {
        require(level >= 3 && level <= 5, "Invalid level");
        require(dailyRate <= 1000, "Too high");
        
        levels[level] = LevelConfig({
            minStake: minStake,
            dailyRate: dailyRate,
            lpHCFRequired: lpHCFRequired,
            compoundUnit: compoundUnit
        });
    }
    
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}