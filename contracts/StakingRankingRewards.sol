// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IStaking {
    function getUserStakeAmount(address user) external view returns (uint256);
    function getAllStakers() external view returns (address[] memory);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract StakingRankingRewards is Ownable, ReentrancyGuard {
    IStaking public stakingContract;
    IERC20 public rewardToken;
    
    // 排名奖励比例 (基于10000)
    uint256 public top100Reward = 2000;    // 20%
    uint256 public top500Reward = 1500;    // 15%
    uint256 public top2000Reward = 1000;   // 10%
    
    // 记录已分配的奖励
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public claimedRewards;
    
    // 排名快照
    struct RankingSnapshot {
        address user;
        uint256 stakeAmount;
        uint256 rank;
        uint256 reward;
    }
    
    RankingSnapshot[] public lastSnapshot;
    uint256 public lastSnapshotTime;
    uint256 public snapshotInterval = 1 days;
    
    event RewardsDistributed(uint256 totalAmount, uint256 timestamp);
    event RewardClaimed(address indexed user, uint256 amount);
    event RankingUpdated(address indexed user, uint256 rank, uint256 reward);
    
    constructor(address _stakingContract, address _rewardToken) {
        stakingContract = IStaking(_stakingContract);
        rewardToken = IERC20(_rewardToken);
    }
    
    // 更新排名并分配奖励
    function updateRankingAndDistribute() external nonReentrant {
        require(block.timestamp >= lastSnapshotTime + snapshotInterval, "Too soon");
        
        // 获取所有质押者
        address[] memory stakers = stakingContract.getAllStakers();
        uint256 totalStakers = stakers.length;
        
        // 创建临时数组存储质押信息
        RankingSnapshot[] memory tempSnapshot = new RankingSnapshot[](totalStakers);
        
        // 获取每个人的质押量
        for (uint256 i = 0; i < totalStakers; i++) {
            tempSnapshot[i] = RankingSnapshot({
                user: stakers[i],
                stakeAmount: stakingContract.getUserStakeAmount(stakers[i]),
                rank: 0,
                reward: 0
            });
        }
        
        // 排序（简单冒泡排序，实际应用中应使用更高效的算法）
        for (uint256 i = 0; i < totalStakers - 1; i++) {
            for (uint256 j = 0; j < totalStakers - i - 1; j++) {
                if (tempSnapshot[j].stakeAmount < tempSnapshot[j + 1].stakeAmount) {
                    RankingSnapshot memory temp = tempSnapshot[j];
                    tempSnapshot[j] = tempSnapshot[j + 1];
                    tempSnapshot[j + 1] = temp;
                }
            }
        }
        
        // 分配排名和奖励
        uint256 totalRewardPool = rewardToken.balanceOf(address(this));
        delete lastSnapshot;
        
        for (uint256 i = 0; i < totalStakers; i++) {
            tempSnapshot[i].rank = i + 1;
            
            // 计算奖励
            uint256 reward = 0;
            if (i < 100) {
                // 前100名: 20%
                reward = (totalRewardPool * top100Reward) / 10000 / 100;
            } else if (i < 500) {
                // 101-500名: 15%
                reward = (totalRewardPool * top500Reward) / 10000 / 400;
            } else if (i < 2000) {
                // 501-2000名: 10%
                reward = (totalRewardPool * top2000Reward) / 10000 / 1500;
            }
            
            tempSnapshot[i].reward = reward;
            pendingRewards[tempSnapshot[i].user] += reward;
            
            // 保存快照
            lastSnapshot.push(tempSnapshot[i]);
            
            emit RankingUpdated(tempSnapshot[i].user, tempSnapshot[i].rank, reward);
        }
        
        lastSnapshotTime = block.timestamp;
        emit RewardsDistributed(totalRewardPool, block.timestamp);
    }
    
    // 用户领取奖励
    function claimReward() external nonReentrant {
        uint256 reward = pendingRewards[msg.sender];
        require(reward > 0, "No reward");
        
        pendingRewards[msg.sender] = 0;
        claimedRewards[msg.sender] += reward;
        
        require(rewardToken.transfer(msg.sender, reward), "Transfer failed");
        
        emit RewardClaimed(msg.sender, reward);
    }
    
    // 查询用户排名
    function getUserRanking(address user) external view returns (uint256 rank, uint256 stakeAmount, uint256 reward) {
        for (uint256 i = 0; i < lastSnapshot.length; i++) {
            if (lastSnapshot[i].user == user) {
                return (lastSnapshot[i].rank, lastSnapshot[i].stakeAmount, lastSnapshot[i].reward);
            }
        }
        return (0, 0, 0);
    }
    
    // 获取排行榜
    function getTopStakers(uint256 limit) external view returns (RankingSnapshot[] memory) {
        uint256 actualLimit = limit > lastSnapshot.length ? lastSnapshot.length : limit;
        RankingSnapshot[] memory topStakers = new RankingSnapshot[](actualLimit);
        
        for (uint256 i = 0; i < actualLimit; i++) {
            topStakers[i] = lastSnapshot[i];
        }
        
        return topStakers;
    }
    
    // 管理功能
    function setRewardRates(uint256 _top100, uint256 _top500, uint256 _top2000) external onlyOwner {
        require(_top100 + _top500 + _top2000 <= 10000, "Total exceeds 100%");
        top100Reward = _top100;
        top500Reward = _top500;
        top2000Reward = _top2000;
    }
    
    function setSnapshotInterval(uint256 _interval) external onlyOwner {
        snapshotInterval = _interval;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = rewardToken.balanceOf(address(this));
        rewardToken.transfer(owner(), balance);
    }
}