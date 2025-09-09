const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 检查HCF/BSDT池子状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const poolAddress = "0x8288dd6507f5ada98602de3138a79cc3712f5685";
    const stakingAddress = "0x7B073C2A44679b3457E6Bc015Fef5279afE72fC7";
    
    try {
        // 1. 检查池子合约
        console.log(chalk.cyan("1. 检查池子合约..."));
        const pool = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() view returns (address)",
            "function token1() view returns (address)"
        ], poolAddress);
        
        // 获取token地址
        const token0 = await pool.token0();
        const token1 = await pool.token1();
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        
        // 获取储备量
        const reserves = await pool.getReserves();
        console.log("\n储备量:");
        console.log("Reserve0:", ethers.utils.formatEther(reserves[0]));
        console.log("Reserve1:", ethers.utils.formatEther(reserves[1]));
        
        // 2. 检查质押合约的池子设置
        console.log(chalk.cyan("\n2. 检查质押合约设置..."));
        const staking = await ethers.getContractAt([
            "function hcfBsdtPair() view returns (address)",
            "function hcfToken() view returns (address)",
            "function getHCFPrice() view returns (uint256)"
        ], stakingAddress);
        
        const pairInContract = await staking.hcfBsdtPair();
        const hcfInContract = await staking.hcfToken();
        
        console.log("合约中的池子地址:", pairInContract);
        console.log("合约中的HCF地址:", hcfInContract);
        
        // 3. 尝试直接调用getHCFPrice
        console.log(chalk.cyan("\n3. 尝试获取价格..."));
        try {
            const price = await staking.getHCFPrice();
            console.log(chalk.green("✅ 价格获取成功:", ethers.utils.formatEther(price), "BSDT"));
        } catch (err) {
            console.log(chalk.red("❌ 价格获取失败:"));
            console.log("错误:", err.message);
            
            // 如果池子地址为0，使用默认价格
            if (pairInContract === "0x0000000000000000000000000000000000000000") {
                console.log(chalk.yellow("原因: 池子地址未设置"));
            } else {
                console.log(chalk.yellow("原因: 池子调用失败，可能是池子合约接口不匹配"));
            }
        }
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
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