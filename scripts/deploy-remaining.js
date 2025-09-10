const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📦 部署剩余合约"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    const deployedContracts = {};
    
    try {
        // 1. 部署推荐系统
        console.log(chalk.cyan("1️⃣ 部署推荐系统..."));
        const HCFReferral = await ethers.getContractFactory("HCFReferral");
        const referral = await HCFReferral.deploy();
        await referral.deployed();
        deployedContracts.Referral = referral.address;
        console.log("✅ 推荐系统:", referral.address);
        
        // 2. 部署排行榜系统
        console.log(chalk.cyan("\n2️⃣ 部署排行榜系统..."));
        const HCFRanking = await ethers.getContractFactory("HCFRanking");
        const ranking = await HCFRanking.deploy();
        await ranking.deployed();
        deployedContracts.Ranking = ranking.address;
        console.log("✅ 排行榜:", ranking.address);
        
        // 3. 部署治理系统
        console.log(chalk.cyan("\n3️⃣ 部署治理系统..."));
        const HCF_TOKEN = "0xc5c3f24a212838968759045d1654d3643016d585";
        const HCFGovernance = await ethers.getContractFactory("HCFGovernance");
        const governance = await HCFGovernance.deploy(HCF_TOKEN);
        await governance.deployed();
        deployedContracts.Governance = governance.address;
        console.log("✅ 治理系统:", governance.address);
        
        // 等待确认
        console.log(chalk.cyan("\n⏳ 等待区块确认..."));
        await referral.deployTransaction.wait(3);
        await ranking.deployTransaction.wait(3);
        await governance.deployTransaction.wait(3);
        
        // 保存部署信息
        const fs = require("fs");
        const deployInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
            deployer: deployer.address
        };
        
        fs.writeFileSync(
            "remaining-contracts.json",
            JSON.stringify(deployInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ 所有合约部署完成!"));
        
        console.log("\n部署的合约:");
        console.log("1. 推荐系统:", deployedContracts.Referral);
        console.log("2. 排行榜:", deployedContracts.Ranking);
        console.log("3. 治理系统:", deployedContracts.Governance);
        
        console.log(chalk.yellow("\n⚠️ 下一步:"));
        console.log("1. 更新其他合约中的推荐合约地址");
        console.log("2. 设置必要的权限");
        console.log("3. 初始化合约参数");
        
        return deployedContracts;
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        
        if (deployedContracts.Referral) {
            console.log(chalk.yellow("\n已部署的合约:"));
            for (const [name, address] of Object.entries(deployedContracts)) {
                console.log(`${name}: ${address}`);
            }
        }
        
        throw error;
    }
}

main()
    .then((contracts) => {
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green.bold("   🎉 系统部署100%完成!"));
        console.log(chalk.blue.bold("========================================\n"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });