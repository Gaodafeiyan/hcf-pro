const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💧 创建BSDT/USDT锚定池 (1:1)"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);
    
    // 合约地址
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const USDT = "0x55d398326f99059fF775485246999027B3197955"; // BSC主网USDT
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    console.log(chalk.green("合约地址："));
    console.log("SimpleBSDT:", SimpleBSDT_ADDRESS);
    console.log("USDT:", USDT);
    console.log("PancakeRouter:", PancakeRouter);
    
    try {
        // 获取合约实例
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n1. 检查余额："));
        const bsdtBal = await bsdt.balanceOf(deployer.address);
        const usdtBal = await usdt.balanceOf(deployer.address);
        const bnbBal = await deployer.getBalance();
        
        console.log("SimpleBSDT:", ethers.utils.formatEther(bsdtBal), "BSDT");
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18), "USDT");
        console.log("BNB:", ethers.utils.formatEther(bnbBal), "BNB");
        
        // 设置添加流动性的数量
        const bsdtAmount = ethers.utils.parseEther("10000"); // 1万 BSDT
        const usdtAmount = ethers.utils.parseUnits("10000", 18); // 1万 USDT (BSC USDT是18位)
        
        console.log(chalk.cyan.bold("\n2. 计划添加流动性："));
        console.log("BSDT: 10,000 个");
        console.log("USDT: 10,000 个");
        console.log("比例: 1:1 (锚定)");
        
        // 检查余额是否足够
        if (bsdtBal.lt(bsdtAmount)) {
            console.log(chalk.yellow("⚠️ BSDT充足，但减少到1000个避免风险"));
            const adjustedBsdtAmount = ethers.utils.parseEther("1000");
            const adjustedUsdtAmount = ethers.utils.parseUnits("1000", 18);
        }
        
        if (usdtBal.lt(usdtAmount)) {
            console.log(chalk.red("❌ USDT余额不足"));
            console.log(chalk.yellow("需要:", ethers.utils.formatUnits(usdtAmount, 18), "USDT"));
            console.log(chalk.yellow("实际:", ethers.utils.formatUnits(usdtBal, 18), "USDT"));
            
            // 使用实际余额
            if (usdtBal.gt(0)) {
                console.log(chalk.cyan("\n使用实际可用余额创建池子..."));
                const finalBsdtAmount = usdtBal; // 1:1比例
                const finalUsdtAmount = usdtBal;
                console.log("调整后 BSDT:", ethers.utils.formatUnits(finalBsdtAmount, 18));
                console.log("调整后 USDT:", ethers.utils.formatUnits(finalUsdtAmount, 18));
            } else {
                console.log(chalk.red("请先获取一些USDT"));
                return;
            }
        }
        
        // 检查并授权
        console.log(chalk.yellow.bold("\n3. 检查授权状态："));
        
        const bsdtAllowance = await bsdt.allowance(deployer.address, PancakeRouter);
        const usdtAllowance = await usdt.allowance(deployer.address, PancakeRouter);
        
        if (bsdtAllowance.lt(bsdtAmount)) {
            console.log(chalk.cyan("授权BSDT..."));
            const tx1 = await bsdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            await tx1.wait();
            console.log(chalk.green("✅ BSDT已授权"));
        } else {
            console.log(chalk.green("✅ BSDT已有授权"));
        }
        
        if (usdtAllowance.lt(usdtAmount)) {
            console.log(chalk.cyan("授权USDT..."));
            const tx2 = await usdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            await tx2.wait();
            console.log(chalk.green("✅ USDT已授权"));
        } else {
            console.log(chalk.green("✅ USDT已有授权"));
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
        
        // 检查池子是否存在
        console.log(chalk.yellow.bold("\n4. 检查池子状态："));
        let bsdtUsdtPair = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
        
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.cyan("池子不存在，将在添加流动性时自动创建"));
        } else {
            console.log(chalk.green("✅ 池子已存在:"), bsdtUsdtPair);
        }
        
        // 添加流动性
        console.log(chalk.yellow.bold("\n5. 添加流动性到BSDT/USDT池子..."));
        
        // 使用实际可用的最小值
        const finalBsdtAmount = usdtBal.gt(bsdtAmount) ? bsdtAmount : usdtBal;
        const finalUsdtAmount = finalBsdtAmount; // 保持1:1
        
        console.log(chalk.cyan("最终添加:"));
        console.log("BSDT:", ethers.utils.formatEther(finalBsdtAmount));
        console.log("USDT:", ethers.utils.formatUnits(finalUsdtAmount, 18));
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        
        const tx = await router.addLiquidity(
            SimpleBSDT_ADDRESS,
            USDT,
            finalBsdtAmount,
            finalUsdtAmount,
            finalBsdtAmount.mul(95).div(100), // 允许5%滑点
            finalUsdtAmount.mul(95).div(100), // 允许5%滑点
            deployer.address,
            deadline
        );
        
        console.log(chalk.cyan("交易已发送:"), tx.hash);
        console.log(chalk.cyan("等待确认..."));
        await tx.wait();
        
        // 获取池子地址
        bsdtUsdtPair = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 BSDT/USDT池子创建成功"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("池子信息："));
        console.log(chalk.white("池子地址:"), bsdtUsdtPair);
        console.log(chalk.white("类型: 1:1锚定池"));
        console.log(chalk.white("查看池子:"));
        console.log(chalk.cyan(`https://pancakeswap.finance/info/v2/pair/${bsdtUsdtPair}`));
        
        console.log(chalk.green.bold("\n✅ BSDT/USDT锚定池创建完成！"));
        console.log(chalk.yellow("下一步: HCF/BSDT池子可以让其他人添加"));
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
        
        if (error.message.includes("INSUFFICIENT")) {
            console.log(chalk.yellow("可能是余额不足，请检查USDT余额"));
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