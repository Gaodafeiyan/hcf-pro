const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 部署新HCF合约（10亿总量）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);
    
    // 检查BNB余额
    const balance = await deployer.getBalance();
    console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.05"))) {
        console.log(chalk.red("❌ BNB不足，需要至少0.05 BNB"));
        return;
    }
    
    try {
        // 部署参数
        const multiSigWallet = "0x4509f773f2Cb6543837Eabbd27538139feE59496";
        const marketingWallet = deployer.address; // 暂时用部署者地址
        const nodePool = deployer.address;
        const lpPool = deployer.address;
        const bridgeAddress = deployer.address;
        
        console.log(chalk.yellow.bold("1. 部署HCF合约..."));
        console.log(chalk.white("参数:"));
        console.log("  multiSigWallet:", multiSigWallet);
        console.log("  marketingWallet:", marketingWallet);
        console.log("  nodePool:", nodePool);
        console.log("  lpPool:", lpPool);
        console.log("  bridgeAddress:", bridgeAddress);
        
        const HCFToken = await ethers.getContractFactory("HCFToken");
        const hcf = await HCFToken.deploy(
            multiSigWallet,
            marketingWallet,
            nodePool,
            lpPool,
            bridgeAddress
        );
        
        console.log(chalk.cyan("等待部署..."));
        await hcf.deployed();
        
        console.log(chalk.green("✅ HCF部署成功:"), hcf.address);
        
        // 验证部署结果
        console.log(chalk.yellow.bold("\n2. 验证合约信息..."));
        
        const name = await hcf.name();
        const symbol = await hcf.symbol();
        const totalSupply = await hcf.totalSupply();
        const deployerBalance = await hcf.balanceOf(deployer.address);
        
        console.log(chalk.white("代币名称:"), name);
        console.log(chalk.white("代币符号:"), symbol);
        console.log(chalk.white("总供应量:"), ethers.utils.formatEther(totalSupply), "HCF");
        console.log(chalk.white("部署者余额:"), ethers.utils.formatEther(deployerBalance), "HCF");
        
        // 检查是否达到10亿
        const targetSupply = ethers.utils.parseEther("1000000000");
        if (totalSupply.eq(targetSupply)) {
            console.log(chalk.green.bold("✅ 总供应量正确：10亿 HCF"));
        } else {
            console.log(chalk.red("❌ 总供应量不正确"));
            console.log(chalk.yellow("期望: 1,000,000,000 HCF"));
            console.log(chalk.yellow("实际:", ethers.utils.formatEther(totalSupply), "HCF"));
        }
        
        // 保存新的HCF地址
        const contractInfo = {
            HCF_NEW: hcf.address,
            HCF_OLD: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
            SimpleBSDT: "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6",
            BSDT_USDT_Pool: "0x0B7a96A7be86769444eD4d83362883fE4CF47044",
            deployTime: new Date().toISOString(),
            totalSupply: ethers.utils.formatEther(totalSupply),
            deployerBalance: ethers.utils.formatEther(deployerBalance)
        };
        
        fs.writeFileSync('./new-hcf-deployment.json', JSON.stringify(contractInfo, null, 2));
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 新HCF部署成功"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("新HCF合约地址:"), hcf.address);
        console.log(chalk.gray("旧HCF地址:"), "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3");
        
        console.log(chalk.yellow.bold("\n重要提醒："));
        console.log(chalk.white("1. 新HCF已铸造10亿代币"));
        console.log(chalk.white("2. 所有代币在部署者钱包"));
        console.log(chalk.white("3. 尚未创建流动性池"));
        console.log(chalk.white("4. 需要时可以创建HCF/BSDT池子（100万:10万）"));
        
        console.log(chalk.cyan.bold("\n下一步："));
        console.log(chalk.white("- 等待您的指示再创建HCF/BSDT流动性池"));
        console.log(chalk.white("- 可以转移HCF给其他地址"));
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 脚本执行完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });