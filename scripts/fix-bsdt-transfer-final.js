const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 最终修复BSDT转账并创建流动性"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        BSDTUSDTPair: "0x9495B0d829bA860eD2486f22d1204391A2607ad4",
        HCFBSDTPair: "0xE936EB1B86f6ab84cB45c3FbD36d39E21734AcA2"
    };

    try {
        const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
        
        // 1. 检查并授权当前账户
        console.log(chalk.yellow.bold("1. 授权当前账户为交易所..."));
        
        const isSignerAuthorized = await bsdt.authorizedExchanges(signer.address);
        if (!isSignerAuthorized) {
            console.log(chalk.cyan("授权当前账户..."));
            const tx1 = await bsdt.authorizeExchange(signer.address, true);
            await tx1.wait();
            console.log(chalk.green("✅ 当前账户已授权为交易所"));
        } else {
            console.log(chalk.green("✅ 当前账户已经是授权交易所"));
        }
        
        // 2. 验证所有授权
        console.log(chalk.yellow.bold("\n2. 验证授权状态："));
        console.log("当前账户:", await bsdt.authorizedExchanges(signer.address) ? "✅ 已授权" : "❌ 未授权");
        console.log("BSDT/USDT池子:", await bsdt.authorizedExchanges(contracts.BSDTUSDTPair) ? "✅ 已授权" : "❌ 未授权");
        console.log("HCF/BSDT池子:", await bsdt.authorizedExchanges(contracts.HCFBSDTPair) ? "✅ 已授权" : "❌ 未授权");
        
        // 3. 获取代币合约
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        
        // 4. 检查余额
        console.log(chalk.yellow.bold("\n3. 检查余额："));
        const usdtBal = await usdt.balanceOf(signer.address);
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        
        // 5. 创建BSDT/USDT池子（1:1）
        console.log(chalk.yellow.bold("\n4. 创建BSDT/USDT锚定池（1:1）..."));
        
        const pairABI = [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() external view returns (address)",
            "function sync() external",
            "function mint(address to) external returns (uint liquidity)"
        ];
        
        const bsdtUsdtPair = new ethers.Contract(contracts.BSDTUSDTPair, pairABI, signer);
        const reserves1 = await bsdtUsdtPair.getReserves();
        
        // 检查池子中已有的USDT
        const usdtInPool = await usdt.balanceOf(contracts.BSDTUSDTPair);
        console.log("池子中USDT:", ethers.utils.formatUnits(usdtInPool, 18));
        
        if (reserves1[0].eq(0) && reserves1[1].eq(0)) {
            // 如果USDT不足1个，补充
            if (usdtInPool.lt(ethers.utils.parseUnits("1", 18))) {
                const needUsdt = ethers.utils.parseUnits("1", 18).sub(usdtInPool);
                console.log(chalk.cyan("补充USDT到池子..."));
                const tx2 = await usdt.transfer(contracts.BSDTUSDTPair, needUsdt);
                await tx2.wait();
                console.log(chalk.green("✅ USDT已补充"));
            }
            
            // 转账1 BSDT
            console.log(chalk.cyan("转账1 BSDT到池子..."));
            const bsdtAmount = ethers.utils.parseEther("1");
            const tx3 = await bsdt.transfer(contracts.BSDTUSDTPair, bsdtAmount);
            await tx3.wait();
            console.log(chalk.green("✅ BSDT已转账"));
            
            // 铸造LP代币给自己
            console.log(chalk.cyan("铸造LP代币..."));
            const tx4 = await bsdtUsdtPair.mint(signer.address);
            await tx4.wait();
            console.log(chalk.green("✅ BSDT/USDT池子创建成功！"));
        } else {
            console.log(chalk.green("✅ BSDT/USDT池子已有流动性"));
        }
        
        // 6. 创建HCF/BSDT池子（100万HCF + 10万BSDT）
        console.log(chalk.yellow.bold("\n5. 创建HCF/BSDT交易池..."));
        
        const hcfBsdtPair = new ethers.Contract(contracts.HCFBSDTPair, pairABI, signer);
        const reserves2 = await hcfBsdtPair.getReserves();
        
        if (reserves2[0].eq(0) && reserves2[1].eq(0)) {
            console.log(chalk.white("配置: 100万 HCF + 10万 BSDT"));
            console.log(chalk.white("初始价格: 1 HCF = 0.1 BSDT"));
            
            // 转账HCF
            const hcfAmount = ethers.utils.parseEther("1000000");
            console.log(chalk.cyan("转账100万 HCF到池子..."));
            const tx5 = await hcf.transfer(contracts.HCFBSDTPair, hcfAmount);
            await tx5.wait();
            console.log(chalk.green("✅ HCF已转账"));
            
            // 转账BSDT
            const bsdtAmount = ethers.utils.parseEther("100000");
            console.log(chalk.cyan("转账10万 BSDT到池子..."));
            const tx6 = await bsdt.transfer(contracts.HCFBSDTPair, bsdtAmount);
            await tx6.wait();
            console.log(chalk.green("✅ BSDT已转账"));
            
            // 铸造LP代币
            console.log(chalk.cyan("铸造LP代币..."));
            const tx7 = await hcfBsdtPair.mint(signer.address);
            await tx7.wait();
            console.log(chalk.green("✅ HCF/BSDT池子创建成功！"));
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子已有流动性"));
        }
        
        // 7. 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 流动性池创建完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("池子信息："));
        console.log(chalk.white("BSDT/USDT: 1 BSDT = 1 USDT（锚定）"));
        console.log(chalk.white("HCF/BSDT: 1 HCF = 0.1 BSDT = 0.1 USDT"));
        
        console.log(chalk.cyan.bold("\n查看池子："));
        console.log(chalk.white("BSDT/USDT:"));
        console.log(`https://pancakeswap.finance/info/v2/pair/${contracts.BSDTUSDTPair}`);
        console.log(chalk.white("HCF/BSDT:"));
        console.log(`https://pancakeswap.finance/info/v2/pair/${contracts.HCFBSDTPair}`);
        
        console.log(chalk.green.bold("\n✅ 系统准备就绪，可以开始交易！"));
        console.log(chalk.yellow("\n提示: LP代币已发送到你的钱包，记得锁定10年"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
        
        if (error.message.includes("BSDT: Transfer not authorized")) {
            console.log(chalk.yellow("\n诊断: BSDT合约限制了转账"));
            console.log(chalk.yellow("解决: 需要将当前账户授权为交易所"));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });