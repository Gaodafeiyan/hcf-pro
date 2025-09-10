const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 部署HCFRanking排名奖励系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    if (balance.lt(ethers.utils.parseEther("0.05"))) {
        console.log(chalk.red("❌ BNB余额不足，至少需要0.05 BNB"));
        return;
    }
    
    // 已部署的合约地址
    const contracts = {
        HCF_TOKEN: "0xc5c3f24a212838968759045d1654d3643016d585",
        STAKING: "0x209d3d4f8ab55cd678d736957abc139f157753fe",
        REFERRAL: "0x7fBc3bB1e4943f44CF158703B045a1198c99C405"
    };
    
    try {
        console.log(chalk.cyan("1️⃣ 部署HCFRanking合约...\n"));
        
        const HCFRanking = await ethers.getContractFactory("HCFRanking");
        
        // 部署参数：HCF代币地址，多签钱包（暂时用部署者地址）
        const ranking = await HCFRanking.deploy(
            contracts.HCF_TOKEN,
            deployer.address,  // 多签钱包地址，后续可更改
            {
                gasPrice: ethers.utils.parseUnits("1", "gwei"),
                gasLimit: 5000000
            }
        );
        
        console.log("交易哈希:", ranking.deployTransaction.hash);
        console.log("等待确认...");
        
        await ranking.deployed();
        console.log(chalk.green("✅ HCFRanking已部署:", ranking.address));
        
        // 等待区块确认
        console.log(chalk.cyan("\n2️⃣ 等待3个区块确认..."));
        await ranking.deployTransaction.wait(3);
        console.log(chalk.green("✅ 已确认"));
        
        // 设置关联合约
        console.log(chalk.cyan("\n3️⃣ 配置关联合约..."));
        
        const tx1 = await ranking.setContracts(
            contracts.STAKING,
            contracts.REFERRAL,
            ethers.constants.AddressZero, // 销毁合约暂时不设置
            {gasPrice: ethers.utils.parseUnits("1", "gwei")}
        );
        console.log("设置合约地址交易:", tx1.hash);
        await tx1.wait();
        console.log(chalk.green("✅ 已设置关联合约"));
        
        // 授权质押合约
        console.log(chalk.cyan("\n4️⃣ 授权质押合约..."));
        const tx2 = await ranking.setAuthorizedContract(
            contracts.STAKING,
            true,
            {gasPrice: ethers.utils.parseUnits("1", "gwei")}
        );
        console.log("授权交易:", tx2.hash);
        await tx2.wait();
        console.log(chalk.green("✅ 已授权"));
        
        // 验证配置
        console.log(chalk.cyan("\n5️⃣ 验证配置..."));
        const config = await ranking.getConfig();
        console.log("排名配置:");
        console.log("  Top100奖励:", config.top100Bonus.toNumber() / 100, "%");
        console.log("  Top299奖励:", config.top299Bonus.toNumber() / 100, "%");
        console.log("  更新间隔:", config.updateInterval.toNumber() / 3600, "小时");
        console.log("  状态:", config.enabled ? "已启用" : "未启用");
        
        // 保存部署信息
        const deploymentInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            HCFRanking: ranking.address,
            config: {
                top100Bonus: "20%",
                top299Bonus: "10%",
                updateInterval: "24小时",
                enabled: true
            },
            relatedContracts: contracts,
            deployer: deployer.address
        };
        
        fs.writeFileSync(
            "ranking-deployment.json",
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ HCFRanking部署成功!"));
        console.log(chalk.cyan("\n部署信息:"));
        console.log("合约地址:", ranking.address);
        console.log("部署者:", deployer.address);
        
        console.log(chalk.yellow("\n⚠️ 重要: 请更新其他合约以集成排名系统"));
        console.log("1. 质押合约需要调用排名更新");
        console.log("2. 用户需要通过前端查看排名");
        console.log("3. 定期调用updateRanking()更新排名");
        
        return ranking.address;
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green.bold("   🎉 排名系统部署完成!"));
        console.log(chalk.green.bold(`   地址: ${address}`));
        console.log(chalk.blue.bold("========================================\n"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });