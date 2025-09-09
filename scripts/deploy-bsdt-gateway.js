const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚪 部署BSDT Gateway (1:1单向兑换)"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);
    
    // 合约地址
    const USDT = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT
    const SimpleBSDT = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6"; // SimpleBSDT
    
    try {
        // 部署Gateway
        console.log(chalk.yellow.bold("1. 部署SimpleBSDTGateway..."));
        const Gateway = await ethers.getContractFactory("SimpleBSDTGateway");
        const gateway = await Gateway.deploy(USDT, SimpleBSDT);
        await gateway.deployed();
        
        console.log(chalk.green("✅ Gateway部署成功:"), gateway.address);
        
        // 获取BSDT合约
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT);
        
        // 检查余额
        const bsdtBalance = await bsdt.balanceOf(deployer.address);
        console.log(chalk.cyan("\n您的BSDT余额:"), ethers.utils.formatEther(bsdtBalance));
        
        // 存入BSDT到Gateway供兑换（比如1000万）
        console.log(chalk.yellow.bold("\n2. 存入BSDT到Gateway..."));
        const depositAmount = ethers.utils.parseEther("10000000"); // 1000万BSDT
        
        // 先授权
        console.log(chalk.cyan("授权BSDT..."));
        const approveTx = await bsdt.approve(gateway.address, depositAmount);
        await approveTx.wait();
        console.log(chalk.green("✅ 已授权"));
        
        // 存入
        console.log(chalk.cyan("存入1000万BSDT到Gateway..."));
        const depositTx = await gateway.depositBSDT(depositAmount);
        await depositTx.wait();
        console.log(chalk.green("✅ 已存入"));
        
        // 验证Gateway状态
        console.log(chalk.yellow.bold("\n3. Gateway状态："));
        const availableBSDT = await gateway.availableBSDT();
        console.log("可兑换BSDT:", ethers.utils.formatEther(availableBSDT));
        
        // 保存信息
        const gatewayInfo = {
            SimpleBSDTGateway: gateway.address,
            SimpleBSDT: SimpleBSDT,
            USDT: USDT,
            depositedBSDT: ethers.utils.formatEther(depositAmount),
            deployTime: new Date().toISOString()
        };
        
        fs.writeFileSync('./bsdt-gateway.json', JSON.stringify(gatewayInfo, null, 2));
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         ✅ Gateway部署成功"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("Gateway地址:"), gateway.address);
        console.log(chalk.green.bold("功能:"));
        console.log("  • USDT → BSDT (1:1固定比率)");
        console.log("  • 单向兑换（不能反向）");
        console.log("  • 已存入1000万BSDT供兑换");
        
        console.log(chalk.yellow.bold("\n用户如何使用："));
        console.log("1. 授权USDT给Gateway");
        console.log("2. 调用exchangeToBSDT()函数");
        console.log("3. 获得等量BSDT (1:1)");
        
        console.log(chalk.cyan.bold("\n下一步："));
        console.log("• 创建HCF/BSDT交易池（100万:10万）");
        console.log("• 用户通过Gateway获取BSDT");
        console.log("• 用BSDT交易HCF");
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
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