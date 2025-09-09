const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   检查AutoSwap合约状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    // AutoSwap合约地址
    const autoSwapAddress = "0x83714243313D69AE9d21B09d2f336e9A2713B8A5";
    
    // 合约ABI
    const autoSwapABI = [
        "function swapFee() view returns (uint256)",
        "function minSwapAmount() view returns (uint256)",
        "function treasury() view returns (address)",
        "function owner() view returns (address)",
        "function bsdtToken() view returns (address)",
        "function usdtToken() view returns (address)",
        "function hcfToken() view returns (address)",
        "function pancakeRouter() view returns (address)",
        "function totalBSDTtoUSDT() view returns (uint256)",
        "function totalUSDTtoBSDT() view returns (uint256)",
        "function totalFeesCollected() view returns (uint256)",
        "function getReserves() view returns (uint256,uint256,uint256)"
    ];
    
    const autoSwap = new ethers.Contract(autoSwapAddress, autoSwapABI, signer);
    
    console.log(chalk.cyan("📊 合约基本信息:"));
    console.log(chalk.white(`  合约地址: ${autoSwapAddress}`));
    
    try {
        const owner = await autoSwap.owner();
        const treasury = await autoSwap.treasury();
        console.log(chalk.white(`  Owner: ${owner}`));
        console.log(chalk.white(`  Treasury: ${treasury}`));
        
        const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
        if (isOwner) {
            console.log(chalk.green(`  ✅ 你是合约Owner，可以配置参数`));
        } else {
            console.log(chalk.yellow(`  ⚠️ 你不是Owner，无法配置参数`));
        }
    } catch (e) {
        console.log(chalk.red(`  ❌ 无法读取Owner信息`));
    }
    
    console.log(chalk.cyan("\n⚙️ 当前配置:"));
    try {
        const swapFee = await autoSwap.swapFee();
        const minAmount = await autoSwap.minSwapAmount();
        
        console.log(chalk.white(`  手续费: ${swapFee/100}%`));
        console.log(chalk.white(`  最小兑换: ${ethers.utils.formatEther(minAmount)} BSDT/USDT`));
        
        if (swapFee === 0) {
            console.log(chalk.yellow("  ⚠️ 手续费未设置"));
        }
    } catch (e) {
        console.log(chalk.red(`  ❌ 无法读取配置`));
    }
    
    console.log(chalk.cyan("\n💰 代币地址:"));
    try {
        const bsdt = await autoSwap.bsdtToken();
        const usdt = await autoSwap.usdtToken();
        const hcf = await autoSwap.hcfToken();
        const router = await autoSwap.pancakeRouter();
        
        console.log(chalk.white(`  BSDT: ${bsdt}`));
        console.log(chalk.white(`  USDT: ${usdt}`));
        console.log(chalk.white(`  HCF: ${hcf}`));
        console.log(chalk.white(`  Router: ${router}`));
    } catch (e) {
        console.log(chalk.red(`  ❌ 无法读取代币地址`));
    }
    
    console.log(chalk.cyan("\n📈 统计数据:"));
    try {
        const totalBSDTtoUSDT = await autoSwap.totalBSDTtoUSDT();
        const totalUSDTtoBSDT = await autoSwap.totalUSDTtoBSDT();
        const totalFees = await autoSwap.totalFeesCollected();
        
        console.log(chalk.white(`  BSDT→USDT总量: ${ethers.utils.formatEther(totalBSDTtoUSDT)}`));
        console.log(chalk.white(`  USDT→BSDT总量: ${ethers.utils.formatEther(totalUSDTtoBSDT)}`));
        console.log(chalk.white(`  收取手续费总量: ${ethers.utils.formatEther(totalFees)}`));
    } catch (e) {
        console.log(chalk.gray(`  暂无交易数据`));
    }
    
    console.log(chalk.cyan("\n💼 合约储备:"));
    try {
        const reserves = await autoSwap.getReserves();
        console.log(chalk.white(`  BSDT储备: ${ethers.utils.formatEther(reserves[0])}`));
        console.log(chalk.white(`  USDT储备: ${ethers.utils.formatEther(reserves[1])}`));
        console.log(chalk.white(`  HCF储备: ${ethers.utils.formatEther(reserves[2])}`));
        
        if (reserves[0].eq(0) && reserves[1].eq(0)) {
            console.log(chalk.yellow("\n  ⚠️ 合约需要注入流动性才能运行"));
        }
    } catch (e) {
        console.log(chalk.gray(`  暂无储备`));
    }
    
    // 检查账户余额
    const balance = await signer.getBalance();
    console.log(chalk.cyan("\n💳 你的账户:"));
    console.log(chalk.white(`  地址: ${signer.address}`));
    console.log(chalk.white(`  BNB余额: ${ethers.utils.formatEther(balance)}`));
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        console.log(chalk.yellow("  ⚠️ BNB余额较低，可能无法执行交易"));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });