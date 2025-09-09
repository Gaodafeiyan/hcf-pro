const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔄 分批移除流动性"));
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
            "function totalSupply() view returns (uint256)",
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)"
        ], addresses.Pool);
        
        const router = await ethers.getContractAt([
            "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)"
        ], addresses.Router);
        
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
        const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        
        // 2. 检查当前状态
        console.log(chalk.cyan("1. 当前状态..."));
        let lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        const reserves = await pair.getReserves();
        
        console.log(`您的LP: ${ethers.utils.formatEther(lpBalance)}`);
        console.log(`总LP: ${ethers.utils.formatEther(totalSupply)}`);
        console.log(`池子储备: ${ethers.utils.formatEther(reserves[0])} / ${ethers.utils.formatEther(reserves[1])}`);
        
        if (lpBalance.eq(0)) {
            console.log(chalk.red("❌ 您没有LP代币"));
            return;
        }
        
        // 3. 分批移除策略
        console.log(chalk.cyan("\n2. 开始分批移除..."));
        console.log(chalk.yellow("策略：每次移除100个LP，直到全部移除"));
        
        const batchSize = ethers.utils.parseEther("100"); // 每批100个LP
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时有效期
        let totalRemoved = ethers.BigNumber.from(0);
        let batchCount = 0;
        
        // 记录收到的代币
        const initialHCF = await hcf.balanceOf(signer.address);
        const initialBSDT = await bsdt.balanceOf(signer.address);
        
        while (lpBalance.gt(0)) {
            batchCount++;
            
            // 确定这批要移除的数量
            const removeAmount = lpBalance.gt(batchSize) ? batchSize : lpBalance;
            
            console.log(chalk.cyan(`\n批次 ${batchCount}:`));
            console.log(`移除 ${ethers.utils.formatEther(removeAmount)} LP...`);
            
            try {
                const tx = await router.removeLiquidity(
                    addresses.HCF,
                    addresses.BSDT,
                    removeAmount,
                    0, // 接受任意数量的HCF
                    0, // 接受任意数量的BSDT
                    signer.address,
                    deadline
                );
                
                console.log(`交易: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(chalk.green(`✅ 批次 ${batchCount} 成功`));
                
                totalRemoved = totalRemoved.add(removeAmount);
                
                // 更新余额
                lpBalance = await pair.balanceOf(signer.address);
                console.log(`剩余LP: ${ethers.utils.formatEther(lpBalance)}`);
                
                // 如果剩余很少，一次性移除
                if (lpBalance.gt(0) && lpBalance.lt(ethers.utils.parseEther("10"))) {
                    console.log(chalk.yellow("\n剩余LP较少，一次性移除..."));
                    const finalTx = await router.removeLiquidity(
                        addresses.HCF,
                        addresses.BSDT,
                        lpBalance,
                        0,
                        0,
                        signer.address,
                        deadline
                    );
                    await finalTx.wait();
                    console.log(chalk.green("✅ 全部移除完成"));
                    break;
                }
                
            } catch (error) {
                console.log(chalk.red(`❌ 批次 ${batchCount} 失败:`, error.reason || error.message));
                
                // 如果失败，尝试更小的批次
                if (removeAmount.gt(ethers.utils.parseEther("10"))) {
                    console.log(chalk.yellow("尝试更小批次（10 LP）..."));
                    
                    try {
                        const smallTx = await router.removeLiquidity(
                            addresses.HCF,
                            addresses.BSDT,
                            ethers.utils.parseEther("10"),
                            0,
                            0,
                            signer.address,
                            deadline
                        );
                        await smallTx.wait();
                        console.log(chalk.green("✅ 小批次成功"));
                        lpBalance = await pair.balanceOf(signer.address);
                    } catch (smallError) {
                        console.log(chalk.red("小批次也失败了"));
                        break;
                    }
                } else {
                    break;
                }
            }
            
            // 防止无限循环
            if (batchCount > 50) {
                console.log(chalk.red("批次过多，停止"));
                break;
            }
        }
        
        // 4. 显示结果
        console.log(chalk.cyan("\n3. 移除结果..."));
        console.log(`总共移除: ${ethers.utils.formatEther(totalRemoved)} LP`);
        
        const finalHCF = await hcf.balanceOf(signer.address);
        const finalBSDT = await bsdt.balanceOf(signer.address);
        
        const receivedHCF = finalHCF.sub(initialHCF);
        const receivedBSDT = finalBSDT.sub(initialBSDT);
        
        console.log(chalk.green("\n收到的代币："));
        console.log(`HCF: ${ethers.utils.formatEther(receivedHCF)}`);
        console.log(`BSDT: ${ethers.utils.formatEther(receivedBSDT)}`);
        
        // 5. 检查池子状态
        const finalReserves = await pair.getReserves();
        const finalTotalSupply = await pair.totalSupply();
        
        console.log(chalk.cyan("\n4. 最终池子状态..."));
        console.log(`池子储备: ${ethers.utils.formatEther(finalReserves[0])} / ${ethers.utils.formatEther(finalReserves[1])}`);
        console.log(`总LP供应: ${ethers.utils.formatEther(finalTotalSupply)}`);
        
        if (finalTotalSupply.eq(0)) {
            console.log(chalk.green("\n✅ 池子已清空，可以重新添加正确比例的流动性"));
            console.log(chalk.yellow("运行: npx hardhat run scripts/create-hcf-bsdt-pool.js --network bsc"));
            console.log("添加: 10000 HCF + 1000 BSDT (价格0.1)");
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