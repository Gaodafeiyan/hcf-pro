const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   配置AutoSwap合约（低Gas版）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`操作账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    // AutoSwap合约地址（已部署）
    const autoSwapAddress = "0x83714243313D69AE9d21B09d2f336e9A2713B8A5";
    
    console.log(chalk.green(`✅ 使用已部署的AutoSwap合约: ${autoSwapAddress}\n`));

    // 获取合约实例
    const AutoSwap = await ethers.getContractFactory("HCFAutoSwap");
    const autoSwap = AutoSwap.attach(autoSwapAddress);

    // 设置低gas价格 (BSC通常5 gwei就够了)
    const gasPrice = ethers.utils.parseUnits("5", "gwei");
    console.log(chalk.cyan(`使用Gas价格: 5 gwei\n`));

    try {
        // 1. 设置手续费
        console.log(chalk.yellow.bold("【1】设置手续费..."));
        const tx1 = await autoSwap.setSwapFee(300, { 
            gasLimit: 50000,
            gasPrice: gasPrice
        });
        console.log(chalk.gray(`  交易哈希: ${tx1.hash}`));
        await tx1.wait();
        console.log(chalk.green("  ✅ 手续费设置为3%"));
        
        // 2. 设置最小兑换金额
        console.log(chalk.yellow.bold("\n【2】设置最小兑换金额..."));
        const tx2 = await autoSwap.setMinSwapAmount(ethers.utils.parseEther("10"), { 
            gasLimit: 50000,
            gasPrice: gasPrice
        });
        console.log(chalk.gray(`  交易哈希: ${tx2.hash}`));
        await tx2.wait();
        console.log(chalk.green("  ✅ 最小兑换金额: 10 USDT/BSDT"));
        
        // 3. 读取当前配置
        console.log(chalk.yellow.bold("\n【3】验证配置..."));
        const swapFee = await autoSwap.swapFee();
        const minAmount = await autoSwap.minSwapAmount();
        
        console.log(chalk.white(`  当前手续费: ${swapFee/100}%`));
        console.log(chalk.white(`  最小兑换: ${ethers.utils.formatEther(minAmount)} BSDT/USDT`));
        
        console.log(chalk.green("\n✅ 配置完成！"));
        
    } catch (error) {
        console.log(chalk.red(`\n配置失败: ${error.message}`));
        
        if (error.message.includes("INSUFFICIENT_FUNDS")) {
            console.log(chalk.yellow("\n💡 解决方案:"));
            console.log(chalk.white("1. 充值更多BNB (建议至少0.05 BNB)"));
            console.log(chalk.white("2. 或等待网络拥堵缓解"));
        }
    }

    // 检查合约状态
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         合约状态"));
    console.log(chalk.blue.bold("========================================\n"));
    
    try {
        const treasury = await autoSwap.treasury();
        const owner = await autoSwap.owner();
        
        console.log(chalk.cyan("合约信息:"));
        console.log(chalk.white(`  合约地址: ${autoSwapAddress}`));
        console.log(chalk.white(`  Owner: ${owner}`));
        console.log(chalk.white(`  Treasury: ${treasury}`));
        
        // 检查合约余额
        const bsdtAddress = await autoSwap.bsdtToken();
        const usdtAddress = await autoSwap.usdtToken();
        const hcfAddress = await autoSwap.hcfToken();
        
        console.log(chalk.cyan("\n代币地址:"));
        console.log(chalk.white(`  BSDT: ${bsdtAddress}`));
        console.log(chalk.white(`  USDT: ${usdtAddress}`));
        console.log(chalk.white(`  HCF: ${hcfAddress}`));
        
    } catch (e) {
        console.log(chalk.yellow("  无法读取部分状态"));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });