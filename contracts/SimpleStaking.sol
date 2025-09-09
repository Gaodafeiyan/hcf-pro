// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

interface IBSDTToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IReferral {
    function getUserReferrer(address user) external view returns (address);
    function distributeStaticRewards(address user, uint256 amount) external;
}

/**
 * @title SimpleStaking
 * @dev 简化版质押合约 - 3个等级，LP加成，股权LP
 * 
 * 功能说明：
 * 1. 三个质押等级：1000 HCF、10000 HCF、100000 HCF
 * 2. LP加成：普通LP翻倍，股权LP100天+20%，股权LP300天+40%
 * 3. 前7天每账户每天限购1000枚
 * 4. 动静收益日封顶：质押量10%（可调）
 * 5. 复投功能：按倍数复投
 * 6. 赎回费用：10% BNB，未达标额外30%销毁
 */
contract SimpleStaking is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DAILY_LIMIT_7DAYS = 1000 * 10**18;  // 前7天每天限购1000枚
    uint256 public constant DECIMALS = 10**18;
    
    // ============ 结构体 ============
    struct StakeInfo {
        uint256 amount;           // 质押数量
        uint256 level;           // 质押等级 (1, 2, 3)
        uint256 lpHCFAmount;      // LP中HCF数量
        uint256 lpBSDTAmount;     // LP中BSDT数量
        uint256 lpType;          // 0:无LP 1:普通LP 2:股权LP100天 3:股权LP300天
        uint256 lastClaim;       // 上次领取时间
        uint256 totalClaimed;    // 总领取量
        uint256 stakeTime;       // 质押时间
        uint256 directReferrals; // 直推数量
        uint256 teamStake;       // 团队质押量
    }
    
    struct LevelConfig {
        uint256 minStake;        // 最小质押量
        uint256 dailyRate;       // 日产率(基点)
        uint256 lpBonus;         // LP加成(基点)
        uint256 lpRequired;      // 需要的LP数量
        uint256 compoundUnit;    // 复投单位
    }
    
    // ============ 状态变量 ============
    mapping(address => StakeInfo) public stakeInfo;
    mapping(address => uint256[7]) public purchaseHistory; // 7天购买记录
    
    LevelConfig[3] public levels;
    
    uint256 public totalStaked;
    uint256 public launchTime;
    uint256 public dailyCap = 1000;  // 日封顶：质押量10%（可调）
    
    // 合约地址
    IHCFToken public hcfToken;
    IBSDTToken public bsdtToken;
    IReferral public referralContract;
    address public collectionAddress;  // 归集地址
    
    // ============ 事件 ============
    event Staked(address indexed user, uint256 amount, uint256 level);
    event LPAdded(address indexed user, uint256 hcfAmount, uint256 bsdtAmount, uint256 lpType);
    event Claimed(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event Compounded(address indexed user, uint256 amount);
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _bsdtToken,
        address _collectionAddress
    ) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        bsdtToken = IBSDTToken(_bsdtToken);
        collectionAddress = _collectionAddress;
        launchTime = block.timestamp;
        
        // 初始化等级配置
        _initializeLevels();
    }
    
    function _initializeLevels() private {
        // Level 1: 1000 HCF
        levels[0] = LevelConfig({
            minStake: 1000 * 10**18,
            dailyRate: 60,  // 0.6%
            lpBonus: 60,    // +0.6%
            lpRequired: 200 * 10**18,
            compoundUnit: 200 * 10**18
        });
        
        // Level 2: 10000 HCF
        levels[1] = LevelConfig({
            minStake: 10000 * 10**18,
            dailyRate: 70,  // 0.7%
            lpBonus: 70,    // +0.7%
            lpRequired: 2000 * 10**18,
            compoundUnit: 2000 * 10**18
        });
        
        // Level 3: 100000+ HCF
        levels[2] = LevelConfig({
            minStake: 100000 * 10**18,
            dailyRate: 80,  // 0.8%
            lpBonus: 80,    // +0.8%
            lpRequired: 20000 * 10**18,
            compoundUnit: 2000 * 10**18
        });
    }
    
    // ============ 质押功能 ============
    
    /**
     * @dev 质押HCF
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // 前7天限购检查
        if (block.timestamp < launchTime + 7 days) {
            _checkDailyLimit(msg.sender, amount);
        }
        
        // 确定等级
        uint256 level = _getLevel(amount + stakeInfo[msg.sender].amount);
        require(level > 0, "Amount too small");
        
        // 转入代币
        require(hcfToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // 更新质押信息
        StakeInfo storage info = stakeInfo[msg.sender];
        if (info.stakeTime == 0) {
            info.stakeTime = block.timestamp;
        }
        info.amount += amount;
        info.level = level;
        info.lastClaim = block.timestamp;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, level);
    }
    
    /**
     * @dev 添加LP
     * @param lpType 1:普通LP 2:股权LP100天 3:股权LP300天
     */
    function addLP(uint256 lpType) external nonReentrant {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        require(lpType >= 1 && lpType <= 3, "Invalid LP type");
        
        LevelConfig memory config = levels[info.level - 1];
        uint256 requiredHCF = config.lpRequired;
        uint256 requiredBSDT = config.lpRequired;
        
        // 股权LP发送到归集地址，普通LP留在合约
        address destination = lpType == 1 ? address(this) : collectionAddress;
        
        require(hcfToken.transferFrom(msg.sender, destination, requiredHCF), "HCF transfer failed");
        require(bsdtToken.transferFrom(msg.sender, destination, requiredBSDT), "BSDT transfer failed");
        
        info.lpHCFAmount = requiredHCF;
        info.lpBSDTAmount = requiredBSDT;
        info.lpType = lpType;
        
        emit LPAdded(msg.sender, requiredHCF, requiredBSDT, lpType);
    }
    
    /**
     * @dev 领取收益
     */
    function claim() external nonReentrant {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        
        uint256 pending = calculatePending(msg.sender);
        require(pending > 0, "No rewards");
        
        // 日封顶检查（质押量的10%）
        uint256 dailyMax = (info.amount * dailyCap) / BASIS_POINTS;
        if (pending > dailyMax) {
            pending = dailyMax;
        }
        
        info.lastClaim = block.timestamp;
        info.totalClaimed += pending;
        
        require(hcfToken.transfer(msg.sender, pending), "Transfer failed");
        
        // 触发推荐奖励分配
        if (address(referralContract) != address(0)) {
            try referralContract.distributeStaticRewards(msg.sender, pending) {} catch {}
        }
        
        emit Claimed(msg.sender, pending);
    }
    
    /**
     * @dev 复投
     */
    function compound() external nonReentrant {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount > 0, "No stake");
        
        uint256 pending = calculatePending(msg.sender);
        require(pending > 0, "No rewards");
        
        // 日封顶检查
        uint256 dailyMax = (info.amount * dailyCap) / BASIS_POINTS;
        if (pending > dailyMax) {
            pending = dailyMax;
        }
        
        // 检查复投单位
        LevelConfig memory config = levels[info.level - 1];
        require(pending >= config.compoundUnit, "Below compound unit");
        
        uint256 compoundAmount = (pending / config.compoundUnit) * config.compoundUnit;
        
        info.amount += compoundAmount;
        info.lastClaim = block.timestamp;
        info.totalClaimed += compoundAmount;
        
        totalStaked += compoundAmount;
        
        // 更新等级
        uint256 newLevel = _getLevel(info.amount);
        if (newLevel > info.level) {
            info.level = newLevel;
        }
        
        emit Compounded(msg.sender, compoundAmount);
    }
    
    /**
     * @dev 赎回质押
     */
    function withdraw(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakeInfo[msg.sender];
        require(info.amount >= amount, "Insufficient balance");
        
        // 计算赎回费用
        uint256 fee;
        uint256 burnAmount;
        
        // 检查直推条件（直推3倍质押量免额外销毁）
        if (info.directReferrals * 3 >= info.amount) {
            fee = (amount * 1000) / BASIS_POINTS;  // 10% BNB费用
        } else {
            fee = (amount * 1000) / BASIS_POINTS;  // 10% BNB费用
            burnAmount = (amount * 3000) / BASIS_POINTS;  // 额外30%销毁
        }
        
        uint256 netAmount = amount - fee - burnAmount;
        
        // LP赎回处理
        if (info.lpType > 0 && amount == info.amount) {
            // 50% BSDT + 20% HCF (30%销毁)
            uint256 bsdtReturn = (info.lpBSDTAmount * 5000) / BASIS_POINTS;
            uint256 hcfReturn = (info.lpHCFAmount * 2000) / BASIS_POINTS;
            uint256 hcfBurn = (info.lpHCFAmount * 3000) / BASIS_POINTS;
            
            if (info.lpType == 1) {  // 普通LP才退还
                bsdtToken.transfer(msg.sender, bsdtReturn);
                hcfToken.transfer(msg.sender, hcfReturn);
            }
            hcfToken.burn(hcfBurn);
            
            info.lpHCFAmount = 0;
            info.lpBSDTAmount = 0;
            info.lpType = 0;
        }
        
        // 更新质押信息
        info.amount -= amount;
        totalStaked -= amount;
        
        // 执行转账
        if (burnAmount > 0) {
            hcfToken.burn(burnAmount);
        }
        
        hcfToken.transfer(msg.sender, netAmount);
        
        emit Withdrawn(msg.sender, amount, fee + burnAmount);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 计算待领取收益
     */
    function calculatePending(address user) public view returns (uint256) {
        StakeInfo memory info = stakeInfo[user];
        if (info.amount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - info.lastClaim;
        if (timeElapsed == 0) return 0;
        
        LevelConfig memory config = levels[info.level - 1];
        
        // 基础日产
        uint256 dailyBase = (info.amount * config.dailyRate) / BASIS_POINTS;
        
        // LP加成
        if (info.lpType > 0) {
            dailyBase += (info.amount * config.lpBonus) / BASIS_POINTS;
            
            // 股权LP额外加成
            if (info.lpType == 2) {
                dailyBase = (dailyBase * 12000) / BASIS_POINTS;  // +20%
            } else if (info.lpType == 3) {
                dailyBase = (dailyBase * 14000) / BASIS_POINTS;  // +40%
            }
        }
        
        // 计算总收益
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
        uint256 totalClaimed,
        uint256 lpType,
        uint256 dailyOutput
    ) {
        StakeInfo memory info = stakeInfo[user];
        pending = calculatePending(user);
        
        // 计算日产出
        if (info.amount > 0 && info.level > 0) {
            LevelConfig memory config = levels[info.level - 1];
            dailyOutput = (info.amount * config.dailyRate) / BASIS_POINTS;
            
            if (info.lpType > 0) {
                dailyOutput += (info.amount * config.lpBonus) / BASIS_POINTS;
                
                if (info.lpType == 2) {
                    dailyOutput = (dailyOutput * 12000) / BASIS_POINTS;
                } else if (info.lpType == 3) {
                    dailyOutput = (dailyOutput * 14000) / BASIS_POINTS;
                }
            }
            
            // 应用日封顶
            uint256 dailyMax = (info.amount * dailyCap) / BASIS_POINTS;
            if (dailyOutput > dailyMax) {
                dailyOutput = dailyMax;
            }
        }
        
        return (info.amount, info.level, pending, info.totalClaimed, info.lpType, dailyOutput);
    }
    
    // ============ 内部功能 ============
    
    function _getLevel(uint256 amount) internal view returns (uint256) {
        if (amount >= levels[2].minStake) return 3;
        if (amount >= levels[1].minStake) return 2;
        if (amount >= levels[0].minStake) return 1;
        return 0;
    }
    
    function _checkDailyLimit(address user, uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        uint256 dayIndex = today % 7;
        
        // 清理过期记录
        for (uint256 i = 0; i < 7; i++) {
            if (i != dayIndex && purchaseHistory[user][i] > 0) {
                uint256 recordDay = purchaseHistory[user][i] / 10**36;
                if (today - recordDay >= 7) {
                    purchaseHistory[user][i] = 0;
                }
            }
        }
        
        // 检查今日购买量
        uint256 todayAmount = purchaseHistory[user][dayIndex] % 10**36;
        require(todayAmount + amount <= DAILY_LIMIT_7DAYS, "Exceeds daily limit");
        
        // 更新记录
        purchaseHistory[user][dayIndex] = (today * 10**36) + todayAmount + amount;
    }
    
    // ============ 管理功能 ============
    
    function setDailyCap(uint256 _cap) external onlyOwner {
        require(_cap >= 100 && _cap <= 2000, "Invalid cap");  // 1%-20%
        dailyCap = _cap;
    }
    
    function setReferralContract(address _referral) external onlyOwner {
        referralContract = IReferral(_referral);
    }
    
    function updateUserReferrals(address user, uint256 directCount, uint256 teamStake) external onlyOwner {
        stakeInfo[user].directReferrals = directCount;
        stakeInfo[user].teamStake = teamStake;
    }
}