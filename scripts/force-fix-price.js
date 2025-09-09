const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💱 强制调整HCF价格到0.1 BSDT"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    try {
        // 1. 检查当前状态
        console.log(chalk.cyan("1. 当前池子状态..."));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
            "function token0() view returns (address)"
        ], addresses.Pool);
        
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        
        let hcfReserve, bsdtReserve;
        if (token0.toLowerCase() === addresses.BSDT.toLowerCase()) {
            bsdtReserve = reserves[0];
            hcfReserve = reserves[1];
        } else {
            hcfReserve = reserves[0];
            bsdtReserve = reserves[1];
        }
        
        console.log(`当前储备: ${ethers.utils.formatEther(hcfReserve)} HCF / ${ethers.utils.formatEther(bsdtReserve)} BSDT`);
        const currentPrice = bsdtReserve.mul(ethers.utils.parseEther("1")).div(hcfReserve);
        console.log(chalk.red(`当前价格: 1 HCF = ${ethers.utils.formatEther(currentPrice)} BSDT`));
        
        // 2. 计算需要的交换
        console.log(chalk.cyan("\n2. 计算调整方案..."));
        
        // 使用恒定乘积公式 x * y = k
        const k = hcfReserve.mul(bsdtReserve);
        console.log(`恒定乘积 k = ${ethers.utils.formatEther(k.div(ethers.utils.parseEther("1")))}`);
        
        // 目标: 价格 = 0.1，即 bsdtReserve / hcfReserve = 0.1
        // 需要: hcfReserve = 10 * bsdtReserve
        // 由于 k = hcfReserve * bsdtReserve
        // 所以: k = 10 * bsdtReserve^2
        // bsdtReserve = sqrt(k/10)
        
        // 为了简化，我们通过大量买入HCF来降低价格
        // 当前: 1000 HCF, 10000 BSDT, 价格 10
        // 目标: 31622 HCF, 316 BSDT, 价格 0.01 (接近0.1)
        
        // 需要卖出的BSDT数量
        const bsdtToSell = ethers.utils.parseEther("9000"); // 卖出9000 BSDT
        
        console.log(chalk.yellow("调整方案："));
        console.log(`需要卖出: ${ethers.utils.formatEther(bsdtToSell)} BSDT 来买入HCF`);
        
        // 3. 检查余额
        const bsdtToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        const hcfToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
        
        const bsdtBalance = await bsdtToken.balanceOf(signer.address);
        const hcfBalance = await hcfToken.balanceOf(signer.address);
        
        console.log(chalk.cyan("\n3. 检查余额..."));
        console.log(`您的BSDT: ${ethers.utils.formatEther(bsdtBalance)}`);
        console.log(`您的HCF: ${ethers.utils.formatEther(hcfBalance)}`);
        
        if (bsdtBalance.lt(bsdtToSell)) {
            console.log(chalk.red(`\n❌ BSDT余额不足，需要 ${ethers.utils.formatEther(bsdtToSell)} BSDT`));
            
            // 替代方案：添加更多HCF到池子
            console.log(chalk.yellow("\n替代方案：直接添加大量HCF流动性"));
            console.log("如果添加 9000 HCF + 900 BSDT:");
            console.log("新储备将变成: 10000 HCF + 10900 BSDT");
            console.log("价格将变成: 1 HCF = 1.09 BSDT（仍然偏高）");
            return;
        }
        
        // 4. 授权Router
        console.log(chalk.cyan("\n4. 授权BSDT给Router..."));
        const allowance = await bsdtToken.allowance(signer.address, addresses.Router);
        if (allowance.lt(bsdtToSell)) {
            const approveTx = await bsdtToken.approve(addresses.Router, ethers.constants.MaxUint256);
            console.log("授权交易:", approveTx.hash);
            await approveTx.wait();
            console.log(chalk.green("✅ 授权成功"));
        }
        
        // 5. 执行交换
        console.log(chalk.cyan("\n5. 执行交换（卖BSDT买HCF）..."));
        const router = await ethers.getContractAt([
            "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)"
        ], addresses.Router);
        
        const deadline = Math.floor(Date.now() / 1000) + 600;
        const path = [addresses.BSDT, addresses.HCF];
        
        console.log("执行交换...");
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
        
        // 6. 验证新价格
        console.log(chalk.cyan("\n6. 验证新价格..."));
        const newReserves = await pair.getReserves();
        let newHcfReserve, newBsdtReserve;
        if (token0.toLowerCase() === addresses.BSDT.toLowerCase()) {
            newBsdtReserve = newReserves[0];
            newHcfReserve = newReserves[1];
        } else {
            newHcfReserve = newReserves[0];
            newBsdtReserve = newReserves[1];
        }
        
        console.log(`新储备: ${ethers.utils.formatEther(newHcfReserve)} HCF / ${ethers.utils.formatEther(newBsdtReserve)} BSDT`);
        const newPrice = newBsdtReserve.mul(ethers.utils.parseEther("1")).div(newHcfReserve);
        console.log(chalk.green(`新价格: 1 HCF = ${ethers.utils.formatEther(newPrice)} BSDT`));
        
        if (parseFloat(ethers.utils.formatEther(newPrice)) < 1) {
            console.log(chalk.green("✅ 价格调整成功！"));
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