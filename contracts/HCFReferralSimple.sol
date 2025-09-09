// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HCFReferralSimple
 * @dev 简化版推荐系统 - 支持3级推荐奖励
 */
contract HCFReferralSimple is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ 结构体 ============
    struct UserInfo {
        address referrer;           // 推荐人
        uint256 directCount;        // 直推人数
        uint256 totalReferred;      // 总推荐人数（包括间接）
        uint256 totalRewards;       // 总获得奖励
        uint256 unclaimedRewards;   // 未领取奖励
        uint256 totalStaked;        // 总质押量
        uint256 registerTime;       // 注册时间
    }
    
    // ============ 状态变量 ============
    mapping(address => UserInfo) public userInfo;
    mapping(address => address[]) public directReferrals;  // 直推列表
    mapping(address => bool) public isRegistered;
    
    // 奖励比例
    uint256 public level1Rate = 1000;  // 一级10%
    uint256 public level2Rate = 500;   // 二级5%
    uint256 public level3Rate = 300;   // 三级3%
    
    IERC20 public hcfToken;
    address public stakingContract;
    
    uint256 public totalUsers;
    uint256 public totalRewardsPaid;
    
    mapping(address => bool) public operators;
    
    // ============ 事件 ============
    event UserRegistered(address indexed user, address indexed referrer);
    event RewardDistributed(address indexed user, address indexed from, uint256 amount, uint256 level);
    event RewardsClaimed(address indexed user, uint256 amount);
    event StakeRecorded(address indexed user, uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }
    
    modifier onlyStaking() {
        require(msg.sender == stakingContract, "Only staking");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(address _hcfToken) Ownable() {
        require(_hcfToken != address(0), "Invalid token");
        hcfToken = IERC20(_hcfToken);
    }
    
    // ============ 注册功能 ============
    
    /**
     * @dev 注册用户
     */
    function register(address referrer) external {
        require(!isRegistered[msg.sender], "Already registered");
        require(msg.sender != referrer, "Cannot refer yourself");
        
        // 允许没有推荐人注册
        if (referrer != address(0)) {
            require(isRegistered[referrer], "Referrer not registered");
        }
        
        isRegistered[msg.sender] = true;
        totalUsers++;
        
        userInfo[msg.sender] = UserInfo({
            referrer: referrer,
            directCount: 0,
            totalReferred: 0,
            totalRewards: 0,
            unclaimedRewards: 0,
            totalStaked: 0,
            registerTime: block.timestamp
        });
        
        // 更新推荐关系
        if (referrer != address(0)) {
            directReferrals[referrer].push(msg.sender);
            userInfo[referrer].directCount++;
            
            // 更新推荐链的总推荐人数
            address current = referrer;
            while (current != address(0)) {
                userInfo[current].totalReferred++;
                current = userInfo[current].referrer;
            }
        }
        
        emit UserRegistered(msg.sender, referrer);
    }
    
    // ============ 奖励分发 ============
    
    /**
     * @dev 记录质押并分发推荐奖励（由质押合约调用）
     */
    function recordStakeAndDistribute(address user, uint256 amount) external onlyStaking {
        if (!isRegistered[user]) {
            // 自动注册无推荐人用户
            isRegistered[user] = true;
            totalUsers++;
            userInfo[user] = UserInfo({
                referrer: address(0),
                directCount: 0,
                totalReferred: 0,
                totalRewards: 0,
                unclaimedRewards: 0,
                totalStaked: amount,
                registerTime: block.timestamp
            });
            emit UserRegistered(user, address(0));
        } else {
            userInfo[user].totalStaked += amount;
        }
        
        emit StakeRecorded(user, amount);
        
        // 分发推荐奖励
        _distributeRewards(user, amount);
    }
    
    /**
     * @dev 内部分发奖励
     */
    function _distributeRewards(address user, uint256 baseAmount) internal {
        address referrer = userInfo[user].referrer;
        if (referrer == address(0)) return;
        
        // 一级奖励
        uint256 level1Reward = (baseAmount * level1Rate) / BASIS_POINTS;
        if (level1Reward > 0) {
            userInfo[referrer].totalRewards += level1Reward;
            userInfo[referrer].unclaimedRewards += level1Reward;
            emit RewardDistributed(referrer, user, level1Reward, 1);
            
            // 二级奖励
            address referrer2 = userInfo[referrer].referrer;
            if (referrer2 != address(0)) {
                uint256 level2Reward = (baseAmount * level2Rate) / BASIS_POINTS;
                if (level2Reward > 0) {
                    userInfo[referrer2].totalRewards += level2Reward;
                    userInfo[referrer2].unclaimedRewards += level2Reward;
                    emit RewardDistributed(referrer2, user, level2Reward, 2);
                    
                    // 三级奖励
                    address referrer3 = userInfo[referrer2].referrer;
                    if (referrer3 != address(0)) {
                        uint256 level3Reward = (baseAmount * level3Rate) / BASIS_POINTS;
                        if (level3Reward > 0) {
                            userInfo[referrer3].totalRewards += level3Reward;
                            userInfo[referrer3].unclaimedRewards += level3Reward;
                            emit RewardDistributed(referrer3, user, level3Reward, 3);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * @dev 领取推荐奖励
     */
    function claimRewards() external nonReentrant {
        require(isRegistered[msg.sender], "Not registered");
        
        uint256 rewards = userInfo[msg.sender].unclaimedRewards;
        require(rewards > 0, "No rewards");
        
        userInfo[msg.sender].unclaimedRewards = 0;
        totalRewardsPaid += rewards;
        
        require(hcfToken.transfer(msg.sender, rewards), "Transfer failed");
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取用户完整信息
     */
    function getUserFullInfo(address user) external view returns (
        address referrer,
        uint256 directCount,
        uint256 totalReferred,
        uint256 totalRewards,
        uint256 unclaimedRewards,
        uint256 totalStaked,
        uint256 registerTime,
        bool registered
    ) {
        UserInfo memory info = userInfo[user];
        return (
            info.referrer,
            info.directCount,
            info.totalReferred,
            info.totalRewards,
            info.unclaimedRewards,
            info.totalStaked,
            info.registerTime,
            isRegistered[user]
        );
    }
    
    /**
     * @dev 获取直推列表
     */
    function getDirectReferrals(address user) external view returns (address[] memory) {
        return directReferrals[user];
    }
    
    /**
     * @dev 获取推荐链（最多3级）
     */
    function getReferralChain(address user) external view returns (
        address referrer1,
        address referrer2,
        address referrer3
    ) {
        referrer1 = userInfo[user].referrer;
        if (referrer1 != address(0)) {
            referrer2 = userInfo[referrer1].referrer;
            if (referrer2 != address(0)) {
                referrer3 = userInfo[referrer2].referrer;
            }
        }
    }
    
    /**
     * @dev 计算预期奖励
     */
    function calculateExpectedRewards(uint256 stakeAmount) external view returns (
        uint256 level1,
        uint256 level2,
        uint256 level3
    ) {
        level1 = (stakeAmount * level1Rate) / BASIS_POINTS;
        level2 = (stakeAmount * level2Rate) / BASIS_POINTS;
        level3 = (stakeAmount * level3Rate) / BASIS_POINTS;
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置质押合约
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid address");
        stakingContract = _stakingContract;
    }
    
    /**
     * @dev 设置操作员
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }
    
    /**
     * @dev 更新奖励比例
     */
    function updateRewardRates(
        uint256 _level1Rate,
        uint256 _level2Rate,
        uint256 _level3Rate
    ) external onlyOperator {
        require(_level1Rate <= 2000, "Level1 too high");  // 最多20%
        require(_level2Rate <= 1000, "Level2 too high");  // 最多10%
        require(_level3Rate <= 500, "Level3 too high");   // 最多5%
        
        level1Rate = _level1Rate;
        level2Rate = _level2Rate;
        level3Rate = _level3Rate;
    }
    
    /**
     * @dev 批量注册（用于迁移）
     */
    function batchRegister(
        address[] calldata users,
        address[] calldata referrers
    ) external onlyOperator {
        require(users.length == referrers.length, "Length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (!isRegistered[users[i]]) {
                isRegistered[users[i]] = true;
                totalUsers++;
                
                userInfo[users[i]] = UserInfo({
                    referrer: referrers[i],
                    directCount: 0,
                    totalReferred: 0,
                    totalRewards: 0,
                    unclaimedRewards: 0,
                    totalStaked: 0,
                    registerTime: block.timestamp
                });
                
                if (referrers[i] != address(0) && isRegistered[referrers[i]]) {
                    directReferrals[referrers[i]].push(users[i]);
                    userInfo[referrers[i]].directCount++;
                }
                
                emit UserRegistered(users[i], referrers[i]);
            }
        }
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev 手动分发奖励（用于特殊情况）
     */
    function manualDistributeReward(address to, uint256 amount) external onlyOperator {
        require(isRegistered[to], "User not registered");
        
        userInfo[to].totalRewards += amount;
        userInfo[to].unclaimedRewards += amount;
        
        emit RewardDistributed(to, address(0), amount, 0);
    }
}