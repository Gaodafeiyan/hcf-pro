const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔄 简单移除流动性"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    try {
        // 1. 获取LP余额
        console.log(chalk.cyan("1. 检查LP余额..."));
        const pair = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function totalSupply() view returns (uint256)"
        ], addresses.Pool);
        
        const lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        console.log(`您的LP: ${ethers.utils.formatEther(lpBalance)}`);
        console.log(`总LP: ${ethers.utils.formatEther(totalSupply)}`);
        
        if (lpBalance.eq(0)) {
            console.log(chalk.red("❌ 您没有LP代币"));
            return;
        }
        
        // 2. 检查授权
        console.log(chalk.cyan("\n2. 检查LP授权..."));
        const allowance = await pair.allowance(signer.address, addresses.Router);
        console.log(`当前授权: ${ethers.utils.formatEther(allowance)}`);
        
        if (allowance.lt(lpBalance)) {
            console.log("授权LP给Router...");
            const approveTx = await pair.approve(addresses.Router, lpBalance);
            console.log("授权交易:", approveTx.hash);
            await approveTx.wait();
            console.log(chalk.green("✅ 授权成功"));
        } else {
            console.log(chalk.green("✅ 已授权"));
        }
        
        // 3. 尝试移除一小部分流动性测试
        console.log(chalk.cyan("\n3. 先测试移除1个LP..."));
        const router = await ethers.getContractAt([
            "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)"
        ], addresses.Router);
        
        const deadline = Math.floor(Date.now() / 1000) + 600;
        const testAmount = ethers.utils.parseEther("1"); // 测试移除1个LP
        
        try {
            console.log("尝试移除1个LP代币...");
            const removeTx = await router.removeLiquidity(
                addresses.HCF,
                addresses.BSDT,
                testAmount,
                0,
                0,
                signer.address,
                deadline
            );
            
            console.log("交易哈希:", removeTx.hash);
            await removeTx.wait();
            console.log(chalk.green("✅ 测试成功！可以移除流动性"));
            
            // 4. 移除剩余的流动性
            console.log(chalk.cyan("\n4. 移除剩余流动性..."));
            const remainingLP = await pair.balanceOf(signer.address);
            console.log(`剩余LP: ${ethers.utils.formatEther(remainingLP)}`);
            
            if (remainingLP.gt(0)) {
                const removeTx2 = await router.removeLiquidity(
                    addresses.HCF,
                    addresses.BSDT,
                    remainingLP,
                    0,
                    0,
                    signer.address,
                    deadline
                );
                
                console.log("交易哈希:", removeTx2.hash);
                await removeTx2.wait();
                console.log(chalk.green("✅ 所有流动性已移除"));
            }
            
            // 5. 显示收到的代币
            const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
            const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
            
            const hcfBalance = await hcf.balanceOf(signer.address);
            const bsdtBalance = await bsdt.balanceOf(signer.address);
            
            console.log(chalk.green("\n✅ 移除成功！收到："));
            console.log(`HCF: ${ethers.utils.formatEther(hcfBalance)}`);
            console.log(`BSDT: ${ethers.utils.formatEther(bsdtBalance)}`);
            
            console.log(chalk.yellow("\n下一步："));
            console.log("运行 create-hcf-bsdt-pool.js 重新添加正确比例的流动性");
            console.log("添加 10000 HCF + 1000 BSDT (价格0.1)");
            
        } catch (error) {
            console.log(chalk.red("\n❌ 移除失败:"), error.reason || error.message);
            
            // 尝试诊断问题
            console.log(chalk.yellow("\n可能的原因："));
            console.log("1. LP代币可能被锁定");
            console.log("2. Router合约问题");
            console.log("3. 代币转账限制");
            
            // 检查是否可以直接burn LP
            console.log(chalk.cyan("\n尝试其他方法..."));
            console.log("如果无法移除，可以：");
            console.log("1. 创建新的池子");
            console.log("2. 或通过大量交易调整价格");
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