const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 验证HCF/BSDT池子创建"));
    console.log(chalk.blue.bold("========================================\n"));

    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };
    
    try {
        // 1. 从Factory获取正确的池子地址
        console.log(chalk.cyan("1. 从PancakeSwap Factory查询池子..."));
        const factory = await ethers.getContractAt([
            "function getPair(address tokenA, address tokenB) view returns (address pair)"
        ], addresses.PancakeFactory);
        
        const pairAddress = await factory.getPair(addresses.HCF, addresses.BSDT);
        console.log("Factory返回的池子地址:", pairAddress);
        
        if (pairAddress === "0x0000000000000000000000000000000000000000") {
            console.log(chalk.red("❌ 池子不存在！需要先创建池子"));
            console.log(chalk.yellow("\n运行以下命令创建池子:"));
            console.log("npx hardhat run scripts/create-hcf-bsdt-pool.js --network bsc");
            return;
        }
        
        // 2. 验证池子合约
        console.log(chalk.cyan("\n2. 验证池子合约..."));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function totalSupply() view returns (uint256)"
        ], pairAddress);
        
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        const reserves = await pair.getReserves();
        const totalSupply = await pair.totalSupply();
        
        console.log("\nToken0:", token0);
        console.log("Token1:", token1);
        console.log("Reserve0:", ethers.utils.formatEther(reserves[0]));
        console.log("Reserve1:", ethers.utils.formatEther(reserves[1]));
        console.log("Total LP Supply:", ethers.utils.formatEther(totalSupply));
        
        // 3. 计算价格
        if (reserves[0].gt(0) && reserves[1].gt(0)) {
            let price;
            if (token0.toLowerCase() === addresses.HCF.toLowerCase()) {
                price = reserves[1].mul(ethers.utils.parseEther("1")).div(reserves[0]);
                console.log(chalk.green(`\n✅ 当前HCF价格: ${ethers.utils.formatEther(price)} BSDT`));
            } else {
                price = reserves[0].mul(ethers.utils.parseEther("1")).div(reserves[1]);
                console.log(chalk.green(`\n✅ 当前HCF价格: ${ethers.utils.formatEther(price)} BSDT`));
            }
        } else {
            console.log(chalk.yellow("\n⚠️ 池子存在但没有流动性"));
        }
        
        // 4. 输出正确的池子地址
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green.bold("正确的HCF/BSDT池子地址:"));
        console.log(chalk.green.bold(pairAddress));
        console.log(chalk.blue.bold("========================================"));
        
        console.log(chalk.yellow("\n更新质押合约的池子地址:"));
        console.log(`stakingContract.setHCFBSDTPair("${pairAddress}")`);
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 验证完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });