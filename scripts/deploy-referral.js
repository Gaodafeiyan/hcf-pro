const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📝 部署推荐系统合约"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    try {
        console.log(chalk.cyan("📝 部署 HCFReferral 合约..."));
        
        const HCFReferral = await ethers.getContractFactory("HCFReferral");
        const referral = await HCFReferral.deploy();
        
        await referral.deployed();
        
        console.log(chalk.green("✅ 推荐系统合约部署成功!"));
        console.log("合约地址:", chalk.yellow(referral.address));
        
        // 等待确认
        console.log("\n等待区块确认...");
        await referral.deployTransaction.wait(5);
        
        // 验证合约功能
        console.log(chalk.cyan("\n📊 验证合约功能:"));
        
        const owner = await referral.owner();
        console.log("合约Owner:", owner);
        
        // 测试注册功能
        console.log("\n测试注册功能...");
        const tx = await referral.register(ethers.constants.AddressZero);
        await tx.wait();
        console.log("✅ 注册功能正常");
        
        const isRegistered = await referral.isRegistered(deployer.address);
        console.log(`部署者注册状态: ${isRegistered ? "✅ 已注册" : "❌ 未注册"}`);
        
        // 保存部署信息
        const fs = require("fs");
        const deployInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: {
                HCFReferral: referral.address
            },
            deployer: deployer.address
        };
        
        fs.writeFileSync(
            "referral-deployment.json",
            JSON.stringify(deployInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ 推荐系统部署完成!"));
        
        console.log("\n功能说明:");
        console.log("  • 用户注册推荐关系");
        console.log("  • 追踪推荐链");
        console.log("  • 查询推荐人和被推荐人");
        console.log("  • 支持多级推荐查询");
        
        console.log(chalk.yellow("\n⚠️ 重要提醒:"));
        console.log("需要更新其他合约中的推荐合约地址:");
        console.log("- 团队奖励合约");
        console.log("- 20级推荐合约");
        console.log(`新地址: ${referral.address}`);
        
        return referral.address;
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green.bold("   🎉 部署成功!"));
        console.log(chalk.yellow.bold(`   合约地址: ${address}`));
        console.log(chalk.blue.bold("========================================\n"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });