const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 检查代币状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("检查账户:"), signer.address);

    // 合约地址
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };

    try {
        // 1. 检查BNB余额
        console.log(chalk.yellow.bold("1. Gas费状态："));
        const bnbBalance = await signer.getBalance();
        console.log(chalk.white("BNB余额:"), ethers.utils.formatEther(bnbBalance), "BNB");
        if (bnbBalance.lt(ethers.utils.parseEther("0.01"))) {
            console.log(chalk.red("⚠️ BNB不足，需要至少0.01 BNB作为Gas费"));
        } else {
            console.log(chalk.green("✅ Gas费充足"));
        }

        // 2. 检查代币合约是否存在
        console.log(chalk.yellow.bold("\n2. 代币合约状态："));
        
        // 检查USDT
        const usdtCode = await ethers.provider.getCode(contracts.USDT);
        if (usdtCode === "0x") {
            console.log(chalk.red("❌ USDT合约不存在"));
        } else {
            console.log(chalk.green("✅ USDT合约正常"));
            const usdt = await ethers.getContractAt("IERC20", contracts.USDT);
            const usdtBalance = await usdt.balanceOf(signer.address);
            console.log(chalk.white("  余额:"), ethers.utils.formatUnits(usdtBalance, 18), "USDT");
        }

        // 检查BSDT
        const bsdtCode = await ethers.provider.getCode(contracts.BSDT);
        if (bsdtCode === "0x") {
            console.log(chalk.red("❌ BSDT合约不存在"));
        } else {
            console.log(chalk.green("✅ BSDT合约正常"));
            const bsdt = await ethers.getContractAt("IERC20", contracts.BSDT);
            const bsdtBalance = await bsdt.balanceOf(signer.address);
            const bsdtTotalSupply = await bsdt.totalSupply();
            console.log(chalk.white("  余额:"), ethers.utils.formatEther(bsdtBalance), "BSDT");
            console.log(chalk.white("  总供应量:"), ethers.utils.formatEther(bsdtTotalSupply), "BSDT");
            
            // 检查是否可以调用approve
            try {
                // 尝试读取当前授权额度
                const allowance = await bsdt.allowance(signer.address, contracts.PancakeRouter);
                console.log(chalk.white("  当前授权:"), ethers.utils.formatEther(allowance), "BSDT");
                console.log(chalk.green("  ✅ approve函数可用"));
            } catch (error) {
                console.log(chalk.red("  ❌ approve函数不可用:", error.message));
            }
        }

        // 检查HCF
        const hcfCode = await ethers.provider.getCode(contracts.HCF);
        if (hcfCode === "0x") {
            console.log(chalk.red("❌ HCF合约不存在"));
        } else {
            console.log(chalk.green("✅ HCF合约正常"));
            const hcf = await ethers.getContractAt("IERC20", contracts.HCF);
            const hcfBalance = await hcf.balanceOf(signer.address);
            const hcfTotalSupply = await hcf.totalSupply();
            console.log(chalk.white("  余额:"), ethers.utils.formatEther(hcfBalance), "HCF");
            console.log(chalk.white("  总供应量:"), ethers.utils.formatEther(hcfTotalSupply), "HCF");
            
            // 检查是否可以调用approve
            try {
                const allowance = await hcf.allowance(signer.address, contracts.PancakeRouter);
                console.log(chalk.white("  当前授权:"), ethers.utils.formatEther(allowance), "HCF");
                console.log(chalk.green("  ✅ approve函数可用"));
            } catch (error) {
                console.log(chalk.red("  ❌ approve函数不可用:", error.message));
            }
        }

        // 3. 检查流动性池是否存在
        console.log(chalk.yellow.bold("\n3. 流动性池状态："));
        const factory = await ethers.getContractAt("IPancakeFactory", contracts.PancakeFactory);
        
        // 检查BSDT/USDT池子
        const bsdtUsdtPair = await factory.getPair(contracts.BSDT, contracts.USDT);
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.yellow("⚠️ BSDT/USDT池子未创建"));
        } else {
            console.log(chalk.green("✅ BSDT/USDT池子已存在:"), bsdtUsdtPair);
        }
        
        // 检查HCF/BSDT池子
        const hcfBsdtPair = await factory.getPair(contracts.HCF, contracts.BSDT);
        if (hcfBsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.yellow("⚠️ HCF/BSDT池子未创建"));
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子已存在:"), hcfBsdtPair);
        }

        // 4. 诊断结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         诊断结果"));
        console.log(chalk.blue.bold("========================================\n"));

        if (bnbBalance.lt(ethers.utils.parseEther("0.01"))) {
            console.log(chalk.red("问题1: BNB不足"));
            console.log(chalk.yellow("解决: 充值至少0.01 BNB作为Gas费"));
        }

        const usdt = await ethers.getContractAt("IERC20", contracts.USDT);
        const usdtBalance = await usdt.balanceOf(signer.address);
        if (usdtBalance.eq(0)) {
            console.log(chalk.red("\n问题2: USDT余额为0"));
            console.log(chalk.yellow("解决: 获取至少1 USDT"));
        }

        const bsdt = await ethers.getContractAt("IERC20", contracts.BSDT);
        const bsdtBalance = await bsdt.balanceOf(signer.address);
        if (bsdtBalance.eq(0)) {
            console.log(chalk.red("\n问题3: BSDT余额为0"));
            console.log(chalk.yellow("解决: 使用BSDTGateway将USDT兑换为BSDT"));
            console.log(chalk.gray("命令: npx hardhat run scripts/exchange-usdt-to-bsdt.js --network bsc"));
        }

        const hcf = await ethers.getContractAt("IERC20", contracts.HCF);
        const hcfBalance = await hcf.balanceOf(signer.address);
        if (hcfBalance.eq(0)) {
            console.log(chalk.red("\n问题4: HCF余额为0"));
            console.log(chalk.yellow("解决: 从部署者账户转移HCF"));
        }

        console.log(chalk.green.bold("\n建议操作顺序："));
        console.log(chalk.white("1. 确保有足够BNB (>0.01)"));
        console.log(chalk.white("2. 获取1 USDT"));
        console.log(chalk.white("3. 运行: npx hardhat run scripts/manual-approve-tokens.js --network bsc"));
        console.log(chalk.white("4. 去PancakeSwap添加流动性"));

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