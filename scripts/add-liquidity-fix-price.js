const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💱 添加流动性调整价格到0.1 BSDT"));
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
        
        // 2. 计算需要添加的流动性
        console.log(chalk.cyan("\n2. 计算调整方案..."));
        
        // 当前: 约 3.16 HCF / 31.6 BSDT (价格10)
        // 目标: 价格0.1
        // 策略: 添加大量HCF和少量BSDT来稀释价格
        
        // 使用公式计算需要添加的量
        // 添加后: (currentHCF + addHCF) / (currentBSDT + addBSDT) = 10
        // 为了将价格从10降到0.1，需要HCF是BSDT的10倍
        
        // 方案1: 添加大量HCF，保持恒定乘积
        const k = currentHCF.mul(currentBSDT);
        console.log(`恒定乘积 k = ${ethers.utils.formatEther(k.div(ethers.utils.parseEther("1")))}`);
        
        // 目标：添加9000 HCF + 90 BSDT (按0.01价格比例)
        // 这样新储备变成: 9003 HCF + 122 BSDT ≈ 0.0135 BSDT/HCF
        const addHCF = ethers.utils.parseEther("9000");
        const addBSDT = ethers.utils.parseEther("90");
        
        console.log(chalk.yellow("添加方案："));
        console.log(`添加: ${ethers.utils.formatEther(addHCF)} HCF + ${ethers.utils.formatEther(addBSDT)} BSDT`);
        
        const newHCF = currentHCF.add(addHCF);
        const newBSDT = currentBSDT.add(addBSDT);
        const newPrice = newBSDT.mul(ethers.utils.parseEther("1")).div(newHCF);
        console.log(`预计新储备: ${ethers.utils.formatEther(newHCF)} HCF / ${ethers.utils.formatEther(newBSDT)} BSDT`);
        console.log(chalk.green(`预计新价格: 1 HCF = ${ethers.utils.formatEther(newPrice)} BSDT`));
        
        // 3. 检查余额
        console.log(chalk.cyan("\n3. 检查余额..."));
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
        const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        
        const hcfBalance = await hcf.balanceOf(signer.address);
        const bsdtBalance = await bsdt.balanceOf(signer.address);
        
        console.log(`您的HCF: ${ethers.utils.formatEther(hcfBalance)}`);
        console.log(`您的BSDT: ${ethers.utils.formatEther(bsdtBalance)}`);
        
        if (hcfBalance.lt(addHCF)) {
            console.log(chalk.red(`❌ HCF不足，需要 ${ethers.utils.formatEther(addHCF)}`));
            
            // 替代方案
            const availableHCF = hcfBalance.div(2); // 使用一半余额
            const correspondingBSDT = availableHCF.div(100); // 按0.01比例
            
            console.log(chalk.yellow("\n替代方案："));
            console.log(`添加: ${ethers.utils.formatEther(availableHCF)} HCF + ${ethers.utils.formatEther(correspondingBSDT)} BSDT`);
            return;
        }
        
        if (bsdtBalance.lt(addBSDT)) {
            console.log(chalk.red(`❌ BSDT不足，需要 ${ethers.utils.formatEther(addBSDT)}`));
            return;
        }
        
        // 4. 授权
        console.log(chalk.cyan("\n4. 授权代币..."));
        const router = await ethers.getContractAt([
            "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)"
        ], addresses.Router);
        
        const hcfAllowance = await hcf.allowance(signer.address, addresses.Router);
        if (hcfAllowance.lt(addHCF)) {
            console.log("授权HCF...");
            const approveTx1 = await hcf.approve(addresses.Router, ethers.constants.MaxUint256);
            await approveTx1.wait();
            console.log(chalk.green("✅ HCF授权成功"));
        }
        
        const bsdtAllowance = await bsdt.allowance(signer.address, addresses.Router);
        if (bsdtAllowance.lt(addBSDT)) {
            console.log("授权BSDT...");
            const approveTx2 = await bsdt.approve(addresses.Router, ethers.constants.MaxUint256);
            await approveTx2.wait();
            console.log(chalk.green("✅ BSDT授权成功"));
        }
        
        // 5. 添加流动性
        console.log(chalk.cyan("\n5. 添加流动性..."));
        const deadline = Math.floor(Date.now() / 1000) + 600;
        
        console.log("执行添加流动性...");
        const addTx = await router.addLiquidity(
            addresses.HCF,
            addresses.BSDT,
            addHCF,
            addBSDT,
            0,  // 接受任意数量
            0,  // 接受任意数量
            signer.address,
            deadline
        );
        
        console.log("交易哈希:", addTx.hash);
        const receipt = await addTx.wait();
        console.log(chalk.green("✅ 流动性添加成功"));
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
        
        if (parseFloat(ethers.utils.formatEther(finalPrice)) < 0.2) {
            console.log(chalk.green.bold("\n✅ 价格调整成功！接近0.1 BSDT"));
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