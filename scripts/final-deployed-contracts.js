const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🎉 最终部署地址汇总"));
    console.log(chalk.blue.bold("========================================\n"));

    // 所有已部署的合约
    const contracts = {
        "HCF Token": "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        "BSDT Token": "0xf460422388C1205724EF699051aBe300215E490b",
        "BSDTGateway": "0xcED40bF4AF4dD04F821Bd777f7d953861cfD9cda",
        "HCFSwapRouter": "0x2e386A8313Cc33a24370A25Fdae5E8d5C548760a",
        "USDT (BSC)": "0x55d398326f99059fF775485246999027B3197955",
        "PancakeRouter": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        "PancakeFactory": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };
    
    console.log(chalk.green.bold("✅ 核心合约已部署："));
    for (const [name, address] of Object.entries(contracts)) {
        console.log(chalk.white(`${name}: ${address}`));
    }
    
    console.log(chalk.yellow.bold("\n⚠️ 重要提示："));
    console.log(chalk.white("BSDT供应量: 100亿枚（足够使用）"));
    console.log(chalk.white("HCF供应量: 10亿枚"));
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 创建流动性池步骤"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan.bold("步骤1：获取资金"));
    console.log(chalk.white("  • 获取1 USDT"));
    console.log(chalk.white("  • 从部署者钱包转1 BSDT"));
    
    console.log(chalk.cyan.bold("\n步骤2：创建BSDT/USDT锚定池"));
    console.log(chalk.white("  1. 访问 https://pancakeswap.finance/add"));
    console.log(chalk.white("  2. 输入USDT: 0x55d398326f99059fF775485246999027B3197955"));
    console.log(chalk.white("  3. 输入BSDT: 0xf460422388C1205724EF699051aBe300215E490b"));
    console.log(chalk.white("  4. 输入数量: 1 USDT + 1 BSDT"));
    console.log(chalk.white("  5. 点击 Add Liquidity"));
    
    console.log(chalk.cyan.bold("\n步骤3：创建HCF/BSDT交易池"));
    console.log(chalk.white("  1. 访问 https://pancakeswap.finance/add"));
    console.log(chalk.white("  2. 输入HCF: 0x2877E99F01c739C38c0d0E204761518Ed6ff11c3"));
    console.log(chalk.white("  3. 输入BSDT: 0xf460422388C1205724EF699051aBe300215E490b"));
    console.log(chalk.white("  4. 输入数量:"));
    console.log(chalk.yellow("     方案A: 100万 HCF + 1万 BSDT"));
    console.log(chalk.yellow("     方案B: 1000万 HCF + 10万 BSDT"));
    console.log(chalk.white("  5. 点击 Add Liquidity"));
    
    console.log(chalk.cyan.bold("\n步骤4：测试交易"));
    console.log(chalk.white("  1. 使用USDT购买HCF"));
    console.log(chalk.white("  2. 卖出HCF换回USDT"));
    console.log(chalk.white("  3. 检查税率是否正常"));
    
    console.log(chalk.green.bold("\n🎆 恭喜！系统准备就绪！"));
    console.log(chalk.cyan("\n现在只需要："));
    console.log(chalk.white("1. 获取1 USDT"));
    console.log(chalk.white("2. 创建流动性池"));
    console.log(chalk.white("3. 开始交易！"));
    
    // 保存到文件
    const finalData = {
        network: "BSC Mainnet",
        chainId: 56,
        timestamp: new Date().toISOString(),
        contracts: contracts,
        supply: {
            BSDT: "100亿",
            HCF: "10亿"
        },
        status: "核心合约部署完成，等待创建流动性池"
    };
    
    fs.writeFileSync('./FINAL-CONTRACTS.json', JSON.stringify(finalData, null, 2));
    console.log(chalk.gray("\n📄 地址已保存到 FINAL-CONTRACTS.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });