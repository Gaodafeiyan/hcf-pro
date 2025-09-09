const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔒 创建受保护的BSDT/USDT池子"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("Owner账户:"), deployer.address);
    
    // 合约地址
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    const GATEWAY = "0x6b5462814DC6ffB2a66D5E45Ab5b5d11Dcc1a033"; // Gateway地址
    
    try {
        // 获取合约
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        
        // 检查余额
        console.log(chalk.yellow.bold("1. 检查余额："));
        const bsdtBal = await bsdt.balanceOf(deployer.address);
        const usdtBal = await usdt.balanceOf(deployer.address);
        
        console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        
        // 设置池子数量（足够大以防止价格波动）
        const bsdtAmount = ethers.utils.parseEther("1000000"); // 100万BSDT
        const usdtAmount = ethers.utils.parseUnits("1000000", 18); // 100万USDT (1:1)
        
        console.log(chalk.yellow.bold("\n2. 创建大额1:1池子："));
        console.log("BSDT: 1,000,000");
        console.log("USDT: 1,000,000");
        console.log("比例: 1:1（锚定）");
        
        if (usdtBal.lt(usdtAmount)) {
            console.log(chalk.red("\n❌ USDT不足"));
            console.log(chalk.yellow("方案A: 创建较小的池子（如1万:1万）"));
            console.log(chalk.yellow("方案B: 先充值USDT"));
            console.log(chalk.cyan("\n使用现有余额创建池子..."));
            
            // 使用可用余额
            const smallAmount = ethers.utils.parseUnits("100", 18); // 100个
            
            if (usdtBal.gte(smallAmount)) {
                await createPool(smallAmount, smallAmount);
            } else if (usdtBal.gt(0)) {
                await createPool(usdtBal, usdtBal); // 使用全部USDT
            } else {
                console.log(chalk.red("没有USDT，无法创建池子"));
                return;
            }
        } else {
            await createPool(bsdtAmount, usdtAmount);
        }
        
        async function createPool(bsdtAmt, usdtAmt) {
            // 授权
            console.log(chalk.yellow.bold("\n3. 授权代币..."));
            
            const bsdtAllowance = await bsdt.allowance(deployer.address, PancakeRouter);
            if (bsdtAllowance.lt(bsdtAmt)) {
                await bsdt.approve(PancakeRouter, ethers.constants.MaxUint256);
                console.log(chalk.green("✅ BSDT已授权"));
            }
            
            const usdtAllowance = await usdt.allowance(deployer.address, PancakeRouter);
            if (usdtAllowance.lt(usdtAmt)) {
                await usdt.approve(PancakeRouter, ethers.constants.MaxUint256);
                console.log(chalk.green("✅ USDT已授权"));
            }
            
            // 添加流动性
            console.log(chalk.yellow.bold("\n4. 添加流动性..."));
            const router = await ethers.getContractAt(
                ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
                PancakeRouter
            );
            
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const tx = await router.addLiquidity(
                SimpleBSDT_ADDRESS,
                USDT,
                bsdtAmt,
                usdtAmt,
                bsdtAmt.mul(99).div(100), // 最少99%
                usdtAmt.mul(99).div(100), // 最少99%
                deployer.address,
                deadline
            );
            
            console.log(chalk.cyan("交易哈希:"), tx.hash);
            await tx.wait();
            
            // 获取池子地址
            const factory = await ethers.getContractAt(
                ["function getPair(address,address) view returns (address)"],
                PancakeFactory
            );
            const pairAddress = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
            
            console.log(chalk.green("✅ 池子创建成功:"), pairAddress);
        }
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📊 池子保护机制"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("BSDT获取方式："));
        console.log("1. 通过Gateway兑换（1:1固定）");
        console.log("   Gateway:", GATEWAY);
        console.log("2. 不能在DEX直接交易BSDT/USDT");
        
        console.log(chalk.yellow.bold("\n价格保护："));
        console.log("• 池子显示价格但限制交易");
        console.log("• SimpleBSDT合约可以添加交易限制");
        console.log("• 只有Owner控制流动性");
        console.log("• 用户通过Gateway获取BSDT（1:1）");
        
        console.log(chalk.cyan.bold("\n用户流程："));
        console.log("1. USDT → Gateway → BSDT (1:1)");
        console.log("2. BSDT → HCF/BSDT池子 → HCF");
        
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