const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💧 直接创建流动性池"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };

    try {
        // 获取Router合约
        const routerABI = [
            "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
            "function factory() external view returns (address)"
        ];
        const router = new ethers.Contract(contracts.PancakeRouter, routerABI, signer);
        
        // 获取Factory合约
        const factoryABI = [
            "function getPair(address tokenA, address tokenB) external view returns (address pair)",
            "function createPair(address tokenA, address tokenB) external returns (address pair)"
        ];
        const factory = new ethers.Contract(contracts.PancakeFactory, factoryABI, signer);
        
        // 检查池子是否存在
        console.log(chalk.yellow.bold("1. 检查池子状态..."));
        
        let bsdtUsdtPair = await factory.getPair(contracts.BSDT, contracts.USDT);
        let hcfBsdtPair = await factory.getPair(contracts.HCF, contracts.BSDT);
        
        console.log("BSDT/USDT池子:", bsdtUsdtPair === ethers.constants.AddressZero ? "不存在" : bsdtUsdtPair);
        console.log("HCF/BSDT池子:", hcfBsdtPair === ethers.constants.AddressZero ? "不存在" : hcfBsdtPair);
        
        // 如果池子不存在，创建池子
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.cyan("\n创建BSDT/USDT池子..."));
            const tx1 = await factory.createPair(contracts.BSDT, contracts.USDT);
            console.log(chalk.gray("交易哈希:"), tx1.hash);
            await tx1.wait();
            bsdtUsdtPair = await factory.getPair(contracts.BSDT, contracts.USDT);
            console.log(chalk.green("✅ BSDT/USDT池子已创建:"), bsdtUsdtPair);
            
            // 授权新池子
            const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
            const isAuthorized = await bsdt.authorizedExchanges(bsdtUsdtPair);
            if (!isAuthorized) {
                console.log(chalk.cyan("授权BSDT/USDT池子..."));
                const tx = await bsdt.authorizeExchange(bsdtUsdtPair, true);
                await tx.wait();
                console.log(chalk.green("✅ 池子已授权"));
            }
        }
        
        if (hcfBsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.cyan("\n创建HCF/BSDT池子..."));
            const tx2 = await factory.createPair(contracts.HCF, contracts.BSDT);
            console.log(chalk.gray("交易哈希:"), tx2.hash);
            await tx2.wait();
            hcfBsdtPair = await factory.getPair(contracts.HCF, contracts.BSDT);
            console.log(chalk.green("✅ HCF/BSDT池子已创建:"), hcfBsdtPair);
            
            // 授权新池子
            const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
            const isAuthorized = await bsdt.authorizedExchanges(hcfBsdtPair);
            if (!isAuthorized) {
                console.log(chalk.cyan("授权HCF/BSDT池子..."));
                const tx = await bsdt.authorizeExchange(hcfBsdtPair, true);
                await tx.wait();
                console.log(chalk.green("✅ 池子已授权"));
            }
        }
        
        // 获取代币合约
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const bsdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.BSDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n2. 检查余额..."));
        const usdtBal = await usdt.balanceOf(signer.address);
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        
        // 先尝试直接转账代币到池子（绕过approve）
        console.log(chalk.yellow.bold("\n3. 尝试直接添加流动性..."));
        
        // 方案A：直接转账到池子然后sync
        if (bsdtUsdtPair !== ethers.constants.AddressZero) {
            console.log(chalk.cyan("\n方案：直接转账代币到池子"));
            
            // 转1 USDT到池子
            const usdtAmount = ethers.utils.parseUnits("1", 18);
            const bsdtAmount = ethers.utils.parseEther("1");
            
            console.log("转账1 USDT到BSDT/USDT池子...");
            const tx3 = await usdt.transfer(bsdtUsdtPair, usdtAmount);
            await tx3.wait();
            console.log(chalk.green("✅ USDT已转账"));
            
            console.log("转账1 BSDT到BSDT/USDT池子...");
            const tx4 = await bsdt.transfer(bsdtUsdtPair, bsdtAmount);
            await tx4.wait();
            console.log(chalk.green("✅ BSDT已转账"));
            
            // 调用sync更新储备
            const pairABI = ["function sync() external"];
            const pair = new ethers.Contract(bsdtUsdtPair, pairABI, signer);
            console.log("同步池子储备...");
            const tx5 = await pair.sync();
            await tx5.wait();
            console.log(chalk.green("✅ 池子已同步"));
            
            console.log(chalk.green.bold("\n🎉 BSDT/USDT池子创建成功！"));
        }
        
        console.log(chalk.cyan.bold("\n下一步："));
        console.log(chalk.white("1. 检查池子: https://pancakeswap.finance/info/v2/pair/" + bsdtUsdtPair));
        console.log(chalk.white("2. 如果需要，可以用同样方式创建HCF/BSDT池子"));
        console.log(chalk.white("3. 或者现在可以去PancakeSwap正常添加流动性了"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
        
        if (error.message.includes("BSDT:")) {
            console.log(chalk.yellow("\n提示: BSDT转账被限制，需要授权池子地址"));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });