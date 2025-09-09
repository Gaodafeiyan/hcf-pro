const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   部署缺失功能补充合约"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`部署账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    // 已部署的合约
    const existingContracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55"
    };

    const deployedContracts = {};

    // 1. 部署排名奖励合约
    console.log(chalk.yellow.bold("【1】部署排名奖励合约..."));
    try {
        const RankingRewards = await ethers.getContractFactory("HCFRanking");
        const ranking = await RankingRewards.deploy(
            existingContracts.hcfToken,
            existingContracts.staking
        );
        await ranking.deployed();
        deployedContracts.ranking = ranking.address;
        console.log(chalk.green(`✅ 排名奖励合约: ${ranking.address}`));
        
        // 设置排名奖励比例
        console.log(chalk.gray("  设置排名奖励..."));
        
        // 小区业绩排名
        await ranking.setCommunityRankingRewards(20, 10); // 1-100名20%, 101-299名10%
        console.log(chalk.green("  ✅ 小区业绩排名奖已设置"));
        
        // 质押排名
        await ranking.setStakingRankingRewards(20, 15, 10); // 100内20%, 101-500内15%, 501-2000内10%
        console.log(chalk.green("  ✅ 质押排名奖已设置"));
        
    } catch (e) {
        console.log(chalk.red(`❌ 排名奖励部署失败: ${e.message}`));
    }

    // 2. 部署无常损失保护合约
    console.log(chalk.yellow.bold("\n【2】部署无常损失保护..."));
    try {
        const ImpermanentLoss = await ethers.getContractFactory("HCFImpermanentLossProtection");
        const ilProtection = await ImpermanentLoss.deploy(
            existingContracts.hcfToken,
            existingContracts.staking
        );
        await ilProtection.deployed();
        deployedContracts.ilProtection = ilProtection.address;
        console.log(chalk.green(`✅ 无常损失保护: ${ilProtection.address}`));
        
    } catch (e) {
        console.log(chalk.red(`❌ 无常损失保护部署失败: ${e.message}`));
    }

    // 3. 部署多签钱包
    console.log(chalk.yellow.bold("\n【3】部署多签钱包..."));
    try {
        const MultiSig = await ethers.getContractFactory("MultiSigWallet");
        
        // 设置多签管理员（需要至少2个地址）
        const owners = [
            deployer.address,
            // 添加其他管理员地址
            "0x0000000000000000000000000000000000000001" // 示例地址，需要替换
        ];
        const requiredConfirmations = 2; // 需要2个签名
        
        const multiSig = await MultiSig.deploy(owners, requiredConfirmations);
        await multiSig.deployed();
        deployedContracts.multiSig = multiSig.address;
        console.log(chalk.green(`✅ 多签钱包: ${multiSig.address}`));
        console.log(chalk.gray(`  管理员: ${owners.length}个`));
        console.log(chalk.gray(`  需要签名: ${requiredConfirmations}个`));
        
    } catch (e) {
        console.log(chalk.red(`❌ 多签钱包部署失败: ${e.message}`));
        console.log(chalk.yellow("  提示: 可以使用Gnosis Safe作为替代"));
    }

    // 4. 更新质押合约配置（如果有权限）
    console.log(chalk.yellow.bold("\n【4】更新质押合约配置..."));
    try {
        const stakingABI = [
            "function owner() view returns (address)",
            "function setWithdrawFees(uint256,uint256,uint256) external",
            "function setRankingContract(address) external"
        ];
        
        const staking = new ethers.Contract(existingContracts.staking, stakingABI, deployer);
        const owner = await staking.owner();
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            // 设置赎回费用
            console.log(chalk.gray("  设置赎回费用..."));
            await staking.setWithdrawFees(
                1000,  // 普通赎回10% BNB
                5000,  // LP赎回50% BSDT
                3000   // 未达标额外销毁30%
            );
            console.log(chalk.green("  ✅ 赎回费用已设置"));
            
            // 关联排名合约
            if (deployedContracts.ranking) {
                await staking.setRankingContract(deployedContracts.ranking);
                console.log(chalk.green("  ✅ 已关联排名合约"));
            }
        } else {
            console.log(chalk.yellow("  ⚠️ 没有权限更新质押合约"));
        }
    } catch (e) {
        console.log(chalk.yellow(`  ⚠️ 无法更新质押合约: ${e.message}`));
    }

    // 5. 在HCF Token设置多签
    if (deployedContracts.multiSig) {
        console.log(chalk.yellow.bold("\n【5】设置多签钱包到HCF Token..."));
        try {
            const tokenABI = [
                "function owner() view returns (address)",
                "function setMultiSigWallet(address) external"
            ];
            
            const token = new ethers.Contract(existingContracts.hcfToken, tokenABI, deployer);
            const owner = await token.owner();
            
            if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                await token.setMultiSigWallet(deployedContracts.multiSig);
                console.log(chalk.green("✅ 多签钱包已设置到HCF Token"));
            } else {
                console.log(chalk.yellow("  ⚠️ 没有权限设置多签"));
            }
        } catch (e) {
            console.log(chalk.yellow(`  ⚠️ 无法设置多签: ${e.message}`));
        }
    }

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         部署总结"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.cyan("新部署的合约:"));
    for (const [name, address] of Object.entries(deployedContracts)) {
        console.log(chalk.green(`  ${name}: ${address}`));
    }

    console.log(chalk.cyan("\n建议的后续操作:"));
    console.log(chalk.white("1. 添加流动性到PancakeSwap"));
    console.log(chalk.white("2. 配置100万HCF + 10万BSDT底池"));
    console.log(chalk.white("3. 锁定流动性10年"));
    console.log(chalk.white("4. 在BSCScan验证所有合约"));
    console.log(chalk.white("5. 配置多签管理员"));
    
    // 保存结果
    const fs = require('fs');
    const result = {
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        newContracts: deployedContracts,
        existingContracts: existingContracts,
        recommendations: [
            "Add liquidity to PancakeSwap",
            "Configure 1M HCF + 100K BSDT pool",
            "Lock liquidity for 10 years",
            "Verify contracts on BSCScan",
            "Configure multi-sig admins"
        ]
    };
    
    fs.writeFileSync('./missing-features-deployment.json', JSON.stringify(result, null, 2));
    console.log(chalk.green("\n📄 部署结果已保存到 missing-features-deployment.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });