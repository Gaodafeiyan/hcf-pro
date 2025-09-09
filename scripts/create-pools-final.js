const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 最终创建流动性池"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), deployer.address);
    
    // 合约地址 - 确保USDT地址正确
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const USDT = "0x55d398326f99059fF775485246999027B3197955"; // BSC主网USDT (18 decimals)
    const HCF = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    console.log(chalk.green("✅ SimpleBSDT:"), SimpleBSDT_ADDRESS);
    console.log(chalk.green("✅ USDT:"), USDT);
    console.log(chalk.green("✅ HCF:"), HCF);
    
    try {
        // 获取合约实例
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", HCF);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n1. 检查余额："));
        const bsdtBal = await bsdt.balanceOf(deployer.address);
        const usdtBal = await usdt.balanceOf(deployer.address);
        const hcfBal = await hcf.balanceOf(deployer.address);
        
        console.log("SimpleBSDT:", ethers.utils.formatEther(bsdtBal), "BSDT");
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18), "USDT"); // BSC USDT uses 18 decimals
        console.log("HCF:", ethers.utils.formatEther(hcfBal), "HCF");
        
        // 检查所有授权
        console.log(chalk.yellow.bold("\n2. 检查授权状态："));
        
        const bsdtAllowance = await bsdt.allowance(deployer.address, PancakeRouter);
        const usdtAllowance = await usdt.allowance(deployer.address, PancakeRouter);
        const hcfAllowance = await hcf.allowance(deployer.address, PancakeRouter);
        
        console.log("BSDT授权:", bsdtAllowance.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : "❌ 需要授权");
        console.log("USDT授权:", usdtAllowance.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : "❌ 需要授权");
        console.log("HCF授权:", hcfAllowance.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : "❌ 需要授权");
        
        // 如果需要，重新授权
        if (!bsdtAllowance.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.cyan("授权BSDT..."));
            await bsdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            console.log(chalk.green("✅ BSDT已授权"));
        }
        
        if (!usdtAllowance.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.cyan("授权USDT..."));
            await usdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            console.log(chalk.green("✅ USDT已授权"));
        }
        
        if (!hcfAllowance.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.cyan("授权HCF..."));
            await hcf.approve(PancakeRouter, ethers.constants.MaxUint256);
            console.log(chalk.green("✅ HCF已授权"));
        }
        
        // 获取合约
        const router = await ethers.getContractAt(
            ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
            PancakeRouter
        );
        
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)",
             "function createPair(address,address) returns (address)"],
            PancakeFactory
        );
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        
        // 创建池子1：BSDT/USDT（1:1锚定）
        console.log(chalk.yellow.bold("\n3. 创建BSDT/USDT锚定池..."));
        
        let bsdtUsdtPair = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
        
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            // 先创建池子
            console.log(chalk.cyan("创建BSDT/USDT池子..."));
            const createTx1 = await factory.createPair(SimpleBSDT_ADDRESS, USDT);
            await createTx1.wait();
            
            bsdtUsdtPair = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
            console.log(chalk.green("✅ 池子已创建:"), bsdtUsdtPair);
            
            // 添加流动性 - 使用较小金额避免余额不足
            const bsdtAmount = ethers.utils.parseEther("1");
            const usdtAmount = ethers.utils.parseUnits("1", 18); // BSC USDT uses 18 decimals
            
            console.log(chalk.cyan("添加流动性: 1 BSDT + 1 USDT..."));
            console.log(chalk.white("BSDT数量:", ethers.utils.formatEther(bsdtAmount)));
            console.log(chalk.white("USDT数量:", ethers.utils.formatUnits(usdtAmount, 18)));
            
            const tx1 = await router.addLiquidity(
                SimpleBSDT_ADDRESS,
                USDT,
                bsdtAmount,
                usdtAmount,
                bsdtAmount.mul(95).div(100), // 允许5%滑点
                usdtAmount.mul(95).div(100), // 允许5%滑点
                deployer.address,
                deadline
            );
            await tx1.wait();
            console.log(chalk.green("✅ BSDT/USDT流动性已添加"));
        } else {
            console.log(chalk.green("✅ BSDT/USDT池子已存在:"), bsdtUsdtPair);
        }
        
        // 创建池子2：HCF/BSDT（100万:10万）
        console.log(chalk.yellow.bold("\n4. 创建HCF/BSDT交易池..."));
        
        let hcfBsdtPair = await factory.getPair(HCF, SimpleBSDT_ADDRESS);
        
        if (hcfBsdtPair === ethers.constants.AddressZero) {
            // 先创建池子
            console.log(chalk.cyan("创建HCF/BSDT池子..."));
            const createTx2 = await factory.createPair(HCF, SimpleBSDT_ADDRESS);
            await createTx2.wait();
            
            hcfBsdtPair = await factory.getPair(HCF, SimpleBSDT_ADDRESS);
            console.log(chalk.green("✅ 池子已创建:"), hcfBsdtPair);
            
            // 添加流动性
            const hcfAmount = ethers.utils.parseEther("1000000");   // 100万 HCF
            const bsdtForHcf = ethers.utils.parseEther("100000");   // 10万 BSDT
            
            console.log(chalk.cyan("添加流动性: 100万 HCF + 10万 BSDT..."));
            console.log(chalk.white("初始价格: 1 HCF = 0.1 BSDT = 0.1 USDT"));
            
            const tx2 = await router.addLiquidity(
                HCF,
                SimpleBSDT_ADDRESS,
                hcfAmount,
                bsdtForHcf,
                hcfAmount.mul(95).div(100), // 允许5%滑点
                bsdtForHcf.mul(95).div(100), // 允许5%滑点
                deployer.address,
                deadline
            );
            await tx2.wait();
            console.log(chalk.green("✅ HCF/BSDT流动性已添加"));
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子已存在:"), hcfBsdtPair);
        }
        
        // 显示最终结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 成功创建所有池子"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("池子信息："));
        
        console.log(chalk.white("\nBSDT/USDT锚定池:"));
        console.log("  地址:", bsdtUsdtPair);
        console.log("  比例: 1:1");
        console.log("  查看:", `https://pancakeswap.finance/info/v2/pair/${bsdtUsdtPair}`);
        
        console.log(chalk.white("\nHCF/BSDT交易池:"));
        console.log("  地址:", hcfBsdtPair);
        console.log("  比例: 10:1 (1 HCF = 0.1 BSDT)");
        console.log("  查看:", `https://pancakeswap.finance/info/v2/pair/${hcfBsdtPair}`);
        
        console.log(chalk.green.bold("\n✅ 系统已完全部署！"));
        console.log(chalk.white("- SimpleBSDT可以在PancakeSwap交易"));
        console.log(chalk.white("- 价格会正常显示"));
        console.log(chalk.white("- 符合你的需求文档"));
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
        
        // 详细错误分析
        if (error.message.includes("TRANSFER_FROM_FAILED")) {
            console.log(chalk.yellow("\n问题: 代币转账失败"));
            console.log(chalk.white("可能原因:"));
            console.log("1. 余额不足");
            console.log("2. 授权问题");
            console.log("3. 代币合约限制");
        }
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 脚本执行完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });