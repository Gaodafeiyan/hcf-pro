const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   ⚙️ 设置ProtectedBSDT并创建池子"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("账户:"), deployer.address);
    
    // 合约地址
    const ProtectedBSDT_ADDRESS = "0x3932968a904Bf6773E8a13F1D2358331B9a1a530";
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    try {
        // 获取合约
        const bsdt = await ethers.getContractAt("ProtectedBSDT", ProtectedBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        
        // 1. 先暂时关闭交易限制，以便创建池子
        console.log(chalk.yellow.bold("1. 暂时关闭交易限制..."));
        await bsdt.setTradingRestricted(false);
        console.log(chalk.green("✅ 交易限制已关闭"));
        
        // 2. 创建池子
        console.log(chalk.yellow.bold("\n2. 创建BSDT/USDT池子..."));
        
        // 检查余额
        const bsdtBal = await bsdt.balanceOf(deployer.address);
        const usdtBal = await usdt.balanceOf(deployer.address);
        console.log("BSDT余额:", ethers.utils.formatEther(bsdtBal));
        console.log("USDT余额:", ethers.utils.formatUnits(usdtBal, 18));
        
        // 使用可用USDT
        const usdtAmount = usdtBal;
        const bsdtAmount = usdtAmount; // 1:1
        
        if (usdtAmount.eq(0)) {
            console.log(chalk.red("❌ 没有USDT，无法创建池子"));
            return;
        }
        
        console.log(chalk.cyan("添加流动性:"));
        console.log("BSDT:", ethers.utils.formatEther(bsdtAmount));
        console.log("USDT:", ethers.utils.formatUnits(usdtAmount, 18));
        
        // 授权
        console.log(chalk.cyan("\n授权代币..."));
        const bsdtAllowance = await bsdt.allowance(deployer.address, PancakeRouter);
        if (bsdtAllowance.lt(bsdtAmount)) {
            await bsdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            console.log("✅ BSDT已授权");
        }
        
        const usdtAllowance = await usdt.allowance(deployer.address, PancakeRouter);
        if (usdtAllowance.lt(usdtAmount)) {
            await usdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            console.log("✅ USDT已授权");
        }
        
        // 添加流动性
        const router = await ethers.getContractAt(
            ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
            PancakeRouter
        );
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        console.log(chalk.cyan("\n添加流动性..."));
        const tx = await router.addLiquidity(
            ProtectedBSDT_ADDRESS,
            USDT,
            bsdtAmount,
            usdtAmount,
            0,
            0,
            deployer.address,
            deadline
        );
        
        console.log("交易哈希:", tx.hash);
        await tx.wait();
        console.log(chalk.green("✅ 池子创建成功"));
        
        // 3. 获取池子地址
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)"],
            PancakeFactory
        );
        const pairAddress = await factory.getPair(ProtectedBSDT_ADDRESS, USDT);
        console.log(chalk.green("池子地址:"), pairAddress);
        
        // 4. 设置池子为受限地址
        console.log(chalk.yellow.bold("\n3. 设置池子限制..."));
        await bsdt.setPairAddress(pairAddress, true);
        console.log(chalk.green("✅ 已标记池子地址"));
        
        // 5. 设置白名单（只有这些地址可以交易）
        console.log(chalk.yellow.bold("\n4. 设置白名单..."));
        const whitelist = [
            deployer.address,  // Owner
            // 添加您的后端地址
        ];
        
        for (const addr of whitelist) {
            await bsdt.setWhitelist(addr, true);
            console.log("✅ 已添加白名单:", addr);
        }
        
        // 6. 重新开启交易限制
        console.log(chalk.yellow.bold("\n5. 开启交易限制..."));
        await bsdt.setTradingRestricted(true);
        console.log(chalk.green("✅ 交易限制已开启"));
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         ✅ 设置完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("状态："));
        console.log("ProtectedBSDT:", ProtectedBSDT_ADDRESS);
        console.log("池子地址:", pairAddress);
        console.log("池子比例: 1:1");
        
        console.log(chalk.yellow.bold("\n限制说明："));
        console.log("❌ 其他人不能从池子买BSDT");
        console.log("❌ 其他人不能卖BSDT到池子");
        console.log("❌ 其他人不能添加流动性");
        console.log("✅ 只有白名单地址可以交易");
        console.log("✅ 池子显示1:1价格");
        
        console.log(chalk.cyan.bold("\n查看池子："));
        console.log(`https://pancakeswap.finance/info/v2/pair/${pairAddress}`);
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });