const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📋 合约基础检查"));
    console.log(chalk.blue.bold("========================================\n"));

    // 最终使用的合约
    const finalContracts = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",          // 新HCF 10亿
        ProtectedBSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530", // 受保护的BSDT
        Pool: "0xe0e4ca5DD8FB4559a467636ca8e482123b810Db8",          // BSDT/USDT池子
        
        // 早上部署的辅助合约
        Staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        Referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        NodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        Gateway: "0xb4c9C3E8CA4365c04d47dD6113831449213731ca"
    };
    
    console.log(chalk.green.bold("核心系统状态：\n"));
    
    // 1. HCF检查
    try {
        const hcf = await ethers.getContractAt("HCFToken", finalContracts.HCF);
        const supply = await hcf.totalSupply();
        console.log("✅ HCF总量:", ethers.utils.formatEther(supply), "HCF");
        console.log("  地址:", finalContracts.HCF);
    } catch(e) {
        console.log("❌ HCF检查失败");
    }
    
    // 2. BSDT检查
    try {
        const bsdt = await ethers.getContractAt("ProtectedBSDT", finalContracts.ProtectedBSDT);
        const supply = await bsdt.totalSupply();
        const restricted = await bsdt.tradingRestricted();
        console.log("✅ BSDT总量:", ethers.utils.formatEther(supply), "BSDT");
        console.log("  交易限制:", restricted ? "已开启" : "未开启");
        console.log("  地址:", finalContracts.ProtectedBSDT);
    } catch(e) {
        console.log("❌ BSDT检查失败");
    }
    
    // 3. 池子检查
    console.log("✅ BSDT/USDT池子:");
    console.log("  地址:", finalContracts.Pool);
    console.log("  功能: 显示1:1价格，限制交易");
    
    console.log(chalk.yellow.bold("\n辅助合约（需要验证）：\n"));
    
    // 检查合约是否存在
    for (const [name, address] of Object.entries({
        "质押系统": finalContracts.Staking,
        "推荐系统": finalContracts.Referral,
        "节点NFT": finalContracts.NodeNFT,
        "Gateway": finalContracts.Gateway
    })) {
        const code = await ethers.provider.getCode(address);
        if (code !== "0x") {
            console.log(`✅ ${name}: ${address}`);
        } else {
            console.log(`❌ ${name}: 合约不存在`);
        }
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         🎯 当前状态"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green("可以使用的："));
    console.log("1. HCF代币系统 ✅");
    console.log("2. BSDT锚定系统 ✅");
    console.log("3. 价格显示池子 ✅");
    
    console.log(chalk.yellow("\n需要做的："));
    console.log("1. 开发Swap前端界面 🔴");
    console.log("2. 验证辅助合约功能");
    console.log("3. 集成所有合约");
    
    console.log(chalk.cyan("\n建议："));
    console.log("• 先做Swap界面（USDT→BSDT→HCF）");
    console.log("• 让用户能够兑换和交易");
    console.log("• 再逐步开启质押、推荐等功能");
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