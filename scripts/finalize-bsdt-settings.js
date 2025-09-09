const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n完成ProtectedBSDT设置"));
    
    const [deployer] = await ethers.getSigners();
    const ProtectedBSDT_ADDRESS = "0x3932968a904Bf6773E8a13F1D2358331B9a1a530";
    
    try {
        const bsdt = await ethers.getContractAt("ProtectedBSDT", ProtectedBSDT_ADDRESS);
        
        // 检查BNB
        const balance = await deployer.getBalance();
        console.log("BNB余额:", ethers.utils.formatEther(balance));
        
        if (balance.lt(ethers.utils.parseEther("0.01"))) {
            console.log(chalk.red("BNB不足，需要充值"));
            return;
        }
        
        // 设置白名单
        console.log("\n设置白名单...");
        await bsdt.setWhitelist(deployer.address, true);
        console.log("✅ Owner已加白名单");
        
        // 开启交易限制
        console.log("\n开启交易限制...");
        await bsdt.setTradingRestricted(true);
        console.log("✅ 交易限制已开启");
        
        console.log(chalk.green.bold("\n✅ 设置完成！"));
        console.log("\n现在状态：");
        console.log("• 池子显示1:1价格");
        console.log("• 其他人不能买卖");
        console.log("• 价格永远固定");
        
    } catch (error) {
        console.log(chalk.red("错误:"), error.message);
    }
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});