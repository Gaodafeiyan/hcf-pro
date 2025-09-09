const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💎 授权并添加流动性（100万HCF+10万BSDT）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        BSDTUSDTPair: "0x9495B0d829bA860eD2486f22d1204391A2607ad4",
        HCFBSDTPair: "0xE936EB1B86f6ab84cB45c3FbD36d39E21734AcA2"
    };

    try {
        const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        
        // 1. 授权池子地址（如果还没授权）
        console.log(chalk.yellow.bold("1. 检查并授权池子地址..."));
        
        // 检查BSDT/USDT池子授权
        const isBsdtUsdtAuthorized = await bsdt.authorizedExchanges(contracts.BSDTUSDTPair);
        if (!isBsdtUsdtAuthorized) {
            console.log(chalk.cyan("授权BSDT/USDT池子..."));
            const tx1 = await bsdt.authorizeExchange(contracts.BSDTUSDTPair, true);
            await tx1.wait();
            console.log(chalk.green("✅ BSDT/USDT池子已授权"));
        } else {
            console.log(chalk.green("✅ BSDT/USDT池子已经授权"));
        }
        
        // 检查HCF/BSDT池子授权
        const isHcfBsdtAuthorized = await bsdt.authorizedExchanges(contracts.HCFBSDTPair);
        if (!isHcfBsdtAuthorized) {
            console.log(chalk.cyan("授权HCF/BSDT池子..."));
            const tx2 = await bsdt.authorizeExchange(contracts.HCFBSDTPair, true);
            await tx2.wait();
            console.log(chalk.green("✅ HCF/BSDT池子已授权"));
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子已经授权"));
        }
        
        // 2. 检查余额
        console.log(chalk.yellow.bold("\n2. 检查余额..."));
        const usdtBal = await usdt.balanceOf(signer.address);
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        
        // 3. 创建BSDT/USDT锚定池（1:1）
        console.log(chalk.yellow.bold("\n3. 创建BSDT/USDT锚定池（1:1）..."));
        
        const usdtAmount = ethers.utils.parseUnits("1", 18); // 1 USDT
        const bsdtAmountForUsdtPool = ethers.utils.parseEther("1"); // 1 BSDT
        
        // 检查池子当前余额
        const pairABI = [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() external view returns (address)",
            "function token1() external view returns (address)",
            "function sync() external"
        ];
        
        const bsdtUsdtPair = new ethers.Contract(contracts.BSDTUSDTPair, pairABI, signer);
        const reserves1 = await bsdtUsdtPair.getReserves();
        
        if (reserves1[0].eq(0) && reserves1[1].eq(0)) {
            console.log(chalk.cyan("添加初始流动性到BSDT/USDT池子..."));
            
            // 转账USDT到池子（USDT已经转了1个）
            const usdtInPool = await usdt.balanceOf(contracts.BSDTUSDTPair);
            if (usdtInPool.lt(usdtAmount)) {
                console.log("需要补充USDT到池子...");
                const needUsdt = usdtAmount.sub(usdtInPool);
                const tx3 = await usdt.transfer(contracts.BSDTUSDTPair, needUsdt);
                await tx3.wait();
                console.log(chalk.green("✅ USDT已转账"));
            }
            
            // 转账BSDT到池子
            console.log("转账1 BSDT到池子...");
            const tx4 = await bsdt.transfer(contracts.BSDTUSDTPair, bsdtAmountForUsdtPool);
            await tx4.wait();
            console.log(chalk.green("✅ BSDT已转账"));
            
            // 同步池子
            console.log("同步池子储备...");
            const tx5 = await bsdtUsdtPair.sync();
            await tx5.wait();
            console.log(chalk.green("✅ BSDT/USDT池子创建成功（1:1锚定）"));
        } else {
            console.log(chalk.green("✅ BSDT/USDT池子已有流动性"));
        }
        
        // 4. 创建HCF/BSDT交易池（100万HCF + 10万BSDT）
        console.log(chalk.yellow.bold("\n4. 创建HCF/BSDT交易池（100万HCF + 10万BSDT）..."));
        
        const hcfAmount = ethers.utils.parseEther("1000000"); // 100万 HCF
        const bsdtAmountForHcfPool = ethers.utils.parseEther("100000"); // 10万 BSDT
        
        const hcfBsdtPair = new ethers.Contract(contracts.HCFBSDTPair, pairABI, signer);
        const reserves2 = await hcfBsdtPair.getReserves();
        
        if (reserves2[0].eq(0) && reserves2[1].eq(0)) {
            console.log(chalk.cyan("添加初始流动性到HCF/BSDT池子..."));
            console.log(chalk.white("比例: 100万 HCF : 10万 BSDT"));
            console.log(chalk.white("初始价格: 1 HCF = 0.1 BSDT"));
            
            // 转账HCF到池子
            console.log("转账100万 HCF到池子...");
            const tx6 = await hcf.transfer(contracts.HCFBSDTPair, hcfAmount);
            await tx6.wait();
            console.log(chalk.green("✅ HCF已转账"));
            
            // 转账BSDT到池子
            console.log("转账10万 BSDT到池子...");
            const tx7 = await bsdt.transfer(contracts.HCFBSDTPair, bsdtAmountForHcfPool);
            await tx7.wait();
            console.log(chalk.green("✅ BSDT已转账"));
            
            // 同步池子
            console.log("同步池子储备...");
            const tx8 = await hcfBsdtPair.sync();
            await tx8.wait();
            console.log(chalk.green("✅ HCF/BSDT池子创建成功"));
            console.log(chalk.yellow("初始价格: 1 HCF = 0.1 BSDT = 0.1 USDT"));
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子已有流动性"));
        }
        
        // 5. 显示最终状态
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 流动性池创建完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("池子地址："));
        console.log(chalk.white("BSDT/USDT锚定池:"), contracts.BSDTUSDTPair);
        console.log(chalk.white("HCF/BSDT交易池:"), contracts.HCFBSDTPair);
        
        console.log(chalk.cyan.bold("\n查看池子："));
        console.log(chalk.white("BSDT/USDT: https://pancakeswap.finance/info/v2/pair/" + contracts.BSDTUSDTPair));
        console.log(chalk.white("HCF/BSDT: https://pancakeswap.finance/info/v2/pair/" + contracts.HCFBSDTPair));
        
        console.log(chalk.yellow.bold("\n价格信息："));
        console.log(chalk.white("1 BSDT = 1 USDT（锚定）"));
        console.log(chalk.white("1 HCF = 0.1 BSDT = 0.1 USDT（初始价格）"));
        
        console.log(chalk.green.bold("\n✅ 系统已准备就绪，可以开始交易！"));
        
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