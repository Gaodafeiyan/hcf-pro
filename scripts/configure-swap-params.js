const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   配置AutoSwap合约参数"));
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

    try {
        // 配置兑换参数
        console.log(chalk.yellow.bold("【1】设置手续费..."));
        const tx1 = await autoSwap.setSwapFee(300, { gasLimit: 100000 });
        await tx1.wait();
        console.log(chalk.green("  ✅ 手续费设置为3%"));
        
        console.log(chalk.yellow.bold("\n【2】设置最小兑换金额..."));
        const tx2 = await autoSwap.setMinSwapAmount(ethers.utils.parseEther("10"), { gasLimit: 100000 });
        await tx2.wait();
        console.log(chalk.green("  ✅ 最小兑换金额: 10 USDT/BSDT"));
        
        console.log(chalk.green("\n✅ 配置完成！"));
        
    } catch (error) {
        console.log(chalk.red(`\n配置失败: ${error.message}`));
        console.log(chalk.yellow("\n提示：请确保有足够的BNB支付gas费"));
    }

    // 显示下一步操作
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         下一步操作"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("1️⃣ 授权代币给Router:"));
    console.log(chalk.white("   运行: npx hardhat run scripts/approve-tokens.js --network bsc\n"));
    
    console.log(chalk.cyan("2️⃣ 添加流动性:"));
    console.log(chalk.white("   访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("   • BSDT/USDT池: 1:1"));
    console.log(chalk.white("   • HCF/BSDT池: 1000000:100000\n"));
    
    console.log(chalk.cyan("3️⃣ 启动监控服务:"));
    console.log(chalk.white("   运行: npx hardhat run scripts/swap-monitor-service.js --network bsc"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });