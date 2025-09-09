const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🎯 部署20级推荐奖励系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    // 现有合约地址
    const HCF_ADDRESS = "0xc5c3f24a212838968759045d1654d3643016d585";
    const REFERRAL_ADDRESS = "0xea0e87adfdad8b27e967287f7f6ad8a491d88e4f";
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
    
    try {
        console.log(chalk.cyan("📝 部署 HCFMultiLevelRewards 合约..."));
        
        const HCFMultiLevelRewards = await ethers.getContractFactory("HCFMultiLevelRewards");
        const multiLevelRewards = await HCFMultiLevelRewards.deploy(
            HCF_ADDRESS,
            REFERRAL_ADDRESS,
            STAKING_ADDRESS
        );
        
        await multiLevelRewards.deployed();
        
        console.log(chalk.green("✅ 20级推荐奖励合约部署成功!"));
        console.log("合约地址:", chalk.yellow(multiLevelRewards.address));
        
        // 等待确认
        console.log("\n等待区块确认...");
        await multiLevelRewards.deployTransaction.wait(5);
        
        // 验证配置
        console.log(chalk.cyan("\n📊 验证20级奖励配置:"));
        
        // 显示前10级配置
        for (let i = 1; i <= 10; i++) {
            const config = await multiLevelRewards.levelConfigs(i);
            console.log(`\n第${i}层:`);
            console.log(`  奖励比例: ${config.rewardRate / 100}%`);
            console.log(`  最小质押: ${ethers.utils.formatEther(config.minStakeRequired)} HCF`);
            console.log(`  烧伤保护: ${config.burnProtection ? "✅" : "❌"}`);
        }
        
        console.log("\n... (11-20层配置已设置，奖励递减)");
        
        // 设置操作权限
        console.log(chalk.cyan("\n🔧 设置操作权限..."));
        
        // 将质押合约设为操作员
        const tx1 = await multiLevelRewards.setOperator(STAKING_ADDRESS, true);
        await tx1.wait();
        console.log("✅ 质押合约已设为操作员");
        
        // 保存部署信息
        const fs = require("fs");
        const deployInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: {
                HCFMultiLevelRewards: multiLevelRewards.address
            },
            config: {
                HCF: HCF_ADDRESS,
                Referral: REFERRAL_ADDRESS,
                Staking: STAKING_ADDRESS
            },
            features: {
                levels: 20,
                maxReward: "10%",
                minReward: "0.6%",
                burnProtection: "1-10层",
                minStake: "100-5000 HCF"
            }
        };
        
        fs.writeFileSync(
            "multilevel-rewards-deployment.json",
            JSON.stringify(deployInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ 20级推荐奖励系统部署完成!"));
        
        console.log("\n奖励分配规则:");
        console.log("  • 第1层: 10% (需质押100 HCF)");
        console.log("  • 第2层: 8% (需质押100 HCF)");
        console.log("  • 第3层: 6% (需质押200 HCF)");
        console.log("  • 第4层: 5% (需质押300 HCF)");
        console.log("  • 第5层: 4% (需质押500 HCF)");
        console.log("  • 第6-10层: 3%-2.2% (需质押1000 HCF)");
        console.log("  • 第11-15层: 2%-1.2% (需质押2000 HCF)");
        console.log("  • 第16-20层: 1%-0.6% (需质押5000 HCF)");
        
        console.log(chalk.yellow("\n⚠️ 特性说明:"));
        console.log("  1. 烧伤机制 - 前10层上级质押必须≥下级");
        console.log("  2. 质押门槛 - 随层级递增");
        console.log("  3. 奖励递减 - 深度越深奖励越少");
        console.log("  4. 防循环 - 自动检测循环推荐");
        
        return multiLevelRewards.address;
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green.bold("   🎉 部署成功完成!"));
        console.log(chalk.yellow.bold(`   合约地址: ${address}`));
        console.log(chalk.blue.bold("========================================\n"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });