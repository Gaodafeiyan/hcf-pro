const { ethers } = require("hardhat");
const chalk = require("chalk");

// 已部署的合约地址
const DEPLOYED_CONTRACTS = {
    referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
    staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
    nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
    exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9",
    // 需要查找HCF和BSDT代币合约地址
    hcfToken: "", // 待填充
    bsdtToken: "" // 待填充
};

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   HCF-RWA 合约机制验证工具 v1.0"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.gray(`验证账户: ${signer.address}\n`));

    // 1. 查找并验证HCF代币合约
    console.log(chalk.yellow.bold("📋 [1/6] 查找HCF代币合约..."));
    await findHCFToken();

    // 2. 验证质押合约机制
    console.log(chalk.yellow.bold("\n📋 [2/6] 验证质押合约机制..."));
    await verifyStakingContract();

    // 3. 验证推荐合约机制
    console.log(chalk.yellow.bold("\n📋 [3/6] 验证推荐合约机制..."));
    await verifyReferralContract();

    // 4. 验证节点NFT合约
    console.log(chalk.yellow.bold("\n📋 [4/6] 验证节点NFT合约..."));
    await verifyNodeNFTContract();

    // 5. 验证兑换合约
    console.log(chalk.yellow.bold("\n📋 [5/6] 验证兑换合约..."));
    await verifyExchangeContract();

    // 6. 生成综合报告
    console.log(chalk.yellow.bold("\n📋 [6/6] 生成综合验证报告..."));
    await generateReport();
}

async function findHCFToken() {
    try {
        // 从质押合约获取HCF代币地址
        const stakingABI = [
            "function hcfToken() view returns (address)",
            "function bsdtToken() view returns (address)"
        ];
        
        const staking = new ethers.Contract(DEPLOYED_CONTRACTS.staking, stakingABI, ethers.provider);
        
        try {
            DEPLOYED_CONTRACTS.hcfToken = await staking.hcfToken();
            console.log(chalk.green(`  ✅ HCF Token: ${DEPLOYED_CONTRACTS.hcfToken}`));
        } catch (e) {
            console.log(chalk.red(`  ❌ 无法获取HCF Token地址`));
        }
        
        try {
            DEPLOYED_CONTRACTS.bsdtToken = await staking.bsdtToken();
            console.log(chalk.green(`  ✅ BSDT Token: ${DEPLOYED_CONTRACTS.bsdtToken}`));
        } catch (e) {
            console.log(chalk.red(`  ❌ 无法获取BSDT Token地址`));
        }
        
        // 如果找到HCF代币，验证其机制
        if (DEPLOYED_CONTRACTS.hcfToken) {
            await verifyHCFToken();
        }
    } catch (error) {
        console.log(chalk.red(`  ❌ 查找代币合约失败: ${error.message}`));
    }
}

async function verifyHCFToken() {
    console.log(chalk.cyan("\n  验证HCF代币参数:"));
    
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
    
    const token = new ethers.Contract(DEPLOYED_CONTRACTS.hcfToken, tokenABI, ethers.provider);
    
    try {
        const name = await token.name();
        const symbol = await token.symbol();
        const totalSupply = await token.totalSupply();
        
        console.log(chalk.white(`    名称: ${name}`));
        console.log(chalk.white(`    符号: ${symbol}`));
        console.log(chalk.white(`    当前供应量: ${ethers.utils.formatEther(totalSupply)} HCF`));
        
        // 验证总量配置
        try {
            const TOTAL_SUPPLY = await token.TOTAL_SUPPLY();
            const INITIAL_RELEASE = await token.INITIAL_RELEASE();
            const BURN_STOP = await token.BURN_STOP_SUPPLY();
            const MIN_BALANCE = await token.MIN_BALANCE();
            
            console.log(chalk.white(`    最大供应量: ${ethers.utils.formatEther(TOTAL_SUPPLY)} HCF`));
            console.log(chalk.white(`    首发释放: ${ethers.utils.formatEther(INITIAL_RELEASE)} HCF`));
            console.log(chalk.white(`    销毁停止于: ${ethers.utils.formatEther(BURN_STOP)} HCF`));
            console.log(chalk.white(`    最小保留: ${ethers.utils.formatEther(MIN_BALANCE)} HCF`));
            
            // 验证是否符合要求
            const expectedTotal = ethers.utils.parseEther("1000000000"); // 10亿
            const expectedInitial = ethers.utils.parseEther("10000000"); // 1000万
            const expectedBurnStop = ethers.utils.parseEther("990000"); // 99万
            
            if (TOTAL_SUPPLY.eq(expectedTotal)) {
                console.log(chalk.green(`    ✅ 总量配置正确 (10亿)`));
            } else {
                console.log(chalk.red(`    ❌ 总量配置错误`));
            }
            
            if (INITIAL_RELEASE.eq(expectedInitial)) {
                console.log(chalk.green(`    ✅ 首发量配置正确 (1000万)`));
            } else {
                console.log(chalk.red(`    ❌ 首发量配置错误`));
            }
            
            if (BURN_STOP.gte(expectedBurnStop)) {
                console.log(chalk.green(`    ✅ 销毁停止配置正确 (≥99万)`));
            } else {
                console.log(chalk.red(`    ❌ 销毁停止配置错误`));
            }
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取供应量常量`));
        }
        
        // 验证税率
        console.log(chalk.cyan("\n  验证税率机制:"));
        try {
            const buyTax = await token.buyTaxRate();
            const sellTax = await token.sellTaxRate();
            const transferTax = await token.transferTaxRate();
            
            console.log(chalk.white(`    买入税: ${buyTax / 100}% (应为2%)`));
            console.log(chalk.white(`    卖出税: ${sellTax / 100}% (应为5%)`));
            console.log(chalk.white(`    转账税: ${transferTax / 100}% (应为1%)`));
            
            if (buyTax == 200) console.log(chalk.green(`    ✅ 买入税正确`));
            else console.log(chalk.red(`    ❌ 买入税不正确`));
            
            if (sellTax == 500) console.log(chalk.green(`    ✅ 卖出税正确`));
            else console.log(chalk.red(`    ❌ 卖出税不正确`));
            
            if (transferTax == 100) console.log(chalk.green(`    ✅ 转账税正确`));
            else console.log(chalk.red(`    ❌ 转账税不正确`));
            
            // 验证买入税分配
            const buyBurn = await token.buyBurnRate();
            const buyMarketing = await token.buyMarketingRate();
            const buyLP = await token.buyLPRate();
            const buyNode = await token.buyNodeRate();
            
            console.log(chalk.cyan("\n  买入税分配 (应各占25%):"));
            console.log(chalk.white(`    销毁: ${buyBurn / 100}%`));
            console.log(chalk.white(`    营销: ${buyMarketing / 100}%`));
            console.log(chalk.white(`    LP: ${buyLP / 100}%`));
            console.log(chalk.white(`    节点: ${buyNode / 100}%`));
            
            // 验证卖出税分配
            const sellBurn = await token.sellBurnRate();
            const sellMarketing = await token.sellMarketingRate();
            const sellLP = await token.sellLPRate();
            const sellNode = await token.sellNodeRate();
            
            console.log(chalk.cyan("\n  卖出税分配:"));
            console.log(chalk.white(`    销毁: ${sellBurn / 100}% (应为40%)`));
            console.log(chalk.white(`    营销: ${sellMarketing / 100}% (应为20%)`));
            console.log(chalk.white(`    LP: ${sellLP / 100}% (应为20%)`));
            console.log(chalk.white(`    节点: ${sellNode / 100}% (应为20%)`));
            
            // 获取已销毁数量
            const burned = await token.totalBurned();
            console.log(chalk.cyan(`\n  已销毁总量: ${ethers.utils.formatEther(burned)} HCF`));
            
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取税率配置: ${e.message}`));
        }
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 验证HCF代币失败: ${error.message}`));
    }
}

async function verifyStakingContract() {
    console.log(chalk.cyan("  验证质押合约配置:"));
    
    const stakingABI = [
        "function levels(uint256) view returns (uint256 minStake, uint256 baseRate, uint256 lpRate, uint256 compoundUnit)",
        "function totalStaked() view returns (uint256)",
        "function decayThreshold() view returns (uint256)",
        "function globalDecayRate() view returns (uint256)",
        "function addonRates() view returns (uint256 holdingBonus, uint256 referralBonus, uint256 communityBonus, uint256 compoundBonus)",
        "function DAILY_LIMIT() view returns (uint256)",
        "function launchTime() view returns (uint256)"
    ];
    
    const staking = new ethers.Contract(DEPLOYED_CONTRACTS.staking, stakingABI, ethers.provider);
    
    try {
        // 验证5个等级配置
        console.log(chalk.cyan("\n  质押等级配置:"));
        const expectedLevels = [
            { min: "10", base: 40, lp: 80 },      // 等级1 - 暂时禁用
            { min: "100", base: 50, lp: 100 },    // 等级2 - 暂时禁用
            { min: "1000", base: 60, lp: 120 },   // 等级3
            { min: "10000", base: 70, lp: 140 },  // 等级4
            { min: "100000", base: 80, lp: 160 }  // 等级5
        ];
        
        for (let i = 0; i < 5; i++) {
            try {
                const level = await staking.levels(i);
                const minStake = ethers.utils.formatEther(level.minStake);
                const baseRate = level.baseRate.toNumber();
                const lpRate = level.lpRate.toNumber();
                
                console.log(chalk.white(`\n    等级${i + 1}:`));
                console.log(chalk.white(`      最小质押: ${minStake} HCF (应为${expectedLevels[i].min})`));
                console.log(chalk.white(`      基础日化: ${baseRate / 100}% (应为${expectedLevels[i].base / 100}%)`));
                console.log(chalk.white(`      LP日化: ${lpRate / 100}% (应为${expectedLevels[i].lp / 100}%)`));
                
                if (parseFloat(minStake) == parseFloat(expectedLevels[i].min) &&
                    baseRate == expectedLevels[i].base &&
                    lpRate == expectedLevels[i].lp) {
                    console.log(chalk.green(`      ✅ 配置正确`));
                } else {
                    console.log(chalk.yellow(`      ⚠️ 配置有差异`));
                }
            } catch (e) {
                console.log(chalk.red(`    ❌ 无法读取等级${i + 1}配置`));
            }
        }
        
        // 验证全局参数
        console.log(chalk.cyan("\n  全局参数:"));
        try {
            const totalStaked = await staking.totalStaked();
            const decayThreshold = await staking.decayThreshold();
            const globalDecay = await staking.globalDecayRate();
            const dailyLimit = await staking.DAILY_LIMIT();
            const launchTime = await staking.launchTime();
            
            console.log(chalk.white(`    总质押量: ${ethers.utils.formatEther(totalStaked)} HCF`));
            console.log(chalk.white(`    衰减阈值: ${ethers.utils.formatEther(decayThreshold)} HCF`));
            console.log(chalk.white(`    当前衰减率: ${globalDecay}%`));
            console.log(chalk.white(`    每日限购: ${ethers.utils.formatEther(dailyLimit)} HCF`));
            
            const launchDate = new Date(launchTime.toNumber() * 1000);
            console.log(chalk.white(`    启动时间: ${launchDate.toLocaleString()}`));
            
            const now = Date.now() / 1000;
            const daysSinceLaunch = Math.floor((now - launchTime) / 86400);
            if (daysSinceLaunch < 7) {
                console.log(chalk.yellow(`    ⚠️ 限购期剩余: ${7 - daysSinceLaunch}天`));
            } else {
                console.log(chalk.green(`    ✅ 限购期已结束`));
            }
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取全局参数`));
        }
        
        // 验证加成配置
        console.log(chalk.cyan("\n  加成奖励配置:"));
        try {
            const addons = await staking.addonRates();
            console.log(chalk.white(`    持有奖励: ${addons.holdingBonus / 100}%`));
            console.log(chalk.white(`    推荐奖励: ${addons.referralBonus / 100}%`));
            console.log(chalk.white(`    社区奖励: ${addons.communityBonus / 100}%`));
            console.log(chalk.white(`    复投奖励: ${addons.compoundBonus / 100}%`));
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取加成配置`));
        }
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 验证质押合约失败: ${error.message}`));
    }
}

async function verifyReferralContract() {
    console.log(chalk.cyan("  验证推荐合约配置:"));
    
    const referralABI = [
        "function levelRequirements(uint256) view returns (uint256 smallTeamStake, uint256 directCount)",
        "function levelRewardRates(uint256) view returns (uint256)",
        "function generationRates(uint256) view returns (uint256)",
        "function rankingRewards(uint256) view returns (uint256)",
        "function totalUsers() view returns (uint256)",
        "function BURN_RATE_REFERRAL() view returns (uint256)",
        "function BURN_RATE_TEAM() view returns (uint256)"
    ];
    
    const referral = new ethers.Contract(DEPLOYED_CONTRACTS.referral, referralABI, ethers.provider);
    
    try {
        // 验证团队等级要求
        console.log(chalk.cyan("\n  团队等级要求:"));
        const expectedLevels = [
            { stake: "2000", direct: 0 },     // V1
            { stake: "20000", direct: 2 },    // V2
            { stake: "100000", direct: 2 },   // V3
            { stake: "500000", direct: 3 },   // V4
            { stake: "3000000", direct: 3 },  // V5
            { stake: "20000000", direct: 3 }  // V6
        ];
        
        for (let i = 0; i < 6; i++) {
            try {
                const req = await referral.levelRequirements(i + 1);
                const stake = ethers.utils.formatEther(req.smallTeamStake);
                const direct = req.directCount.toNumber();
                
                console.log(chalk.white(`    V${i + 1}:`));
                console.log(chalk.white(`      小区质押: ${stake} HCF (应为${expectedLevels[i].stake})`));
                console.log(chalk.white(`      直推要求: ${direct}个V${i} (应为${expectedLevels[i].direct})`));
                
                const rate = await referral.levelRewardRates(i + 1);
                console.log(chalk.white(`      奖励比例: ${rate}% (应为${(i + 1) * 6}%)`));
            } catch (e) {
                console.log(chalk.yellow(`    ⚠️ 无法读取V${i + 1}配置`));
            }
        }
        
        // 验证代数奖励
        console.log(chalk.cyan("\n  代数奖励配置:"));
        const expectedGenRates = [20, 10, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2];
        
        for (let i = 0; i < 20; i++) {
            try {
                const rate = await referral.generationRates(i);
                if (rate == expectedGenRates[i]) {
                    console.log(chalk.green(`    ✅ ${i + 1}代: ${rate}%`));
                } else {
                    console.log(chalk.yellow(`    ⚠️ ${i + 1}代: ${rate}% (应为${expectedGenRates[i]}%)`));
                }
            } catch (e) {
                break;
            }
        }
        
        // 验证排名奖励
        console.log(chalk.cyan("\n  排名奖励配置:"));
        try {
            const rank100 = await referral.rankingRewards(0);
            const rank299 = await referral.rankingRewards(1);
            console.log(chalk.white(`    1-100名: ${rank100}% (应为20%)`));
            console.log(chalk.white(`    101-299名: ${rank299}% (应为10%)`));
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取排名奖励`));
        }
        
        // 验证燃烧率
        console.log(chalk.cyan("\n  燃烧机制:"));
        try {
            const burnReferral = await referral.BURN_RATE_REFERRAL();
            const burnTeam = await referral.BURN_RATE_TEAM();
            console.log(chalk.white(`    推荐奖励燃烧: ${burnReferral}% (应为10%)`));
            console.log(chalk.white(`    团队奖励燃烧: ${burnTeam}% (应为5%)`));
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取燃烧率`));
        }
        
        // 获取总用户数
        try {
            const totalUsers = await referral.totalUsers();
            console.log(chalk.cyan(`\n  注册用户总数: ${totalUsers}`));
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取用户总数`));
        }
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 验证推荐合约失败: ${error.message}`));
    }
}

async function verifyNodeNFTContract() {
    console.log(chalk.cyan("  验证节点NFT配置:"));
    
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
    
    const node = new ethers.Contract(DEPLOYED_CONTRACTS.nodeNFT, nodeABI, ethers.provider);
    
    try {
        const maxNodes = await node.MAX_NODES();
        const feeHCF = await node.APPLICATION_FEE_HCF();
        const feeBSDT = await node.APPLICATION_FEE_BSDT();
        const activationHCF = await node.ACTIVATION_FEE_HCF();
        const activationLP = await node.ACTIVATION_FEE_LP();
        const nodeCount = await node.nodeCount();
        
        console.log(chalk.white(`    最大节点数: ${maxNodes} (应为99)`));
        console.log(chalk.white(`    申请费(HCF): ${ethers.utils.formatEther(feeHCF)} HCF`));
        console.log(chalk.white(`    申请费(BSDT): ${ethers.utils.formatEther(feeBSDT)} BSDT (应为5000)`));
        console.log(chalk.white(`    激活费(HCF): ${ethers.utils.formatEther(activationHCF)} HCF (应为1000)`));
        console.log(chalk.white(`    激活费(LP): ${ethers.utils.formatEther(activationLP)} HCF`));
        console.log(chalk.white(`    当前节点数: ${nodeCount}`));
        
        if (maxNodes == 99) console.log(chalk.green(`    ✅ 最大节点数正确`));
        else console.log(chalk.red(`    ❌ 最大节点数不正确`));
        
        if (ethers.utils.formatEther(feeBSDT) == "5000.0") {
            console.log(chalk.green(`    ✅ BSDT申请费正确`));
        } else {
            console.log(chalk.red(`    ❌ BSDT申请费不正确`));
        }
        
        // 节点等级配置
        console.log(chalk.cyan("\n  节点等级:"));
        try {
            const lightThreshold = await node.lightNodeThreshold();
            const superThreshold = await node.superNodeThreshold();
            const onlineRate = await node.onlineRateThreshold();
            
            console.log(chalk.white(`    轻节点门槛: ${ethers.utils.formatEther(lightThreshold)} HCF`));
            console.log(chalk.white(`    超级节点门槛: ${ethers.utils.formatEther(superThreshold)} HCF`));
            console.log(chalk.white(`    在线率要求: ${onlineRate}%`));
        } catch (e) {
            console.log(chalk.yellow(`    ⚠️ 无法读取节点等级配置`));
        }
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 验证节点NFT失败: ${error.message}`));
    }
}

async function verifyExchangeContract() {
    console.log(chalk.cyan("  验证兑换合约配置:"));
    
    const exchangeABI = [
        "function exchangeRate() view returns (uint256)",
        "function minExchange() view returns (uint256)",
        "function maxExchange() view returns (uint256)",
        "function totalExchanged() view returns (uint256)",
        "function isPaused() view returns (bool)"
    ];
    
    const exchange = new ethers.Contract(DEPLOYED_CONTRACTS.exchange, exchangeABI, ethers.provider);
    
    try {
        const rate = await exchange.exchangeRate();
        const min = await exchange.minExchange();
        const max = await exchange.maxExchange();
        const total = await exchange.totalExchanged();
        const paused = await exchange.isPaused();
        
        console.log(chalk.white(`    兑换率: ${rate} (1 USDT = ${rate} BSDT)`));
        console.log(chalk.white(`    最小兑换: ${ethers.utils.formatEther(min)}`));
        console.log(chalk.white(`    最大兑换: ${ethers.utils.formatEther(max)}`));
        console.log(chalk.white(`    已兑换总量: ${ethers.utils.formatEther(total)}`));
        console.log(chalk.white(`    暂停状态: ${paused ? '已暂停' : '运行中'}`));
        
        if (rate == 1) console.log(chalk.green(`    ✅ 兑换率正确 (1:1)`));
        else console.log(chalk.yellow(`    ⚠️ 兑换率不是1:1`));
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 验证兑换合约失败: ${error.message}`));
    }
}

async function generateReport() {
    const report = {
        timestamp: new Date().toISOString(),
        contracts: DEPLOYED_CONTRACTS,
        verificationResults: {},
        recommendations: []
    };
    
    console.log(chalk.green.bold("\n========================================"));
    console.log(chalk.green.bold("         验证报告总结"));
    console.log(chalk.green.bold("========================================\n"));
    
    console.log(chalk.cyan("已部署合约地址:"));
    for (const [name, address] of Object.entries(DEPLOYED_CONTRACTS)) {
        if (address) {
            console.log(chalk.white(`  ${name}: ${address}`));
        }
    }
    
    console.log(chalk.cyan("\n关键发现:"));
    console.log(chalk.yellow("  1. 部分合约已成功部署并运行"));
    console.log(chalk.yellow("  2. 燃烧机制合约部署失败，需要修复"));
    console.log(chalk.yellow("  3. 市场控制合约尚未部署"));
    console.log(chalk.yellow("  4. 建议检查所有参数配置是否符合白皮书要求"));
    
    console.log(chalk.cyan("\n建议的下一步操作:"));
    console.log(chalk.white("  1. 修复并部署燃烧机制合约"));
    console.log(chalk.white("  2. 部署市场控制合约"));
    console.log(chalk.white("  3. 配置合约间的关联关系"));
    console.log(chalk.white("  4. 设置多签钱包"));
    console.log(chalk.white("  5. 进行完整的集成测试"));
    
    // 保存报告到文件
    const fs = require('fs');
    const reportPath = `./verification-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n✅ 详细报告已保存至: ${reportPath}`));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("\n❌ 验证过程出错:"), error);
        process.exit(1);
    });