const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🏆 部署团队奖励合约 V1-V6"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    // 现有合约地址
    const HCF_ADDRESS = "0xc5c3f24a212838968759045d1654d3643016d585";
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe"; 
    const REFERRAL_ADDRESS = "0xea0e87adfdad8b27e967287f7f6ad8a491d88e4f";
    
    try {
        console.log(chalk.cyan("📝 部署 HCFTeamRewards 合约..."));
        
        const HCFTeamRewards = await ethers.getContractFactory("HCFTeamRewards");
        const teamRewards = await HCFTeamRewards.deploy(
            HCF_ADDRESS,
            STAKING_ADDRESS,
            REFERRAL_ADDRESS
        );
        
        await teamRewards.deployed();
        
        console.log(chalk.green("✅ 团队奖励合约部署成功!"));
        console.log("合约地址:", chalk.yellow(teamRewards.address));
        
        // 等待确认
        console.log("\n等待区块确认...");
        await teamRewards.deployTransaction.wait(5);
        
        // 验证团队等级配置
        console.log(chalk.cyan("\n📊 验证团队等级配置:"));
        
        for (let i = 1; i <= 6; i++) {
            const level = await teamRewards.teamLevels(i);
            console.log(`\nV${i} 等级要求:`);
            console.log(`  小区最小质押: ${ethers.utils.formatEther(level.minStake)} HCF`);
            console.log(`  奖励比例: ${level.rewardRate.toNumber() / 100}%`);
            if (level.requiredSubTeams > 0) {
                console.log(`  需要子团队数: ${level.requiredSubTeams} 个 V${level.requiredLevel}`);
            }
        }
        
        // 设置操作权限
        console.log(chalk.cyan("\n🔧 设置操作权限..."));
        
        // 将质押合约设为操作员
        const tx1 = await teamRewards.setOperator(STAKING_ADDRESS, true);
        await tx1.wait();
        console.log("✅ 质押合约已设为操作员");
        
        // 保存部署信息
        const fs = require("fs");
        const deployInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: {
                HCFTeamRewards: teamRewards.address
            },
            config: {
                HCF: HCF_ADDRESS,
                Staking: STAKING_ADDRESS,
                Referral: REFERRAL_ADDRESS
            }
        };
        
        fs.writeFileSync(
            "team-rewards-deployment.json",
            JSON.stringify(deployInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ 团队奖励系统部署完成!"));
        console.log("\n功能说明:");
        console.log("  • V1: 小区2000 HCF, 奖励6%");
        console.log("  • V2: 2个V1 + 小区2万 HCF, 奖励12%");
        console.log("  • V3: 2个V2 + 小区10万 HCF, 奖励18%");
        console.log("  • V4: 3个V3 + 小区50万 HCF, 奖励24%");
        console.log("  • V5: 3个V4 + 小区300万 HCF, 奖励30%");
        console.log("  • V6: 3个V5 + 小区2000万 HCF, 奖励36%");
        
        console.log(chalk.yellow("\n⚠️ 注意事项:"));
        console.log("  1. 包含烧伤机制 - 上级质押必须≥下级");
        console.log("  2. 小区业绩 = 总业绩 - 最大区业绩");
        console.log("  3. 需要集成到质押合约才能自动分发奖励");
        
        return teamRewards.address;
        
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