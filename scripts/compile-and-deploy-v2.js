const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 编译并部署BSDT V2"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        console.log(chalk.red("❌ BNB不足，需要至少0.01 BNB"));
        return;
    }
    
    try {
        // 先编译
        console.log(chalk.yellow.bold("\n1. 编译合约..."));
        const { exec } = require("child_process");
        await new Promise((resolve, reject) => {
            exec("npx hardhat compile", (error, stdout, stderr) => {
                if (error) {
                    console.log(chalk.red("编译失败:"), error);
                    reject(error);
                } else {
                    console.log(chalk.green("✅ 编译成功"));
                    resolve();
                }
            });
        });
        
        // 部署BSDT V2
        console.log(chalk.yellow.bold("\n2. 部署BSDT V2合约..."));
        
        const BSDTTokenV2 = await ethers.getContractFactory("BSDTTokenV2");
        
        const USDT = "0x55d398326f99059fF775485246999027B3197955";
        
        const bsdtV2 = await BSDTTokenV2.deploy(
            USDT,                          // USDT地址
            ethers.constants.AddressZero,  // Oracle地址（可选）
            deployer.address,              // Keeper地址
            ethers.constants.AddressZero   // LP池子地址（稍后创建）
        );
        
        console.log(chalk.gray("等待确认..."));
        await bsdtV2.deployed();
        
        console.log(chalk.green("✅ BSDT V2部署成功！"));
        console.log(chalk.white("地址:"), bsdtV2.address);
        
        // 设置权限
        console.log(chalk.yellow.bold("\n3. 设置权限..."));
        
        // 设置多签钱包
        const tx1 = await bsdtV2.setMultiSigWallet(deployer.address);
        await tx1.wait();
        console.log(chalk.green("✅ 多签钱包已设置"));
        
        // 授权PancakeRouter
        const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
        const tx2 = await bsdtV2.authorizeExchange(PancakeRouter, true);
        await tx2.wait();
        console.log(chalk.green("✅ PancakeRouter已授权"));
        
        // 授权PancakeFactory
        const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
        const tx3 = await bsdtV2.authorizeExchange(PancakeFactory, true);
        await tx3.wait();
        console.log(chalk.green("✅ PancakeFactory已授权"));
        
        // 添加部署者到白名单
        const tx4 = await bsdtV2.updateWhitelist(deployer.address, true);
        await tx4.wait();
        console.log(chalk.green("✅ 部署者已加入白名单"));
        
        // 获取合约信息
        console.log(chalk.yellow.bold("\n4. 合约信息："));
        const totalSupply = await bsdtV2.totalSupply();
        const name = await bsdtV2.name();
        const symbol = await bsdtV2.symbol();
        
        console.log(chalk.white("名称:"), name);
        console.log(chalk.white("符号:"), symbol);
        console.log(chalk.white("总供应量:"), ethers.utils.formatEther(totalSupply), "BSDT");
        console.log(chalk.white("合约地址:"), bsdtV2.address);
        
        // 保存地址
        const contractAddresses = {
            "BSDT_V2": bsdtV2.address,
            "BSDT_OLD": "0xf460422388C1205724EF699051aBe300215E490b",
            "HCF": "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
            "USDT": USDT,
            "PancakeRouter": PancakeRouter,
            "PancakeFactory": PancakeFactory,
            "timestamp": new Date().toISOString()
        };
        
        fs.writeFileSync(
            './bsdt-v2-address.json',
            JSON.stringify(contractAddresses, null, 2)
        );
        
        console.log(chalk.gray("\n📄 地址已保存到 bsdt-v2-address.json"));
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 部署总结"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("新BSDT V2:"), bsdtV2.address);
        console.log(chalk.yellow("旧BSDT:"), "0xf460422388C1205724EF699051aBe300215E490b");
        console.log(chalk.white("HCF:"), "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3");
        
        console.log(chalk.cyan.bold("\n下一步："));
        console.log(chalk.white("1. 运行: npx hardhat run scripts/create-pools-with-bsdt-v2.js --network bsc"));
        console.log(chalk.white("2. 创建BSDT V2/USDT池子（1:1锚定）"));
        console.log(chalk.white("3. 创建HCF/BSDT V2池子（100万:10万）"));
        
        return bsdtV2.address;
        
    } catch (error) {
        console.log(chalk.red("❌ 部署失败:"), error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log(chalk.green.bold("\n✅ 部署完成！BSDT V2地址:"), address);
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });