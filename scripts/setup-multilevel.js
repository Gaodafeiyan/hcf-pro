const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 设置20级推荐奖励权限"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 已部署的合约地址
    const MULTILEVEL_ADDRESS = "0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6";
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
    
    try {
        const multiLevel = await ethers.getContractAt("HCFMultiLevelRewards", MULTILEVEL_ADDRESS);
        
        console.log(chalk.cyan("1️⃣ 设置质押合约为操作员..."));
        
        // 检查是否已经是操作员
        const isOperator = await multiLevel.operators(STAKING_ADDRESS);
        
        if (!isOperator) {
            console.log("设置操作员权限...");
            
            // 使用更低的gas价格
            const gasPrice = ethers.utils.parseUnits("1", "gwei");
            
            const tx = await multiLevel.setOperator(STAKING_ADDRESS, true, {
                gasPrice: gasPrice
            });
            
            console.log("交易哈希:", tx.hash);
            await tx.wait();
            console.log(chalk.green("✅ 操作员权限设置成功!"));
        } else {
            console.log(chalk.green("✅ 质押合约已经是操作员"));
        }
        
        console.log(chalk.cyan("\n2️⃣ 验证系统状态..."));
        
        // 验证状态
        const rewardsEnabled = await multiLevel.rewardsEnabled();
        const burnEnabled = await multiLevel.burnMechanismEnabled();
        const totalDistributed = await multiLevel.totalDistributed();
        
        console.log(`奖励系统: ${rewardsEnabled ? "✅ 开启" : "❌ 关闭"}`);
        console.log(`烧伤机制: ${burnEnabled ? "✅ 开启" : "❌ 关闭"}`);
        console.log(`总分发奖励: ${ethers.utils.formatEther(totalDistributed)} HCF`);
        
        // 验证合约地址
        const hcfToken = await multiLevel.hcfToken();
        const stakingContract = await multiLevel.stakingContract();
        const referralContract = await multiLevel.referralContract();
        
        console.log("\n关联合约:");
        console.log(`HCF Token: ${hcfToken}`);
        console.log(`Staking: ${stakingContract}`);
        console.log(`Referral: ${referralContract}`);
        
        console.log(chalk.green.bold("\n✅ 20级推荐奖励系统准备就绪!"));
        
        console.log(chalk.yellow("\n📝 保存合约地址..."));
        const fs = require("fs");
        const deploymentInfo = {
            MultiLevelRewards: MULTILEVEL_ADDRESS,
            deployedAt: new Date().toISOString(),
            network: "BSC Mainnet"
        };
        
        fs.writeFileSync(
            "multilevel-address.json",
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green("✅ 地址已保存"));
        
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