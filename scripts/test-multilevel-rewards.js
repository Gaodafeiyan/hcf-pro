const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🧪 测试20级推荐奖励系统"));
    console.log(chalk.blue.bold("========================================\n"));

    // 合约地址 - 部署后需要更新
    const MULTILEVEL_ADDRESS = ""; // 部署后填入
    const REFERRAL_ADDRESS = "0xea0e87adfdad8b27e967287f7f6ad8a491d88e4f";
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
    
    if (!MULTILEVEL_ADDRESS) {
        console.log(chalk.red("❌ 请先部署20级推荐合约并填入地址"));
        return;
    }
    
    const [deployer] = await ethers.getSigners();
    
    try {
        const multiLevel = await ethers.getContractAt("HCFMultiLevelRewards", MULTILEVEL_ADDRESS);
        const referral = await ethers.getContractAt("HCFReferral", REFERRAL_ADDRESS);
        
        const testUser = deployer.address;
        console.log("测试用户:", testUser);
        
        console.log(chalk.cyan("\n1️⃣ 检查20级配置..."));
        console.log("\n层级 | 奖励率 | 最小质押 | 烧伤保护");
        console.log("-".repeat(50));
        
        for (let i = 1; i <= 20; i++) {
            const config = await multiLevel.levelConfigs(i);
            const rate = config.rewardRate / 100;
            const minStake = ethers.utils.formatEther(config.minStakeRequired);
            const burn = config.burnProtection ? "✅" : "❌";
            
            console.log(`L${i.toString().padStart(2, '0')}  | ${rate.toString().padStart(5, ' ')}% | ${minStake.padStart(8, ' ')} HCF | ${burn}`);
        }
        
        console.log(chalk.cyan("\n2️⃣ 获取推荐链..."));
        const result = await multiLevel.getUserReferralChain(testUser);
        const chain = result.chain;
        const length = result.length;
        
        console.log(`推荐链长度: ${length}`);
        if (length > 0) {
            console.log("\n推荐链:");
            for (let i = 0; i < length && i < 5; i++) {
                console.log(`  第${i+1}层: ${chain[i]}`);
            }
            if (length > 5) {
                console.log(`  ... 还有${length - 5}层`);
            }
        }
        
        console.log(chalk.cyan("\n3️⃣ 计算潜在奖励..."));
        const baseAmount = ethers.utils.parseEther("1000");
        const potentialRewards = await multiLevel.calculatePotentialRewards(testUser, baseAmount);
        
        let totalPotential = ethers.BigNumber.from(0);
        console.log("\n基础金额: 1000 HCF");
        console.log("各层潜在奖励:");
        
        for (let i = 0; i < 20; i++) {
            if (potentialRewards[i].gt(0)) {
                const reward = ethers.utils.formatEther(potentialRewards[i]);
                console.log(`  第${i+1}层: ${reward} HCF`);
                totalPotential = totalPotential.add(potentialRewards[i]);
            }
        }
        
        console.log(`\n总潜在奖励: ${ethers.utils.formatEther(totalPotential)} HCF`);
        
        console.log(chalk.cyan("\n4️⃣ 查询用户奖励信息..."));
        const userInfo = await multiLevel.userRewards(testUser);
        console.log(`总奖励: ${ethers.utils.formatEther(userInfo.totalRewards)} HCF`);
        console.log(`未领取: ${ethers.utils.formatEther(userInfo.unclaimedRewards)} HCF`);
        console.log(`已领取: ${ethers.utils.formatEther(userInfo.claimedRewards)} HCF`);
        
        // 获取各层级奖励
        const levelRewards = await multiLevel.getUserLevelRewards(testUser);
        if (levelRewards.length > 0) {
            console.log("\n各层获得的奖励:");
            for (let i = 0; i < levelRewards.length; i++) {
                if (levelRewards[i].gt(0)) {
                    console.log(`  第${i+1}层: ${ethers.utils.formatEther(levelRewards[i])} HCF`);
                }
            }
        }
        
        console.log(chalk.cyan("\n5️⃣ 系统状态..."));
        const totalDistributed = await multiLevel.totalDistributed();
        const rewardsEnabled = await multiLevel.rewardsEnabled();
        const burnEnabled = await multiLevel.burnMechanismEnabled();
        
        console.log(`总分发奖励: ${ethers.utils.formatEther(totalDistributed)} HCF`);
        console.log(`奖励系统: ${rewardsEnabled ? "✅ 开启" : "❌ 关闭"}`);
        console.log(`烧伤机制: ${burnEnabled ? "✅ 开启" : "❌ 关闭"}`);
        
        console.log(chalk.green.bold("\n✅ 测试完成!"));
        
        console.log(chalk.yellow("\n💡 系统特点:"));
        console.log("1. 20层深度推荐，奖励从10%递减到0.6%");
        console.log("2. 前10层启用烧伤保护");
        console.log("3. 质押门槛随层级递增");
        console.log("4. 自动防止循环推荐");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 测试失败:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });