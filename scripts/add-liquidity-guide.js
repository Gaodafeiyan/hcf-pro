const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   添加流动性指南"));
    console.log(chalk.blue.bold("========================================\n"));

    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
    };

    console.log(chalk.cyan("📋 流动性添加步骤:\n"));

    console.log(chalk.yellow("【步骤1】准备代币"));
    console.log(chalk.white("  需要准备:"));
    console.log(chalk.white("  • 1,000,000 HCF (底池)"));
    console.log(chalk.white("  • 100,000 BSDT (底池)"));
    console.log(chalk.white("  • 0.2 BNB (手续费)\n"));

    console.log(chalk.yellow("【步骤2】授权代币"));
    console.log(chalk.white("  在以下地址授权代币给PancakeSwap Router:"));
    console.log(chalk.gray(`  HCF Token: ${contracts.hcfToken}`));
    console.log(chalk.gray(`  BSDT Token: ${contracts.bsdtToken}`));
    console.log(chalk.gray("  PancakeSwap Router: 0x10ED43C718714eb63d5aA57B78B54704E256024E\n"));

    console.log(chalk.yellow("【步骤3】添加流动性"));
    console.log(chalk.white("  访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("  1. 选择HCF Token"));
    console.log(chalk.white("  2. 选择BSDT Token"));
    console.log(chalk.white("  3. 输入数量:"));
    console.log(chalk.white("     • HCF: 1,000,000"));
    console.log(chalk.white("     • BSDT: 100,000"));
    console.log(chalk.white("  4. 点击'Supply'添加流动性\n"));

    console.log(chalk.yellow("【步骤4】锁定LP代币"));
    console.log(chalk.white("  推荐使用以下锁仓平台:"));
    console.log(chalk.white("  • PinkLock: https://www.pinksale.finance/pinklock"));
    console.log(chalk.white("  • Mudra: https://mudra.website"));
    console.log(chalk.white("  • DxLock: https://dxsale.app/app/v3/dxlock"));
    console.log(chalk.white("  锁定时间: 10年\n"));

    console.log(chalk.cyan("📊 当前合约状态:"));
    
    try {
        const [signer] = await ethers.getSigners();
        
        // 检查HCF余额
        const hcfABI = ["function balanceOf(address) view returns (uint256)"];
        const hcf = new ethers.Contract(contracts.hcfToken, hcfABI, ethers.provider);
        const hcfBalance = await hcf.balanceOf(signer.address);
        
        // 检查BSDT余额
        const bsdtABI = ["function balanceOf(address) view returns (uint256)"];
        const bsdt = new ethers.Contract(contracts.bsdtToken, bsdtABI, ethers.provider);
        const bsdtBalance = await bsdt.balanceOf(signer.address);
        
        console.log(chalk.white(`  您的HCF余额: ${ethers.utils.formatEther(hcfBalance)} HCF`));
        console.log(chalk.white(`  您的BSDT余额: ${ethers.utils.formatEther(bsdtBalance)} BSDT`));
        
        const requiredHCF = ethers.utils.parseEther("1000000");
        const requiredBSDT = ethers.utils.parseEther("100000");
        
        if (hcfBalance.gte(requiredHCF) && bsdtBalance.gte(requiredBSDT)) {
            console.log(chalk.green("\n✅ 您有足够的代币添加流动性!"));
        } else {
            console.log(chalk.yellow("\n⚠️ 代币余额不足"));
            if (hcfBalance.lt(requiredHCF)) {
                const needed = ethers.utils.formatEther(requiredHCF.sub(hcfBalance));
                console.log(chalk.white(`  还需要 ${needed} HCF`));
            }
            if (bsdtBalance.lt(requiredBSDT)) {
                const needed = ethers.utils.formatEther(requiredBSDT.sub(bsdtBalance));
                console.log(chalk.white(`  还需要 ${needed} BSDT`));
            }
        }
        
    } catch (e) {
        console.log(chalk.yellow("  无法读取余额"));
    }

    console.log(chalk.cyan("\n💡 重要提示:"));
    console.log(chalk.white("  1. 添加流动性会创建HCF/BSDT交易对"));
    console.log(chalk.white("  2. 初始价格比例 = 1 HCF : 0.1 BSDT"));
    console.log(chalk.white("  3. 锁定LP代币防止撤池"));
    console.log(chalk.white("  4. 保存LP代币地址和锁仓证明"));

    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         流动性配置完成"));
    console.log(chalk.blue.bold("========================================\n"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });