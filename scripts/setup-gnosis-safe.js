const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   设置Gnosis Safe多签钱包"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.cyan("📋 Gnosis Safe设置步骤：\n"));

    console.log(chalk.yellow("【步骤1】访问Gnosis Safe"));
    console.log(chalk.white("  访问: https://gnosis-safe.io/app/bsc:"));
    console.log(chalk.white("  点击 'Create new Safe'\n"));

    console.log(chalk.yellow("【步骤2】配置多签"));
    console.log(chalk.white("  1. 添加至少3个管理员地址"));
    console.log(chalk.white("  2. 设置需要的签名数量（建议2/3）"));
    console.log(chalk.white("  3. 确认创建\n"));

    console.log(chalk.yellow("【步骤3】转移合约所有权"));
    console.log(chalk.white("  需要转移所有权的合约:"));
    console.log(chalk.gray("  • HCF Token: 0x24cA14001674fD9250c9E343e30Bc788bC3a64cC"));
    console.log(chalk.gray("  • Staking: 0x42C343c61a630d0107B752001caCd50EfbDD13f6"));
    console.log(chalk.gray("  • Referral: 0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D"));
    console.log(chalk.gray("  • NodeNFT: 0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55"));
    console.log(chalk.gray("  • AutoSwap: 0x83714243313D69AE9d21B09d2f336e9A2713B8A5\n"));

    console.log(chalk.yellow("【步骤4】验证设置"));
    console.log(chalk.white("  确保所有关键操作需要多签批准"));
    console.log(chalk.white("  测试多签交易流程\n"));

    console.log(chalk.green("✅ 多签钱包优势:"));
    console.log(chalk.white("  • 防止单点故障"));
    console.log(chalk.white("  • 提高项目信任度"));
    console.log(chalk.white("  • 保护用户资金安全"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });