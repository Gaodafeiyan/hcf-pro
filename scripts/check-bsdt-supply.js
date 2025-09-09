const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   查询BSDT代币供应量"));
    console.log(chalk.blue.bold("========================================\n"));

    const bsdtAddress = "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908";
    
    // 使用完整的ABI
    const bsdtABI = [
        "function totalSupply() view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)"
    ];
    
    try {
        const bsdt = new ethers.Contract(bsdtAddress, bsdtABI, ethers.provider);
        
        // 获取基本信息
        const name = await bsdt.name();
        const symbol = await bsdt.symbol();
        const decimals = await bsdt.decimals();
        const totalSupply = await bsdt.totalSupply();
        
        console.log(chalk.cyan("代币信息："));
        console.log(chalk.white(`  名称: ${name}`));
        console.log(chalk.white(`  符号: ${symbol}`));
        console.log(chalk.white(`  精度: ${decimals}位\n`));
        
        // 格式化总供应量
        const formattedSupply = ethers.utils.formatUnits(totalSupply, decimals);
        const supplyInBillion = (parseFloat(formattedSupply) / 1000000000).toFixed(2);
        
        console.log(chalk.green.bold("总供应量："));
        console.log(chalk.white(`  原始值: ${totalSupply.toString()}`));
        console.log(chalk.white(`  格式化: ${parseFloat(formattedSupply).toLocaleString()} ${symbol}`));
        console.log(chalk.yellow.bold(`  换算: ${supplyInBillion} 亿枚\n`));
        
        // 检查部署者余额
        const deployer = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
        const deployerBalance = await bsdt.balanceOf(deployer);
        const formattedBalance = ethers.utils.formatUnits(deployerBalance, decimals);
        
        console.log(chalk.cyan("部署者账户余额："));
        console.log(chalk.white(`  地址: ${deployer}`));
        console.log(chalk.white(`  余额: ${parseFloat(formattedBalance).toLocaleString()} ${symbol}\n`));
        
        // 根据需求文档的说明
        console.log(chalk.blue.bold("根据需求文档："));
        console.log(chalk.gray("  • BSDT总量应为1000亿枚"));
        console.log(chalk.gray("  • 1:1锚定USDT价值"));
        console.log(chalk.gray("  • 单向兑换机制（只能USDT→BSDT）"));
        console.log(chalk.gray("  • 不能反向兑换（BSDT无法换回USDT）\n"));
        
        if (supplyInBillion === "1000.00") {
            console.log(chalk.green.bold("✅ 总供应量符合需求（1000亿枚）"));
        } else {
            console.log(chalk.yellow.bold(`⚠️ 当前供应量: ${supplyInBillion}亿，需求: 1000亿`));
        }
        
    } catch (error) {
        console.error(chalk.red("查询失败:"), error.message);
        console.log(chalk.yellow("\n提示：请确保连接到BSC主网"));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });