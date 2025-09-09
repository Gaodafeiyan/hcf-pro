const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 检查HCF代币详细信息"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const HCF_ADDRESS = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    
    try {
        // 获取HCF合约（尝试包含更多函数）
        const hcf = await ethers.getContractAt([
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function owner() view returns (address)",
            "function MAX_SUPPLY() view returns (uint256)",
            "function cap() view returns (uint256)",
            "function maxSupply() view returns (uint256)"
        ], HCF_ADDRESS);
        
        // 基本信息
        console.log(chalk.yellow.bold("基本信息："));
        const name = await hcf.name();
        const symbol = await hcf.symbol();
        const decimals = await hcf.decimals();
        const totalSupply = await hcf.totalSupply();
        
        console.log("名称:", name);
        console.log("符号:", symbol);
        console.log("精度:", decimals);
        console.log("当前总供应量:", ethers.utils.formatEther(totalSupply), "HCF");
        console.log("当前总供应量(原始):", totalSupply.toString());
        
        // 尝试获取最大供应量
        console.log(chalk.yellow.bold("\n最大供应量信息："));
        try {
            const maxSupply = await hcf.MAX_SUPPLY();
            console.log("MAX_SUPPLY:", ethers.utils.formatEther(maxSupply), "HCF");
        } catch (e) {
            console.log("MAX_SUPPLY: 函数不存在");
        }
        
        try {
            const cap = await hcf.cap();
            console.log("cap():", ethers.utils.formatEther(cap), "HCF");
        } catch (e) {
            console.log("cap(): 函数不存在");
        }
        
        try {
            const maxSupply = await hcf.maxSupply();
            console.log("maxSupply():", ethers.utils.formatEther(maxSupply), "HCF");
        } catch (e) {
            console.log("maxSupply(): 函数不存在");
        }
        
        // Owner信息
        console.log(chalk.yellow.bold("\nOwner信息："));
        try {
            const owner = await hcf.owner();
            console.log("Owner地址:", owner);
            const ownerBalance = await hcf.balanceOf(owner);
            console.log("Owner余额:", ethers.utils.formatEther(ownerBalance), "HCF");
            
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log(chalk.green("✅ 当前账户是Owner"));
            } else {
                console.log(chalk.yellow("⚠️ 当前账户不是Owner"));
            }
        } catch (e) {
            console.log("无法获取Owner信息");
        }
        
        // 余额分布
        console.log(chalk.yellow.bold("\n代币分布："));
        const signerBalance = await hcf.balanceOf(signer.address);
        console.log("您的余额:", ethers.utils.formatEther(signerBalance), "HCF");
        console.log("占总供应量:", (signerBalance.mul(10000).div(totalSupply).toNumber() / 100), "%");
        
        // 需求对比
        console.log(chalk.red.bold("\n⚠️ 需求对比："));
        console.log(chalk.white("需求文档要求: 10亿 HCF (1,000,000,000)"));
        console.log(chalk.white("实际总供应量: " + ethers.utils.formatEther(totalSupply) + " HCF"));
        
        const required = ethers.utils.parseEther("1000000000"); // 10亿
        if (totalSupply.lt(required)) {
            const diff = required.sub(totalSupply);
            console.log(chalk.red("❌ 缺少: " + ethers.utils.formatEther(diff) + " HCF"));
            console.log(chalk.yellow("\n需要铸造更多HCF到10亿"));
        } else if (totalSupply.eq(required)) {
            console.log(chalk.green("✅ 总供应量符合要求"));
        } else {
            console.log(chalk.yellow("⚠️ 总供应量超过要求"));
        }
        
        // HCF/BSDT池子计划
        console.log(chalk.cyan.bold("\nHCF/BSDT池子计划："));
        console.log("需求: 100万 HCF + 10万 BSDT");
        console.log("比例: 10:1 (1 HCF = 0.1 BSDT)");
        
        const hcfNeeded = ethers.utils.parseEther("1000000"); // 100万
        const bsdtNeeded = ethers.utils.parseEther("100000");  // 10万
        
        if (signerBalance.gte(hcfNeeded)) {
            console.log(chalk.green("✅ HCF余额充足创建池子"));
        } else {
            console.log(chalk.red("❌ HCF余额不足"));
            console.log("需要:", ethers.utils.formatEther(hcfNeeded), "HCF");
            console.log("实际:", ethers.utils.formatEther(signerBalance), "HCF");
        }
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
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