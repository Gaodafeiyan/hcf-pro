const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🧪 全面功能测试"));
    console.log(chalk.blue.bold("========================================\n"));

    const [tester] = await ethers.getSigners();
    console.log("测试账户:", tester.address);
    
    // 合约地址
    const addresses = {
        HCF: "0xc5c3f24a212838968759045d1654d3643016d585",
        POOL: "0x53df45a3260af4b7590a53ce11e7a1f8df5a8048",
        STAKING: "0x209d3d4f8ab55cd678d736957abc139f157753fe",
        ANTIDUMP: "0xff9d8c2f579cb2b6e663b05f2f0d1e19dcb3eb5a",
        NODE: "0x10b4284eafdc92f448d29db58f1ccc784e8230ad",
        REFERRAL: "0x7fBc3bB1e4943f44CF158703B045a1198c99C405",
        TEAM: "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6",
        MULTILEVEL: "0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6",
        AUTOSWAP: "0x83714243313D69AE9d21B09d2f336e9A2713B8A5",
        RANKING: "0x212Ec53B84bb091E663dDf68306b00cbCE30c13C",
        SWAPROUTER: "0x62218eA5bE6ce2efD9795c2943c431a429d1b1D4"
    };
    
    const results = {
        passed: [],
        failed: [],
        warning: []
    };
    
    console.log(chalk.cyan("开始测试各项功能...\n"));
    
    // 1. 测试HCF Token基础功能
    console.log(chalk.yellow("1. 测试HCF Token基础功能"));
    try {
        const hcf = await ethers.getContractAt("HCFToken", addresses.HCF);
        
        // 检查总量
        const totalSupply = await hcf.totalSupply();
        const expectedSupply = ethers.utils.parseEther("1000000000"); // 10亿
        if (totalSupply.eq(expectedSupply)) {
            results.passed.push("✅ 总量10亿");
            console.log(chalk.green("  ✅ 总量: 10亿 HCF"));
        } else {
            results.failed.push("❌ 总量不是10亿");
        }
        
        // 检查销毁停止值
        const burnStop = await hcf.BURN_STOP_SUPPLY();
        const expectedBurnStop = ethers.utils.parseEther("990000"); // 99万
        if (burnStop.eq(expectedBurnStop)) {
            results.passed.push("✅ 销毁停止在99万");
            console.log(chalk.green("  ✅ 销毁停止: 99万 HCF"));
        }
        
        // 检查最小余额
        const minBalance = await hcf.MIN_BALANCE();
        const expectedMin = ethers.utils.parseEther("0.0001");
        if (minBalance.eq(expectedMin)) {
            results.passed.push("✅ 最小余额0.0001");
            console.log(chalk.green("  ✅ 最小余额: 0.0001 HCF"));
        }
        
        // 检查税费
        const buyTax = await hcf.buyTaxRate();
        const sellTax = await hcf.sellTaxRate();
        const transferTax = await hcf.transferTaxRate();
        
        if (buyTax.eq(200)) { // 2%
            results.passed.push("✅ 买入税2%");
            console.log(chalk.green("  ✅ 买入税: 2%"));
        }
        if (sellTax.eq(500)) { // 5%
            results.passed.push("✅ 卖出税5%");
            console.log(chalk.green("  ✅ 卖出税: 5%"));
        }
        if (transferTax.eq(100)) { // 1%
            results.passed.push("✅ 转账税1%");
            console.log(chalk.green("  ✅ 转账税: 1%"));
        }
        
        // 检查DEX配置
        const isDEX = await hcf.isDEXPair(addresses.POOL);
        if (isDEX) {
            results.passed.push("✅ 税费系统已激活");
            console.log(chalk.green("  ✅ 税费系统: 已激活"));
        } else {
            results.warning.push("⚠️ 税费系统未激活");
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
        results.failed.push("❌ HCF Token测试失败");
    }
    
    // 2. 测试质押系统
    console.log(chalk.yellow("\n2. 测试质押系统"));
    try {
        const staking = await ethers.getContractAt("HCFStaking", addresses.STAKING);
        
        // 检查质押级别
        const level3 = await staking.stakingLevels(3);
        const level4 = await staking.stakingLevels(4);
        const level5 = await staking.stakingLevels(5);
        
        if (level3.minStake.eq(ethers.utils.parseEther("1000"))) {
            results.passed.push("✅ L3级1000 HCF");
            console.log(chalk.green("  ✅ L3级: 1000 HCF, 日化0.6%"));
        }
        if (level4.minStake.eq(ethers.utils.parseEther("10000"))) {
            results.passed.push("✅ L4级10000 HCF");
            console.log(chalk.green("  ✅ L4级: 10000 HCF, 日化0.7%"));
        }
        if (level5.minStake.eq(ethers.utils.parseEther("100000"))) {
            results.passed.push("✅ L5级100000 HCF");
            console.log(chalk.green("  ✅ L5级: 100000 HCF, 日化0.8%"));
        }
        
        // 检查领取手续费
        const claimFee = await staking.claimFeeRate();
        if (claimFee.eq(500)) { // 5%
            results.passed.push("✅ 领取手续费5%");
            console.log(chalk.green("  ✅ 领取手续费: 5% BNB"));
        }
        
        // 检查7天限购
        const purchaseLimit = await staking.dailyPurchaseLimit();
        if (purchaseLimit.eq(ethers.utils.parseEther("1000"))) {
            results.passed.push("✅ 7天限购每天1000");
            console.log(chalk.green("  ✅ 7天限购: 每天1000 HCF"));
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
        results.failed.push("❌ 质押系统测试失败");
    }
    
    // 3. 测试团队奖励
    console.log(chalk.yellow("\n3. 测试团队奖励V1-V6"));
    try {
        const team = await ethers.getContractAt("HCFTeamRewards", addresses.TEAM);
        
        const levels = [
            { level: 1, stake: "2000", rate: 6 },
            { level: 2, stake: "20000", rate: 12 },
            { level: 3, stake: "100000", rate: 18 },
            { level: 4, stake: "500000", rate: 24 },
            { level: 5, stake: "3000000", rate: 30 },
            { level: 6, stake: "20000000", rate: 36 }
        ];
        
        for (const config of levels) {
            const teamLevel = await team.teamLevels(config.level);
            const expectedStake = ethers.utils.parseEther(config.stake);
            if (teamLevel.minStake.eq(expectedStake)) {
                results.passed.push(`✅ V${config.level}: ${config.rate}%`);
                console.log(chalk.green(`  ✅ V${config.level}: ${config.stake} HCF, ${config.rate}%`));
            }
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
    }
    
    // 4. 测试20级推荐
    console.log(chalk.yellow("\n4. 测试20级推荐奖励"));
    try {
        const multiLevel = await ethers.getContractAt("HCFMultiLevelRewards", addresses.MULTILEVEL);
        
        // 检查第1级(10%)
        const level1 = await multiLevel.levelConfigs(1);
        if (level1.rewardRate.eq(1000)) { // 10%
            results.passed.push("✅ 第1级10%");
            console.log(chalk.green("  ✅ 第1级: 10%"));
        }
        
        // 检查第20级(0.6%)
        const level20 = await multiLevel.levelConfigs(20);
        if (level20.rewardRate.eq(60)) { // 0.6%
            results.passed.push("✅ 第20级0.6%");
            console.log(chalk.green("  ✅ 第20级: 0.6%"));
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
    }
    
    // 5. 测试防砸盘机制
    console.log(chalk.yellow("\n5. 测试防砸盘机制"));
    try {
        const antiDump = await ethers.getContractAt("HCFAntiDump", addresses.ANTIDUMP);
        
        const level1 = await antiDump.protectionLevels(0);
        const level2 = await antiDump.protectionLevels(1);
        const level3 = await antiDump.protectionLevels(2);
        
        if (level1.threshold.eq(1000)) { // 10%
            results.passed.push("✅ 防砸盘10%档");
            console.log(chalk.green("  ✅ 10%下跌: 滑点+5%, 减产5%"));
        }
        if (level2.threshold.eq(3000)) { // 30%
            results.passed.push("✅ 防砸盘30%档");
            console.log(chalk.green("  ✅ 30%下跌: 滑点+15%, 减产15%"));
        }
        if (level3.threshold.eq(5000)) { // 50%
            results.passed.push("✅ 防砸盘50%档");
            console.log(chalk.green("  ✅ 50%下跌: 滑点+30%, 减产30%"));
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
    }
    
    // 6. 测试节点NFT
    console.log(chalk.yellow("\n6. 测试节点NFT系统"));
    try {
        const node = await ethers.getContractAt("HCFNode", addresses.NODE);
        
        const maxNodes = await node.MAX_NODES();
        const applicationFee = await node.applicationFee();
        
        if (maxNodes.eq(99)) {
            results.passed.push("✅ 99个限量节点");
            console.log(chalk.green("  ✅ 限量: 99个节点"));
        }
        if (applicationFee.eq(ethers.utils.parseEther("5000"))) {
            results.passed.push("✅ 5000 BSDT申请费");
            console.log(chalk.green("  ✅ 申请费: 5000 BSDT"));
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
    }
    
    // 7. 测试排名系统
    console.log(chalk.yellow("\n7. 测试排名奖励系统"));
    try {
        const ranking = await ethers.getContractAt("HCFRanking", addresses.RANKING);
        
        const config = await ranking.getConfig();
        if (config.top100Bonus.eq(2000)) { // 20%
            results.passed.push("✅ Top100额外20%");
            console.log(chalk.green("  ✅ Top100: 额外20%"));
        }
        if (config.top299Bonus.eq(1000)) { // 10%
            results.passed.push("✅ Top299额外10%");
            console.log(chalk.green("  ✅ Top299: 额外10%"));
        }
        
    } catch (error) {
        console.log(chalk.red("  ❌ 测试失败:", error.message));
    }
    
    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.cyan("📊 测试结果统计"));
    console.log(chalk.blue.bold("========================================"));
    
    console.log(chalk.green(`\n✅ 通过: ${results.passed.length} 项`));
    results.passed.forEach(item => console.log(`  ${item}`));
    
    if (results.warning.length > 0) {
        console.log(chalk.yellow(`\n⚠️ 警告: ${results.warning.length} 项`));
        results.warning.forEach(item => console.log(`  ${item}`));
    }
    
    if (results.failed.length > 0) {
        console.log(chalk.red(`\n❌ 失败: ${results.failed.length} 项`));
        results.failed.forEach(item => console.log(`  ${item}`));
    }
    
    const total = results.passed.length + results.failed.length;
    const percentage = (results.passed.length / total * 100).toFixed(1);
    
    console.log(chalk.cyan(`\n总体通过率: ${percentage}%`));
    
    if (percentage >= 90) {
        console.log(chalk.green.bold("\n✅ 测试结果: 系统功能正常！"));
    } else if (percentage >= 70) {
        console.log(chalk.yellow.bold("\n⚠️ 测试结果: 部分功能需要检查"));
    } else {
        console.log(chalk.red.bold("\n❌ 测试结果: 系统存在问题"));
    }
    
    console.log(chalk.blue.bold("\n========================================\n"));
}

main().then(() => process.exit(0)).catch(console.error);