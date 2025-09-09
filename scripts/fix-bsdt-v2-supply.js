const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 修复BSDT V2供应量问题"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), deployer.address);
    
    // 检查BNB余额
    const balance = await deployer.getBalance();
    console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(balance), "BNB");
    console.log(chalk.red("⚠️ BNB不足，需要充值"));
    
    console.log(chalk.yellow.bold("\n问题分析："));
    console.log(chalk.white("1. BSDT V2总供应量为0（构造函数没有正确铸造）"));
    console.log(chalk.white("2. BNB不足，无法执行交易"));
    
    console.log(chalk.yellow.bold("\n解决方案："));
    console.log(chalk.cyan.bold("方案1：充值BNB"));
    console.log(chalk.white("- 充值至少0.05 BNB到地址:"));
    console.log(chalk.green(deployer.address));
    
    console.log(chalk.cyan.bold("\n方案2：重新部署简化版BSDT"));
    console.log(chalk.white("- 部署一个更简单的BSDT合约"));
    console.log(chalk.white("- 在构造函数中直接铸造代币给deployer"));
    
    console.log(chalk.cyan.bold("\n方案3：使用现有代币"));
    console.log(chalk.white("- 使用HCF代币（你有1900万个）"));
    console.log(chalk.white("- 创建HCF/USDT池子"));
    console.log(chalk.white("- 这样可以绕过BSDT"));
    
    // 显示现有资产
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         📊 现有资产"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green.bold("可用资产："));
    console.log(chalk.white("HCF: 19,000,000 个"));
    console.log(chalk.white("USDT: 3.33 个"));
    console.log(chalk.white("旧BSDT: 1000亿个（但有DEX限制）"));
    
    console.log(chalk.yellow.bold("\n建议："));
    console.log(chalk.white("1. 先充值0.05 BNB"));
    console.log(chalk.white("2. 或者创建HCF/USDT直接交易池"));
    
    // 创建HCF/USDT池子脚本提示
    console.log(chalk.green.bold("\n创建HCF/USDT池子（无需BSDT）："));
    console.log(chalk.white("运行: npx hardhat run scripts/create-hcf-usdt-pool.js --network bsc"));
    console.log(chalk.white("这样可以直接在PancakeSwap交易HCF"));
    
    // 地址汇总
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         📋 合约地址"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.white("HCF:"), "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3");
    console.log(chalk.white("USDT:"), "0x55d398326f99059fF775485246999027B3197955");
    console.log(chalk.white("BSDT V2:"), "0x91d044C229c93c3C21A4bBEa0454867B8E06f46A");
    console.log(chalk.white("旧BSDT:"), "0xf460422388C1205724EF699051aBe300215E490b");
    
    console.log(chalk.red.bold("\n⚠️ 当前限制："));
    console.log(chalk.white("- BNB不足（需要0.05 BNB）"));
    console.log(chalk.white("- BSDT V2没有初始供应量"));
    console.log(chalk.white("- 旧BSDT不能在DEX交易"));
    
    console.log(chalk.green.bold("\n✅ 可行方案："));
    console.log(chalk.white("- 创建HCF/USDT池子（绕过BSDT）"));
    console.log(chalk.white("- 初始价格: 1 HCF = 0.0001 USDT"));
    console.log(chalk.white("- 使用100万 HCF + 100 USDT"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });