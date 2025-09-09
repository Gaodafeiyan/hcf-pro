const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   设置SWAP系统流动性"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.gray(`操作账户: ${signer.address}\n`));

    // 合约地址
    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        usdtToken: "0x55d398326f99059fF775485246999027B3197955",
        bsdtGateway: "0xb4c9C3E8CA4365c04d47dD6113831449213731ca",
        hcfSwapRouter: "0x266b661f952dF7f5FBC97b28E9828775d9F0e75d",
        pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        pancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };

    // 检查余额
    console.log(chalk.yellow.bold("【1】检查账户余额"));
    
    const tokenABI = [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];
    
    const bsdt = new ethers.Contract(contracts.bsdtToken, tokenABI, signer);
    const hcf = new ethers.Contract(contracts.hcfToken, tokenABI, signer);
    const usdt = new ethers.Contract(contracts.usdtToken, tokenABI, signer);
    
    const bsdtBalance = await bsdt.balanceOf(signer.address);
    const hcfBalance = await hcf.balanceOf(signer.address);
    const usdtBalance = await usdt.balanceOf(signer.address);
    
    console.log(chalk.white(`  BSDT: ${ethers.utils.formatEther(bsdtBalance)}`));
    console.log(chalk.white(`  HCF: ${ethers.utils.formatEther(hcfBalance)}`));
    console.log(chalk.white(`  USDT: ${ethers.utils.formatEther(usdtBalance)}\n`));

    // 准备储备金
    console.log(chalk.yellow.bold("【2】准备储备金"));
    
    console.log(chalk.cyan("A. BSDTGateway需要BSDT储备（供USDT兑换）:"));
    const bsdtReserveNeeded = ethers.utils.parseEther("50000"); // 5万BSDT储备
    if (bsdtBalance.gte(bsdtReserveNeeded)) {
        console.log(chalk.green(`  ✅ 有足够BSDT (需要50,000)`));
        console.log(chalk.white(`  转账命令:`));
        console.log(chalk.gray(`  await bsdt.transfer("${contracts.bsdtGateway}", "${bsdtReserveNeeded}")`));
    } else {
        console.log(chalk.red(`  ❌ BSDT不足 (需要50,000)`));
    }
    
    console.log(chalk.cyan("\nB. HCFSwapRouter需要USDT储备（供HCF卖出）:"));
    const usdtReserveNeeded = ethers.utils.parseEther("10000"); // 1万USDT储备
    if (usdtBalance.gte(usdtReserveNeeded)) {
        console.log(chalk.green(`  ✅ 有足够USDT (需要10,000)`));
        console.log(chalk.white(`  转账命令:`));
        console.log(chalk.gray(`  await usdt.transfer("${contracts.hcfSwapRouter}", "${usdtReserveNeeded}")`));
    } else {
        console.log(chalk.red(`  ❌ USDT不足 (需要10,000)`));
    }

    // 创建流动性池
    console.log(chalk.yellow.bold("\n【3】创建流动性池"));
    
    console.log(chalk.cyan("A. BSDT/USDT锚定池（1:1价格参考）:"));
    console.log(chalk.white("  需要: 1 BSDT + 1 USDT"));
    console.log(chalk.white("  步骤:"));
    console.log(chalk.gray("  1. 访问 https://pancakeswap.finance/add"));
    console.log(chalk.gray(`  2. Token A: USDT (${contracts.usdtToken})`));
    console.log(chalk.gray(`  3. Token B: BSDT (${contracts.bsdtToken})`));
    console.log(chalk.gray("  4. 输入: 1 USDT + 1 BSDT"));
    console.log(chalk.gray("  5. 点击Supply"));
    console.log(chalk.gray("  6. LP代币发送到黑洞: 0x000000000000000000000000000000000000dEaD\n"));
    
    console.log(chalk.cyan("B. HCF/BSDT交易池（真实交易）:"));
    console.log(chalk.white("  需要: 1,000,000 HCF + 100,000 BSDT"));
    
    const hcfNeeded = ethers.utils.parseEther("1000000");
    const bsdtNeeded = ethers.utils.parseEther("100001"); // 100000 + 1 for anchor
    
    const canCreatePools = hcfBalance.gte(hcfNeeded) && bsdtBalance.gte(bsdtNeeded);
    
    if (canCreatePools) {
        console.log(chalk.green("  ✅ 有足够代币创建池子"));
    } else {
        console.log(chalk.red("  ❌ 代币不足"));
        if (hcfBalance.lt(hcfNeeded)) {
            console.log(chalk.red(`     需要更多HCF: ${ethers.utils.formatEther(hcfNeeded.sub(hcfBalance))}`));
        }
        if (bsdtBalance.lt(bsdtNeeded)) {
            console.log(chalk.red(`     需要更多BSDT: ${ethers.utils.formatEther(bsdtNeeded.sub(bsdtBalance))}`));
        }
    }
    
    console.log(chalk.white("\n  步骤:"));
    console.log(chalk.gray("  1. 访问 https://pancakeswap.finance/add"));
    console.log(chalk.gray(`  2. Token A: HCF (${contracts.hcfToken})`));
    console.log(chalk.gray(`  3. Token B: BSDT (${contracts.bsdtToken})`));
    console.log(chalk.gray("  4. 输入: 1,000,000 HCF + 100,000 BSDT"));
    console.log(chalk.gray("  5. 点击Supply"));
    console.log(chalk.gray("  6. 使用PinkLock锁定LP 10年"));

    // 检查池子状态
    console.log(chalk.yellow.bold("\n【4】检查池子状态"));
    
    const factoryABI = ["function getPair(address,address) view returns (address)"];
    const factory = new ethers.Contract(contracts.pancakeFactory, factoryABI, signer);
    
    const bsdtUsdtPair = await factory.getPair(contracts.bsdtToken, contracts.usdtToken);
    const hcfBsdtPair = await factory.getPair(contracts.hcfToken, contracts.bsdtToken);
    
    console.log(chalk.white("  BSDT/USDT池:"));
    if (bsdtUsdtPair === "0x0000000000000000000000000000000000000000") {
        console.log(chalk.yellow("    ⚠️ 未创建"));
    } else {
        console.log(chalk.green(`    ✅ ${bsdtUsdtPair}`));
    }
    
    console.log(chalk.white("  HCF/BSDT池:"));
    if (hcfBsdtPair === "0x0000000000000000000000000000000000000000") {
        console.log(chalk.yellow("    ⚠️ 未创建"));
    } else {
        console.log(chalk.green(`    ✅ ${hcfBsdtPair}`));
    }

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         执行顺序"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("1️⃣ 注入储备金:"));
    console.log(chalk.white("   • 50,000 BSDT → BSDTGateway"));
    console.log(chalk.white("   • 10,000 USDT → HCFSwapRouter\n"));
    
    console.log(chalk.cyan("2️⃣ 创建BSDT/USDT锚定池:"));
    console.log(chalk.white("   • 1 BSDT + 1 USDT"));
    console.log(chalk.white("   • LP发到黑洞\n"));
    
    console.log(chalk.cyan("3️⃣ 创建HCF/BSDT交易池:"));
    console.log(chalk.white("   • 1,000,000 HCF + 100,000 BSDT"));
    console.log(chalk.white("   • LP锁定10年\n"));
    
    console.log(chalk.green.bold("完成后系统即可运行！"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });