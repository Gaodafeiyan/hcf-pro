const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 设置团队奖励权限"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 已部署的合约地址
    const TEAM_REWARDS_ADDRESS = "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6";
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
    
    try {
        const teamRewards = await ethers.getContractAt("HCFTeamRewards", TEAM_REWARDS_ADDRESS);
        
        console.log(chalk.cyan("1️⃣ 设置质押合约为操作员..."));
        
        // 检查是否已经是操作员
        const isOperator = await teamRewards.operators(STAKING_ADDRESS);
        
        if (!isOperator) {
            console.log("设置操作员权限...");
            
            // 使用更低的gas价格
            const gasPrice = ethers.utils.parseUnits("1", "gwei");
            
            const tx = await teamRewards.setOperator(STAKING_ADDRESS, true, {
                gasPrice: gasPrice
            });
            
            console.log("交易哈希:", tx.hash);
            await tx.wait();
            console.log(chalk.green("✅ 操作员权限设置成功!"));
        } else {
            console.log(chalk.green("✅ 质押合约已经是操作员"));
        }
        
        console.log(chalk.cyan("\n2️⃣ 验证合约状态..."));
        
        // 验证烧伤机制
        const burnEnabled = await teamRewards.burnEnabled();
        console.log(`烧伤机制: ${burnEnabled ? "✅ 开启" : "❌ 关闭"}`);
        
        // 验证合约地址设置
        const hcfToken = await teamRewards.hcfToken();
        const stakingContract = await teamRewards.stakingContract();
        const referralContract = await teamRewards.referralContract();
        
        console.log("\n关联合约:");
        console.log(`HCF Token: ${hcfToken}`);
        console.log(`Staking: ${stakingContract}`);
        console.log(`Referral: ${referralContract}`);
        
        console.log(chalk.green.bold("\n✅ 团队奖励系统准备就绪!"));
        
        console.log(chalk.yellow("\n📝 保存合约地址..."));
        const fs = require("fs");
        const deploymentInfo = {
            TeamRewards: TEAM_REWARDS_ADDRESS,
            deployedAt: new Date().toISOString(),
            network: "BSC Mainnet"
        };
        
        fs.writeFileSync(
            "team-rewards-address.json",
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green("✅ 地址已保存到 team-rewards-address.json"));
        
    } catch (error) {
        console.error(chalk.red("\n❌ 操作失败:"), error.message);
        
        if (error.message.includes("insufficient funds")) {
            const balance = await deployer.getBalance();
            console.log(chalk.yellow("\n当前余额:"), ethers.utils.formatEther(balance), "BNB");
            console.log(chalk.yellow("建议充值 0.01 BNB 到:"), deployer.address);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });