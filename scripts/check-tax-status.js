const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 检查税费系统状态"));
    console.log(chalk.blue.bold("========================================\n"));

    // 合约地址
    const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
    const POOL_ADDRESS = "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048";
    
    try {
        const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
        
        // 检查池子是否设置为DEX
        const isPairSet = await hcf.isDEXPair(POOL_ADDRESS);
        
        console.log(chalk.cyan("税费系统状态:"));
        console.log(`  池子DEX状态: ${isPairSet ? "✅ 已激活" : "❌ 未激活"}`);
        
        if (!isPairSet) {
            console.log(chalk.red("\n❌ 税费系统未激活！"));
            console.log(chalk.yellow("\n需要执行以下步骤:"));
            console.log("  1. 确保部署账户有BNB");
            console.log("  2. 运行: npx hardhat run scripts/activate-tax-system.js --network bsc");
            console.log("\n部署账户地址: 0x4509f773f2Cb6543837Eabbd27538139feE59496");
        } else {
            console.log(chalk.green("\n✅ 税费系统已激活！"));
            console.log("\n税费设置:");
            console.log("  买入: 2% (0.5%销毁 + 0.5%营销 + 0.5%LP + 0.5%节点)");
            console.log("  卖出: 5% (2%销毁 + 1%营销 + 1%LP + 1%节点)");
            console.log("  转账: 1% (100%销毁)");
            
            // 检查销毁量
            const totalBurned = await hcf.totalBurned();
            console.log(`\n总销毁量: ${ethers.utils.formatEther(totalBurned)} HCF`);
        }
        
    } catch (error) {
        console.error(chalk.red("\n❌ 检查失败:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });