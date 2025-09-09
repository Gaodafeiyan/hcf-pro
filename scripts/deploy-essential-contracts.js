const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   部署核心合约（简化版）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);

    // 使用已部署的地址
    const NEW_BSDT = "0xf460422388C1205724EF699051aBe300215E490b";
    const NEW_HCF = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
    const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    
    const deployedContracts = {
        BSDT: NEW_BSDT,
        HCF: NEW_HCF,
        USDT: USDT_BSC,
        PancakeRouter: PANCAKE_ROUTER
    };
    
    console.log(chalk.green("✅ 使用已部署的BSDT:"), NEW_BSDT);
    console.log(chalk.green("✅ 使用已部署的HCF:"), NEW_HCF);
    
    try {
        // 1. 部署BSDTGateway（最重要）
        console.log(chalk.yellow.bold("\n[1/2] 部署BSDTGateway..."));
        const BSDTGateway = await ethers.getContractFactory("BSDTGateway");
        const gateway = await BSDTGateway.deploy(
            USDT_BSC,
            NEW_BSDT
        );
        await gateway.deployed();
        console.log(chalk.green("✅ BSDTGateway:"), gateway.address);
        deployedContracts.BSDTGateway = gateway.address;
        
        // 2. 部署HCFSwapRouter
        console.log(chalk.yellow.bold("\n[2/2] 部署HCFSwapRouter..."));
        const HCFSwapRouter = await ethers.getContractFactory("HCFSwapRouter");
        const swapRouter = await HCFSwapRouter.deploy(
            NEW_HCF,
            NEW_BSDT,
            USDT_BSC,
            PANCAKE_ROUTER,
            gateway.address,
            deployer.address  // 费用接收者
        );
        await swapRouter.deployed();
        console.log(chalk.green("✅ HCFSwapRouter:"), swapRouter.address);
        deployedContracts.HCFSwapRouter = swapRouter.address;
        
        // 授权
        console.log(chalk.yellow.bold("\n设置授权..."));
        const bsdt = await ethers.getContractAt("BSDTToken", NEW_BSDT);
        
        // 授权Gateway和Router
        await bsdt.addAuthorizedExchange(gateway.address);
        console.log(chalk.green("✅ BSDTGateway已授权"));
        
        await bsdt.addAuthorizedExchange(swapRouter.address);
        console.log(chalk.green("✅ HCFSwapRouter已授权"));
        
    } catch (error) {
        console.log(chalk.red("部署失败:"), error.message);
        throw error;
    }
    
    // 保存地址
    const finalAddresses = {
        network: "BSC Mainnet",
        chainId: 56,
        timestamp: new Date().toISOString(),
        contracts: deployedContracts,
        note: "核心合约部署完成，可以创建流动性池"
    };
    
    fs.writeFileSync('./essential-contracts.json', JSON.stringify(finalAddresses, null, 2));
    console.log(chalk.green("\n✅ 地址已保存到 essential-contracts.json"));
    
    // 显示汇总
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         核心合约地址"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.white("HCF Token:"), NEW_HCF);
    console.log(chalk.white("BSDT Token:"), NEW_BSDT);
    console.log(chalk.white("BSDT Gateway:"), deployedContracts.BSDTGateway);
    console.log(chalk.white("HCF SwapRouter:"), deployedContracts.HCFSwapRouter);
    console.log(chalk.white("USDT (BSC):"), USDT_BSC);
    console.log(chalk.white("PancakeRouter:"), PANCAKE_ROUTER);
    
    console.log(chalk.green.bold("\n✅ 核心合约部署完成！"));
    console.log(chalk.yellow.bold("\n🎯 现在可以:"));
    console.log(chalk.white("1. 获取1 USDT"));
    console.log(chalk.white("2. 通过BSDTGateway兑换1 BSDT"));
    console.log(chalk.white("3. 创建BSDT/USDT锚定池 (1:1)"));
    console.log(chalk.white("4. 创建HCF/BSDT交易池"));
    console.log(chalk.white("5. 开始交易！"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });