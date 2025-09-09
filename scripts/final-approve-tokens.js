const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   ✅ 最终代币授权"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };

    try {
        // 获取代币合约
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.BSDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        
        // 检查余额
        console.log(chalk.yellow.bold("1. 当前余额："));
        const usdtBal = await usdt.balanceOf(signer.address);
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        
        console.log(chalk.white("USDT:"), ethers.utils.formatUnits(usdtBal, 18));
        console.log(chalk.white("BSDT:"), ethers.utils.formatEther(bsdtBal));
        console.log(chalk.white("HCF:"), ethers.utils.formatEther(hcfBal));
        
        // 检查当前授权
        console.log(chalk.yellow.bold("\n2. 检查授权状态："));
        const usdtAllow = await usdt.allowance(signer.address, contracts.PancakeRouter);
        const bsdtAllow = await bsdt.allowance(signer.address, contracts.PancakeRouter);
        const hcfAllow = await hcf.allowance(signer.address, contracts.PancakeRouter);
        
        console.log(chalk.white("USDT授权:"), usdtAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatUnits(usdtAllow, 18));
        console.log(chalk.white("BSDT授权:"), bsdtAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatEther(bsdtAllow));
        console.log(chalk.white("HCF授权:"), hcfAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatEther(hcfAllow));
        
        // 执行授权
        console.log(chalk.yellow.bold("\n3. 执行授权："));
        
        // USDT已经授权了
        if (usdtAllow.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.green("✅ USDT已有无限授权"));
        }
        
        // 授权BSDT
        if (!bsdtAllow.eq(ethers.constants.MaxUint256) && bsdtBal.gt(0)) {
            console.log(chalk.cyan("授权BSDT..."));
            const tx1 = await bsdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
            console.log(chalk.gray("交易哈希:"), tx1.hash);
            await tx1.wait();
            console.log(chalk.green("✅ BSDT已授权"));
        } else if (bsdtAllow.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.green("✅ BSDT已有无限授权"));
        }
        
        // 授权HCF
        if (!hcfAllow.eq(ethers.constants.MaxUint256) && hcfBal.gt(0)) {
            console.log(chalk.cyan("授权HCF..."));
            const tx2 = await hcf.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
            console.log(chalk.gray("交易哈希:"), tx2.hash);
            await tx2.wait();
            console.log(chalk.green("✅ HCF已授权"));
        } else if (hcfAllow.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.green("✅ HCF已有无限授权"));
        }
        
        // 最终确认
        console.log(chalk.yellow.bold("\n4. 最终确认："));
        const finalUsdtAllow = await usdt.allowance(signer.address, contracts.PancakeRouter);
        const finalBsdtAllow = await bsdt.allowance(signer.address, contracts.PancakeRouter);
        const finalHcfAllow = await hcf.allowance(signer.address, contracts.PancakeRouter);
        
        console.log(chalk.white("USDT:"), finalUsdtAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限授权" : "❌ 未授权");
        console.log(chalk.white("BSDT:"), finalBsdtAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限授权" : "❌ 未授权");
        console.log(chalk.white("HCF:"), finalHcfAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限授权" : "❌ 未授权");
        
        console.log(chalk.green.bold("\n🎉 所有准备工作完成！"));
        console.log(chalk.cyan.bold("\n现在可以添加流动性了："));
        console.log(chalk.white("1. 访问 https://pancakeswap.finance/add"));
        console.log(chalk.white("2. 创建BSDT/USDT池子 (1 BSDT + 1 USDT)"));
        console.log(chalk.white("3. 创建HCF/BSDT池子 (100万 HCF + 1万 BSDT)"));
        
        console.log(chalk.yellow.bold("\n池子地址（已预授权）："));
        console.log(chalk.white("BSDT/USDT池子: 0x9495B0d829bA860eD2486f22d1204391A2607ad4"));
        console.log(chalk.white("HCF/BSDT池子: 0xE936EB1B86f6ab84cB45c3FbD36d39E21734AcA2"));
        
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