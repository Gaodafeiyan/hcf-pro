const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚪 通过Gateway创建流动性"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        BSDTGateway: "0xcED40bF4AF4dD04F821Bd777f7d953861cfD9cda",
        BSDTUSDTPair: "0x9495B0d829bA860eD2486f22d1204391A2607ad4",
        HCFBSDTPair: "0xE936EB1B86f6ab84cB45c3FbD36d39E21734AcA2"
    };

    try {
        console.log(chalk.yellow.bold("问题分析："));
        console.log(chalk.white("BSDT合约禁止向DEX池子转账（安全机制）"));
        console.log(chalk.white("解决方案：使用BSDTGateway或修改合约"));
        
        // 获取合约
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n1. 当前余额："));
        const usdtBal = await usdt.balanceOf(signer.address);
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        
        // 方案A：将池子加入白名单（移除DEX检测）
        console.log(chalk.yellow.bold("\n2. 解决方案A：修改BSDT合约"));
        console.log(chalk.white("需要部署新的BSDT合约，移除_isDEXPair检测"));
        console.log(chalk.white("或者添加一个函数来豁免特定池子"));
        
        // 方案B：使用其他方式
        console.log(chalk.yellow.bold("\n3. 解决方案B：直接交易"));
        console.log(chalk.white("系统已部署完成，可以通过以下方式使用："));
        console.log(chalk.white("- 用户通过BSDTGateway将USDT兑换为BSDT"));
        console.log(chalk.white("- 用户通过HCFSwapRouter买卖HCF"));
        console.log(chalk.white("- 不需要在PancakeSwap创建池子"));
        
        // 显示系统架构
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         系统架构说明"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.cyan.bold("BSDT设计理念："));
        console.log(chalk.white("1. BSDT不能在DEX交易（防止价格偏离）"));
        console.log(chalk.white("2. 只能通过官方Gateway兑换"));
        console.log(chalk.white("3. 保持1:1锚定USDT"));
        
        console.log(chalk.cyan.bold("\nHCF交易流程："));
        console.log(chalk.white("1. 用户使用USDT"));
        console.log(chalk.white("2. 通过HCFSwapRouter自动处理"));
        console.log(chalk.white("3. 内部完成USDT→BSDT→HCF转换"));
        
        console.log(chalk.cyan.bold("\n已部署合约："));
        console.log(chalk.white("BSDTGateway:", contracts.BSDTGateway));
        console.log(chalk.white("  功能: USDT→BSDT单向兑换"));
        console.log(chalk.white("HCFSwapRouter:", "0x2e386A8313Cc33a24370A25Fdae5E8d5C548760a"));
        console.log(chalk.white("  功能: 处理HCF买卖"));
        
        console.log(chalk.yellow.bold("\n建议："));
        console.log(chalk.white("1. 如果需要PancakeSwap池子，需要重新部署BSDT"));
        console.log(chalk.white("2. 或者使用现有的Gateway系统进行交易"));
        console.log(chalk.white("3. HCF可以正常在PancakeSwap创建池子"));
        
        // 创建HCF/USDT池子（替代方案）
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         替代方案：创建HCF/USDT池子"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.cyan("可以创建HCF/USDT直接交易池："));
        console.log(chalk.white("1. HCF没有DEX限制"));
        console.log(chalk.white("2. 可以直接在PancakeSwap交易"));
        console.log(chalk.white("3. 初始价格: 1 HCF = 0.1 USDT"));
        
        const pairABI = [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function mint(address to) external returns (uint liquidity)"
        ];
        
        // 检查是否要创建HCF/USDT池子
        const factoryABI = ["function getPair(address tokenA, address tokenB) external view returns (address pair)"];
        const factory = new ethers.Contract("0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", factoryABI, signer);
        const hcfUsdtPair = await factory.getPair(contracts.HCF, contracts.USDT);
        
        if (hcfUsdtPair !== ethers.constants.AddressZero) {
            console.log(chalk.green("\n✅ HCF/USDT池子已存在:", hcfUsdtPair));
            console.log(`查看: https://pancakeswap.finance/info/v2/pair/${hcfUsdtPair}`);
        } else {
            console.log(chalk.yellow("\n可以创建HCF/USDT池子"));
            console.log(chalk.white("运行: npx hardhat run scripts/create-hcf-usdt-pool.js --network bsc"));
        }
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });