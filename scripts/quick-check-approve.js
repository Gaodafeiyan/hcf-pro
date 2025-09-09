const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 快速授权检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };

    // 获取合约实例
    const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
    const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.BSDT);
    const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
    
    console.log(chalk.cyan("账户:"), signer.address);
    
    // 检查余额
    console.log(chalk.yellow.bold("\n余额:"));
    const usdtBal = await usdt.balanceOf(signer.address);
    const bsdtBal = await bsdt.balanceOf(signer.address);
    const hcfBal = await hcf.balanceOf(signer.address);
    
    console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
    console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
    console.log("HCF:", ethers.utils.formatEther(hcfBal));
    
    // 检查授权
    console.log(chalk.yellow.bold("\n当前授权:"));
    const usdtAllow = await usdt.allowance(signer.address, contracts.PancakeRouter);
    const bsdtAllow = await bsdt.allowance(signer.address, contracts.PancakeRouter);
    const hcfAllow = await hcf.allowance(signer.address, contracts.PancakeRouter);
    
    console.log("USDT:", usdtAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatUnits(usdtAllow, 18));
    console.log("BSDT:", bsdtAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatEther(bsdtAllow));
    console.log("HCF:", hcfAllow.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatEther(hcfAllow));
    
    // 如果需要授权
    if (!usdtAllow.eq(ethers.constants.MaxUint256) && usdtBal.gt(0)) {
        console.log(chalk.cyan("\n授权USDT..."));
        const tx = await usdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
        await tx.wait();
        console.log(chalk.green("✅ USDT已授权"));
    }
    
    if (!bsdtAllow.eq(ethers.constants.MaxUint256) && bsdtBal.gt(0)) {
        console.log(chalk.cyan("\n授权BSDT..."));
        const tx = await bsdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
        await tx.wait();
        console.log(chalk.green("✅ BSDT已授权"));
    }
    
    if (!hcfAllow.eq(ethers.constants.MaxUint256) && hcfBal.gt(0)) {
        console.log(chalk.cyan("\n授权HCF..."));
        const tx = await hcf.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
        await tx.wait();
        console.log(chalk.green("✅ HCF已授权"));
    }
    
    console.log(chalk.green.bold("\n✅ 授权完成！现在可以去PancakeSwap添加流动性了"));
    console.log(chalk.cyan("\n建议的池子:"));
    console.log(chalk.white("1. BSDT/USDT: 1 BSDT + 1 USDT (锚定池)"));
    console.log(chalk.white("2. HCF/BSDT: 100万 HCF + 1万 BSDT (交易池)"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });