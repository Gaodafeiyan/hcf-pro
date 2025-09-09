const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 激活税费系统（最终版）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
    const POOL_ADDRESS = "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048";
    
    try {
        const balance = await deployer.getBalance();
        console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
        
        const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
        
        // 检查池子是否已设置
        const isPairSet = await hcf.isDEXPair(POOL_ADDRESS);
        console.log(`池子DEX状态: ${isPairSet ? "✅ 已设置" : "❌ 未设置"}`);
        
        if (!isPairSet) {
            console.log(chalk.cyan("\n🔧 设置PancakeSwap池子为DEX交易对..."));
            console.log("这会激活：");
            console.log("  • 买入税2%");
            console.log("  • 卖出税5%");
            console.log("  • 转账税1%\n");
            
            // BSC主网最低gas价格是0.1 Gwei (100000000 wei)
            const minGasPrice = ethers.utils.parseUnits("0.1", "gwei");
            console.log("使用最低Gas价格:", ethers.utils.formatUnits(minGasPrice, "gwei"), "Gwei");
            
            // 执行交易
            const tx = await hcf.setDEXPair(POOL_ADDRESS, true, {
                gasPrice: minGasPrice
            });
            
            console.log("交易哈希:", tx.hash);
            console.log("等待确认...");
            const receipt = await tx.wait();
            
            console.log(chalk.green("✅ 交易成功!"));
            console.log("Gas使用:", receipt.gasUsed.toString());
            console.log("实际花费:", ethers.utils.formatEther(receipt.gasUsed.mul(minGasPrice)), "BNB");
            
            // 验证设置
            const isNowPair = await hcf.isDEXPair(POOL_ADDRESS);
            if (isNowPair) {
                console.log(chalk.green.bold("\n🎉 税费系统激活成功！"));
            }
        } else {
            console.log(chalk.yellow("\n⚠️ 税费系统已经激活了！"));
        }
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("   📋 税费系统状态"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log("✅ 现在PancakeSwap交易会自动扣税：");
        console.log("  🔹 买入HCF: 扣2% (0.5%销毁+0.5%营销+0.5%LP+0.5%节点)");
        console.log("  🔹 卖出HCF: 扣5% (2%销毁+1%营销+1%LP+1%节点)");
        console.log("  🔹 转账HCF: 扣1% (100%销毁)");
        
        // 检查销毁信息
        const totalBurned = await hcf.totalBurned();
        const totalSupply = await hcf.totalSupply();
        console.log(`\n📊 销毁信息:`);
        console.log(`  已销毁: ${ethers.utils.formatEther(totalBurned)} HCF`);
        console.log(`  当前总量: ${ethers.utils.formatEther(totalSupply)} HCF`);
        
        console.log(chalk.yellow("\n💡 测试方法:"));
        console.log("  1. 去PancakeSwap买入HCF，检查是否扣2%");
        console.log("  2. 去PancakeSwap卖出HCF，检查是否扣5%");
        console.log("  3. 直接转账HCF，检查是否扣1%");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 操作失败:"), error.message);
        if (error.message.includes("insufficient funds")) {
            console.log(chalk.yellow("\n需要充值更多BNB到:"), deployer.address);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });