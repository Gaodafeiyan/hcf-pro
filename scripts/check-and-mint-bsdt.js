const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   检查并增发BSDT到正确数量"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("操作账户:"), deployer.address);

    // 新BSDT地址
    const BSDT_ADDRESS = "0xf460422388C1205724EF699051aBe300215E490b";
    
    // 获取BSDT合约
    const bsdt = await ethers.getContractAt("BSDTToken", BSDT_ADDRESS);
    
    // 检查当前供应量
    const currentSupply = await bsdt.totalSupply();
    const currentSupplyFormatted = ethers.utils.formatEther(currentSupply);
    const currentSupplyInBillion = parseFloat(currentSupplyFormatted) / 1000000000;
    
    console.log(chalk.yellow("当前BSDT供应量:"));
    console.log(chalk.white(`  ${currentSupplyFormatted} BSDT`));
    console.log(chalk.white(`  = ${currentSupplyInBillion.toFixed(0)} 亿枚\n`));
    
    // 检查部署者余额
    const deployerBalance = await bsdt.balanceOf(deployer.address);
    const balanceFormatted = ethers.utils.formatEther(deployerBalance);
    const balanceInBillion = parseFloat(balanceFormatted) / 1000000000;
    
    console.log(chalk.cyan("部署者BSDT余额:"));
    console.log(chalk.white(`  ${balanceFormatted} BSDT`));
    console.log(chalk.white(`  = ${balanceInBillion.toFixed(2)} 亿枚\n`));
    
    // 判断是否需要增发
    if (currentSupplyInBillion < 1000) {
        console.log(chalk.red("❌ 供应量不足，需要增发"));
        
        const targetSupply = ethers.utils.parseEther("1000000000000"); // 1000亿
        const mintAmount = targetSupply.sub(currentSupply);
        const mintAmountFormatted = ethers.utils.formatEther(mintAmount);
        const mintInBillion = parseFloat(mintAmountFormatted) / 1000000000;
        
        console.log(chalk.yellow(`\n需要增发: ${mintInBillion.toFixed(0)} 亿枚"));
        
        // 尝试增发
        console.log(chalk.cyan("\n尝试增发..."));
        try {
            // 检查是否是owner
            const owner = await bsdt.owner();
            if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                // 尝试increaseSupply
                console.log(chalk.cyan("你是Owner，尝试increaseSupply..."));
                const tx = await bsdt.increaseSupply(mintAmount);
                await tx.wait();
                console.log(chalk.green("✅ 增发成功！"));
            } else {
                console.log(chalk.red("❌ 你不是Owner，无法增发"));
                console.log(chalk.yellow("Owner地址:"), owner);
            }
        } catch (error) {
            console.log(chalk.red("增发失败:"), error.message);
            console.log(chalk.yellow("\n可能原因:"));
            console.log(chalk.white("1. 合约不支持increaseSupply"));
            console.log(chalk.white("2. 需要特殊权限"));
            console.log(chalk.white("3. 超出最大供应量限制"));
        }
        
        // 重新检查供应量
        const newSupply = await bsdt.totalSupply();
        const newSupplyFormatted = ethers.utils.formatEther(newSupply);
        const newSupplyInBillion = parseFloat(newSupplyFormatted) / 1000000000;
        
        console.log(chalk.cyan("\n最终供应量:"));
        console.log(chalk.white(`  ${newSupplyFormatted} BSDT`));
        console.log(chalk.white(`  = ${newSupplyInBillion.toFixed(0)} 亿枚"));
        
    } else if (currentSupplyInBillion === 100) {
        console.log(chalk.green.bold("✅ 当前100亿枚，可以使用！"));
        console.log(chalk.yellow("\n注意: 虽然不是1000亿，但100亿也足够使用"));
        console.log(chalk.white("可以调整池子比例:"));
        console.log(chalk.white("  原计划: 100万HCF : 10万BSDT"));
        console.log(chalk.white("  现在可: 100万HCF : 1万BSDT"));
        console.log(chalk.white("  或者: 1000万HCF : 10万BSDT"));
    } else {
        console.log(chalk.green.bold("✅ 供应量充足！"));
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         结论"));
    console.log(chalk.blue.bold("========================================\n"));
    
    if (currentSupplyInBillion >= 100) {
        console.log(chalk.green.bold("🎉 BSDT可以使用！"));
        console.log(chalk.cyan("\n接下来:"));
        console.log(chalk.white("1. 部署BSDTGateway和HCFSwapRouter"));
        console.log(chalk.white("2. 获取1 USDT"));
        console.log(chalk.white("3. 创建流动性池"));
    } else {
        console.log(chalk.red("❌ 需要解决BSDT供应量问题"));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });