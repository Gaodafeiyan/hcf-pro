const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 检查钱包余额"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log("钱包地址:", signer.address);
    
    // 检查BNB余额
    const bnbBalance = await signer.getBalance();
    console.log(chalk.yellow("\nBNB余额:"), ethers.utils.formatEther(bnbBalance), "BNB");
    
    // 如果余额不足
    if (bnbBalance.lt(ethers.utils.parseEther("0.02"))) {
        console.log(chalk.red("⚠️ BNB余额不足！需要至少0.02 BNB来支付Gas费"));
        console.log(chalk.cyan("请向以下地址充值BNB:"));
        console.log(chalk.green.bold(signer.address));
        return;
    }
    
    // 检查代币余额
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530"
    };
    
    try {
        const hcfToken = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ], addresses.HCF);
        
        const bsdtToken = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ], addresses.BSDT);
        
        const hcfBalance = await hcfToken.balanceOf(signer.address);
        const bsdtBalance = await bsdtToken.balanceOf(signer.address);
        
        console.log(chalk.yellow("\n代币余额:"));
        console.log("HCF:", ethers.utils.formatEther(hcfBalance), "HCF");
        console.log("BSDT:", ethers.utils.formatEther(bsdtBalance), "BSDT");
        
        // 检查是否足够创建池子
        const requiredHCF = ethers.utils.parseEther("10000");
        const requiredBSDT = ethers.utils.parseEther("1000");
        
        console.log(chalk.cyan("\n创建池子需要:"));
        console.log("- 10000 HCF");
        console.log("- 1000 BSDT");
        console.log("- 约0.02 BNB (Gas费)");
        
        const canCreate = bnbBalance.gte(ethers.utils.parseEther("0.02")) &&
                         hcfBalance.gte(requiredHCF) &&
                         bsdtBalance.gte(requiredBSDT);
        
        if (canCreate) {
            console.log(chalk.green("\n✅ 余额充足，可以创建池子"));
        } else {
            console.log(chalk.red("\n❌ 余额不足，请检查:"));
            if (bnbBalance.lt(ethers.utils.parseEther("0.02"))) {
                console.log(chalk.red("- BNB不足"));
            }
            if (hcfBalance.lt(requiredHCF)) {
                console.log(chalk.red("- HCF不足"));
            }
            if (bsdtBalance.lt(requiredBSDT)) {
                console.log(chalk.red("- BSDT不足"));
            }
        }
        
    } catch (error) {
        console.error(chalk.red("检查代币余额失败:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });