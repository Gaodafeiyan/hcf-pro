const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    const txHash = process.argv[2] || "0xcf3cdacd088f88505020d6e37fffc3144346fdea8c92e5e5c8f0e1e93e1ebbed4f";
    
    console.log(chalk.blue.bold("\n查询交易状态..."));
    console.log("交易哈希:", txHash);
    
    try {
        const provider = ethers.provider;
        
        // 获取交易
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
            console.log(chalk.red("交易未找到"));
            return;
        }
        
        console.log("发送方:", tx.from);
        console.log("接收方:", tx.to);
        console.log("Gas价格:", ethers.utils.formatUnits(tx.gasPrice, "gwei"), "Gwei");
        
        // 获取交易收据
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt) {
            if (receipt.status === 1) {
                console.log(chalk.green.bold("\n✅ 交易成功!"));
                console.log("区块号:", receipt.blockNumber);
                console.log("Gas使用:", receipt.gasUsed.toString());
                console.log("实际花费:", ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice)), "BNB");
            } else {
                console.log(chalk.red("\n❌ 交易失败"));
            }
        } else {
            console.log(chalk.yellow("\n⏳ 交易等待确认中..."));
        }
        
        // 检查税费状态
        const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
        const POOL_ADDRESS = "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048";
        const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
        const isDEX = await hcf.isDEXPair(POOL_ADDRESS);
        
        console.log(chalk.cyan("\n税费系统状态:"));
        console.log(`池子DEX状态: ${isDEX ? "✅ 已激活" : "❌ 未激活"}`);
        
        if (isDEX) {
            console.log(chalk.green.bold("\n🎉 税费系统已成功激活！"));
            console.log("现在PancakeSwap交易会自动扣税:");
            console.log("  • 买入扣2%");
            console.log("  • 卖出扣5%");
            console.log("  • 转账扣1%");
        }
        
    } catch (error) {
        console.error(chalk.red("错误:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });