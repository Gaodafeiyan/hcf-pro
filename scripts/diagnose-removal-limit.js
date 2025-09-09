const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 诊断LP移除限制原因"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    try {
        // 1. 获取池子详细信息
        console.log(chalk.cyan("1. 池子详细信息..."));
        const pair = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function totalSupply() view returns (uint256)",
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function kLast() view returns (uint256)",
            "function MINIMUM_LIQUIDITY() view returns (uint256)"
        ], addresses.Pool);
        
        const lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        const kLast = await pair.kLast();
        const minLiquidity = await pair.MINIMUM_LIQUIDITY();
        
        console.log(`您的LP: ${ethers.utils.formatEther(lpBalance)}`);
        console.log(`总LP供应: ${ethers.utils.formatEther(totalSupply)}`);
        console.log(`最小流动性: ${ethers.utils.formatEther(minLiquidity)}`);
        console.log(`Reserve0: ${ethers.utils.formatEther(reserves[0])}`);
        console.log(`Reserve1: ${ethers.utils.formatEther(reserves[1])}`);
        console.log(`kLast: ${kLast.toString()}`);
        
        // 2. 计算不同数量LP对应的代币
        console.log(chalk.cyan("\n2. 计算不同LP数量对应的代币..."));
        
        const testAmounts = [
            lpBalance,  // 全部
            ethers.utils.parseEther("1"),  // 1个
            ethers.utils.parseEther("10"),  // 10个
            ethers.utils.parseEther("100"),  // 100个
            ethers.utils.parseEther("500"),  // 500个
        ];
        
        for (const amount of testAmounts) {
            if (amount.lte(lpBalance)) {
                const token0Amount = amount.mul(reserves[0]).div(totalSupply);
                const token1Amount = amount.mul(reserves[1]).div(totalSupply);
                
                console.log(chalk.yellow(`\n${ethers.utils.formatEther(amount)} LP 将获得:`));
                console.log(`  Token0: ${ethers.utils.formatEther(token0Amount)}`);
                console.log(`  Token1: ${ethers.utils.formatEther(token1Amount)}`);
                
                // 检查是否超过储备
                if (token0Amount.gt(reserves[0])) {
                    console.log(chalk.red("  ❌ Token0超过储备量！"));
                }
                if (token1Amount.gt(reserves[1])) {
                    console.log(chalk.red("  ❌ Token1超过储备量！"));
                }
            }
        }
        
        // 3. 检查最小流动性锁定
        console.log(chalk.cyan("\n3. 最小流动性锁定分析..."));
        console.log(`PancakeSwap通常锁定前1000个LP单位作为最小流动性`);
        console.log(`最小流动性: ${minLiquidity.toString()} wei`);
        
        if (totalSupply.sub(lpBalance).lte(minLiquidity)) {
            console.log(chalk.red("⚠️ 移除您的LP后，剩余LP将小于最小流动性！"));
            console.log("这可能是无法移除全部LP的原因");
        }
        
        // 4. 检查是否是第一个LP提供者
        console.log(chalk.cyan("\n4. LP持有者分析..."));
        const yourShare = lpBalance.mul(10000).div(totalSupply);
        console.log(`您的份额: ${yourShare.toNumber() / 100}%`);
        
        if (yourShare.gte(9999)) {
            console.log(chalk.yellow("您几乎持有所有LP（>99.99%）"));
            console.log("最后的LP可能因为MINIMUM_LIQUIDITY限制无法移除");
        }
        
        // 5. 测试实际移除
        console.log(chalk.cyan("\n5. 测试移除不同数量..."));
        const router = await ethers.getContractAt([
            "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)"
        ], addresses.Router);
        
        const deadline = Math.floor(Date.now() / 1000) + 600;
        
        // 测试移除0.1个LP
        if (lpBalance.gte(ethers.utils.parseEther("0.1"))) {
            try {
                console.log("\n测试移除0.1个LP...");
                const testTx = await router.removeLiquidity(
                    addresses.HCF,
                    addresses.BSDT,
                    ethers.utils.parseEther("0.1"),
                    0,
                    0,
                    signer.address,
                    deadline
                );
                await testTx.wait();
                console.log(chalk.green("✅ 0.1个LP成功"));
            } catch (err) {
                console.log(chalk.red("❌ 0.1个LP失败"));
            }
        }
        
        // 6. 分析结论
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.yellow("结论："));
        
        if (totalSupply.sub(lpBalance).lt(ethers.utils.parseEther("0.001"))) {
            console.log("1. 您是唯一的LP提供者");
            console.log("2. 最后约1个LP无法移除是因为MINIMUM_LIQUIDITY锁定");
            console.log("3. 这是PancakeSwap的安全机制，防止池子被完全清空");
        }
        
        console.log(chalk.green("\n解决方案："));
        console.log("1. 接受留下1个LP在池子中（损失很小）");
        console.log("2. 或者创建全新的池子");
        console.log("3. 当前池子仍可正常使用，只是价格是10:1而不是1:10");
        
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