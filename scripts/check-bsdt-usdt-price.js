const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💱 检查 BSDT/USDT 价格"));
    console.log(chalk.blue.bold("========================================\n"));

    // 合约地址
    const addresses = {
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",     // ProtectedBSDT
        USDT: "0x55d398326f99059fF775485246999027B3197955",     // BSC USDT
        Pool: "0xe0e4ca5DD8FB4559a467636ca8e482123b810Db8",     // BSDT/USDT池子
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };
    
    try {
        // 1. 连接池子合约
        console.log(chalk.cyan("1. 连接BSDT/USDT池子..."));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function totalSupply() view returns (uint256)"
        ], addresses.Pool);
        
        // 2. 获取储备量
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        console.log(chalk.yellow("\n池子信息:"));
        console.log("池子地址:", addresses.Pool);
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        
        // 3. 判断代币顺序并计算价格
        let bsdtReserve, usdtReserve;
        if (token0.toLowerCase() === addresses.BSDT.toLowerCase()) {
            bsdtReserve = reserves[0];
            usdtReserve = reserves[1];
            console.log(`\n储备量:`);
            console.log(`BSDT: ${ethers.utils.formatEther(bsdtReserve)}`);
            console.log(`USDT: ${ethers.utils.formatEther(usdtReserve)}`);
        } else {
            bsdtReserve = reserves[1];
            usdtReserve = reserves[0];
            console.log(`\n储备量:`);
            console.log(`USDT: ${ethers.utils.formatEther(usdtReserve)}`);
            console.log(`BSDT: ${ethers.utils.formatEther(bsdtReserve)}`);
        }
        
        // 4. 计算价格
        const price = usdtReserve.mul(ethers.utils.parseEther("1")).div(bsdtReserve);
        const priceFormatted = ethers.utils.formatEther(price);
        
        console.log(chalk.green.bold("\n价格信息:"));
        console.log(`1 BSDT = ${priceFormatted} USDT`);
        
        // 5. 检查是否接近1:1
        const priceDiff = Math.abs(parseFloat(priceFormatted) - 1.0);
        if (priceDiff < 0.01) {
            console.log(chalk.green("✅ 价格基本保持1:1锚定（误差小于1%）"));
        } else if (priceDiff < 0.05) {
            console.log(chalk.yellow("⚠️ 价格略有偏差（误差${(priceDiff * 100).toFixed(2)}%）"));
        } else {
            console.log(chalk.red("❌ 价格偏离较大（误差${(priceDiff * 100).toFixed(2)}%）"));
        }
        
        // 6. 提供HCF/BSDT合约地址
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("   📝 HCF/BSDT 池子信息"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("准备创建HCF/BSDT池子需要的合约:"));
        console.log("HCF合约:", "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192");
        console.log("BSDT合约:", addresses.BSDT);
        
        console.log(chalk.yellow("\n你可以手动在PancakeSwap添加流动性:"));
        console.log("1. 访问: https://pancakeswap.finance/add");
        console.log("2. 输入HCF合约地址");
        console.log("3. 输入BSDT合约地址");
        console.log("4. 输入数量 (建议10000 HCF + 1000 BSDT，初始价格0.1)");
        console.log("5. 点击Supply添加流动性");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });