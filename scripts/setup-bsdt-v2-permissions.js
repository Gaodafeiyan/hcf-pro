const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 设置BSDT V2权限"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // BSDT V2地址
    const BSDT_V2 = "0x91d044C229c93c3C21A4bBEa0454867B8E06f46A";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    try {
        const bsdtV2 = await ethers.getContractAt("BSDTTokenV2", BSDT_V2);
        
        // 检查owner
        const owner = await bsdtV2.owner();
        console.log(chalk.yellow("合约Owner:"), owner);
        console.log(chalk.yellow("是否是Owner:"), owner.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌");
        
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log(chalk.red("❌ 不是Owner，无法设置权限"));
            return;
        }
        
        // 检查余额
        const balance = await signer.getBalance();
        console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(balance), "BNB");
        
        // 获取BSDT V2余额
        const bsdtBalance = await bsdtV2.balanceOf(signer.address);
        console.log(chalk.cyan("BSDT V2余额:"), ethers.utils.formatEther(bsdtBalance), "BSDT");
        
        console.log(chalk.yellow.bold("\n设置权限（低gas）："));
        
        try {
            // 1. 设置多签钱包
            console.log(chalk.cyan("1. 设置多签钱包..."));
            const tx1 = await bsdtV2.setMultiSigWallet(signer.address, {
                gasLimit: 100000,
                gasPrice: ethers.utils.parseUnits("5", "gwei")
            });
            await tx1.wait();
            console.log(chalk.green("✅ 多签钱包已设置"));
        } catch (error) {
            console.log(chalk.yellow("⚠️ 设置多签失败:", error.message));
        }
        
        try {
            // 2. 授权PancakeRouter
            console.log(chalk.cyan("2. 授权PancakeRouter..."));
            const tx2 = await bsdtV2.authorizeExchange(PancakeRouter, true, {
                gasLimit: 100000,
                gasPrice: ethers.utils.parseUnits("5", "gwei")
            });
            await tx2.wait();
            console.log(chalk.green("✅ PancakeRouter已授权"));
        } catch (error) {
            console.log(chalk.yellow("⚠️ 授权Router失败:", error.message));
        }
        
        try {
            // 3. 授权PancakeFactory
            console.log(chalk.cyan("3. 授权PancakeFactory..."));
            const tx3 = await bsdtV2.authorizeExchange(PancakeFactory, true, {
                gasLimit: 100000,
                gasPrice: ethers.utils.parseUnits("5", "gwei")
            });
            await tx3.wait();
            console.log(chalk.green("✅ PancakeFactory已授权"));
        } catch (error) {
            console.log(chalk.yellow("⚠️ 授权Factory失败:", error.message));
        }
        
        try {
            // 4. 添加到白名单
            console.log(chalk.cyan("4. 添加到白名单..."));
            const tx4 = await bsdtV2.updateWhitelist(signer.address, true, {
                gasLimit: 100000,
                gasPrice: ethers.utils.parseUnits("5", "gwei")
            });
            await tx4.wait();
            console.log(chalk.green("✅ 已加入白名单"));
        } catch (error) {
            console.log(chalk.yellow("⚠️ 添加白名单失败:", error.message));
        }
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 合约信息"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("BSDT V2:"), BSDT_V2);
        console.log(chalk.white("HCF:"), "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3");
        console.log(chalk.white("USDT:"), "0x55d398326f99059fF775485246999027B3197955");
        
        console.log(chalk.cyan.bold("\n如果BNB不足，可以："));
        console.log(chalk.white("1. 充值更多BNB"));
        console.log(chalk.white("2. 或直接在PancakeSwap添加流动性"));
        console.log(chalk.white("3. BSDT V2已经允许DEX交易"));
        
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