const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   检查部署状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), deployer.address);

    // 检查新BSDT
    const NEW_BSDT = "0xf460422388C1205724EF699051aBe300215E490b";
    console.log(chalk.yellow("\n检查新BSDT..."));
    try {
        const bsdt = await ethers.getContractAt("BSDTToken", NEW_BSDT);
        const totalSupply = await bsdt.totalSupply();
        const supplyFormatted = ethers.utils.formatEther(totalSupply);
        const supplyInBillion = (parseFloat(supplyFormatted) / 1000000000).toFixed(0);
        console.log(chalk.green("✅ BSDT地址:"), NEW_BSDT);
        console.log(chalk.green("   总供应量:"), supplyInBillion, "亿枚");
        
        // 检查部署者余额
        const balance = await bsdt.balanceOf(deployer.address);
        const balanceFormatted = ethers.utils.formatEther(balance);
        console.log(chalk.green("   部署者余额:"), balanceFormatted, "BSDT");
    } catch (e) {
        console.log(chalk.red("❌ BSDT合约无法访问"));
    }
    
    // 检查新HCF
    const NEW_HCF = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    console.log(chalk.yellow("\n检查新HCF..."));
    try {
        const hcf = await ethers.getContractAt("HCFToken", NEW_HCF);
        const totalSupply = await hcf.totalSupply();
        const supplyFormatted = ethers.utils.formatEther(totalSupply);
        console.log(chalk.green("✅ HCF地址:"), NEW_HCF);
        console.log(chalk.green("   总供应量:"), supplyFormatted, "HCF");
        
        // 检查部署者余额
        const balance = await hcf.balanceOf(deployer.address);
        const balanceFormatted = ethers.utils.formatEther(balance);
        console.log(chalk.green("   部署者余额:"), balanceFormatted, "HCF");
    } catch (e) {
        console.log(chalk.red("❌ HCF合约无法访问"));
    }
    
    // 检查是否有保存的地址
    console.log(chalk.yellow("\n检查已保存的地址..."));
    
    try {
        if (fs.existsSync('./new-bsdt-address.json')) {
            const data = JSON.parse(fs.readFileSync('./new-bsdt-address.json', 'utf8'));
            console.log(chalk.cyan("new-bsdt-address.json:"));
            console.log(data);
        }
    } catch (e) {
        console.log(chalk.gray("无new-bsdt-address.json文件"));
    }
    
    try {
        if (fs.existsSync('./deployed-contracts-v2.json')) {
            const data = JSON.parse(fs.readFileSync('./deployed-contracts-v2.json', 'utf8'));
            console.log(chalk.cyan("\ndeployed-contracts-v2.json:"));
            console.log(data);
        } else {
            console.log(chalk.yellow("⚠️ deployed-contracts-v2.json不存在，可能部署未完成"));
        }
    } catch (e) {
        console.log(chalk.gray("无deployed-contracts-v2.json文件"));
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         当前状态"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green("✅ 已完成:"));
    console.log(chalk.white("  1. BSDT V2 部署 (", supplyInBillion || "?", "亿枚)"));
    console.log(chalk.white("  2. HCF Token 部署"));
    
    console.log(chalk.yellow("\n⚠️ 可能需要:"));
    console.log(chalk.white("  1. 继续完成其他合约部署"));
    console.log(chalk.white("  2. 或者使用更简单的部署脚本"));
    
    console.log(chalk.cyan("\n建议: 运行简化版部署脚本"));
    console.log(chalk.white("npx hardhat run scripts/deploy-essential-contracts.js --network bsc"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });