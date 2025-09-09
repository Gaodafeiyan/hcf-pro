const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 检查ProtectedBSDT状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    // 合约地址
    const ProtectedBSDT_ADDRESS = "0x3932968a904Bf6773E8a13F1D2358331B9a1a530";
    const POOL_ADDRESS = "0xe0e4ca5DD8FB4559a467636ca8e482123b810Db8";
    
    try {
        const bsdt = await ethers.getContractAt("ProtectedBSDT", ProtectedBSDT_ADDRESS);
        
        // 检查交易限制状态
        const tradingRestricted = await bsdt.tradingRestricted();
        console.log(chalk.yellow("交易限制状态:"), tradingRestricted ? "✅ 已开启" : "❌ 未开启");
        
        // 检查白名单
        const isWhitelisted = await bsdt.isWhitelisted(signer.address);
        console.log(chalk.yellow("您的地址白名单:"), isWhitelisted ? "✅ 已加入" : "❌ 未加入");
        
        // 检查池子是否被标记
        const isPair = await bsdt.isPair(POOL_ADDRESS);
        console.log(chalk.yellow("池子已标记:"), isPair ? "✅ 是" : "❌ 否");
        
        // 检查能否交易
        const canTrade = await bsdt.canTrade(signer.address);
        console.log(chalk.yellow("您能交易:"), canTrade ? "✅ 可以" : "❌ 不可以");
        
        // 随机地址测试
        const randomAddress = "0x0000000000000000000000000000000000000001";
        const randomCanTrade = await bsdt.canTrade(randomAddress);
        console.log(chalk.yellow("其他人能交易:"), randomCanTrade ? "⚠️ 可以（需要开启限制）" : "✅ 不可以");
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         当前状态总结"));
        console.log(chalk.blue.bold("========================================\n"));
        
        if (!tradingRestricted) {
            console.log(chalk.red("⚠️ 交易限制未开启，任何人都能交易！"));
            console.log(chalk.yellow("需要调用 setTradingRestricted(true) 开启限制"));
        } else {
            console.log(chalk.green("✅ 交易限制已开启"));
            console.log("• 只有白名单地址可以交易");
            console.log("• 其他人不能从池子买卖BSDT");
        }
        
        console.log(chalk.cyan("\n池子信息："));
        console.log("地址:", POOL_ADDRESS);
        console.log("查看: https://pancakeswap.finance/info/v2/pair/" + POOL_ADDRESS);
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });