const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 诊断流动性移除问题"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    try {
        // 1. 检查HCF合约
        console.log(chalk.cyan("1. 检查HCF代币合约..."));
        const hcfToken = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function paused() view returns (bool)",
            "function owner() view returns (address)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ], addresses.HCF);
        
        // 检查是否暂停
        try {
            const isPaused = await hcfToken.paused();
            console.log("HCF是否暂停:", isPaused ? "是 ❌" : "否 ✅");
            if (isPaused) {
                console.log(chalk.red("⚠️ HCF代币已暂停，无法转账！"));
            }
        } catch (e) {
            console.log("HCF暂停状态: 无暂停功能 ✅");
        }
        
        // 检查池子的HCF余额
        const poolHCFBalance = await hcfToken.balanceOf(addresses.Pool);
        console.log(`池子HCF余额: ${ethers.utils.formatEther(poolHCFBalance)}`);
        
        // 2. 检查BSDT合约
        console.log(chalk.cyan("\n2. 检查BSDT代币合约..."));
        const bsdtToken = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function paused() view returns (bool)",
            "function isBlacklisted(address) view returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ], addresses.BSDT);
        
        // 检查是否暂停
        try {
            const isPaused = await bsdtToken.paused();
            console.log("BSDT是否暂停:", isPaused ? "是 ❌" : "否 ✅");
            if (isPaused) {
                console.log(chalk.red("⚠️ BSDT代币已暂停，无法转账！"));
            }
        } catch (e) {
            console.log("BSDT暂停状态: 无暂停功能 ✅");
        }
        
        // 检查黑名单
        try {
            const isPoolBlacklisted = await bsdtToken.isBlacklisted(addresses.Pool);
            const isRouterBlacklisted = await bsdtToken.isBlacklisted(addresses.Router);
            const isSignerBlacklisted = await bsdtToken.isBlacklisted(signer.address);
            
            console.log("池子是否在黑名单:", isPoolBlacklisted ? "是 ❌" : "否 ✅");
            console.log("Router是否在黑名单:", isRouterBlacklisted ? "是 ❌" : "否 ✅");
            console.log("您是否在黑名单:", isSignerBlacklisted ? "是 ❌" : "否 ✅");
            
            if (isPoolBlacklisted || isRouterBlacklisted || isSignerBlacklisted) {
                console.log(chalk.red("⚠️ 有地址在BSDT黑名单中！"));
            }
        } catch (e) {
            console.log("BSDT黑名单检查: 无黑名单功能");
        }
        
        // 检查池子的BSDT余额
        const poolBSDTBalance = await bsdtToken.balanceOf(addresses.Pool);
        console.log(`池子BSDT余额: ${ethers.utils.formatEther(poolBSDTBalance)}`);
        
        // 3. 检查LP代币
        console.log(chalk.cyan("\n3. 检查LP代币..."));
        const pair = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function totalSupply() view returns (uint256)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)"
        ], addresses.Pool);
        
        const lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        const routerAllowance = await pair.allowance(signer.address, addresses.Router);
        
        console.log(`您的LP余额: ${ethers.utils.formatEther(lpBalance)}`);
        console.log(`总LP供应: ${ethers.utils.formatEther(totalSupply)}`);
        console.log(`Router授权: ${ethers.utils.formatEther(routerAllowance)}`);
        
        const reserves = await pair.getReserves();
        console.log(`储备0: ${ethers.utils.formatEther(reserves[0])}`);
        console.log(`储备1: ${ethers.utils.formatEther(reserves[1])}`);
        
        // 4. 计算预期收到的代币
        console.log(chalk.cyan("\n4. 计算移除流动性预期收到..."));
        const sharePercent = lpBalance.mul(100).div(totalSupply);
        const expectedToken0 = reserves[0].mul(lpBalance).div(totalSupply);
        const expectedToken1 = reserves[1].mul(lpBalance).div(totalSupply);
        
        console.log(`您的份额: ${sharePercent}%`);
        console.log(`预期收到Token0: ${ethers.utils.formatEther(expectedToken0)}`);
        console.log(`预期收到Token1: ${ethers.utils.formatEther(expectedToken1)}`);
        
        // 5. 诊断结果
        console.log(chalk.yellow("\n诊断结果："));
        console.log("TRANSFER_FAILED 错误通常由以下原因造成：");
        console.log("1. 代币合约暂停或黑名单限制");
        console.log("2. 池子代币余额不足");
        console.log("3. 代币合约有特殊转账限制");
        
        // 建议解决方案
        console.log(chalk.cyan("\n建议解决方案："));
        console.log("由于BSDT是ProtectedBSDT合约，可能有特殊限制");
        console.log("建议直接通过Swap调整价格，而不是移除流动性");
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 诊断完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });