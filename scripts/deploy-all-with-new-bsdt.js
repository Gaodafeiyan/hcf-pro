const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   重新部署所有合约（使用新BSDT）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);

    // 新的BSDT地址
    const NEW_BSDT = "0xf460422388C1205724EF699051aBe300215E490b";
    const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
    const PANCAKE_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    
    const deployedContracts = {};
    
    console.log(chalk.green("✅ 使用新BSDT:"), NEW_BSDT);
    deployedContracts.BSDT = NEW_BSDT;
    deployedContracts.USDT = USDT_BSC;
    
    // 验证BSDT供应量
    console.log(chalk.yellow("\n验证BSDT供应量..."));
    const bsdt = await ethers.getContractAt("BSDTToken", NEW_BSDT);
    const totalSupply = await bsdt.totalSupply();
    console.log(chalk.green("BSDT总供应量:"), ethers.utils.formatEther(totalSupply), "BSDT");
    const supplyInBillion = (parseFloat(ethers.utils.formatEther(totalSupply)) / 1000000000).toFixed(0);
    console.log(chalk.green("相当于:"), supplyInBillion, "亿枚");
    
    // 1. 部署HCF Token
    console.log(chalk.yellow.bold("\n[1/8] 部署HCF Token..."));
    const HCFToken = await ethers.getContractFactory("HCFToken");
    const hcf = await HCFToken.deploy(
        PANCAKE_ROUTER,
        deployer.address,  // 营销钱包
        deployer.address,  // 开发钱包
        deployer.address   // 流动性钱包
    );
    await hcf.deployed();
    console.log(chalk.green("✅ HCF Token:"), hcf.address);
    deployedContracts.HCF = hcf.address;
    
    // 2. 部署BurnManager
    console.log(chalk.yellow.bold("\n[2/8] 部署BurnManager..."));
    const BurnManager = await ethers.getContractFactory("BurnManager");
    const burnManager = await BurnManager.deploy(hcf.address);
    await burnManager.deployed();
    console.log(chalk.green("✅ BurnManager:"), burnManager.address);
    deployedContracts.BurnManager = burnManager.address;
    
    // 3. 部署ReferralSystem
    console.log(chalk.yellow.bold("\n[3/8] 部署ReferralSystem..."));
    const ReferralSystem = await ethers.getContractFactory("ReferralSystem");
    const referral = await ReferralSystem.deploy(hcf.address);
    await referral.deployed();
    console.log(chalk.green("✅ ReferralSystem:"), referral.address);
    deployedContracts.ReferralSystem = referral.address;
    
    // 4. 部署HCFStaking
    console.log(chalk.yellow.bold("\n[4/8] 部署HCFStaking..."));
    const HCFStaking = await ethers.getContractFactory("HCFStaking");
    const staking = await HCFStaking.deploy(
        hcf.address,
        NEW_BSDT,
        referral.address,
        burnManager.address
    );
    await staking.deployed();
    console.log(chalk.green("✅ HCFStaking:"), staking.address);
    deployedContracts.Staking = staking.address;
    
    // 5. 部署NodeNFT
    console.log(chalk.yellow.bold("\n[5/8] 部署NodeNFT..."));
    const NodeNFT = await ethers.getContractFactory("NodeNFT");
    const nodeNFT = await NodeNFT.deploy(
        NEW_BSDT,
        hcf.address,
        staking.address
    );
    await nodeNFT.deployed();
    console.log(chalk.green("✅ NodeNFT:"), nodeNFT.address);
    deployedContracts.NodeNFT = nodeNFT.address;
    
    // 6. 部署BSDTGateway
    console.log(chalk.yellow.bold("\n[6/8] 部署BSDTGateway..."));
    const BSDTGateway = await ethers.getContractFactory("BSDTGateway");
    const gateway = await BSDTGateway.deploy(
        USDT_BSC,
        NEW_BSDT,
        deployer.address  // 财务地址
    );
    await gateway.deployed();
    console.log(chalk.green("✅ BSDTGateway:"), gateway.address);
    deployedContracts.BSDTGateway = gateway.address;
    
    // 7. 部署HCFSwapRouter
    console.log(chalk.yellow.bold("\n[7/8] 部署HCFSwapRouter..."));
    const HCFSwapRouter = await ethers.getContractFactory("HCFSwapRouter");
    const swapRouter = await HCFSwapRouter.deploy(
        hcf.address,
        NEW_BSDT,
        USDT_BSC,
        PANCAKE_ROUTER,
        gateway.address,
        deployer.address  // 费用接收者
    );
    await swapRouter.deployed();
    console.log(chalk.green("✅ HCFSwapRouter:"), swapRouter.address);
    deployedContracts.HCFSwapRouter = swapRouter.address;
    
    // 8. 部署MarketControl
    console.log(chalk.yellow.bold("\n[8/8] 部署MarketControl..."));
    const MarketControl = await ethers.getContractFactory("MarketControl");
    const marketControl = await MarketControl.deploy(
        hcf.address,
        NEW_BSDT,
        PANCAKE_FACTORY,
        nodeNFT.address
    );
    await marketControl.deployed();
    console.log(chalk.green("✅ MarketControl:"), marketControl.address);
    deployedContracts.MarketControl = marketControl.address;
    
    // 设置权限和连接
    console.log(chalk.yellow.bold("\n配置合约权限..."));
    
    // 设置HCF的合约地址
    await hcf.setBurnManager(burnManager.address);
    await hcf.setReferralSystem(referral.address);
    await hcf.setStakingContract(staking.address);
    console.log(chalk.green("✅ HCF权限设置完成"));
    
    // 授权BSDT Gateway
    await bsdt.addAuthorizedExchange(gateway.address);
    await bsdt.addAuthorizedExchange(swapRouter.address);
    console.log(chalk.green("✅ BSDT授权完成"));
    
    // 保存所有地址
    const allAddresses = {
        network: "BSC Mainnet",
        chainId: 56,
        timestamp: new Date().toISOString(),
        contracts: deployedContracts
    };
    
    fs.writeFileSync('./deployed-contracts-v2.json', JSON.stringify(allAddresses, null, 2));
    console.log(chalk.green("\n✅ 所有合约地址已保存到 deployed-contracts-v2.json"));
    
    // 显示汇总
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         部署完成汇总"));
    console.log(chalk.blue.bold("========================================\n"));
    
    for (const [name, address] of Object.entries(deployedContracts)) {
        console.log(chalk.white(`${name}: ${address}`));
    }
    
    console.log(chalk.green.bold("\n✅ 所有合约重新部署完成！"));
    console.log(chalk.yellow("\n下一步："));
    console.log(chalk.white("1. 获取1 USDT"));
    console.log(chalk.white("2. 创建BSDT/USDT锚定池"));
    console.log(chalk.white("3. 创建HCF/BSDT交易池"));
    console.log(chalk.white("4. 锁定LP代币"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });