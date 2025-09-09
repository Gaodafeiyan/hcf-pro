const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   部署剩余功能"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`部署账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    // 已部署的合约
    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D"
    };

    // 检查是否有足够的gas
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.log(chalk.red("❌ BNB余额不足，建议至少0.1 BNB"));
        return;
    }

    console.log(chalk.cyan("📋 需要部署/配置的功能：\n"));

    // 1. 配置赎回机制
    console.log(chalk.yellow.bold("【1】配置赎回机制"));
    console.log(chalk.white("  需求:"));
    console.log(chalk.gray("  • 普通赎回扣10% BNB"));
    console.log(chalk.gray("  • LP赎回扣50% BSDT"));
    console.log(chalk.gray("  • 未达标额外销毁30%"));
    
    try {
        const stakingABI = [
            "function owner() view returns (address)",
            "function setWithdrawFees(uint256,uint256,uint256) external"
        ];
        
        const staking = new ethers.Contract(contracts.staking, stakingABI, deployer);
        const owner = await staking.owner();
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log(chalk.cyan("  配置赎回费用..."));
            const tx = await staking.setWithdrawFees(
                1000,  // 10% 普通赎回
                5000,  // 50% LP赎回
                3000,  // 30% 额外销毁
                { gasLimit: 100000, gasPrice: ethers.utils.parseUnits("5", "gwei") }
            );
            await tx.wait();
            console.log(chalk.green("  ✅ 赎回机制已配置"));
        } else {
            console.log(chalk.yellow("  ⚠️ 你不是质押合约Owner，无法配置"));
        }
    } catch (e) {
        console.log(chalk.red(`  ❌ 配置失败: ${e.message}`));
    }

    // 2. 配置领取收益手续费
    console.log(chalk.yellow.bold("\n【2】配置领取收益手续费"));
    console.log(chalk.white("  需求: 5% BNB手续费"));
    
    try {
        const tokenABI = [
            "function owner() view returns (address)",
            "function setClaimTaxRate(uint256) external"
        ];
        
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, deployer);
        const owner = await token.owner();
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log(chalk.cyan("  设置领取手续费..."));
            const tx = await token.setClaimTaxRate(
                500,  // 5%
                { gasLimit: 50000, gasPrice: ethers.utils.parseUnits("5", "gwei") }
            );
            await tx.wait();
            console.log(chalk.green("  ✅ 领取手续费已设置为5%"));
        } else {
            console.log(chalk.yellow("  ⚠️ 你不是Token Owner，无法配置"));
        }
    } catch (e) {
        console.log(chalk.yellow(`  ⚠️ 可能已配置或不支持: ${e.message}`));
    }

    // 3. 配置小区业绩排名奖
    console.log(chalk.yellow.bold("\n【3】配置小区业绩排名奖"));
    console.log(chalk.white("  需求:"));
    console.log(chalk.gray("  • 1-100名: 20%"));
    console.log(chalk.gray("  • 101-299名: 10%"));
    
    try {
        const referralABI = [
            "function owner() view returns (address)",
            "function setCommunityRankingRewards(uint256,uint256) external"
        ];
        
        const referral = new ethers.Contract(contracts.referral, referralABI, deployer);
        const owner = await referral.owner();
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log(chalk.cyan("  设置排名奖励..."));
            const tx = await referral.setCommunityRankingRewards(
                2000,  // 20%
                1000,  // 10%
                { gasLimit: 100000, gasPrice: ethers.utils.parseUnits("5", "gwei") }
            );
            await tx.wait();
            console.log(chalk.green("  ✅ 小区业绩排名奖已配置"));
        } else {
            console.log(chalk.yellow("  ⚠️ 你不是推荐合约Owner，无法配置"));
        }
    } catch (e) {
        console.log(chalk.yellow(`  ⚠️ 功能可能未实现: ${e.message}`));
    }

    // 4. 部署质押排名奖合约
    console.log(chalk.yellow.bold("\n【4】部署质押排名奖合约"));
    console.log(chalk.white("  需求:"));
    console.log(chalk.gray("  • 前100名: 20%"));
    console.log(chalk.gray("  • 101-500名: 15%"));
    console.log(chalk.gray("  • 501-2000名: 10%"));
    
    console.log(chalk.red("  ❌ 需要新合约，建议稍后单独部署"));

    // 5. 检查并提示多签钱包
    console.log(chalk.yellow.bold("\n【5】多签钱包"));
    console.log(chalk.cyan("  建议使用Gnosis Safe:"));
    console.log(chalk.white("  1. 访问: https://gnosis-safe.io/app/bsc:"));
    console.log(chalk.white("  2. 创建Safe钱包"));
    console.log(chalk.white("  3. 转移所有合约所有权到Safe"));

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         配置总结"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.cyan("✅ 已尝试配置:"));
    console.log(chalk.white("  • 赎回机制费用"));
    console.log(chalk.white("  • 领取收益手续费"));
    console.log(chalk.white("  • 小区业绩排名奖\n"));

    console.log(chalk.yellow("⚠️ 需要单独处理:"));
    console.log(chalk.white("  • 质押排名奖（需要新合约）"));
    console.log(chalk.white("  • 多签钱包（使用Gnosis Safe）"));
    console.log(chalk.white("  • 流动性池（在PancakeSwap添加）\n"));

    console.log(chalk.green.bold("🎯 合约层面基本完成！"));
    console.log(chalk.green.bold("   可以开始添加流动性了"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });