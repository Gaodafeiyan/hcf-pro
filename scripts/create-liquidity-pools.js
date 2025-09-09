const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   创建流动性池指南"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.gray(`操作账户: ${signer.address}\n`));

    // 合约地址
    const contracts = {
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        usdt: "0x55d398326f99059fF775485246999027B3197955",
        pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        pancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        autoSwap: "0x83714243313D69AE9d21B09d2f336e9A2713B8A5"
    };

    // 检查代币余额
    console.log(chalk.yellow.bold("【1】检查代币余额..."));
    
    const tokenABI = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function approve(address spender, uint256 amount) returns (bool)"
    ];
    
    const bsdt = new ethers.Contract(contracts.bsdtToken, tokenABI, signer);
    const hcf = new ethers.Contract(contracts.hcfToken, tokenABI, signer);
    const usdt = new ethers.Contract(contracts.usdt, tokenABI, signer);
    
    const bsdtBalance = await bsdt.balanceOf(signer.address);
    const hcfBalance = await hcf.balanceOf(signer.address);
    const usdtBalance = await usdt.balanceOf(signer.address);
    const bnbBalance = await signer.getBalance();
    
    console.log(chalk.white(`  BSDT余额: ${ethers.utils.formatEther(bsdtBalance)}`));
    console.log(chalk.white(`  HCF余额: ${ethers.utils.formatEther(hcfBalance)}`));
    console.log(chalk.white(`  USDT余额: ${ethers.utils.formatEther(usdtBalance)}`));
    console.log(chalk.white(`  BNB余额: ${ethers.utils.formatEther(bnbBalance)}\n`));
    
    // 检查池子是否已存在
    console.log(chalk.yellow.bold("【2】检查现有池子..."));
    
    const factoryABI = ["function getPair(address,address) view returns (address)"];
    const factory = new ethers.Contract(contracts.pancakeFactory, factoryABI, signer);
    
    const bsdtUsdtPair = await factory.getPair(contracts.bsdtToken, contracts.usdt);
    const hcfBsdtPair = await factory.getPair(contracts.hcfToken, contracts.bsdtToken);
    
    if (bsdtUsdtPair !== "0x0000000000000000000000000000000000000000") {
        console.log(chalk.green(`  ✅ BSDT/USDT池已存在: ${bsdtUsdtPair}`));
    } else {
        console.log(chalk.yellow("  ⚠️ BSDT/USDT池不存在，需要创建"));
    }
    
    if (hcfBsdtPair !== "0x0000000000000000000000000000000000000000") {
        console.log(chalk.green(`  ✅ HCF/BSDT池已存在: ${hcfBsdtPair}`));
    } else {
        console.log(chalk.yellow("  ⚠️ HCF/BSDT池不存在，需要创建"));
    }
    
    // 创建池子的步骤
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         创建流动性池步骤"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("📌 方案A：使用PancakeSwap界面（推荐）\n"));
    
    console.log(chalk.yellow("步骤1: 创建BSDT/USDT锚定池"));
    console.log(chalk.white("  1. 访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("  2. 选择代币:"));
    console.log(chalk.gray(`     • Token A: USDT (${contracts.usdt})`));
    console.log(chalk.gray(`     • Token B: BSDT (${contracts.bsdtToken})`));
    console.log(chalk.white("  3. 输入数量: 1 USDT + 1 BSDT"));
    console.log(chalk.white("  4. 点击 'Supply' 创建池子"));
    console.log(chalk.white("  5. 将获得的LP代币发送到黑洞地址:"));
    console.log(chalk.gray("     0x000000000000000000000000000000000000dEaD\n"));
    
    console.log(chalk.yellow("步骤2: 创建HCF/BSDT交易池"));
    console.log(chalk.white("  1. 访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("  2. 选择代币:"));
    console.log(chalk.gray(`     • Token A: HCF (${contracts.hcfToken})`));
    console.log(chalk.gray(`     • Token B: BSDT (${contracts.bsdtToken})`));
    console.log(chalk.white("  3. 输入数量:"));
    console.log(chalk.white("     • HCF: 1,000,000"));
    console.log(chalk.white("     • BSDT: 100,000"));
    console.log(chalk.white("  4. 点击 'Supply' 添加流动性"));
    console.log(chalk.white("  5. 使用PinkLock锁定LP代币10年:"));
    console.log(chalk.gray("     https://www.pinksale.finance/pinklock\n"));
    
    console.log(chalk.cyan("📌 方案B：使用脚本（需要授权）\n"));
    
    // 需要的数量
    const requiredBSDT = ethers.utils.parseEther("100001"); // 100000 + 1
    const requiredHCF = ethers.utils.parseEther("1000000");
    const requiredUSDT = ethers.utils.parseEther("1");
    
    console.log(chalk.yellow("资金需求:"));
    console.log(chalk.white("  • BSDT: 100,001 (1个锚定池 + 10万交易池)"));
    console.log(chalk.white("  • HCF: 1,000,000"));
    console.log(chalk.white("  • USDT: 1"));
    console.log(chalk.white("  • BNB: 约0.05 (gas费)\n"));
    
    // 检查余额是否充足
    let canCreate = true;
    
    if (bsdtBalance.lt(requiredBSDT)) {
        const needed = ethers.utils.formatEther(requiredBSDT.sub(bsdtBalance));
        console.log(chalk.red(`  ❌ BSDT不足，还需要: ${needed}`));
        canCreate = false;
    } else {
        console.log(chalk.green("  ✅ BSDT充足"));
    }
    
    if (hcfBalance.lt(requiredHCF)) {
        const needed = ethers.utils.formatEther(requiredHCF.sub(hcfBalance));
        console.log(chalk.red(`  ❌ HCF不足，还需要: ${needed}`));
        canCreate = false;
    } else {
        console.log(chalk.green("  ✅ HCF充足"));
    }
    
    if (usdtBalance.lt(requiredUSDT)) {
        console.log(chalk.red(`  ❌ USDT不足，需要至少1个`));
        canCreate = false;
    } else {
        console.log(chalk.green("  ✅ USDT充足"));
    }
    
    if (bnbBalance.lt(ethers.utils.parseEther("0.05"))) {
        console.log(chalk.yellow("  ⚠️ BNB可能不足"));
    }
    
    if (canCreate) {
        console.log(chalk.green("\n✅ 资金充足，可以创建流动性池！"));
        console.log(chalk.cyan("\n运行授权脚本:"));
        console.log(chalk.white("  npx hardhat run scripts/approve-and-add-liquidity.js --network bsc"));
    } else {
        console.log(chalk.yellow("\n⚠️ 资金不足，请先准备好所需代币"));
    }
    
    // AutoSwap合约流动性
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         AutoSwap合约配置"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("为AutoSwap合约注入流动性:"));
    console.log(chalk.white("  1. 向AutoSwap合约转入BSDT和USDT"));
    console.log(chalk.white("  2. 这样用户可以直接兑换"));
    console.log(chalk.white("  3. 建议注入:"));
    console.log(chalk.white("     • 10,000 BSDT"));
    console.log(chalk.white("     • 10,000 USDT"));
    console.log(chalk.gray(`\n  合约地址: ${contracts.autoSwap}`));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });