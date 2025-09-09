const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   增发BSDT至1000亿枚"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("操作账户:"), deployer.address);

    // 合约地址
    const bsdtAddress = "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908";
    const gatewayAddress = "0xb4c9C3E8CA4365c04d47dD6113831449213731ca";
    
    // 获取合约实例
    const bsdt = await ethers.getContractAt("BSDTToken", bsdtAddress);
    const gateway = await ethers.getContractAt("BSDTGateway", gatewayAddress);
    
    // 查询当前供应量
    const currentSupply = await bsdt.totalSupply();
    console.log(chalk.yellow("当前供应量:"), ethers.utils.formatEther(currentSupply), "BSDT");
    
    // 计算需要增发的数量
    const targetSupply = ethers.utils.parseEther("100000000000"); // 1000亿
    const mintAmount = targetSupply.sub(currentSupply);
    
    console.log(chalk.cyan("目标供应量:"), "1000亿 BSDT");
    console.log(chalk.cyan("需要增发:"), ethers.utils.formatEther(mintAmount), "BSDT");
    
    // 检查BSDT合约的owner
    try {
        const owner = await bsdt.owner();
        console.log(chalk.cyan("BSDT Owner:"), owner);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log(chalk.red("❌ 当前账户不是BSDT的owner"));
            console.log(chalk.yellow("需要使用owner账户执行"));
        }
    } catch (e) {
        console.log(chalk.yellow("无法查询owner"));
    }
    
    // 方案一：直接调用mint（需要授权）
    console.log(chalk.blue.bold("\n方案一：直接增发"));
    try {
        // 首先授权BSDTGateway作为authorizedExchange
        console.log(chalk.cyan("步骤1: 授权BSDTGateway..."));
        const authTx = await bsdt.addAuthorizedExchange(gatewayAddress);
        await authTx.wait();
        console.log(chalk.green("✅ 授权成功"));
        
        // 然后通过Gateway mint
        console.log(chalk.cyan("步骤2: 增发BSDT..."));
        const mintTx = await bsdt.connect(deployer).mint(deployer.address, mintAmount);
        await mintTx.wait();
        console.log(chalk.green("✅ 增发成功！"));
        
        // 验证新供应量
        const newSupply = await bsdt.totalSupply();
        console.log(chalk.green("新供应量:"), ethers.utils.formatEther(newSupply), "BSDT");
        console.log(chalk.green("约等于:"), (parseFloat(ethers.utils.formatEther(newSupply))/1000000000).toFixed(2), "亿枚");
        
    } catch (error) {
        console.log(chalk.red("方案一失败:"), error.message);
        
        // 方案二：通过内部函数
        console.log(chalk.blue.bold("\n方案二：通过内部增发"));
        try {
            // 尝试调用increaseSupply函数
            console.log(chalk.cyan("尝试increaseSupply..."));
            const increaseTx = await bsdt.increaseSupply(mintAmount);
            await increaseTx.wait();
            console.log(chalk.green("✅ 增发成功！"));
            
            const newSupply = await bsdt.totalSupply();
            console.log(chalk.green("新供应量:"), ethers.utils.formatEther(newSupply), "BSDT");
            
        } catch (error2) {
            console.log(chalk.red("方案二失败:"), error2.message);
            
            console.log(chalk.red.bold("\n❌ 无法增发BSDT"));
            console.log(chalk.yellow("可能原因："));
            console.log(chalk.yellow("1. 当前账户没有权限"));
            console.log(chalk.yellow("2. 合约不支持增发"));
            console.log(chalk.yellow("3. 需要通过特殊方式增发"));
            
            console.log(chalk.cyan.bold("\n建议：重新部署BSDT合约"));
            console.log(chalk.white("步骤："));
            console.log(chalk.white("1. 修改BSDTToken.sol的初始供应量"));
            console.log(chalk.white("2. 重新部署所有合约"));
            console.log(chalk.white("3. 更新合约地址"));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });