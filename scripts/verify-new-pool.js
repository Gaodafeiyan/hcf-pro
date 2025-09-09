const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   ✅ 验证新HCF/BSDT池子"));
    console.log(chalk.blue.bold("========================================\n"));

    // 新的合约地址
    const addresses = {
        HCF: "0xc5c3f24A212838968759045d1654d3643016D585",      // 新HCF
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",     // BSDT
        Pool: "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048"      // 新池子
    };
    
    try {
        // 1. 连接池子合约
        console.log(chalk.cyan("1. 检查池子状态..."));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function totalSupply() view returns (uint256)"
        ], addresses.Pool);
        
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        const totalSupply = await pair.totalSupply();
        
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        
        // 2. 计算储备和价格
        let hcfReserve, bsdtReserve;
        if (token0.toLowerCase() === addresses.HCF.toLowerCase()) {
            hcfReserve = reserves[0];
            bsdtReserve = reserves[1];
        } else {
            bsdtReserve = reserves[0];
            hcfReserve = reserves[1];
        }
        
        console.log(chalk.yellow("\n2. 池子储备:"));
        console.log(`HCF: ${ethers.utils.formatEther(hcfReserve)}`);
        console.log(`BSDT: ${ethers.utils.formatEther(bsdtReserve)}`);
        console.log(`总LP供应: ${ethers.utils.formatEther(totalSupply)}`);
        
        // 3. 计算价格
        if (hcfReserve.gt(0)) {
            const price = parseFloat(ethers.utils.formatEther(bsdtReserve)) / parseFloat(ethers.utils.formatEther(hcfReserve));
            console.log(chalk.green.bold(`\n价格: 1 HCF = ${price.toFixed(4)} BSDT`));
            
            if (Math.abs(price - 0.1) < 0.001) {
                console.log(chalk.green.bold("✅ 价格完美！正好是0.1 BSDT"));
            } else if (Math.abs(price - 0.1) < 0.01) {
                console.log(chalk.yellow("⚠️ 价格接近0.1 BSDT"));
            } else {
                console.log(chalk.red("❌ 价格偏离0.1 BSDT"));
            }
        } else {
            console.log(chalk.yellow("池子还没有流动性"));
        }
        
        // 4. 输出重要信息
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 池子信息汇总"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("✅ 新HCF合约:"), addresses.HCF);
        console.log(chalk.green("✅ BSDT合约:"), addresses.BSDT);
        console.log(chalk.green("✅ 池子地址:"), addresses.Pool);
        console.log(chalk.green("✅ 当前价格: 1 HCF ="), price ? price.toFixed(4) : "N/A", "BSDT");
        
        // 5. 下一步提示
        console.log(chalk.yellow("\n下一步："));
        console.log("1. 部署新的质押合约使用新HCF");
        console.log("2. 或更新现有质押合约的HCF和池子地址");
        console.log("\n运行:");
        console.log("npx hardhat run scripts/deploy-staking-for-new-hcf.js --network bsc");
        
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