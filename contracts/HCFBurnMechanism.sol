// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMultiSigWallet {
    function submitTransaction(address destination, uint value, bytes memory data) external returns (uint transactionId);
}

interface IHCFToken {
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IHCFStaking {
    function getUserStakingInfo(address user) external view returns (uint256 amount, uint256 dailyReward);
}

interface IHCFReferral {
    function isAuthorized() external view returns (bool);
}

/**
 * @title HCFBurnMechanism
 * @dev 烧伤机制合约 - 实现封顶、特定条件销毁
 * 推荐烧10%、团队烧5%、赎回烧30%、特定触发烧
 */
contract HCFBurnMechanism is Ownable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant BURN_TYPE_VOLATILITY = 0;
    uint256 public constant BURN_TYPE_TRADING = 1;
    uint256 public constant BURN_TYPE_TIMED = 2;
    uint256 public constant BURN_TYPE_VOTE = 3;
    uint256 public constant BURN_TYPE_REFERRAL = 4;
    uint256 public constant BURN_TYPE_TEAM = 5;
    uint256 public constant BURN_TYPE_REDEEM = 6;
    
    // ============ 结构体 ============
    struct BurnConfig {
        uint256 referralBurnRate;      // 推荐烧10%
        uint256 teamBurnRate;           // 团队烧5%
        uint256 redeemBurnRate;         // 赎回烧30%
        uint256 volatilityBurnRate;     // 波动烧5%
        uint256 tradingBurnRate;        // 交易烧1%
        uint256 timedBurnRate;          // 定时烧1%
        uint256 voteBurnRate;           // 投票烧（多签设置）
        uint256 stakingCapMultiplier;   // 质押封顶倍数
    }
    
    struct UserBurnRecord {
        uint256 stakingAmount;          // 质押金额
        uint256 lastCapUpdate;          // 上次封顶更新
        uint256 totalBurned;            // 总销毁量
        uint256 lastBurnTime;           // 上次销毁时间
        uint256 dailyBurnAmount;        // 今日销毁量
        uint256 lastDailyReset;         // 上次日重置
    }
    
    // ============ 状态变量 ============
    BurnConfig public burnConfig;
    mapping(address => UserBurnRecord) public userBurnRecords;
    
    // 全局统计
    uint256 public totalGlobalBurned;
    uint256 public lastTimedBurnExecution;
    uint256 public timedBurnInterval = 24 hours;
    
    // 合约地址
    address public multiSigWallet;
    IHCFToken public hcfToken;
    IHCFStaking public stakingContract;
    IHCFReferral public referralContract;
    address public keeperAddress;
    
    // 授权合约（可以调用burn的合约）
    mapping(address => bool) public authorizedContracts;
    
    // 紧急暂停
    bool public emergencyPaused = false;
    
    // ============ 事件 ============
    event BurnApplied(address indexed user, uint256 amount, uint256 burnType);
    event BurnConfigUpdated(BurnConfig config);
    event VoteBurnTriggered(uint256 rate, uint256 amount);
    event TimedBurnExecuted(uint256 amount, uint256 timestamp);
    event AuthorizedContractSet(address indexed contract_, bool status);
    event EmergencyPauseSet(bool status);
    event MultiSigWalletSet(address indexed oldWallet, address indexed newWallet);
    event DailyCap(address indexed user, uint256 cappedAmount, uint256 actualAmount);
    
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
    
    modifier onlyKeeper() {
        require(msg.sender == keeperAddress || msg.sender == owner(), "Not keeper");
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
        
        // 初始化烧伤配置
        burnConfig = BurnConfig({
            referralBurnRate: 1000,        // 10%
            teamBurnRate: 500,              // 5%
            redeemBurnRate: 3000,           // 30%
            volatilityBurnRate: 500,        // 5%
            tradingBurnRate: 100,           // 1%
            timedBurnRate: 100,             // 1%
            voteBurnRate: 0,                // 初始0，多签设置
            stakingCapMultiplier: 10000     // 100%封顶
        });
        
        lastTimedBurnExecution = block.timestamp;
    }
    
    // ============ 推荐/团队烧伤 ============
    
    /**
     * @dev 应用推荐奖励烧伤（10%）
     */
    function applyReferralBurn(address user, uint256 rewardAmount) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
        returns (uint256) 
    {
        uint256 burnAmount = (rewardAmount * burnConfig.referralBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0) {
            // 检查并应用日封顶
            burnAmount = _applyDailyCap(user, burnAmount);
            
            if (burnAmount > 0) {
                _burn(user, burnAmount, BURN_TYPE_REFERRAL);
            }
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 应用团队奖励烧伤（5%）
     */
    function applyTeamBurn(address user, uint256 rewardAmount) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
        returns (uint256) 
    {
        uint256 burnAmount = (rewardAmount * burnConfig.teamBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0) {
            // 检查并应用日封顶
            burnAmount = _applyDailyCap(user, burnAmount);
            
            if (burnAmount > 0) {
                _burn(user, burnAmount, BURN_TYPE_TEAM);
            }
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 应用赎回烧伤（30%，未分享1:1）
     */
    function applyRedeemBurn(address user, uint256 redeemAmount, bool isShared) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
        returns (uint256) 
    {
        uint256 burnAmount = 0;
        
        if (!isShared) {
            // 未分享，1:1烧伤
            burnAmount = redeemAmount;
        } else {
            // 已分享，30%烧伤
            burnAmount = (redeemAmount * burnConfig.redeemBurnRate) / BASIS_POINTS;
        }
        
        if (burnAmount > 0) {
            _burn(user, burnAmount, BURN_TYPE_REDEEM);
        }
        
        return burnAmount;
    }
    
    // ============ 特定条件烧伤 ============
    
    /**
     * @dev 应用特定条件烧伤
     * @param burnType 0=波动, 1=交易, 2=定时, 3=投票
     */
    function applySpecificBurn(
        uint256 burnType, 
        uint256 baseAmount
    ) 
        external 
        onlyAuthorized 
        notPaused 
        nonReentrant 
        returns (uint256) 
    {
        uint256 burnAmount = 0;
        uint256 burnRate = 0;
        
        if (burnType == BURN_TYPE_VOLATILITY) {
            // 波动5%触发5%烧
            burnRate = burnConfig.volatilityBurnRate;
        } else if (burnType == BURN_TYPE_TRADING) {
            // 交易1%触发1%烧
            burnRate = burnConfig.tradingBurnRate;
        } else if (burnType == BURN_TYPE_TIMED) {
            // 定时1%触发1%烧
            burnRate = burnConfig.timedBurnRate;
        } else if (burnType == BURN_TYPE_VOTE) {
            // 投票烧（多签设置的比例）
            burnRate = burnConfig.voteBurnRate;
        }
        
        if (burnRate > 0) {
            burnAmount = (baseAmount * burnRate) / BASIS_POINTS;
            
            if (burnAmount > 0) {
                _burn(address(this), burnAmount, burnType);
            }
        }
        
        return burnAmount;
    }
    
    /**
     * @dev 执行定时烧伤（Keeper调用）
     */
    function executeTimedBurn() external onlyKeeper notPaused nonReentrant {
        require(
            block.timestamp >= lastTimedBurnExecution + timedBurnInterval,
            "Timed burn interval not met"
        );
        
        uint256 contractBalance = hcfToken.balanceOf(address(this));
        uint256 burnAmount = (contractBalance * burnConfig.timedBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0) {
            _burn(address(this), burnAmount, BURN_TYPE_TIMED);
            lastTimedBurnExecution = block.timestamp;
            emit TimedBurnExecuted(burnAmount, block.timestamp);
        }
    }
    
    /**
     * @dev 触发投票烧伤（仅多签）
     */
    function triggerVoteBurn(uint256 amount) external onlyMultiSig notPaused nonReentrant {
        require(burnConfig.voteBurnRate > 0, "Vote burn rate not set");
        require(amount > 0, "Amount must be positive");
        
        uint256 burnAmount = (amount * burnConfig.voteBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0) {
            _burn(address(this), burnAmount, BURN_TYPE_VOTE);
            emit VoteBurnTriggered(burnConfig.voteBurnRate, burnAmount);
        }
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 应用日封顶限制
     */
    function _applyDailyCap(address user, uint256 burnAmount) internal returns (uint256) {
        UserBurnRecord storage record = userBurnRecords[user];
        
        // 重置日计数器
        if (block.timestamp > record.lastDailyReset + 24 hours) {
            record.dailyBurnAmount = 0;
            record.lastDailyReset = block.timestamp;
        }
        
        // 获取用户质押信息计算日封顶
        uint256 dailyCap = 0;
        if (address(stakingContract) != address(0)) {
            (uint256 stakingAmount, uint256 dailyReward) = stakingContract.getUserStakingInfo(user);
            
            // 封顶 = 日产出 * 倍数 / 10000
            dailyCap = (dailyReward * burnConfig.stakingCapMultiplier) / BASIS_POINTS;
            record.stakingAmount = stakingAmount;
        }
        
        // 如果有封顶限制
        if (dailyCap > 0) {
            uint256 remainingCap = dailyCap > record.dailyBurnAmount ? 
                                   dailyCap - record.dailyBurnAmount : 0;
            
            if (burnAmount > remainingCap) {
                emit DailyCap(user, burnAmount, remainingCap);
                burnAmount = remainingCap;
            }
        }
        
        record.dailyBurnAmount += burnAmount;
        record.lastCapUpdate = block.timestamp;
        
        return burnAmount;
    }
    
    /**
     * @dev 执行销毁
     */
    function _burn(address from, uint256 amount, uint256 burnType) internal {
        require(amount > 0, "Burn amount must be positive");
        
        // 如果from是用户地址，从用户转入
        if (from != address(this)) {
            require(
                hcfToken.transferFrom(from, address(this), amount),
                "Transfer for burn failed"
            );
        }
        
        // 执行销毁
        hcfToken.burn(amount);
        
        // 更新记录
        if (from != address(this)) {
            UserBurnRecord storage record = userBurnRecords[from];
            record.totalBurned += amount;
            record.lastBurnTime = block.timestamp;
        }
        
        totalGlobalBurned += amount;
        
        emit BurnApplied(from, amount, burnType);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置烧伤配置（仅多签）
     */
    function setBurnConfig(
        uint256 referralRate,
        uint256 teamRate,
        uint256 redeemRate,
        uint256 volatilityRate,
        uint256 tradingRate,
        uint256 timedRate,
        uint256 voteRate,
        uint256 capMultiplier
    ) external onlyMultiSig {
        require(referralRate <= 2000, "Referral rate too high");    // 最多20%
        require(teamRate <= 1000, "Team rate too high");            // 最多10%
        require(redeemRate <= 5000, "Redeem rate too high");        // 最多50%
        require(volatilityRate <= 1000, "Volatility rate too high"); // 最多10%
        require(tradingRate <= 500, "Trading rate too high");       // 最多5%
        require(timedRate <= 500, "Timed rate too high");           // 最多5%
        require(voteRate <= 2000, "Vote rate too high");            // 最多20%
        require(capMultiplier <= 20000, "Cap multiplier too high");  // 最多200%
        
        burnConfig.referralBurnRate = referralRate;
        burnConfig.teamBurnRate = teamRate;
        burnConfig.redeemBurnRate = redeemRate;
        burnConfig.volatilityBurnRate = volatilityRate;
        burnConfig.tradingBurnRate = tradingRate;
        burnConfig.timedBurnRate = timedRate;
        burnConfig.voteBurnRate = voteRate;
        burnConfig.stakingCapMultiplier = capMultiplier;
        
        emit BurnConfigUpdated(burnConfig);
    }
    
    /**
     * @dev 设置多签钱包
     */
    function setMultiSigWallet(address _multiSigWallet) external onlyOwner {
        require(_multiSigWallet != address(0), "Invalid address");
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        emit MultiSigWalletSet(oldWallet, _multiSigWallet);
    }
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(
        address _staking,
        address _referral,
        address _keeper
    ) external onlyOwner {
        if (_staking != address(0)) stakingContract = IHCFStaking(_staking);
        if (_referral != address(0)) referralContract = IHCFReferral(_referral);
        if (_keeper != address(0)) keeperAddress = _keeper;
    }
    
    /**
     * @dev 设置授权合约
     */
    function setAuthorizedContract(address contract_, bool authorized) external onlyOwner {
        authorizedContracts[contract_] = authorized;
        emit AuthorizedContractSet(contract_, authorized);
    }
    
    /**
     * @dev 设置定时烧伤间隔
     */
    function setTimedBurnInterval(uint256 interval) external onlyMultiSig {
        require(interval >= 1 hours, "Interval too short");
        require(interval <= 7 days, "Interval too long");
        timedBurnInterval = interval;
    }
    
    /**
     * @dev 设置紧急暂停（仅多签）
     */
    function setEmergencyPause(bool pause) external onlyMultiSig {
        emergencyPaused = pause;
        emit EmergencyPauseSet(pause);
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
     * @dev 获取用户烧伤记录
     */
    function getUserBurnInfo(address user) external view returns (
        uint256 totalBurned,
        uint256 dailyBurned,
        uint256 lastBurnTime,
        uint256 stakingAmount
    ) {
        UserBurnRecord memory record = userBurnRecords[user];
        
        // 如果超过24小时，日销毁量应显示为0
        uint256 dailyAmount = record.dailyBurnAmount;
        if (block.timestamp > record.lastDailyReset + 24 hours) {
            dailyAmount = 0;
        }
        
        return (
            record.totalBurned,
            dailyAmount,
            record.lastBurnTime,
            record.stakingAmount
        );
    }
    
    /**
     * @dev 获取全局统计
     */
    function getGlobalStats() external view returns (
        uint256 totalBurned,
        uint256 nextTimedBurn,
        BurnConfig memory config
    ) {
        return (
            totalGlobalBurned,
            lastTimedBurnExecution + timedBurnInterval,
            burnConfig
        );
    }
    
    /**
     * @dev 计算烧伤金额
     */
    function calculateBurnAmount(uint256 amount, uint256 burnType) external view returns (uint256) {
        uint256 rate = 0;
        
        if (burnType == BURN_TYPE_REFERRAL) {
            rate = burnConfig.referralBurnRate;
        } else if (burnType == BURN_TYPE_TEAM) {
            rate = burnConfig.teamBurnRate;
        } else if (burnType == BURN_TYPE_REDEEM) {
            rate = burnConfig.redeemBurnRate;
        } else if (burnType == BURN_TYPE_VOLATILITY) {
            rate = burnConfig.volatilityBurnRate;
        } else if (burnType == BURN_TYPE_TRADING) {
            rate = burnConfig.tradingBurnRate;
        } else if (burnType == BURN_TYPE_TIMED) {
            rate = burnConfig.timedBurnRate;
        } else if (burnType == BURN_TYPE_VOTE) {
            rate = burnConfig.voteBurnRate;
        }
        
        return (amount * rate) / BASIS_POINTS;
    }
    
    /**
     * @dev 接收BNB
     */
    receive() external payable {}
}