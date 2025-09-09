const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💱 通过交换调整价格到0.1 BSDT"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    try {
        // 1. 检查当前池子状态
        console.log(chalk.cyan("1. 当前池子状态..."));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
            "function token0() view returns (address)"
        ], addresses.Pool);
        
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        
        let currentHCF, currentBSDT;
        if (token0.toLowerCase() === addresses.BSDT.toLowerCase()) {
            currentBSDT = reserves[0];
            currentHCF = reserves[1];
        } else {
            currentHCF = reserves[0];
            currentBSDT = reserves[1];
        }
        
        console.log(`当前储备: ${ethers.utils.formatEther(currentHCF)} HCF / ${ethers.utils.formatEther(currentBSDT)} BSDT`);
        const currentPrice = currentBSDT.mul(ethers.utils.parseEther("1")).div(currentHCF);
        console.log(chalk.red(`当前价格: 1 HCF = ${ethers.utils.formatEther(currentPrice)} BSDT`));
        
        // 2. 计算需要的交换
        console.log(chalk.cyan("\n2. 计算调整方案..."));
        
        // 当前: 100 HCF + 1000 BSDT (价格10)
        // 目标: 价格0.1
        // 使用 x * y = k 恒定乘积
        const k = currentHCF.mul(currentBSDT);
        console.log(`恒定乘积 k = ${k.toString()}`);
        
        // 目标：BSDT/HCF = 0.1
        // 需要增加HCF储备，减少BSDT储备
        // 卖出BSDT买入HCF
        
        // 计算需要的HCF储备量
        // 如果价格要变成0.1，则 BSDT/HCF = 0.1
        // HCF = BSDT / 0.1 = BSDT * 10
        // 同时要满足 HCF * BSDT = k
        // 所以 (BSDT * 10) * BSDT = k
        // BSDT^2 = k/10
        // BSDT = sqrt(k/10)
        
        const targetBSDT = ethers.BigNumber.from(Math.floor(Math.sqrt(parseFloat(k.toString()) / 10)));
        const targetHCF = k.div(targetBSDT);
        
        console.log(`目标储备: ${ethers.utils.formatEther(targetHCF)} HCF / ${ethers.utils.formatEther(targetBSDT)} BSDT`);
        
        const bsdtToSell = currentBSDT.sub(targetBSDT);
        console.log(chalk.yellow(`\n需要卖出: ${ethers.utils.formatEther(bsdtToSell)} BSDT 来买入HCF`));
        
        // 3. 检查余额
        const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        const bsdtBalance = await bsdt.balanceOf(signer.address);
        
        console.log(chalk.cyan("\n3. 检查余额..."));
        console.log(`您的BSDT: ${ethers.utils.formatEther(bsdtBalance)}`);
        
        if (bsdtBalance.lt(bsdtToSell)) {
            console.log(chalk.red(`❌ BSDT余额不足，需要 ${ethers.utils.formatEther(bsdtToSell)}`));
            return;
        }
        
        // 4. 授权
        console.log(chalk.cyan("\n4. 授权BSDT..."));
        const allowance = await bsdt.allowance(signer.address, addresses.Router);
        if (allowance.lt(bsdtToSell)) {
            const approveTx = await bsdt.approve(addresses.Router, ethers.constants.MaxUint256);
            console.log("授权交易:", approveTx.hash);
            await approveTx.wait();
            console.log(chalk.green("✅ 授权成功"));
        }
        
        // 5. 执行交换
        console.log(chalk.cyan("\n5. 执行交换..."));
        const router = await ethers.getContractAt([
            "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)"
        ], addresses.Router);
        
        const deadline = Math.floor(Date.now() / 1000) + 600;
        const path = [addresses.BSDT, addresses.HCF];
        
        console.log("执行交换: 卖BSDT买HCF...");
        const swapTx = await router.swapExactTokensForTokens(
            bsdtToSell,
            0, // 接受任意数量的HCF
            path,
            signer.address,
            deadline
        );
        
        console.log("交换交易:", swapTx.hash);
        const receipt = await swapTx.wait();
        console.log(chalk.green("✅ 交换成功"));
        console.log(`Gas使用: ${receipt.gasUsed.toString()}`);
        
        // 6. 验证新价格
        console.log(chalk.cyan("\n6. 验证新价格..."));
        const newReserves = await pair.getReserves();
        let finalHCF, finalBSDT;
        if (token0.toLowerCase() === addresses.BSDT.toLowerCase()) {
            finalBSDT = newReserves[0];
            finalHCF = newReserves[1];
        } else {
            finalHCF = newReserves[0];
            finalBSDT = newReserves[1];
        }
        
        const finalPrice = finalBSDT.mul(ethers.utils.parseEther("1")).div(finalHCF);
        console.log(`最终储备: ${ethers.utils.formatEther(finalHCF)} HCF / ${ethers.utils.formatEther(finalBSDT)} BSDT`);
        console.log(chalk.green.bold(`最终价格: 1 HCF = ${ethers.utils.formatEther(finalPrice)} BSDT`));
        
        if (parseFloat(ethers.utils.formatEther(finalPrice)) <= 0.11 && parseFloat(ethers.utils.formatEther(finalPrice)) >= 0.09) {
            console.log(chalk.green.bold("\n✅ 价格调整成功！已接近0.1 BSDT"));
        }
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
        }
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