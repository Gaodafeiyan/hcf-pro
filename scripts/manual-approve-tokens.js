const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔐 手动授权代币给PancakeSwap"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);

    // 合约地址
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };

    try {
        // 1. 检查代币余额
        console.log(chalk.yellow.bold("\n1. 检查代币余额..."));
        
        const usdt = await ethers.getContractAt("IERC20", contracts.USDT);
        const bsdt = await ethers.getContractAt("IERC20", contracts.BSDT);
        const hcf = await ethers.getContractAt("IERC20", contracts.HCF);
        
        const usdtBalance = await usdt.balanceOf(signer.address);
        const bsdtBalance = await bsdt.balanceOf(signer.address);
        const hcfBalance = await hcf.balanceOf(signer.address);
        
        console.log(chalk.white("USDT余额:"), ethers.utils.formatUnits(usdtBalance, 18), "USDT");
        console.log(chalk.white("BSDT余额:"), ethers.utils.formatEther(bsdtBalance), "BSDT");
        console.log(chalk.white("HCF余额:"), ethers.utils.formatEther(hcfBalance), "HCF");
        
        // 2. 检查当前授权额度
        console.log(chalk.yellow.bold("\n2. 检查当前授权额度..."));
        
        const usdtAllowance = await usdt.allowance(signer.address, contracts.PancakeRouter);
        const bsdtAllowance = await bsdt.allowance(signer.address, contracts.PancakeRouter);
        const hcfAllowance = await hcf.allowance(signer.address, contracts.PancakeRouter);
        
        console.log(chalk.white("USDT已授权:"), ethers.utils.formatUnits(usdtAllowance, 18), "USDT");
        console.log(chalk.white("BSDT已授权:"), ethers.utils.formatEther(bsdtAllowance), "BSDT");
        console.log(chalk.white("HCF已授权:"), ethers.utils.formatEther(hcfAllowance), "HCF");
        
        // 3. 授权代币
        console.log(chalk.yellow.bold("\n3. 开始授权代币..."));
        
        // 授权USDT (如果余额大于0且授权不足)
        if (usdtBalance.gt(0) && usdtAllowance.lt(usdtBalance)) {
            console.log(chalk.cyan("\n授权USDT..."));
            try {
                const tx1 = await usdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
                console.log(chalk.gray("交易哈希:"), tx1.hash);
                await tx1.wait();
                console.log(chalk.green("✅ USDT授权成功"));
            } catch (error) {
                console.log(chalk.red("❌ USDT授权失败:"), error.message);
            }
        } else if (usdtBalance.eq(0)) {
            console.log(chalk.yellow("⚠️ USDT余额为0，跳过授权"));
        } else {
            console.log(chalk.green("✅ USDT已有足够授权"));
        }
        
        // 授权BSDT (如果余额大于0且授权不足)
        if (bsdtBalance.gt(0) && bsdtAllowance.lt(bsdtBalance)) {
            console.log(chalk.cyan("\n授权BSDT..."));
            try {
                const tx2 = await bsdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
                console.log(chalk.gray("交易哈希:"), tx2.hash);
                await tx2.wait();
                console.log(chalk.green("✅ BSDT授权成功"));
            } catch (error) {
                console.log(chalk.red("❌ BSDT授权失败:"), error.message);
            }
        } else if (bsdtBalance.eq(0)) {
            console.log(chalk.yellow("⚠️ BSDT余额为0，跳过授权"));
        } else {
            console.log(chalk.green("✅ BSDT已有足够授权"));
        }
        
        // 授权HCF (如果余额大于0且授权不足)
        if (hcfBalance.gt(0) && hcfAllowance.lt(hcfBalance)) {
            console.log(chalk.cyan("\n授权HCF..."));
            try {
                const tx3 = await hcf.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
                console.log(chalk.gray("交易哈希:"), tx3.hash);
                await tx3.wait();
                console.log(chalk.green("✅ HCF授权成功"));
            } catch (error) {
                console.log(chalk.red("❌ HCF授权失败:"), error.message);
            }
        } else if (hcfBalance.eq(0)) {
            console.log(chalk.yellow("⚠️ HCF余额为0，跳过授权"));
        } else {
            console.log(chalk.green("✅ HCF已有足够授权"));
        }
        
        // 4. 验证最终授权状态
        console.log(chalk.yellow.bold("\n4. 验证最终授权状态..."));
        
        const finalUsdtAllowance = await usdt.allowance(signer.address, contracts.PancakeRouter);
        const finalBsdtAllowance = await bsdt.allowance(signer.address, contracts.PancakeRouter);
        const finalHcfAllowance = await hcf.allowance(signer.address, contracts.PancakeRouter);
        
        console.log(chalk.white("USDT最终授权:"), 
            finalUsdtAllowance.eq(ethers.constants.MaxUint256) ? "无限制" : ethers.utils.formatUnits(finalUsdtAllowance, 18)
        );
        console.log(chalk.white("BSDT最终授权:"), 
            finalBsdtAllowance.eq(ethers.constants.MaxUint256) ? "无限制" : ethers.utils.formatEther(finalBsdtAllowance)
        );
        console.log(chalk.white("HCF最终授权:"), 
            finalHcfAllowance.eq(ethers.constants.MaxUint256) ? "无限制" : ethers.utils.formatEther(finalHcfAllowance)
        );
        
        console.log(chalk.green.bold("\n✅ 授权流程完成！"));
        console.log(chalk.cyan.bold("\n下一步："));
        console.log(chalk.white("1. 如果余额为0，需要先获取代币"));
        console.log(chalk.white("2. 访问 https://pancakeswap.finance/add"));
        console.log(chalk.white("3. 选择要添加流动性的代币对"));
        console.log(chalk.white("4. 输入数量并添加流动性"));
        
    } catch (error) {
        console.log(chalk.red("\n❌ 操作失败:"), error.message);
        
        // 提供更详细的错误信息
        if (error.message.includes("insufficient funds")) {
            console.log(chalk.yellow("\n提示: BNB余额不足，需要充值Gas费"));
        } else if (error.message.includes("execution reverted")) {
            console.log(chalk.yellow("\n提示: 合约执行失败，可能是权限问题"));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });