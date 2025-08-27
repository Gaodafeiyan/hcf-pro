// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IHCFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

interface IHCFStaking {
    function calculateStaticRatio(address user) external view returns (uint256);
    function getUserStakingInfo(address user) external view returns (uint256 amount, uint256 dailyReward);
}

interface IHCFBurnMechanism {
    function applyReferralBurn(address user, uint256 amount) external returns (uint256);
    function applyTeamBurn(address user, uint256 amount) external returns (uint256);
}

/**
 * @title HCFReferral
 * @dev 推荐/奖励机制合约
 * 实现入金奖励、静态奖励、团队奖励、动态比例控制、烧伤串联
 */
contract HCFReferral is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_REFERRAL_LEVELS = 20;
    
    // 团队等级要求
    uint256 public constant V1_VOLUME = 2000 * 10**18;        // 2000
    uint256 public constant V2_VOLUME = 20000 * 10**18;       // 2万
    uint256 public constant V3_VOLUME = 100000 * 10**18;      // 10万
    uint256 public constant V4_VOLUME = 500000 * 10**18;      // 50万
    uint256 public constant V5_VOLUME = 3000000 * 10**18;     // 300万
    uint256 public constant V6_VOLUME = 20000000 * 10**18;    // 2000万
    
    // ============ 结构体 ============
    struct UserData {
        address referrer;               // 推荐人
        uint256 directCount;           // 直推数量
        uint256 teamLevel;             // 团队等级(V1-V6)
        uint256 personalVolume;        // 个人业绩
        uint256 teamVolume;           // 团队业绩
        uint256 totalReferralReward;  // 总推荐奖励
        uint256 totalTeamReward;      // 总团队奖励
        bool isActive;                // 是否激活
        uint256 joinTime;             // 加入时间
        uint256 lastRewardTime;       // 上次奖励时间
        mapping(uint256 => uint256) levelVCounts; // 各V等级下级数量
    }
    
    struct ReferralConfig {
        // 入金奖励率
        uint256 entryGen1Rate;         // 一代5%
        uint256 entryGen2Rate;         // 二代3%
        
        // 静态奖励率
        uint256 staticGen1Rate;        // 一代20%
        uint256 staticGen2Rate;        // 二代10%
        uint256 staticGen3To8Rate;     // 3-8代5%
        uint256 staticGen9To15Rate;    // 9-15代3%
        uint256 staticGen16To20Rate;   // 16-20代2%
        
        // 团队奖励率(V1-V6)
        uint256[6] teamRewardRates;    // 6%-36%
        
        // 烧伤率
        uint256 referralBurnRate;      // 推荐烧10%
        uint256 teamBurnRate;          // 团队烧5%
    }
    
    // ============ 状态变量 ============
    mapping(address => UserData) public userData;
    mapping(address => address[]) public directReferrals; // 直推列表
    ReferralConfig public config;
    
    // 合约地址
    address public multiSigWallet;
    IHCFToken public hcfToken;
    IHCFStaking public stakingContract;
    IHCFBurnMechanism public burnMechanism;
    
    // 授权合约
    mapping(address => bool) public authorizedContracts;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event UserRegistered(address indexed user, address indexed referrer);
    event RewardDistributed(address indexed user, uint256 amount, string rewardType);
    event BurnApplied(address indexed user, uint256 amount, string burnType);
    event TeamLevelUpgraded(address indexed user, uint256 oldLevel, uint256 newLevel);
    event ConfigUpdated(ReferralConfig config);
    event EmergencyPauseSet(bool status);
    
    // ============ 修饰符 ============
    modifier onlyMultiSig() {
        require(msg.sender == multiSigWallet || msg.sender == owner(), "Only multisig or owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedContracts[msg.sender] || 
            msg.sender == owner() || 
            msg.sender == multiSigWallet,
            "Not authorized"
        );
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _hcfToken,
        address _multiSigWallet
    ) Ownable() {
        hcfToken = IHCFToken(_hcfToken);
        multiSigWallet = _multiSigWallet;
        
        // 初始化配置
        config.entryGen1Rate = 500;        // 5%
        config.entryGen2Rate = 300;        // 3%
        
        config.staticGen1Rate = 2000;      // 20%
        config.staticGen2Rate = 1000;      // 10%
        config.staticGen3To8Rate = 500;    // 5%
        config.staticGen9To15Rate = 300;   // 3%
        config.staticGen16To20Rate = 200;  // 2%
        
        config.teamRewardRates = [600, 1200, 1800, 2400, 3000, 3600]; // 6%-36%
        
        config.referralBurnRate = 1000;    // 10%
        config.teamBurnRate = 500;         // 5%
    }
    
    // ============ 注册功能 ============
    
    /**
     * @dev 用户注册
     */
    function register(address referrer) external notPaused {
        require(userData[msg.sender].referrer == address(0), "Already registered");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referrer != address(0), "Invalid referrer");
        require(userData[referrer].isActive, "Referrer not active");
        
        UserData storage user = userData[msg.sender];
        user.referrer = referrer;
        user.isActive = true;
        user.joinTime = block.timestamp;
        
        // 更新推荐人的直推数
        userData[referrer].directCount++;
        directReferrals[referrer].push(msg.sender);
        
        // 更新团队业绩链
        _updateTeamVolume(referrer, 0);
        
        emit UserRegistered(msg.sender, referrer);
    }
    
    // ============ 入金奖励 ============
    
    /**
     * @dev 分发入金奖励（5%一代，3%二代）
     */
    function distributeEntryRewards(address user, uint256 amount) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
    {
        require(userData[user].isActive, "User not active");
        
        address referrer = userData[user].referrer;
        if (referrer == address(0)) return;
        
        // 一代奖励5%
        uint256 gen1Reward = (amount * config.entryGen1Rate) / BASIS_POINTS;
        if (gen1Reward > 0) {
            // 应用烧伤
            uint256 burnAmount = _applyBurn(referrer, gen1Reward, "referral");
            uint256 actualReward = gen1Reward - burnAmount;
            
            if (actualReward > 0) {
                _distribute(referrer, actualReward, "entry_gen1");
                userData[referrer].totalReferralReward += actualReward;
            }
        }
        
        // 二代奖励3%
        address gen2Referrer = userData[referrer].referrer;
        if (gen2Referrer != address(0)) {
            uint256 gen2Reward = (amount * config.entryGen2Rate) / BASIS_POINTS;
            if (gen2Reward > 0) {
                // 应用烧伤
                uint256 burnAmount = _applyBurn(gen2Referrer, gen2Reward, "referral");
                uint256 actualReward = gen2Reward - burnAmount;
                
                if (actualReward > 0) {
                    _distribute(gen2Referrer, actualReward, "entry_gen2");
                    userData[gen2Referrer].totalReferralReward += actualReward;
                }
            }
        }
    }
    
    // ============ 静态奖励 ============
    
    /**
     * @dev 分发静态产出奖励（20代）
     */
    function distributeStaticRewards(address user, uint256 staticOutput) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
    {
        require(userData[user].isActive, "User not active");
        
        address current = userData[user].referrer;
        
        for (uint256 level = 1; level <= MAX_REFERRAL_LEVELS && current != address(0); level++) {
            uint256 rewardRate = _getStaticRewardRate(level, current);
            
            if (rewardRate > 0) {
                uint256 reward = (staticOutput * rewardRate) / BASIS_POINTS;
                
                // 应用10%烧伤
                uint256 burnAmount = (reward * 1000) / BASIS_POINTS; // 10%
                if (address(burnMechanism) != address(0)) {
                    burnAmount = burnMechanism.applyReferralBurn(current, reward);
                }
                
                uint256 actualReward = reward - burnAmount;
                
                if (actualReward > 0) {
                    _distribute(current, actualReward, "static");
                    userData[current].totalReferralReward += actualReward;
                }
            }
            
            current = userData[current].referrer;
        }
    }
    
    /**
     * @dev 获取静态奖励率
     */
    function _getStaticRewardRate(uint256 level, address user) internal view returns (uint256) {
        UserData storage data = userData[user];
        
        if (level == 1) {
            return config.staticGen1Rate; // 20%
        } else if (level == 2) {
            return config.staticGen2Rate; // 10%
        } else if (level >= 3 && level <= 8) {
            // V3解锁（需要直推数）
            if (data.teamLevel >= 3 || data.directCount >= 3) {
                return config.staticGen3To8Rate; // 5%
            }
        } else if (level >= 9 && level <= 15) {
            // V3+解锁
            if (data.teamLevel >= 3) {
                return config.staticGen9To15Rate; // 3%
            }
        } else if (level >= 16 && level <= 20) {
            // V4+解锁
            if (data.teamLevel >= 4) {
                return config.staticGen16To20Rate; // 2%
            }
        }
        
        return 0;
    }
    
    // ============ 团队奖励 ============
    
    /**
     * @dev 分发团队奖励（V1-V6）
     */
    function distributeTeamRewards(address user, uint256 teamOutput) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
    {
        UserData storage data = userData[user];
        require(data.isActive, "User not active");
        require(data.teamLevel > 0, "No team level");
        
        // 检查是否满足团队等级要求
        if (!_checkTeamLevelRequirements(user)) {
            return;
        }
        
        // 计算团队奖励（6%-36%）
        uint256 rewardRate = config.teamRewardRates[data.teamLevel - 1];
        uint256 reward = (teamOutput * rewardRate) / BASIS_POINTS;
        
        // 应用5%烧伤
        uint256 burnAmount = _applyBurn(user, reward, "team");
        uint256 actualReward = reward - burnAmount;
        
        if (actualReward > 0) {
            _distribute(user, actualReward, "team");
            data.totalTeamReward += actualReward;
        }
    }
    
    /**
     * @dev 检查团队等级要求
     */
    function _checkTeamLevelRequirements(address user) internal view returns (bool) {
        UserData storage data = userData[user];
        
        // V1: 小区2000
        if (data.teamLevel == 1) {
            return data.teamVolume >= V1_VOLUME;
        }
        // V2: 小区2万 + 2个V1
        else if (data.teamLevel == 2) {
            return data.teamVolume >= V2_VOLUME && data.levelVCounts[1] >= 2;
        }
        // V3: 小区10万 + 2个V2
        else if (data.teamLevel == 3) {
            return data.teamVolume >= V3_VOLUME && data.levelVCounts[2] >= 2;
        }
        // V4: 小区50万 + 2个V3
        else if (data.teamLevel == 4) {
            return data.teamVolume >= V4_VOLUME && data.levelVCounts[3] >= 2;
        }
        // V5: 小区300万 + 1个V4
        else if (data.teamLevel == 5) {
            return data.teamVolume >= V5_VOLUME && data.levelVCounts[4] >= 1;
        }
        // V6: 小区2000万 + 2个V4
        else if (data.teamLevel == 6) {
            return data.teamVolume >= V6_VOLUME && data.levelVCounts[4] >= 2;
        }
        
        return false;
    }
    
    // ============ 动态比例 ============
    
    /**
     * @dev 计算动态奖励（基础*动态比例）
     */
    function calculateDynamicBonus(address user, uint256 baseAmount) 
        external 
        view 
        returns (uint256) 
    {
        if (address(stakingContract) == address(0)) {
            return baseAmount / 2; // 默认50%
        }
        
        // 获取静态比例（50%-100%）
        uint256 dynamicRatio = stakingContract.calculateStaticRatio(user);
        
        // 应用动态比例
        return (baseAmount * dynamicRatio) / BASIS_POINTS;
    }
    
    // ============ 烧伤机制 ============
    
    /**
     * @dev 应用烧伤
     */
    function applyBurn(address user, uint256 amount, string memory burnType) 
        external 
        onlyAuthorized 
        notPaused 
        returns (uint256) 
    {
        return _applyBurn(user, amount, burnType);
    }
    
    /**
     * @dev 内部应用烧伤
     */
    function _applyBurn(address user, uint256 amount, string memory burnType) 
        internal 
        returns (uint256) 
    {
        uint256 burnAmount = 0;
        
        if (keccak256(bytes(burnType)) == keccak256(bytes("referral"))) {
            burnAmount = (amount * config.referralBurnRate) / BASIS_POINTS;
        } else if (keccak256(bytes(burnType)) == keccak256(bytes("team"))) {
            burnAmount = (amount * config.teamBurnRate) / BASIS_POINTS;
        }
        
        // 全局封顶检查（日产出%）
        if (address(stakingContract) != address(0)) {
            (uint256 stakingAmount, uint256 dailyReward) = stakingContract.getUserStakingInfo(user);
            if (burnAmount > dailyReward) {
                burnAmount = dailyReward; // 封顶
            }
        }
        
        if (burnAmount > 0) {
            hcfToken.burn(burnAmount);
            emit BurnApplied(user, burnAmount, burnType);
        }
        
        return burnAmount;
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 内部分发奖励
     */
    function _distribute(address to, uint256 amount, string memory rewardType) internal {
        require(hcfToken.transfer(to, amount), "Transfer failed");
        userData[to].lastRewardTime = block.timestamp;
        emit RewardDistributed(to, amount, rewardType);
    }
    
    /**
     * @dev 更新团队业绩
     */
    function _updateTeamVolume(address user, uint256 addVolume) internal {
        address current = user;
        
        while (current != address(0)) {
            userData[current].teamVolume += addVolume;
            
            // 检查并更新团队等级
            _updateTeamLevel(current);
            
            current = userData[current].referrer;
        }
    }
    
    /**
     * @dev 更新团队等级
     */
    function _updateTeamLevel(address user) internal {
        UserData storage data = userData[user];
        uint256 oldLevel = data.teamLevel;
        uint256 newLevel = 0;
        
        // 根据业绩和下级V等级判断
        if (data.teamVolume >= V6_VOLUME && data.levelVCounts[4] >= 2) {
            newLevel = 6;
        } else if (data.teamVolume >= V5_VOLUME && data.levelVCounts[4] >= 1) {
            newLevel = 5;
        } else if (data.teamVolume >= V4_VOLUME && data.levelVCounts[3] >= 2) {
            newLevel = 4;
        } else if (data.teamVolume >= V3_VOLUME && data.levelVCounts[2] >= 2) {
            newLevel = 3;
        } else if (data.teamVolume >= V2_VOLUME && data.levelVCounts[1] >= 2) {
            newLevel = 2;
        } else if (data.teamVolume >= V1_VOLUME) {
            newLevel = 1;
        }
        
        if (newLevel > oldLevel) {
            data.teamLevel = newLevel;
            
            // 更新上级的下级V计数
            if (data.referrer != address(0)) {
                userData[data.referrer].levelVCounts[newLevel]++;
                if (oldLevel > 0) {
                    userData[data.referrer].levelVCounts[oldLevel]--;
                }
            }
            
            emit TeamLevelUpgraded(user, oldLevel, newLevel);
        }
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置烧伤配置（仅多签）
     */
    function setBurnConfig(
        uint256 referralRate,
        uint256 teamRate
    ) external onlyMultiSig {
        require(referralRate <= 2000, "Referral rate too high"); // 最多20%
        require(teamRate <= 1000, "Team rate too high");         // 最多10%
        
        config.referralBurnRate = referralRate;
        config.teamBurnRate = teamRate;
        
        emit ConfigUpdated(config);
    }
    
    /**
     * @dev 设置奖励率（仅多签）
     */
    function setRewardRates(
        uint256[2] memory entryRates,
        uint256[5] memory staticRates,
        uint256[6] memory teamRates
    ) external onlyMultiSig {
        config.entryGen1Rate = entryRates[0];
        config.entryGen2Rate = entryRates[1];
        
        config.staticGen1Rate = staticRates[0];
        config.staticGen2Rate = staticRates[1];
        config.staticGen3To8Rate = staticRates[2];
        config.staticGen9To15Rate = staticRates[3];
        config.staticGen16To20Rate = staticRates[4];
        
        for (uint i = 0; i < 6; i++) {
            config.teamRewardRates[i] = teamRates[i];
        }
        
        emit ConfigUpdated(config);
    }
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid address");
        multiSigWallet = _multiSigWallet;
    }
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _staking,
        address _burnMechanism
    ) external onlyOwner {
        if (_staking != address(0)) stakingContract = IHCFStaking(_staking);
        if (_burnMechanism != address(0)) burnMechanism = IHCFBurnMechanism(_burnMechanism);
    }
    
    /**
     * @dev 设置授权合约
     */
    function setAuthorizedContract(address contract_, bool authorized) external onlyOwner {
        authorizedContracts[contract_] = authorized;
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function setEmergencyPause(bool pause) external onlyMultiSig {
        emergencyPaused = pause;
        emit EmergencyPauseSet(pause);
    }
    
    /**
     * @dev 手动更新用户业绩
     */
    function updateUserVolume(address user, uint256 personalVolume) external onlyAuthorized {
        userData[user].personalVolume = personalVolume;
        _updateTeamVolume(user, personalVolume);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户数据
     */
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
    ) {
        UserData storage data = userData[user];
        return (
            data.referrer,
            data.directCount,
            data.teamLevel,
            data.personalVolume,
            data.teamVolume,
            data.totalReferralReward,
            data.totalTeamReward,
            data.isActive,
            data.joinTime,
            data.lastRewardTime
        );
    }
    
    /**
     * @dev 获取直推列表
     */
    function getDirectReferrals(address user) external view returns (address[] memory) {
        return directReferrals[user];
    }
    
    /**
     * @dev 获取下级V等级计数
     */
    function getLevelVCounts(address user, uint256 level) external view returns (uint256) {
        return userData[user].levelVCounts[level];
    }
    
    /**
     * @dev 检查用户是否已授权
     */
    function isAuthorized() external view returns (bool) {
        return authorizedContracts[msg.sender];
    }
    
    /**
     * @dev 获取配置
     */
    function getConfig() external view returns (ReferralConfig memory) {
        return config;
    }
}