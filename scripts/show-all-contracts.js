const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📋 所有合约地址和代币信息"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 所有合约地址
    const contracts = {
        // 核心代币
        SimpleBSDT: "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6",  // 新部署的SimpleBSDT
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",         // HCF代币
        USDT: "0x55d398326f99059fF775485246999027B3197955",        // BSC主网USDT
        
        // 旧的BSDT合约（有限制的）
        OldBSDT: "0xf460422388C1205724EF699051aBe300215E490b",     // 原始BSDT（不能在DEX用）
        BSDTGateway: "0xcED40bF4AF4dD04F821Bd777f7d953861cfD9cda", // BSDT网关
        
        // DEX相关
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        
        // 流动性池
        BSDT_USDT_Pool: "0x0B7a96A7be86769444eD4d83362883fE4CF47044", // SimpleBSDT/USDT池子
        
        // HCF系统合约
        HCFSwapRouter: "0x2e386A8313Cc33a24370A25Fdae5E8d5C548760a"
    };
    
    console.log(chalk.green.bold("=== 核心代币合约 ===\n"));
    console.log(chalk.white("SimpleBSDT (新):"), contracts.SimpleBSDT);
    console.log(chalk.white("HCF:"), contracts.HCF);
    console.log(chalk.white("USDT (BSC):"), contracts.USDT);
    
    console.log(chalk.yellow.bold("\n=== 旧BSDT系统（已废弃） ===\n"));
    console.log(chalk.gray("旧BSDT:"), contracts.OldBSDT);
    console.log(chalk.gray("BSDTGateway:"), contracts.BSDTGateway);
    
    console.log(chalk.cyan.bold("\n=== DEX合约 ===\n"));
    console.log(chalk.white("PancakeRouter:"), contracts.PancakeRouter);
    console.log(chalk.white("PancakeFactory:"), contracts.PancakeFactory);
    
    console.log(chalk.magenta.bold("\n=== 流动性池 ===\n"));
    console.log(chalk.white("BSDT/USDT池子:"), contracts.BSDT_USDT_Pool);
    console.log(chalk.white("查看: https://pancakeswap.finance/info/v2/pair/" + contracts.BSDT_USDT_Pool));
    
    // 检查代币余额
    console.log(chalk.blue.bold("\n=== 代币余额 ===\n"));
    
    try {
        // SimpleBSDT
        const bsdt = await ethers.getContractAt("SimpleBSDT", contracts.SimpleBSDT);
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const bsdtSupply = await bsdt.totalSupply();
        console.log(chalk.green("SimpleBSDT:"));
        console.log("  您的余额:", ethers.utils.formatEther(bsdtBal));
        console.log("  总供应量:", ethers.utils.formatEther(bsdtSupply));
        
        // HCF
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        const hcfBal = await hcf.balanceOf(signer.address);
        const hcfSupply = await hcf.totalSupply();
        console.log(chalk.green("\nHCF:"));
        console.log("  您的余额:", ethers.utils.formatEther(hcfBal));
        console.log("  总供应量:", ethers.utils.formatEther(hcfSupply));
        
        // USDT
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const usdtBal = await usdt.balanceOf(signer.address);
        console.log(chalk.green("\nUSDT:"));
        console.log("  您的余额:", ethers.utils.formatUnits(usdtBal, 18)); // BSC USDT是18位
        
        // BNB
        const bnbBal = await signer.getBalance();
        console.log(chalk.green("\nBNB:"));
        console.log("  您的余额:", ethers.utils.formatEther(bnbBal));
        
        // 检查池子信息
        if (contracts.BSDT_USDT_Pool !== "0x0000000000000000000000000000000000000000") {
            console.log(chalk.blue.bold("\n=== BSDT/USDT池子信息 ===\n"));
            const pair = await ethers.getContractAt([
                "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
                "function token0() view returns (address)",
                "function totalSupply() view returns (uint256)"
            ], contracts.BSDT_USDT_Pool);
            
            const reserves = await pair.getReserves();
            const token0 = await pair.token0();
            const totalSupply = await pair.totalSupply();
            
            let bsdtReserve, usdtReserve;
            if (token0.toLowerCase() === contracts.USDT.toLowerCase()) {
                usdtReserve = reserves.reserve0;
                bsdtReserve = reserves.reserve1;
            } else {
                bsdtReserve = reserves.reserve0;
                usdtReserve = reserves.reserve1;
            }
            
            console.log("BSDT储备:", ethers.utils.formatEther(bsdtReserve));
            console.log("USDT储备:", ethers.utils.formatUnits(usdtReserve, 18));
            console.log("LP总量:", ethers.utils.formatEther(totalSupply));
            
            if (bsdtReserve.gt(0)) {
                const price = ethers.utils.formatUnits(usdtReserve.mul(ethers.utils.parseEther("1")).div(bsdtReserve), 18);
                console.log(chalk.cyan("价格: 1 BSDT ="), price, "USDT");
            }
        }
        
    } catch (error) {
        console.log(chalk.red("获取余额时出错:"), error.message);
    }
    
    console.log(chalk.yellow.bold("\n=== 重要说明 ===\n"));
    console.log(chalk.white("1. SimpleBSDT是新部署的无限制版本，可以在PancakeSwap使用"));
    console.log(chalk.white("2. 旧的BSDT合约有DEX限制，已废弃"));
    console.log(chalk.white("3. BSDT/USDT池子已创建，比例1:1"));
    console.log(chalk.white("4. HCF/BSDT池子待创建"));
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });