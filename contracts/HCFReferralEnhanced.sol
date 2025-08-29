// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFReferral.sol";

/**
 * @title HCFReferralEnhanced
 * @dev 推荐系统增强版 - 补充缺失功能
 */
contract HCFReferralEnhanced is HCFReferral {
    
    // ============ 新增状态变量 ============
    
    // 动态收益配置
    struct DynamicConfig {
        uint256 minRate;        // 最小倍率 50%
        uint256 maxRate;        // 最大倍率 100%
        bool enabled;           // 是否启用
    }
    
    DynamicConfig public dynamicConfig;
    
    // 全局封顶
    mapping(address => uint256) public userDailyOutput;     // 用户日产出
    mapping(address => uint256) public userBurnedToday;     // 今日已烧
    mapping(address => uint256) public lastBurnDay;         // 上次烧伤日期
    
    // 特定烧伤配置
    struct SpecificBurnConfig {
        uint256 volatilityBurnRate;    // 波动烧 5%
        uint256 tradingBurnRate;       // 交易烧 1%
        uint256 timedBurnRate;         // 定时烧 1%
        uint256 lastTimedBurn;         // 上次定时烧时间
    }
    
    SpecificBurnConfig public specificBurnConfig;
    
    // 直推解锁完整机制
    mapping(address => mapping(uint256 => bool)) public levelUnlocked; // 用户-代数-是否解锁
    
    // 级差显示
    struct LevelDifference {
        uint256 myLevel;
        uint256 lowerLevel;
        uint256 difference;
    }
    
    // ============ 事件 ============
    event DynamicRewardCalculated(address indexed user, uint256 baseAmount, uint256 dynamicAmount);
    event BurnCapped(address indexed user, uint256 requestedBurn, uint256 actualBurn);
    event SpecificBurnApplied(address indexed user, uint256 amount, string burnType);
    event LevelUnlocked(address indexed user, uint256 level);
    
    // ============ 构造函数 ============
    constructor(
        address _multiSig,
        address _burnContract,
        address _stakingContract
    ) HCFReferral(_multiSig, _burnContract, _stakingContract) {
        // 初始化动态配置
        dynamicConfig = DynamicConfig({
            minRate: 5000,  // 50%
            maxRate: 10000, // 100%
            enabled: true
        });
        
        // 初始化特定烧伤配置
        specificBurnConfig = SpecificBurnConfig({
            volatilityBurnRate: 500,   // 5%
            tradingBurnRate: 100,       // 1%
            timedBurnRate: 100,         // 1%
            lastTimedBurn: block.timestamp
        });
    }
    
    // ============ 动态收益计算 ============
    
    /**
     * @dev 计算动态收益（50%-100%基于静态产出）
     */
    function calculateDynamicReward(address user, uint256 staticOutput) 
        public 
        view 
        returns (uint256) 
    {
        if (!dynamicConfig.enabled) {
            return 0;
        }
        
        UserData storage data = userData[user];
        
        // 基于团队等级和业绩计算动态倍率
        uint256 dynamicRate = dynamicConfig.minRate;
        
        // V3+ 获得60%
        if (data.teamLevel >= 3) {
            dynamicRate = 6000;
        }
        
        // V4+ 获得70%
        if (data.teamLevel >= 4) {
            dynamicRate = 7000;
        }
        
        // V5+ 获得85%
        if (data.teamLevel >= 5) {
            dynamicRate = 8500;
        }
        
        // V6 获得100%
        if (data.teamLevel >= 6) {
            dynamicRate = dynamicConfig.maxRate;
        }
        
        // 应用到20代
        uint256 dynamicReward = (staticOutput * dynamicRate) / BASIS_POINTS;
        
        return dynamicReward;
    }
    
    /**
     * @dev 分发动态奖励
     */
    function distributeDynamicRewards(address user, uint256 staticOutput) 
        external 
        onlyAuthorized 
        notPaused 
    {
        uint256 dynamicReward = calculateDynamicReward(user, staticOutput);
        
        if (dynamicReward > 0) {
            userData[user].totalDynamicReward += dynamicReward;
            
            // 转账奖励
            if (address(hcfToken) != address(0)) {
                require(
                    hcfToken.transfer(user, dynamicReward),
                    "Dynamic reward transfer failed"
                );
            }
            
            emit DynamicRewardCalculated(user, staticOutput, dynamicReward);
        }
    }
    
    // ============ 全局封顶机制 ============
    
    /**
     * @dev 应用烧伤（带全局封顶检查）
     */
    function applyBurnWithCap(address user, uint256 amount, string memory burnType)
        public
        onlyAuthorized
        returns (uint256)
    {
        // 更新日期
        uint256 today = block.timestamp / 1 days;
        if (lastBurnDay[user] != today) {
            userBurnedToday[user] = 0;
            lastBurnDay[user] = today;
        }
        
        // 获取用户日产出（从质押合约）
        uint256 dailyOutput = 0;
        if (address(stakingContract) != address(0)) {
            try stakingContract.getUserDailyOutput(user) returns (uint256 output) {
                dailyOutput = output;
            } catch {
                dailyOutput = userDailyOutput[user]; // 使用缓存
            }
        }
        
        // 计算烧伤
        uint256 burnAmount = _applyBurn(user, amount, burnType);
        
        // 检查封顶（不超过日产出）
        if (userBurnedToday[user] + burnAmount > dailyOutput) {
            burnAmount = dailyOutput > userBurnedToday[user] ? 
                         dailyOutput - userBurnedToday[user] : 0;
            
            emit BurnCapped(user, amount, burnAmount);
        }
        
        userBurnedToday[user] += burnAmount;
        
        // 执行实际烧伤
        if (burnAmount > 0 && address(burnContract) != address(0)) {
            burnContract.applyBurn(1, burnAmount, user); // 1 = 推荐烧类型
        }
        
        return burnAmount;
    }
    
    // ============ 特定烧伤机制 ============
    
    /**
     * @dev 应用波动烧伤（5%）
     */
    function applyVolatilityBurn(address user, uint256 amount) 
        external 
        onlyAuthorized 
        returns (uint256) 
    {
        uint256 burnAmount = (amount * specificBurnConfig.volatilityBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0 && address(burnContract) != address(0)) {
            burnContract.applyBurn(4, burnAmount, user); // 4 = 波动烧类型
        }
        
        emit SpecificBurnApplied(user, burnAmount, "volatility");
        return burnAmount;
    }
    
    /**
     * @dev 应用交易烧伤（1%）
     */
    function applyTradingBurn(address user, uint256 amount) 
        external 
        onlyAuthorized 
        returns (uint256) 
    {
        uint256 burnAmount = (amount * specificBurnConfig.tradingBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0 && address(burnContract) != address(0)) {
            burnContract.applyBurn(5, burnAmount, user); // 5 = 交易烧类型
        }
        
        emit SpecificBurnApplied(user, burnAmount, "trading");
        return burnAmount;
    }
    
    /**
     * @dev 应用定时烧伤（1%，24小时间隔）
     */
    function applyTimedBurn(address user, uint256 amount) 
        external 
        onlyAuthorized 
        returns (uint256) 
    {
        require(
            block.timestamp >= specificBurnConfig.lastTimedBurn + 24 hours,
            "Timed burn cooldown"
        );
        
        uint256 burnAmount = (amount * specificBurnConfig.timedBurnRate) / BASIS_POINTS;
        
        if (burnAmount > 0 && address(burnContract) != address(0)) {
            burnContract.applyBurn(6, burnAmount, user); // 6 = 定时烧类型
        }
        
        specificBurnConfig.lastTimedBurn = block.timestamp;
        
        emit SpecificBurnApplied(user, burnAmount, "timed");
        return burnAmount;
    }
    
    // ============ 直推解锁完整机制 ============
    
    /**
     * @dev 检查并解锁代数（直推几个拿几代）
     */
    function checkAndUnlockLevels(address user) public {
        UserData storage data = userData[user];
        uint256 directCount = data.directCount;
        
        // 1-2代：默认解锁
        levelUnlocked[user][1] = true;
        levelUnlocked[user][2] = true;
        
        // 3-8代：需要至少3个直推
        for (uint256 i = 3; i <= 8 && i <= directCount; i++) {
            if (!levelUnlocked[user][i]) {
                levelUnlocked[user][i] = true;
                emit LevelUnlocked(user, i);
            }
        }
        
        // 9-15代：需要V3或更多直推
        if (data.teamLevel >= 3 || directCount >= 9) {
            for (uint256 i = 9; i <= 15 && i <= directCount; i++) {
                if (!levelUnlocked[user][i]) {
                    levelUnlocked[user][i] = true;
                    emit LevelUnlocked(user, i);
                }
            }
        }
        
        // 16-20代：需要V4或更多直推
        if (data.teamLevel >= 4 || directCount >= 16) {
            for (uint256 i = 16; i <= 20 && i <= directCount; i++) {
                if (!levelUnlocked[user][i]) {
                    levelUnlocked[user][i] = true;
                    emit LevelUnlocked(user, i);
                }
            }
        }
    }
    
    /**
     * @dev 获取实际可拿代数奖励率（结合直推数量）
     */
    function getActualLevelRate(address user, uint256 level) 
        public 
        view 
        returns (uint256) 
    {
        // 检查是否解锁该代
        if (!levelUnlocked[user][level]) {
            return 0;
        }
        
        // 返回对应代数的奖励率
        return _getLevelRate(user, level);
    }
    
    // ============ 级差计算与显示 ============
    
    /**
     * @dev 计算级差奖励
     */
    function calculateLevelDifference(address higher, address lower) 
        public 
        view 
        returns (LevelDifference memory) 
    {
        UserData storage higherData = userData[higher];
        UserData storage lowerData = userData[lower];
        
        uint256 higherLevel = higherData.teamLevel;
        uint256 lowerLevel = lowerData.teamLevel;
        
        // 计算级差
        uint256 difference = 0;
        if (higherLevel > lowerLevel) {
            uint256 higherRate = config.teamRewardRates[higherLevel - 1];
            uint256 lowerRate = lowerLevel > 0 ? config.teamRewardRates[lowerLevel - 1] : 0;
            difference = higherRate - lowerRate;
        }
        
        return LevelDifference({
            myLevel: higherLevel,
            lowerLevel: lowerLevel,
            difference: difference
        });
    }
    
    /**
     * @dev 获取前端显示格式
     */
    function getDisplayFormat(address user) 
        external 
        view 
        returns (
            string memory level,
            string memory performance,
            uint256[20] memory unlockedLevels,
            uint256 dynamicRate
        ) 
    {
        UserData storage data = userData[user];
        
        // 等级显示
        if (data.teamLevel == 0) level = "普通用户";
        else if (data.teamLevel == 1) level = "V1";
        else if (data.teamLevel == 2) level = "V2";
        else if (data.teamLevel == 3) level = "V3";
        else if (data.teamLevel == 4) level = "V4";
        else if (data.teamLevel == 5) level = "V5";
        else if (data.teamLevel == 6) level = "V6";
        
        // 业绩格式化
        if (data.teamVolume >= 1e24) {
            performance = string(abi.encodePacked(
                uint2str(data.teamVolume / 1e24), "M"
            ));
        } else if (data.teamVolume >= 1e21) {
            performance = string(abi.encodePacked(
                uint2str(data.teamVolume / 1e21), "K"
            ));
        } else {
            performance = uint2str(data.teamVolume / 1e18);
        }
        
        // 解锁代数
        for (uint256 i = 1; i <= 20; i++) {
            unlockedLevels[i-1] = levelUnlocked[user][i] ? 1 : 0;
        }
        
        // 动态收益率
        dynamicRate = calculateDynamicReward(user, 10000); // 基于1万计算百分比
    }
    
    // ============ 修正团队等级要求 ============
    
    /**
     * @dev 覆盖原有的团队等级检查（修正V4-V6要求）
     */
    function _checkTeamLevelRequirementsFixed(address user) internal view returns (bool) {
        UserData storage data = userData[user];
        
        // V1: 小区业绩2000
        if (data.teamLevel == 1) {
            return data.teamVolume >= V1_VOLUME;
        }
        // V2: 小区业绩2万 + 2个V1下级
        else if (data.teamLevel == 2) {
            return data.teamVolume >= V2_VOLUME && data.levelVCounts[1] >= 2;
        }
        // V3: 小区业绩10万 + 2个V2下级
        else if (data.teamLevel == 3) {
            return data.teamVolume >= V3_VOLUME && data.levelVCounts[2] >= 2;
        }
        // V4: 小区业绩50万 + 3个V3下级（修正）
        else if (data.teamLevel == 4) {
            return data.teamVolume >= V4_VOLUME && data.levelVCounts[3] >= 3;
        }
        // V5: 小区业绩300万 + 3个V4下级（修正）
        else if (data.teamLevel == 5) {
            return data.teamVolume >= V5_VOLUME && data.levelVCounts[4] >= 3;
        }
        // V6: 小区业绩2000万 + 3个V5下级（修正）
        else if (data.teamLevel == 6) {
            return data.teamVolume >= V6_VOLUME && data.levelVCounts[5] >= 3;
        }
        
        return false;
    }
    
    /**
     * @dev 应用团队奖励烧伤5%
     */
    function distributeTeamRewardsWithBurn(address user, uint256 teamOutput) 
        external 
        onlyAuthorized 
        notPaused 
    {
        UserData storage data = userData[user];
        
        if (data.teamLevel == 0 || teamOutput == 0) {
            return;
        }
        
        // 检查修正后的等级要求
        if (!_checkTeamLevelRequirementsFixed(user)) {
            return;
        }
        
        // 计算团队奖励
        uint256 reward = (teamOutput * config.teamRewardRates[data.teamLevel - 1]) / BASIS_POINTS;
        
        // 应用5%烧伤（实际扣除）
        uint256 burnAmount = (reward * 500) / BASIS_POINTS; // 5%烧伤
        uint256 actualReward = reward - burnAmount;
        
        // 执行烧伤
        if (burnAmount > 0 && address(burnContract) != address(0)) {
            burnContract.applyBurn(2, burnAmount, user); // 2 = 团队烧类型
        }
        
        // 记录奖励
        data.totalTeamReward += actualReward;
        
        emit RewardDistributed(user, actualReward, "team");
        emit BurnApplied(user, burnAmount, "team_5%");
    }
    
    // ============ 工具函数 ============
    
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    // ============ 管理函数 ============
    
    /**
     * @dev 设置动态配置（仅多签）
     */
    function setDynamicConfig(uint256 minRate, uint256 maxRate, bool enabled) 
        external 
        onlyMultiSig 
    {
        dynamicConfig.minRate = minRate;
        dynamicConfig.maxRate = maxRate;
        dynamicConfig.enabled = enabled;
    }
    
    /**
     * @dev 设置特定烧伤率（仅多签）
     */
    function setSpecificBurnRates(
        uint256 volatility,
        uint256 trading,
        uint256 timed
    ) external onlyMultiSig {
        specificBurnConfig.volatilityBurnRate = volatility;
        specificBurnConfig.tradingBurnRate = trading;
        specificBurnConfig.timedBurnRate = timed;
    }
    
    /**
     * @dev 更新用户日产出缓存
     */
    function updateUserDailyOutput(address user, uint256 output) 
        external 
        onlyAuthorized 
    {
        userDailyOutput[user] = output;
    }
}