const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   修复BSDT供应量问题"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("操作账户:"), deployer.address);

    // 合约地址
    const bsdtAddress = "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908";
    
    // 获取合约实例
    const bsdt = await ethers.getContractAt("BSDTToken", bsdtAddress);
    
    // 查询当前供应量
    const currentSupply = await bsdt.totalSupply();
    const currentSupplyFormatted = ethers.utils.formatEther(currentSupply);
    const currentSupplyInBillion = (parseFloat(currentSupplyFormatted) / 1000000000).toFixed(6);
    
    console.log(chalk.yellow("当前供应量:"));
    console.log(chalk.white(`  ${currentSupplyFormatted} BSDT`));
    console.log(chalk.white(`  相当于: ${currentSupplyInBillion} 亿枚\n`));
    
    console.log(chalk.red.bold("❌ 问题诊断:"));
    console.log(chalk.white("BSDT只有10万枚，远低于需求的1000亿枚"));
    console.log(chalk.white("这会导致:"));
    console.log(chalk.white("  1. 无法创建足够的流动性"));
    console.log(chalk.white("  2. 价格计算错误"));
    console.log(chalk.white("  3. 系统无法正常运行\n"));
    
    console.log(chalk.green.bold("✅ 解决方案:"));
    console.log(chalk.cyan("\n方案A: 重新部署BSDT（推荐）"));
    console.log(chalk.white("1. 修改contracts/BSDTToken.sol"));
    console.log(chalk.white("2. 将初始供应量改为1000亿"));
    console.log(chalk.white("3. 重新部署所有合约"));
    console.log(chalk.white("4. 更新合约地址\n"));
    
    console.log(chalk.cyan("方案B: 使用现有10万BSDT"));
    console.log(chalk.white("1. 接受当前供应量"));
    console.log(chalk.white("2. 调整池子比例"));
    console.log(chalk.white("3. HCF/BSDT = 10:1 而不是 100万:10万"));
    console.log(chalk.yellow("⚠️ 注意: 这会改变整个经济模型\n"));
    
    // 检查是否可以增发
    console.log(chalk.blue.bold("检查增发可能性:"));
    try {
        // 检查是否有increaseSupply函数
        const canIncrease = bsdt.interface.getFunction("increaseSupply");
        if (canIncrease) {
            console.log(chalk.green("✅ 合约支持increaseSupply函数"));
            console.log(chalk.yellow("但需要owner权限"));
        }
    } catch (e) {
        console.log(chalk.red("❌ 合约不支持increaseSupply函数"));
    }
    
    try {
        // 检查是否有mint函数
        const canMint = bsdt.interface.getFunction("mint");
        if (canMint) {
            console.log(chalk.green("✅ 合约支持mint函数"));
            console.log(chalk.yellow("但需要authorizedExchange权限"));
        }
    } catch (e) {
        console.log(chalk.red("❌ 合约不支持mint函数"));
    }
    
    // 检查owner
    try {
        const owner = await bsdt.owner();
        console.log(chalk.cyan("\n合约Owner:"), owner);
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log(chalk.green("✅ 当前账户是owner，可以尝试增发"));
        } else {
            console.log(chalk.red("❌ 当前账户不是owner，无法增发"));
            console.log(chalk.yellow("需要使用owner账户:"), owner);
        }
    } catch (e) {
        console.log(chalk.yellow("无法查询owner信息"));
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         建议操作"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.red.bold("🔴 强烈建议：重新部署BSDT合约"));
    console.log(chalk.white("\n原因:"));
    console.log(chalk.white("1. 当前供应量严重不足"));
    console.log(chalk.white("2. 增发可能受限"));
    console.log(chalk.white("3. 重新部署更干净\n"));
    
    console.log(chalk.cyan("执行步骤:"));
    console.log(chalk.white("1. 编辑 contracts/BSDTToken.sol"));
    console.log(chalk.white("2. 找到构造函数中的 initialSupply"));
    console.log(chalk.white("3. 改为: 100000000000 * 10**18 (1000亿)"));
    console.log(chalk.white("4. 运行: npx hardhat run scripts/deploy-all.js --network bsc"));
    console.log(chalk.white("5. 更新所有合约地址\n"));
    
    console.log(chalk.yellow("⚠️ 注意: 重新部署会产生新的合约地址"));
    console.log(chalk.yellow("需要更新所有依赖的合约和脚本"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });