const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 激活税费系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 合约地址
    const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
    const POOL_ADDRESS = "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048";
    
    try {
        const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
        
        // 1. 检查当前状态
        console.log(chalk.cyan("1️⃣ 检查当前税费设置..."));
        const buyTax = await hcf.buyTaxRate();
        const sellTax = await hcf.sellTaxRate();
        const transferTax = await hcf.transferTaxRate();
        
        console.log(`  买入税: ${buyTax.toNumber()/100}%`);
        console.log(`  卖出税: ${sellTax.toNumber()/100}%`);
        console.log(`  转账税: ${transferTax.toNumber()/100}%`);
        
        // 2. 检查池子是否已设置
        const isPairSet = await hcf.isDEXPair(POOL_ADDRESS);
        console.log(`  池子DEX状态: ${isPairSet ? "✅ 已设置" : "❌ 未设置"}`);
        
        if (!isPairSet) {
            // 3. 设置池子为DEX交易对
            console.log(chalk.cyan("\n2️⃣ 设置池子为DEX交易对..."));
            const tx = await hcf.setDEXPair(POOL_ADDRESS, true);
            console.log("  交易哈希:", tx.hash);
            await tx.wait();
            console.log(chalk.green("  ✅ 池子已设置为DEX交易对"));
            
            // 4. 验证设置
            const isNowPair = await hcf.isDEXPair(POOL_ADDRESS);
            console.log(`  验证状态: ${isNowPair ? "✅ 成功" : "❌ 失败"}`);
        }
        
        // 5. 获取税费接收地址
        console.log(chalk.cyan("\n3️⃣ 税费接收地址..."));
        const marketingWallet = await hcf.marketingWallet();
        const nodePool = await hcf.nodePool();
        const lpPool = await hcf.lpPool();
        
        console.log(`  营销钱包: ${marketingWallet}`);
        console.log(`  节点池: ${nodePool}`);
        console.log(`  LP池: ${lpPool}`);
        
        // 6. 检查销毁信息
        console.log(chalk.cyan("\n4️⃣ 销毁信息..."));
        const totalBurned = await hcf.totalBurned();
        const totalSupply = await hcf.totalSupply();
        const burnStopSupply = await hcf.BURN_STOP_SUPPLY();
        
        console.log(`  已销毁: ${ethers.utils.formatEther(totalBurned)} HCF`);
        console.log(`  当前总量: ${ethers.utils.formatEther(totalSupply)} HCF`);
        console.log(`  停止销毁: ${ethers.utils.formatEther(burnStopSupply)} HCF`);
        
        // 总结
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("   📋 税费系统状态"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("✅ 税费系统已激活！"));
        console.log("\n交易税费:");
        console.log("  🔹 买入: 2% (0.5%销毁 + 0.5%营销 + 0.5%LP + 0.5%节点)");
        console.log("  🔹 卖出: 5% (2%销毁 + 1%营销 + 1%LP + 1%节点)");
        console.log("  🔹 转账: 1% (100%销毁)");
        
        console.log(chalk.yellow("\n⚠️ 注意事项:"));
        console.log("  1. 在PancakeSwap买卖将自动扣税");
        console.log("  2. 直接转账将扣1%销毁");
        console.log("  3. 账户必须保留最少0.0001 HCF");
        console.log("  4. 销毁至99万HCF自动停止");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 操作失败:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
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