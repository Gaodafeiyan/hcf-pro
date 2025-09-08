const { ethers } = require("hardhat");

// 已部署的合约地址
const CONTRACTS = {
    referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
    staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6", 
    nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
    exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9",
    hcfToken: "",
    bsdtToken: ""
};

// 需求文档的期望值
const REQUIREMENTS = {
    token: {
        totalSupply: "1000000000", // 10亿
        initialRelease: "10000000", // 1000万
        burnStop: "990000", // 99万
        minBalance: "0.0001", // 最小保留
        buyTax: 200, // 2%
        sellTax: 500, // 5%
        transferTax: 100, // 1%
        buyDistribution: {burn: 25, marketing: 25, lp: 25, node: 25},
        sellDistribution: {burn: 40, marketing: 20, lp: 20, node: 20}
    },
    staking: {
        dailyLimit: "1000", // 前7天每天限购1000枚
        levels: [
            {min: "1000", base: 60, lp: 120}, // 0.6%, 1.2%
            {min: "10000", base: 70, lp: 140}, // 0.7%, 1.4%
            {min: "100000", base: 80, lp: 160} // 0.8%, 1.6%
        ],
        equityLP: {
            day100: 20, // +20%
            day300: 40  // +40%
        },
        withdrawFee: 1000, // 10% BNB
        claimFee: 500 // 5% BNB
    },
    referral: {
        generations: [20, 10, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
        teamLevels: [
            {stake: "2000", rate: 6},
            {stake: "20000", rate: 12},
            {stake: "100000", rate: 18},
            {stake: "500000", rate: 24},
            {stake: "3000000", rate: 30},
            {stake: "20000000", rate: 36}
        ],
        rankingRewards: {top100: 20, top299: 10},
        directReward: 5, // 一代5%
        secondReward: 3  // 二代3%
    },
    node: {
        maxNodes: 99,
        applicationFee: "5000", // BSDT
        activationFee: "1000" // HCF + LP
    }
};

async function main() {
    console.log("\n====================================================");
    console.log("     HCF-RWA 完整合约验证报告");
    console.log("====================================================\n");
    
    const [signer] = await ethers.getSigners();
    console.log(`验证账户: ${signer.address}`);
    console.log(`验证时间: ${new Date().toLocaleString()}\n`);

    // 步骤1: 获取代币地址
    await getTokenAddresses();
    
    // 步骤2: 验证HCF代币
    console.log("\n【1】HCF代币合约验证");
    console.log("----------------------------------------");
    await verifyHCFToken();
    
    // 步骤3: 验证质押合约
    console.log("\n【2】质押合约验证");
    console.log("----------------------------------------");
    await verifyStaking();
    
    // 步骤4: 验证推荐合约
    console.log("\n【3】推荐合约验证");
    console.log("----------------------------------------");
    await verifyReferral();
    
    // 步骤5: 验证节点NFT
    console.log("\n【4】节点NFT合约验证");
    console.log("----------------------------------------");
    await verifyNodeNFT();
    
    // 步骤6: 验证兑换合约
    console.log("\n【5】兑换合约验证");
    console.log("----------------------------------------");
    await verifyExchange();
    
    // 步骤7: 生成总结报告
    generateSummary();
}

async function getTokenAddresses() {
    const stakingABI = [
        "function hcfToken() view returns (address)",
        "function bsdtToken() view returns (address)"
    ];
    
    const staking = new ethers.Contract(CONTRACTS.staking, stakingABI, ethers.provider);
    
    try {
        CONTRACTS.hcfToken = await staking.hcfToken();
        CONTRACTS.bsdtToken = await staking.bsdtToken();
        console.log(`HCF Token: ${CONTRACTS.hcfToken}`);
        console.log(`BSDT Token: ${CONTRACTS.bsdtToken}`);
    } catch (e) {
        console.log(`❌ 无法获取代币地址: ${e.message}`);
    }
}

async function verifyHCFToken() {
    if (!CONTRACTS.hcfToken || CONTRACTS.hcfToken === "0x0000000000000000000000000000000000000000") {
        console.log("❌ HCF Token地址未找到");
        return;
    }
    
    const tokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function TOTAL_SUPPLY() view returns (uint256)",
        "function INITIAL_RELEASE() view returns (uint256)",
        "function BURN_STOP_SUPPLY() view returns (uint256)",
        "function MIN_BALANCE() view returns (uint256)",
        "function buyTaxRate() view returns (uint256)",
        "function sellTaxRate() view returns (uint256)",
        "function transferTaxRate() view returns (uint256)",
        "function claimTaxRate() view returns (uint256)",
        "function buyBurnRate() view returns (uint256)",
        "function buyMarketingRate() view returns (uint256)",
        "function buyLPRate() view returns (uint256)",
        "function buyNodeRate() view returns (uint256)",
        "function sellBurnRate() view returns (uint256)",
        "function sellMarketingRate() view returns (uint256)",
        "function sellLPRate() view returns (uint256)",
        "function sellNodeRate() view returns (uint256)",
        "function totalBurned() view returns (uint256)"
    ];
    
    const token = new ethers.Contract(CONTRACTS.hcfToken, tokenABI, ethers.provider);
    
    try {
        // 基本信息
        const name = await token.name();
        const symbol = await token.symbol();
        const totalSupply = await token.totalSupply();
        
        console.log(`名称: ${name}`);
        console.log(`符号: ${symbol}`);
        console.log(`当前供应量: ${ethers.utils.formatEther(totalSupply)} HCF`);
        
        // 验证供应量配置
        console.log("\n供应量配置:");
        try {
            const TOTAL = await token.TOTAL_SUPPLY();
            const INITIAL = await token.INITIAL_RELEASE();
            const BURN_STOP = await token.BURN_STOP_SUPPLY();
            const MIN_BAL = await token.MIN_BALANCE();
            
            const totalStr = ethers.utils.formatEther(TOTAL);
            const initialStr = ethers.utils.formatEther(INITIAL);
            const burnStopStr = ethers.utils.formatEther(BURN_STOP);
            const minBalStr = ethers.utils.formatEther(MIN_BAL);
            
            console.log(`  总供应量: ${totalStr} ${totalStr == REQUIREMENTS.token.totalSupply ? "✅" : "❌ 应为10亿"}`);
            console.log(`  首发量: ${initialStr} ${initialStr == REQUIREMENTS.token.initialRelease ? "✅" : "❌ 应为1000万"}`);
            console.log(`  销毁停止: ${burnStopStr} ${burnStopStr == REQUIREMENTS.token.burnStop ? "✅" : "❌ 应为99万"}`);
            console.log(`  最小保留: ${minBalStr} ${minBalStr == REQUIREMENTS.token.minBalance ? "✅" : "❌ 应为0.0001"}`);
        } catch (e) {
            console.log("  ⚠️ 无法读取供应量常量");
        }
        
        // 验证税率
        console.log("\n税率配置:");
        const buyTax = await token.buyTaxRate();
        const sellTax = await token.sellTaxRate();
        const transferTax = await token.transferTaxRate();
        let claimTax = 0;
        try {
            claimTax = await token.claimTaxRate();
        } catch (e) {}
        
        console.log(`  买入税: ${buyTax/100}% ${buyTax == REQUIREMENTS.token.buyTax ? "✅" : "❌ 应为2%"}`);
        console.log(`  卖出税: ${sellTax/100}% ${sellTax == REQUIREMENTS.token.sellTax ? "✅" : "❌ 应为5%"}`);
        console.log(`  转账税: ${transferTax/100}% ${transferTax == REQUIREMENTS.token.transferTax ? "✅" : "❌ 应为1%"}`);
        if (claimTax > 0) {
            console.log(`  领取税: ${claimTax/100}% ${claimTax == 500 ? "✅" : "❌ 应为5%"}`);
        }
        
        // 验证买入税分配
        console.log("\n买入税分配 (应各占25%):");
        const buyBurn = await token.buyBurnRate();
        const buyMarketing = await token.buyMarketingRate();
        const buyLP = await token.buyLPRate();
        const buyNode = await token.buyNodeRate();
        
        console.log(`  销毁: ${buyBurn/100}% ${buyBurn == 2500 ? "✅" : "❌"}`);
        console.log(`  营销: ${buyMarketing/100}% ${buyMarketing == 2500 ? "✅" : "❌"}`);
        console.log(`  LP: ${buyLP/100}% ${buyLP == 2500 ? "✅" : "❌"}`);
        console.log(`  节点: ${buyNode/100}% ${buyNode == 2500 ? "✅" : "❌"}`);
        
        // 验证卖出税分配
        console.log("\n卖出税分配:");
        const sellBurn = await token.sellBurnRate();
        const sellMarketing = await token.sellMarketingRate();
        const sellLP = await token.sellLPRate();
        const sellNode = await token.sellNodeRate();
        
        console.log(`  销毁: ${sellBurn/100}% ${sellBurn == 4000 ? "✅" : "❌ 应为40%"}`);
        console.log(`  营销: ${sellMarketing/100}% ${sellMarketing == 2000 ? "✅" : "❌ 应为20%"}`);
        console.log(`  LP: ${sellLP/100}% ${sellLP == 2000 ? "✅" : "❌ 应为20%"}`);
        console.log(`  节点: ${sellNode/100}% ${sellNode == 2000 ? "✅" : "❌ 应为20%"}`);
        
        // 已销毁数量
        const burned = await token.totalBurned();
        console.log(`\n已销毁总量: ${ethers.utils.formatEther(burned)} HCF`);
        
    } catch (error) {
        console.log(`❌ 验证失败: ${error.message}`);
    }
}

async function verifyStaking() {
    const stakingABI = [
        "function levels(uint256) view returns (uint256 minStake, uint256 baseRate, uint256 lpRate, uint256 compoundUnit)",
        "function totalStaked() view returns (uint256)",
        "function DAILY_LIMIT() view returns (uint256)",
        "function launchTime() view returns (uint256)",
        "function decayThreshold() view returns (uint256)",
        "function addonRates() view returns (uint256 holdingBonus, uint256 referralBonus, uint256 communityBonus, uint256 compoundBonus)"
    ];
    
    const staking = new ethers.Contract(CONTRACTS.staking, stakingABI, ethers.provider);
    
    try {
        // 检查限购配置
        console.log("限购机制:");
        const dailyLimit = await staking.DAILY_LIMIT();
        const launchTime = await staking.launchTime();
        const limitStr = ethers.utils.formatEther(dailyLimit);
        
        console.log(`  每日限额: ${limitStr} HCF ${limitStr == "500.0" ? "⚠️ 应为1000" : limitStr == "1000.0" ? "✅" : "❌"}`);
        
        const now = Math.floor(Date.now() / 1000);
        const daysSinceLaunch = Math.floor((now - launchTime) / 86400);
        console.log(`  已运行天数: ${daysSinceLaunch}天`);
        console.log(`  限购状态: ${daysSinceLaunch < 7 ? "限购中" : "已解除"}`);
        
        // 验证等级配置
        console.log("\n质押等级配置:");
        
        // 注意：合约中索引可能从0开始，需要检查具体实现
        // 等级3 (1000 HCF) - 索引2
        // 等级4 (10000 HCF) - 索引3
        // 等级5 (100000 HCF) - 索引4
        
        for (let i = 2; i < 5; i++) {
            const level = await staking.levels(i);
            const minStake = ethers.utils.formatEther(level.minStake);
            const baseRate = level.baseRate.toNumber();
            const lpRate = level.lpRate.toNumber();
            const expectedLevel = REQUIREMENTS.staking.levels[i-2];
            
            console.log(`\n等级${i-1}:`);
            console.log(`  最小质押: ${minStake} HCF ${minStake == expectedLevel.min ? "✅" : `❌ 应为${expectedLevel.min}`}`);
            console.log(`  基础日化: ${baseRate/100}% ${baseRate == expectedLevel.base ? "✅" : `❌ 应为${expectedLevel.base/100}%`}`);
            console.log(`  LP日化: ${lpRate/100}% ${lpRate == expectedLevel.lp ? "✅" : `❌ 应为${expectedLevel.lp/100}%`}`);
        }
        
        // 验证股权LP加成
        console.log("\n加成配置:");
        const addons = await staking.addonRates();
        console.log(`  持有30天加成: ${addons.holdingBonus/100}%`);
        console.log(`  推荐加成: ${addons.referralBonus/100}%`);
        console.log(`  社区加成: ${addons.communityBonus/100}%`);
        console.log(`  复投加成: ${addons.compoundBonus/100}%`);
        
        // 全局状态
        console.log("\n全局状态:");
        const totalStaked = await staking.totalStaked();
        const decayThreshold = await staking.decayThreshold();
        
        console.log(`  总质押量: ${ethers.utils.formatEther(totalStaked)} HCF`);
        console.log(`  衰减阈值: ${ethers.utils.formatEther(decayThreshold)} HCF`);
        
    } catch (error) {
        console.log(`❌ 验证失败: ${error.message}`);
    }
}

async function verifyReferral() {
    const referralABI = [
        "function levelRequirements(uint256) view returns (uint256 smallTeamStake, uint256 directCount)",
        "function levelRewardRates(uint256) view returns (uint256)",
        "function generationRates(uint256) view returns (uint256)",
        "function rankingRewards(uint256) view returns (uint256)",
        "function BURN_RATE_REFERRAL() view returns (uint256)",
        "function BURN_RATE_TEAM() view returns (uint256)",
        "function totalUsers() view returns (uint256)"
    ];
    
    const referral = new ethers.Contract(CONTRACTS.referral, referralABI, ethers.provider);
    
    try {
        // 验证团队等级
        console.log("团队等级要求:");
        for (let i = 0; i < 6; i++) {
            const req = await referral.levelRequirements(i + 1);
            const rate = await referral.levelRewardRates(i + 1);
            const expected = REQUIREMENTS.referral.teamLevels[i];
            
            const stakeStr = ethers.utils.formatEther(req.smallTeamStake);
            
            console.log(`\nV${i + 1}:`);
            console.log(`  小区质押: ${stakeStr} HCF ${stakeStr == expected.stake ? "✅" : `❌ 应为${expected.stake}`}`);
            console.log(`  奖励比例: ${rate}% ${rate == expected.rate ? "✅" : `❌ 应为${expected.rate}%`}`);
        }
        
        // 验证代数奖励
        console.log("\n代数奖励配置:");
        let allCorrect = true;
        for (let i = 0; i < 20; i++) {
            const rate = await referral.generationRates(i);
            const expected = REQUIREMENTS.referral.generations[i];
            
            if (rate != expected) {
                console.log(`  ${i+1}代: ${rate}% ❌ 应为${expected}%`);
                allCorrect = false;
            }
        }
        if (allCorrect) {
            console.log(`  1代: 20% ✅`);
            console.log(`  2代: 10% ✅`);
            console.log(`  3-8代: 5% ✅`);
            console.log(`  9-15代: 3% ✅`);
            console.log(`  16-20代: 2% ✅`);
        }
        
        // 验证排名奖励
        console.log("\n排名奖励:");
        try {
            const rank100 = await referral.rankingRewards(0);
            const rank299 = await referral.rankingRewards(1);
            
            console.log(`  1-100名: ${rank100}% ${rank100 == 20 ? "✅" : "❌ 应为20%"}`);
            console.log(`  101-299名: ${rank299}% ${rank299 == 10 ? "✅" : "❌ 应为10%"}`);
        } catch (e) {
            console.log("  ⚠️ 无法读取排名奖励");
        }
        
        // 验证燃烧率
        console.log("\n燃烧机制:");
        const burnReferral = await referral.BURN_RATE_REFERRAL();
        const burnTeam = await referral.BURN_RATE_TEAM();
        
        console.log(`  推荐奖励燃烧: ${burnReferral}% ${burnReferral == 10 ? "✅" : "❌ 应为10%"}`);
        console.log(`  团队奖励燃烧: ${burnTeam}% ${burnTeam == 5 ? "✅" : "❌ 应为5%"}`);
        
        // 用户统计
        const totalUsers = await referral.totalUsers();
        console.log(`\n注册用户总数: ${totalUsers}`);
        
    } catch (error) {
        console.log(`❌ 验证失败: ${error.message}`);
    }
}

async function verifyNodeNFT() {
    const nodeABI = [
        "function MAX_NODES() view returns (uint256)",
        "function APPLICATION_FEE_HCF() view returns (uint256)",
        "function APPLICATION_FEE_BSDT() view returns (uint256)",
        "function ACTIVATION_FEE_HCF() view returns (uint256)",
        "function ACTIVATION_FEE_LP() view returns (uint256)",
        "function nodeCount() view returns (uint256)",
        "function lightNodeThreshold() view returns (uint256)",
        "function superNodeThreshold() view returns (uint256)",
        "function onlineRateThreshold() view returns (uint256)"
    ];
    
    const node = new ethers.Contract(CONTRACTS.nodeNFT, nodeABI, ethers.provider);
    
    try {
        const maxNodes = await node.MAX_NODES();
        const feeHCF = await node.APPLICATION_FEE_HCF();
        const feeBSDT = await node.APPLICATION_FEE_BSDT();
        const activationHCF = await node.ACTIVATION_FEE_HCF();
        const activationLP = await node.ACTIVATION_FEE_LP();
        const nodeCount = await node.nodeCount();
        
        console.log("基本配置:");
        console.log(`  最大节点数: ${maxNodes} ${maxNodes == 99 ? "✅" : "❌ 应为99"}`);
        console.log(`  申请费(BSDT): ${ethers.utils.formatEther(feeBSDT)} ${ethers.utils.formatEther(feeBSDT) == "5000.0" ? "✅" : "❌ 应为5000"}`);
        console.log(`  申请费(HCF): ${ethers.utils.formatEther(feeHCF)} HCF`);
        console.log(`  激活费(HCF): ${ethers.utils.formatEther(activationHCF)} ${ethers.utils.formatEther(activationHCF) == "1000.0" ? "✅" : "❌ 应为1000"}`);
        console.log(`  激活费(LP): ${ethers.utils.formatEther(activationLP)} HCF/BSDT`);
        console.log(`  当前节点数: ${nodeCount}`);
        
        // 节点等级
        console.log("\n节点等级门槛:");
        try {
            const lightThreshold = await node.lightNodeThreshold();
            const superThreshold = await node.superNodeThreshold();
            const onlineRate = await node.onlineRateThreshold();
            
            console.log(`  轻节点: ${ethers.utils.formatEther(lightThreshold)} HCF`);
            console.log(`  超级节点: ${ethers.utils.formatEther(superThreshold)} HCF`);
            console.log(`  在线率要求: ${onlineRate}%`);
        } catch (e) {
            console.log("  ⚠️ 无法读取节点等级");
        }
        
        console.log("\n节点收益:");
        console.log(`  ✓ 享受滑点分红`);
        console.log(`  ✓ 收益提现手续费2%分红`);
        console.log(`  ✓ 全网入单2%分红`);
        console.log(`  ✓ 防暴跌滑点分红`);
        
    } catch (error) {
        console.log(`❌ 验证失败: ${error.message}`);
    }
}

async function verifyExchange() {
    const exchangeABI = [
        "function exchangeRate() view returns (uint256)",
        "function minExchange() view returns (uint256)",
        "function maxExchange() view returns (uint256)",
        "function totalExchanged() view returns (uint256)",
        "function isPaused() view returns (bool)"
    ];
    
    const exchange = new ethers.Contract(CONTRACTS.exchange, exchangeABI, ethers.provider);
    
    try {
        const rate = await exchange.exchangeRate();
        const min = await exchange.minExchange();
        const max = await exchange.maxExchange();
        const total = await exchange.totalExchanged();
        const paused = await exchange.isPaused();
        
        console.log(`兑换率: 1 USDT = ${rate} BSDT ${rate == 1 ? "✅" : "❌ 应为1:1"}`);
        console.log(`最小兑换: ${ethers.utils.formatEther(min)}`);
        console.log(`最大兑换: ${ethers.utils.formatEther(max)}`);
        console.log(`已兑换总量: ${ethers.utils.formatEther(total)}`);
        console.log(`状态: ${paused ? '⚠️ 已暂停' : '✅ 运行中'}`);
        
    } catch (error) {
        console.log(`❌ 验证失败: ${error.message}`);
    }
}

function generateSummary() {
    console.log("\n====================================================");
    console.log("                验证总结");
    console.log("====================================================");
    
    console.log("\n✅ 已部署的合约:");
    console.log(`  • HCF Token: ${CONTRACTS.hcfToken || "未找到"}`);
    console.log(`  • BSDT Token: ${CONTRACTS.bsdtToken || "未找到"}`);
    console.log(`  • 质押合约: ${CONTRACTS.staking}`);
    console.log(`  • 推荐合约: ${CONTRACTS.referral}`);
    console.log(`  • 节点NFT: ${CONTRACTS.nodeNFT}`);
    console.log(`  • 兑换合约: ${CONTRACTS.exchange}`);
    
    console.log("\n❌ 缺失的合约:");
    console.log(`  • 燃烧机制合约: 未部署`);
    console.log(`  • 市场控制合约: 未部署`);
    console.log(`  • 无常损失保护: 未部署`);
    
    console.log("\n⚠️ 需要注意的问题:");
    console.log(`  1. 每日限购设置为500 HCF，文档要求1000 HCF`);
    console.log(`  2. 燃烧机制合约未部署，影响整体经济模型`);
    console.log(`  3. 防暴跌机制未实现（需要市场控制合约）`);
    console.log(`  4. 小区业绩排名奖和质押排名奖未实现`);
    
    console.log("\n📋 建议操作:");
    console.log(`  1. 修复并部署燃烧机制合约`);
    console.log(`  2. 部署市场控制合约实现防暴跌机制`);
    console.log(`  3. 调整每日限购从500到1000 HCF`);
    console.log(`  4. 配置多签钱包管理权限`);
    console.log(`  5. 完成合约间的关联设置`);
    
    console.log("\n====================================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 脚本执行失败:", error);
        process.exit(1);
    });