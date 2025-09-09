const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   ✅ 验证新HCF合约状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 读取部署信息
    let NEW_HCF_ADDRESS;
    try {
        const deploymentInfo = JSON.parse(fs.readFileSync('./new-hcf-deployment.json', 'utf8'));
        NEW_HCF_ADDRESS = deploymentInfo.HCF_NEW;
        console.log(chalk.green("新HCF地址:"), NEW_HCF_ADDRESS);
    } catch (e) {
        console.log(chalk.yellow("请输入新HCF合约地址"));
        return;
    }
    
    try {
        // 获取合约实例
        const hcf = await ethers.getContractAt([
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function owner() view returns (address)",
            "function buyTaxRate() view returns (uint256)",
            "function sellTaxRate() view returns (uint256)",
            "function transferTaxRate() view returns (uint256)"
        ], NEW_HCF_ADDRESS);
        
        // 基本信息
        console.log(chalk.yellow.bold("\n基本信息："));
        const name = await hcf.name();
        const symbol = await hcf.symbol();
        const totalSupply = await hcf.totalSupply();
        
        console.log("代币名称:", name);
        console.log("代币符号:", symbol);
        console.log("总供应量:", ethers.utils.formatEther(totalSupply), "HCF");
        
        // 验证10亿
        const targetSupply = ethers.utils.parseEther("1000000000");
        if (totalSupply.eq(targetSupply)) {
            console.log(chalk.green.bold("✅ 总供应量正确：10亿 HCF"));
        } else {
            console.log(chalk.red("❌ 总供应量不正确"));
        }
        
        // 税率信息
        console.log(chalk.yellow.bold("\n税率设置："));
        const buyTax = await hcf.buyTaxRate();
        const sellTax = await hcf.sellTaxRate();
        const transferTax = await hcf.transferTaxRate();
        
        console.log("买入税:", buyTax.toNumber() / 100, "%");
        console.log("卖出税:", sellTax.toNumber() / 100, "%");
        console.log("转账税:", transferTax.toNumber() / 100, "%");
        
        // 余额分布
        console.log(chalk.yellow.bold("\n代币分布："));
        const signerBalance = await hcf.balanceOf(signer.address);
        console.log("您的余额:", ethers.utils.formatEther(signerBalance), "HCF");
        console.log("占比:", (signerBalance.mul(10000).div(totalSupply).toNumber() / 100), "%");
        
        // Owner信息
        const owner = await hcf.owner();
        console.log(chalk.cyan("\nOwner地址:"), owner);
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
            console.log(chalk.green("✅ 您是Owner"));
        }
        
        // 对比新旧HCF
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📊 新旧HCF对比"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("新HCF:"));
        console.log("  地址:", NEW_HCF_ADDRESS);
        console.log("  总量: 10亿");
        console.log("  状态: ✅ 已部署");
        
        console.log(chalk.gray("\n旧HCF:"));
        console.log("  地址: 0x2877E99F01c739C38c0d0E204761518Ed6ff11c3");
        console.log("  总量: 1900万");
        console.log("  状态: 已废弃");
        
        console.log(chalk.yellow.bold("\n下一步计划："));
        console.log("1. 创建HCF/BSDT池子（100万 HCF : 10万 BSDT）");
        console.log("2. 初始价格：1 HCF = 0.1 BSDT = 0.1 USDT");
        console.log("3. 可以转移HCF给其他地址共同添加流动性");
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 验证完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });