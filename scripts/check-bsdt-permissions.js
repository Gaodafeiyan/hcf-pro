const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 检查BSDT权限设置"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const BSDT_ADDRESS = "0xf460422388C1205724EF699051aBe300215E490b";
    const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PANCAKE_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

    try {
        const bsdt = await ethers.getContractAt("BSDTToken", BSDT_ADDRESS);
        
        console.log(chalk.cyan("当前账户:"), signer.address);
        
        // 检查owner
        const owner = await bsdt.owner();
        console.log(chalk.yellow("合约Owner:"), owner);
        console.log(chalk.white("是否是Owner:"), owner.toLowerCase() === signer.address.toLowerCase() ? "✅ 是" : "❌ 否");
        
        // 检查多签钱包
        const multiSigWallet = await bsdt.multiSigWallet();
        console.log(chalk.yellow("\n多签钱包:"), multiSigWallet);
        console.log(chalk.white("是否是多签:"), multiSigWallet.toLowerCase() === signer.address.toLowerCase() ? "✅ 是" : "❌ 否");
        
        // 检查是否需要多签
        const requireMultiSig = await bsdt.requireMultiSig();
        console.log(chalk.yellow("\n是否需要多签:"), requireMultiSig ? "✅ 是" : "❌ 否");
        
        // 检查已授权的交易所
        console.log(chalk.yellow.bold("\n已授权的交易所："));
        console.log(chalk.white("PancakeRouter:"), await bsdt.authorizedExchanges(PANCAKE_ROUTER) ? "✅ 已授权" : "❌ 未授权");
        console.log(chalk.white("PancakeFactory:"), await bsdt.authorizedExchanges(PANCAKE_FACTORY) ? "✅ 已授权" : "❌ 未授权");
        
        // 检查网关地址
        const gateway = "0xcED40bF4AF4dD04F821Bd777f7d953861cfD9cda";
        console.log(chalk.white("BSDTGateway:"), await bsdt.authorizedExchanges(gateway) ? "✅ 已授权" : "❌ 未授权");
        
        // 检查路由地址
        const router = "0x2e386A8313Cc33a24370A25Fdae5E8d5C548760a";
        console.log(chalk.white("HCFSwapRouter:"), await bsdt.authorizedExchanges(router) ? "✅ 已授权" : "❌ 未授权");
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         诊断结果"));
        console.log(chalk.blue.bold("========================================\n"));
        
        if (requireMultiSig) {
            console.log(chalk.red("❌ 问题：合约需要多签权限"));
            console.log(chalk.yellow("\n解决方案："));
            
            if (multiSigWallet === ethers.constants.AddressZero || multiSigWallet === "0x0000000000000000000000000000000000000000") {
                console.log(chalk.white("1. 多签钱包未设置，需要先设置多签钱包"));
                console.log(chalk.white("2. 或者关闭多签要求（仅owner可操作）"));
            } else if (multiSigWallet.toLowerCase() !== signer.address.toLowerCase()) {
                console.log(chalk.white("1. 使用多签钱包账户:", multiSigWallet));
                console.log(chalk.white("2. 或者关闭多签要求（仅owner可操作）"));
            }
            
            console.log(chalk.cyan("\n如果你是owner，可以关闭多签要求："));
            console.log(chalk.gray("await bsdt.toggleMultiSigRequirement()"));
        } else {
            console.log(chalk.green("✅ 不需要多签，可以直接授权"));
            
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log(chalk.cyan("\n你是owner，可以执行授权操作"));
            } else {
                console.log(chalk.red("\n❌ 你不是owner，需要使用owner账户"));
                console.log(chalk.white("Owner地址:", owner));
            }
        }
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });