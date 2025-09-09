const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔄 智能移除流动性（优化Gas）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    try {
        // 1. 连接合约
        const pair = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function totalSupply() view returns (uint256)"
        ], addresses.Pool);
        
        const router = await ethers.getContractAt([
            "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)"
        ], addresses.Router);
        
        // 2. 获取当前LP余额
        let lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        
        console.log(chalk.cyan("当前状态："));
        console.log(`您的LP: ${ethers.utils.formatEther(lpBalance)}`);
        console.log(`总LP: ${ethers.utils.formatEther(totalSupply)}`);
        
        if (lpBalance.eq(0)) {
            console.log(chalk.red("❌ 您没有LP代币"));
            return;
        }
        
        // 3. 智能批次策略
        console.log(chalk.cyan("\n开始智能移除..."));
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        let batchCount = 0;
        let totalRemoved = ethers.BigNumber.from(0);
        
        // 尝试不同大小的批次
        const batchSizes = [
            ethers.utils.parseEther("1000"),  // 先尝试1000
            ethers.utils.parseEther("500"),   // 然后500
            ethers.utils.parseEther("300"),   // 然后300
            ethers.utils.parseEther("200"),   // 然后200
            ethers.utils.parseEther("100"),   // 然后100
            ethers.utils.parseEther("50"),    // 然后50
            ethers.utils.parseEther("10"),    // 最后10
        ];
        
        let currentBatchSizeIndex = 0;
        
        while (lpBalance.gt(0) && batchCount < 100) {
            batchCount++;
            
            // 找到合适的批次大小
            let batchSize = batchSizes[currentBatchSizeIndex];
            let removeAmount = lpBalance.gt(batchSize) ? batchSize : lpBalance;
            
            // 如果剩余量小于当前批次，直接全部移除
            if (lpBalance.lte(batchSize)) {
                removeAmount = lpBalance;
                console.log(chalk.yellow(`\n最后批次：移除剩余 ${ethers.utils.formatEther(removeAmount)} LP`));
            } else {
                console.log(chalk.cyan(`\n批次 ${batchCount}：尝试移除 ${ethers.utils.formatEther(removeAmount)} LP`));
            }
            
            try {
                const tx = await router.removeLiquidity(
                    addresses.HCF,
                    addresses.BSDT,
                    removeAmount,
                    0,
                    0,
                    signer.address,
                    deadline
                );
                
                console.log(`交易: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(chalk.green(`✅ 成功移除 ${ethers.utils.formatEther(removeAmount)} LP`));
                console.log(`Gas使用: ${receipt.gasUsed.toString()}`);
                
                totalRemoved = totalRemoved.add(removeAmount);
                lpBalance = await pair.balanceOf(signer.address);
                console.log(`剩余LP: ${ethers.utils.formatEther(lpBalance)}`);
                
                // 如果成功，尝试更大的批次（优化gas）
                if (currentBatchSizeIndex > 0 && lpBalance.gt(batchSizes[currentBatchSizeIndex - 1])) {
                    currentBatchSizeIndex--;
                    console.log(chalk.green(`尝试增大批次到 ${ethers.utils.formatEther(batchSizes[currentBatchSizeIndex])}`));
                }
                
            } catch (error) {
                console.log(chalk.red(`❌ ${ethers.utils.formatEther(removeAmount)} LP 失败`));
                
                // 如果失败，减小批次大小
                if (currentBatchSizeIndex < batchSizes.length - 1) {
                    currentBatchSizeIndex++;
                    console.log(chalk.yellow(`减小批次到 ${ethers.utils.formatEther(batchSizes[currentBatchSizeIndex])}`));
                } else {
                    console.log(chalk.red("最小批次也失败，停止"));
                    break;
                }
            }
        }
        
        // 4. 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green(`✅ 总共移除: ${ethers.utils.formatEther(totalRemoved)} LP`));
        console.log(`📊 交易次数: ${batchCount}`);
        
        const finalLP = await pair.balanceOf(signer.address);
        const finalTotalSupply = await pair.totalSupply();
        
        console.log(`\n最终状态：`);
        console.log(`您的LP: ${ethers.utils.formatEther(finalLP)}`);
        console.log(`总LP: ${ethers.utils.formatEther(finalTotalSupply)}`);
        
        if (finalLP.eq(0) && finalTotalSupply.lte(ethers.utils.parseEther("1"))) {
            console.log(chalk.green.bold("\n✅ 流动性已清空！"));
            console.log(chalk.yellow("\n下一步：重新添加正确比例"));
            console.log("运行: npx hardhat run scripts/create-hcf-bsdt-pool.js --network bsc"));
            console.log("添加: 10000 HCF + 1000 BSDT (价格0.1)"));
        } else if (finalLP.gt(0)) {
            console.log(chalk.yellow(`\n⚠️ 还有 ${ethers.utils.formatEther(finalLP)} LP 未移除`));
            console.log("可能需要手动处理或等待");
        }
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
    }
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