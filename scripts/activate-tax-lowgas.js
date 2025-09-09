const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 激活税费系统 (低Gas版)"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 合约地址
    const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
    const POOL_ADDRESS = "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048";
    
    try {
        // 检查余额
        const balance = await deployer.getBalance();
        console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
        
        const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
        
        // 检查池子是否已设置
        const isPairSet = await hcf.isDEXPair(POOL_ADDRESS);
        console.log(`池子DEX状态: ${isPairSet ? "✅ 已设置" : "❌ 未设置"}`);
        
        if (!isPairSet) {
            console.log("\n设置池子为DEX交易对...");
            
            // 使用更低的gas设置
            const gasPrice = await deployer.getGasPrice();
            const lowerGasPrice = gasPrice.mul(8).div(10); // 使用80%的gas价格
            
            console.log("当前Gas价格:", ethers.utils.formatUnits(gasPrice, "gwei"), "Gwei");
            console.log("使用Gas价格:", ethers.utils.formatUnits(lowerGasPrice, "gwei"), "Gwei");
            
            // 估算gas limit
            const estimatedGas = await hcf.estimateGas.setDEXPair(POOL_ADDRESS, true);
            console.log("预估Gas:", estimatedGas.toString());
            
            // 计算总成本
            const totalCost = lowerGasPrice.mul(estimatedGas);
            console.log("预计花费:", ethers.utils.formatEther(totalCost), "BNB");
            
            if (balance.lt(totalCost)) {
                console.log(chalk.red("\n❌ 余额不足!"));
                console.log(`需要: ${ethers.utils.formatEther(totalCost)} BNB`);
                console.log(`当前: ${ethers.utils.formatEther(balance)} BNB`);
                console.log(`缺少: ${ethers.utils.formatEther(totalCost.sub(balance))} BNB`);
                return;
            }
            
            // 执行交易
            const tx = await hcf.setDEXPair(POOL_ADDRESS, true, {
                gasPrice: lowerGasPrice,
                gasLimit: estimatedGas.mul(110).div(100) // 增加10%的buffer
            });
            
            console.log("交易哈希:", tx.hash);
            console.log("等待确认...");
            const receipt = await tx.wait();
            console.log(chalk.green("✅ 交易成功!"));
            console.log("Gas使用:", receipt.gasUsed.toString());
            console.log("实际花费:", ethers.utils.formatEther(receipt.gasUsed.mul(lowerGasPrice)), "BNB");
            
            // 验证设置
            const isNowPair = await hcf.isDEXPair(POOL_ADDRESS);
            console.log(`验证状态: ${isNowPair ? "✅ 成功" : "❌ 失败"}`);
        }
        
        console.log(chalk.green("\n✅ 税费系统已激活！"));
        console.log("\n税费设置:");
        console.log("  买入: 2% (0.5%销毁 + 0.5%营销 + 0.5%LP + 0.5%节点)");
        console.log("  卖出: 5% (2%销毁 + 1%营销 + 1%LP + 1%节点)");
        console.log("  转账: 1% (100%销毁)");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 操作失败:"), error.message);
        
        // 如果是gas问题，提供解决方案
        if (error.message.includes("insufficient funds")) {
            const balance = await deployer.getBalance();
            console.log(chalk.yellow("\n💡 解决方案:"));
            console.log("1. 向账户充值更多BNB (建议0.01 BNB)");
            console.log(`   地址: ${deployer.address}`);
            console.log(`   当前余额: ${ethers.utils.formatEther(balance)} BNB`);
            console.log("\n2. 或等待gas费降低后再试");
        }
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });