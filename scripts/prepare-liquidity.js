const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 准备创建流动性池"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), deployer.address);

    // 合约地址
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };

    // 检查余额
    console.log(chalk.yellow.bold("检查资金状态..."));
    
    try {
        // 检查USDT余额
        const usdt = await ethers.getContractAt("IERC20", contracts.USDT);
        const usdtBalance = await usdt.balanceOf(deployer.address);
        const usdtFormatted = ethers.utils.formatUnits(usdtBalance, 18);
        console.log(chalk.white("USDT余额:"), usdtFormatted, "USDT");
        
        if (parseFloat(usdtFormatted) < 1) {
            console.log(chalk.red("❌ USDT不足！需要至少1 USDT"));
        } else {
            console.log(chalk.green("✅ USDT足够"));
        }
        
        // 检查BSDT余额
        const bsdt = await ethers.getContractAt("IERC20", contracts.BSDT);
        const bsdtBalance = await bsdt.balanceOf(deployer.address);
        const bsdtFormatted = ethers.utils.formatEther(bsdtBalance);
        console.log(chalk.white("BSDT余额:"), bsdtFormatted, "BSDT");
        
        if (parseFloat(bsdtFormatted) < 10001) {
            console.log(chalk.yellow("⚠️ BSDT建议有至少10,001个"));
        } else {
            console.log(chalk.green("✅ BSDT足够"));
        }
        
        // 检查HCF余额
        const hcf = await ethers.getContractAt("IERC20", contracts.HCF);
        const hcfBalance = await hcf.balanceOf(deployer.address);
        const hcfFormatted = ethers.utils.formatEther(hcfBalance);
        console.log(chalk.white("HCF余额:"), hcfFormatted, "HCF");
        
        if (parseFloat(hcfFormatted) < 1000000) {
            console.log(chalk.yellow("⚠️ HCF建议有至少100万个"));
        } else {
            console.log(chalk.green("✅ HCF足够"));
        }
        
        // 检查BNB Gas费
        const bnbBalance = await deployer.getBalance();
        const bnbFormatted = ethers.utils.formatEther(bnbBalance);
        console.log(chalk.white("\nBNB(Gas):"), bnbFormatted, "BNB");
        
        if (parseFloat(bnbFormatted) < 0.01) {
            console.log(chalk.red("❌ BNB不足！需要Gas费"));
        } else {
            console.log(chalk.green("✅ Gas费足够"));
        }
        
    } catch (error) {
        console.log(chalk.red("检查失败:"), error.message);
    }
    
    // 创建池子建议
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         创建池子建议"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan.bold("池子1：BSDT/USDT锚定池"));
    console.log(chalk.white("  数量: 1 BSDT + 1 USDT"));
    console.log(chalk.white("  作用: 价格参考，稳定1:1\n"));
    
    console.log(chalk.cyan.bold("池子2：HCF/BSDT交易池"));
    console.log(chalk.yellow("  方案A: 100万 HCF + 1万 BSDT"));
    console.log(chalk.white("    初始价格: 1 HCF = 0.01 BSDT"));
    console.log(chalk.yellow("  方案B: 1000万 HCF + 10万 BSDT"));
    console.log(chalk.white("    初始价格: 1 HCF = 0.01 BSDT"));
    console.log(chalk.yellow("  方案C: 100万 HCF + 10万 BSDT"));
    console.log(chalk.white("    初始价格: 1 HCF = 0.1 BSDT\n"));
    
    // 操作步骤
    console.log(chalk.blue.bold("========================================"));
    console.log(chalk.blue.bold("         操作步骤"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green.bold("方法A：通过PancakeSwap网页（推荐）"));
    console.log(chalk.white("1. 访问 https://pancakeswap.finance/add"));
    console.log(chalk.white("2. 连接你的钱包"));
    console.log(chalk.white("3. 输入代币地址:"));
    console.log(chalk.gray(`   USDT: ${contracts.USDT}`));
    console.log(chalk.gray(`   BSDT: ${contracts.BSDT}`));
    console.log(chalk.gray(`   HCF: ${contracts.HCF}`));
    console.log(chalk.white("4. 输入数量并点击 Supply\n"));
    
    console.log(chalk.green.bold("方法B：通过脚本自动创建"));
    console.log(chalk.white("npx hardhat run scripts/create-pools-auto.js --network bsc"));
    console.log(chalk.yellow("⚠️ 需要先批准代币\n"));
    
    // 批准代码
    console.log(chalk.cyan.bold("批准代币示例代码:"));
    console.log(chalk.gray(`
const usdt = await ethers.getContractAt("IERC20", "${contracts.USDT}");
await usdt.approve("${contracts.PancakeRouter}", ethers.utils.parseEther("1"));

const bsdt = await ethers.getContractAt("IERC20", "${contracts.BSDT}");
await bsdt.approve("${contracts.PancakeRouter}", ethers.utils.parseEther("10001"));

const hcf = await ethers.getContractAt("IERC20", "${contracts.HCF}");
await hcf.approve("${contracts.PancakeRouter}", ethers.utils.parseEther("1000000"));\n`));
    
    console.log(chalk.green.bold("🎯 下一步:"));
    console.log(chalk.white("1. 确保有足够的资金"));
    console.log(chalk.white("2. 选择一个池子方案"));
    console.log(chalk.white("3. 创建流动性池"));
    console.log(chalk.white("4. 测试交易"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });