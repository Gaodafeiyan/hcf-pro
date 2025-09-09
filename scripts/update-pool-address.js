const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 更新质押合约池子地址"));
    console.log(chalk.blue.bold("========================================\n"));

    const stakingAddress = "0x7B073C2A44679b3457E6Bc015Fef5279afE72fC7";
    const correctPoolAddress = "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1";
    
    try {
        // 1. 连接质押合约
        console.log(chalk.cyan("1. 连接质押合约..."));
        const staking = await ethers.getContractAt([
            "function setHCFBSDTPair(address _pair) external",
            "function hcfBsdtPair() view returns (address)",
            "function getHCFPrice() view returns (uint256)",
            "function owner() view returns (address)"
        ], stakingAddress);
        
        // 2. 检查当前设置
        const currentPair = await staking.hcfBsdtPair();
        console.log("当前池子地址:", currentPair);
        console.log("正确池子地址:", correctPoolAddress);
        
        if (currentPair.toLowerCase() === correctPoolAddress.toLowerCase()) {
            console.log(chalk.green("✅ 池子地址已经正确设置！"));
        } else {
            // 3. 更新池子地址
            console.log(chalk.cyan("\n2. 更新池子地址..."));
            const tx = await staking.setHCFBSDTPair(correctPoolAddress);
            console.log("交易哈希:", tx.hash);
            await tx.wait();
            console.log(chalk.green("✅ 池子地址更新成功！"));
        }
        
        // 4. 验证价格获取
        console.log(chalk.cyan("\n3. 验证价格获取..."));
        try {
            const price = await staking.getHCFPrice();
            console.log(chalk.green("✅ HCF价格:", ethers.utils.formatEther(price), "BSDT"));
            
            // 注意：当前价格是10 BSDT（因为添加流动性时比例反了）
            if (parseFloat(ethers.utils.formatEther(price)) > 1) {
                console.log(chalk.yellow("\n⚠️ 注意：当前价格偏高（1 HCF = 10 BSDT）"));
                console.log(chalk.yellow("原因：添加流动性时数量反了"));
                console.log(chalk.yellow("应该是：10000 HCF + 1000 BSDT"));
                console.log(chalk.yellow("实际是：1000 HCF + 10000 BSDT"));
            }
        } catch (err) {
            console.log(chalk.red("❌ 价格获取失败:", err.message));
        }
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
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