const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔄 重置流动性池（调整价格到0.1）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    // 正确的流动性配置
    const NEW_HCF_AMOUNT = ethers.utils.parseEther("10000");   // 10000 HCF
    const NEW_BSDT_AMOUNT = ethers.utils.parseEther("1000");   // 1000 BSDT
    
    try {
        // 1. 连接合约
        console.log(chalk.cyan("1. 连接合约..."));
        const router = await ethers.getContractAt([
            "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)",
            "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)"
        ], addresses.Router);
        
        const pair = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ], addresses.Pool);
        
        const hcfToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
        const bsdtToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        
        // 2. 检查LP余额
        console.log(chalk.cyan("\n2. 检查LP余额..."));
        const lpBalance = await pair.balanceOf(signer.address);
        console.log(`您的LP余额: ${ethers.utils.formatEther(lpBalance)}`);
        
        if (lpBalance.eq(0)) {
            console.log(chalk.red("❌ 您没有LP代币，无法移除流动性"));
            return;
        }
        
        // 3. 授权LP给Router
        console.log(chalk.cyan("\n3. 授权LP代币..."));
        const lpAllowance = await pair.allowance(signer.address, addresses.Router);
        if (lpAllowance.lt(lpBalance)) {
            const approveTx = await pair.approve(addresses.Router, ethers.constants.MaxUint256);
            console.log("授权交易:", approveTx.hash);
            await approveTx.wait();
            console.log(chalk.green("✅ LP授权成功"));
        }
        
        // 4. 移除流动性
        console.log(chalk.cyan("\n4. 移除所有流动性..."));
        const deadline = Math.floor(Date.now() / 1000) + 600;
        
        const removeTx = await router.removeLiquidity(
            addresses.HCF,
            addresses.BSDT,
            lpBalance,
            0,  // 最小HCF数量
            0,  // 最小BSDT数量
            signer.address,
            deadline
        );
        
        console.log("移除交易:", removeTx.hash);
        const removeReceipt = await removeTx.wait();
        console.log(chalk.green("✅ 流动性移除成功"));
        
        // 5. 检查余额
        console.log(chalk.cyan("\n5. 检查代币余额..."));
        const hcfBalance = await hcfToken.balanceOf(signer.address);
        const bsdtBalance = await bsdtToken.balanceOf(signer.address);
        
        console.log(`HCF余额: ${ethers.utils.formatEther(hcfBalance)}`);
        console.log(`BSDT余额: ${ethers.utils.formatEther(bsdtBalance)}`);
        
        // 6. 检查是否足够重新添加
        if (hcfBalance.lt(NEW_HCF_AMOUNT)) {
            console.log(chalk.red(`❌ HCF不足，需要 ${ethers.utils.formatEther(NEW_HCF_AMOUNT)}`));
            return;
        }
        
        if (bsdtBalance.lt(NEW_BSDT_AMOUNT)) {
            console.log(chalk.red(`❌ BSDT不足，需要 ${ethers.utils.formatEther(NEW_BSDT_AMOUNT)}`));
            return;
        }
        
        // 7. 授权代币
        console.log(chalk.cyan("\n6. 授权代币给Router..."));
        
        const hcfAllowance = await hcfToken.allowance(signer.address, addresses.Router);
        if (hcfAllowance.lt(NEW_HCF_AMOUNT)) {
            const approveTx1 = await hcfToken.approve(addresses.Router, ethers.constants.MaxUint256);
            await approveTx1.wait();
            console.log(chalk.green("✅ HCF授权成功"));
        }
        
        const bsdtAllowance = await bsdtToken.allowance(signer.address, addresses.Router);
        if (bsdtAllowance.lt(NEW_BSDT_AMOUNT)) {
            const approveTx2 = await bsdtToken.approve(addresses.Router, ethers.constants.MaxUint256);
            await approveTx2.wait();
            console.log(chalk.green("✅ BSDT授权成功"));
        }
        
        // 8. 重新添加正确比例的流动性
        console.log(chalk.cyan("\n7. 添加正确比例的流动性..."));
        console.log(`添加: ${ethers.utils.formatEther(NEW_HCF_AMOUNT)} HCF + ${ethers.utils.formatEther(NEW_BSDT_AMOUNT)} BSDT`);
        
        const addTx = await router.addLiquidity(
            addresses.HCF,
            addresses.BSDT,
            NEW_HCF_AMOUNT,
            NEW_BSDT_AMOUNT,
            0,
            0,
            signer.address,
            deadline
        );
        
        console.log("添加交易:", addTx.hash);
        await addTx.wait();
        
        console.log(chalk.green.bold("\n✅ 流动性重置成功！"));
        console.log(chalk.green("新价格: 1 HCF = 0.1 BSDT"));
        
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