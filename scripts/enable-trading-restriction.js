const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.yellow("开启ProtectedBSDT交易限制"));
    
    const [signer] = await ethers.getSigners();
    const BSDT = "0x3932968a904Bf6773E8a13F1D2358331B9a1a530";
    
    try {
        const bsdt = await ethers.getContractAt("ProtectedBSDT", BSDT);
        
        // 只执行一个交易：开启限制
        console.log("执行 setTradingRestricted(true)...");
        const tx = await bsdt.setTradingRestricted(true, {
            gasLimit: 50000,  // 降低gas限制
            gasPrice: ethers.utils.parseUnits("5", "gwei")  // 使用5 gwei
        });
        
        console.log("交易哈希:", tx.hash);
        await tx.wait();
        
        console.log(chalk.green("✅ 交易限制已开启！"));
        console.log("现在只有白名单地址可以交易");
        console.log("其他人不能买卖BSDT");
        
    } catch (error) {
        if (error.message.includes("INSUFFICIENT_FUNDS")) {
            const needed = ethers.utils.parseEther("0.01");
            console.log(chalk.red("BNB不足，还需要约0.01 BNB"));
        } else {
            console.log(chalk.red("错误:"), error.reason || error.message);
        }
    }
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});