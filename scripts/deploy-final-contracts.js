const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📦 部署最后的合约"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    // 已部署的合约地址
    const HCF_TOKEN = "0xc5c3f24a212838968759045d1654d3643016d585";
    
    const deployedContracts = {};
    
    try {
        // 1. 部署推荐系统
        console.log(chalk.cyan("1️⃣ 部署推荐系统..."));
        const HCFReferral = await ethers.getContractFactory("HCFReferral");
        
        // 推荐合约需要HCF代币地址和多签钱包地址（暂时用部署者地址）
        const referral = await HCFReferral.deploy(
            HCF_TOKEN,
            deployer.address  // 多签钱包地址，后续可以更改
        );
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
        
        // 等待确认
        console.log(chalk.cyan("\n⏳ 等待区块确认..."));
        await referral.deployTransaction.wait(3);
        await ranking.deployTransaction.wait(3);
        
        // 保存部署信息
        const fs = require("fs");
        const deployInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
            deployer: deployer.address,
            note: "推荐系统和排行榜"
        };
        
        fs.writeFileSync(
            "final-contracts.json",
            JSON.stringify(deployInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ 合约部署完成!"));
        
        console.log("\n部署的合约:");
        console.log("1. 推荐系统:", deployedContracts.Referral);
        console.log("2. 排行榜:", deployedContracts.Ranking);
        
        // 更新其他合约中的推荐地址
        console.log(chalk.yellow("\n⚠️ 重要: 需要更新其他合约的推荐地址"));
        console.log("团队奖励和20级推荐合约需要使用新的推荐合约地址:");
        console.log(chalk.yellow(deployedContracts.Referral));
        
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
        console.log(chalk.green.bold("   🎉 部署完成!"));
        console.log(chalk.green.bold("   推荐系统和排行榜已部署"));
        console.log(chalk.blue.bold("========================================\n"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });