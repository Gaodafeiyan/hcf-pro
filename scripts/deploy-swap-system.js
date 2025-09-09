const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   部署SWAP系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`部署账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    // 合约地址
    const contracts = {
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        pancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        usdt: "0x55d398326f99059fF775485246999027B3197955" // BSC USDT
    };

    // 步骤1: 部署自动兑换合约
    console.log(chalk.yellow.bold("【1】部署自动兑换合约..."));
    
    const AutoSwap = await ethers.getContractFactory("HCFAutoSwap");
    const autoSwap = await AutoSwap.deploy(
        contracts.bsdtToken,
        contracts.usdt,
        contracts.hcfToken,
        contracts.pancakeRouter
    );
    await autoSwap.deployed();
    
    console.log(chalk.green(`✅ 自动兑换合约: ${autoSwap.address}`));
    
    // 步骤2: 配置兑换参数
    console.log(chalk.yellow.bold("\n【2】配置兑换参数..."));
    
    // 设置手续费 (3%)
    await autoSwap.setSwapFee(300);
    console.log(chalk.green("  ✅ 手续费设置为3%"));
    
    // 设置最小兑换金额
    await autoSwap.setMinSwapAmount(ethers.utils.parseEther("10"));
    console.log(chalk.green("  ✅ 最小兑换金额: 10 USDT/BSDT"));
    
    // 步骤3: 授权代币
    console.log(chalk.yellow.bold("\n【3】授权代币给Router..."));
    
    const tokenABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address) view returns (uint256)"
    ];
    
    const bsdt = new ethers.Contract(contracts.bsdtToken, tokenABI, deployer);
    const hcf = new ethers.Contract(contracts.hcfToken, tokenABI, deployer);
    
    // 检查余额
    const bsdtBalance = await bsdt.balanceOf(deployer.address);
    const hcfBalance = await hcf.balanceOf(deployer.address);
    
    console.log(chalk.white(`  BSDT余额: ${ethers.utils.formatEther(bsdtBalance)}`));
    console.log(chalk.white(`  HCF余额: ${ethers.utils.formatEther(hcfBalance)}`));
    
    // 授权金额
    const bsdtApproveAmount = ethers.utils.parseEther("100001"); // 100000 + 1 for pools
    const hcfApproveAmount = ethers.utils.parseEther("1000000");
    
    if (bsdtBalance.gte(bsdtApproveAmount)) {
        await bsdt.approve(contracts.pancakeRouter, bsdtApproveAmount);
        console.log(chalk.green("  ✅ BSDT已授权给Router"));
    } else {
        console.log(chalk.yellow("  ⚠️ BSDT余额不足，跳过授权"));
    }
    
    if (hcfBalance.gte(hcfApproveAmount)) {
        await hcf.approve(contracts.pancakeRouter, hcfApproveAmount);
        console.log(chalk.green("  ✅ HCF已授权给Router"));
    } else {
        console.log(chalk.yellow("  ⚠️ HCF余额不足，跳过授权"));
    }
    
    // 步骤4: 检查是否需要USDT
    console.log(chalk.yellow.bold("\n【4】检查USDT..."));
    
    // 检查是否有USDT用于创建锚定池
    if (contracts.usdt !== "0x0000000000000000000000000000000000000000") {
        const usdt = new ethers.Contract(contracts.usdt, tokenABI, deployer);
        const usdtBalance = await usdt.balanceOf(deployer.address);
        console.log(chalk.white(`  USDT余额: ${ethers.utils.formatEther(usdtBalance)}`));
        
        if (usdtBalance.gte(ethers.utils.parseEther("1"))) {
            await usdt.approve(contracts.pancakeRouter, ethers.utils.parseEther("1"));
            console.log(chalk.green("  ✅ USDT已授权给Router"));
        } else {
            console.log(chalk.yellow("  ⚠️ 需要至少1 USDT创建锚定池"));
        }
    }
    
    // 步骤5: 创建流动性池指导
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         下一步操作"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("1️⃣ 创建BSDT/USDT锚定池 (仅价格参考):"));
    console.log(chalk.white("   访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("   • 添加 1 BSDT + 1 USDT"));
    console.log(chalk.white("   • 获取LP代币后发送到黑洞地址锁定"));
    console.log(chalk.gray("   • 黑洞地址: 0x000000000000000000000000000000000000dEaD\n"));
    
    console.log(chalk.cyan("2️⃣ 创建HCF/BSDT交易池:"));
    console.log(chalk.white("   访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("   • 添加 1,000,000 HCF + 100,000 BSDT"));
    console.log(chalk.white("   • 设置初始价格 1 HCF = 0.1 BSDT"));
    console.log(chalk.white("   • 锁定LP代币10年\n"));
    
    console.log(chalk.cyan("3️⃣ 启动监控服务:"));
    console.log(chalk.white("   运行: npx hardhat run scripts/swap-monitor-service.js"));
    console.log(chalk.white("   • 自动监控BSDT/USDT转账"));
    console.log(chalk.white("   • 自动执行兑换\n"));
    
    console.log(chalk.cyan("4️⃣ 配置前端:"));
    console.log(chalk.white("   • 显示 USDT ⇄ HCF 直接兑换"));
    console.log(chalk.white("   • 隐藏BSDT中间过程"));
    console.log(chalk.white("   • 集成自动兑换合约\n"));
    
    // 保存部署信息
    const fs = require('fs');
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        autoSwapContract: autoSwap.address,
        contracts: contracts,
        config: {
            swapFee: "3%",
            minSwapAmount: "10 USDT/BSDT",
            pools: {
                anchorPool: "1 BSDT + 1 USDT (locked)",
                tradingPool: "1M HCF + 100K BSDT"
            }
        }
    };
    
    fs.writeFileSync('./swap-system-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log(chalk.green("📄 部署信息已保存到 swap-system-deployment.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });