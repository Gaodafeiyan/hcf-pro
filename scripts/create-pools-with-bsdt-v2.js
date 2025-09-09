const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💧 创建BSDT V2流动性池"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 合约地址
    const contracts = {
        BSDT_V2: "0x91d044C229c93c3C21A4bBEa0454867B8E06f46A",  // 新的BSDT V2
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };

    try {
        // 获取合约实例
        const router = await ethers.getContractAt(
            ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
            contracts.PancakeRouter
        );
        
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)",
             "function createPair(address,address) returns (address)"],
            contracts.PancakeFactory
        );
        
        // 获取代币合约
        const bsdtV2 = await ethers.getContractAt("BSDTTokenV2", contracts.BSDT_V2);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        
        // 检查余额
        console.log(chalk.yellow.bold("1. 检查余额："));
        const usdtBal = await usdt.balanceOf(signer.address);
        const bsdtBal = await bsdtV2.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        console.log("BSDT V2:", ethers.utils.formatEther(bsdtBal));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        
        // 如果BSDT V2余额为0，从合约获取一些
        if (bsdtBal.eq(0)) {
            console.log(chalk.red("❌ BSDT V2余额为0"));
            console.log(chalk.yellow("提示: BSDT V2是新部署的，需要先获取一些BSDT"));
            
            // 检查是否是owner
            const owner = await bsdtV2.owner();
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log(chalk.cyan("你是owner，可以mint一些BSDT V2用于测试"));
            }
            
            return;
        }
        
        // 授权代币
        console.log(chalk.yellow.bold("\n2. 授权代币给PancakeRouter..."));
        
        // 检查并授权USDT
        const usdtAllowance = await usdt.allowance(signer.address, contracts.PancakeRouter);
        if (usdtAllowance.lt(usdtBal)) {
            console.log(chalk.cyan("授权USDT..."));
            const tx1 = await usdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
            await tx1.wait();
            console.log(chalk.green("✅ USDT已授权"));
        } else {
            console.log(chalk.green("✅ USDT已有授权"));
        }
        
        // 检查并授权BSDT V2
        const bsdtAllowance = await bsdtV2.allowance(signer.address, contracts.PancakeRouter);
        if (bsdtAllowance.lt(bsdtBal)) {
            console.log(chalk.cyan("授权BSDT V2..."));
            const tx2 = await bsdtV2.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
            await tx2.wait();
            console.log(chalk.green("✅ BSDT V2已授权"));
        } else {
            console.log(chalk.green("✅ BSDT V2已有授权"));
        }
        
        // 检查并授权HCF
        const hcfAllowance = await hcf.allowance(signer.address, contracts.PancakeRouter);
        if (hcfAllowance.lt(hcfBal)) {
            console.log(chalk.cyan("授权HCF..."));
            const tx3 = await hcf.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
            await tx3.wait();
            console.log(chalk.green("✅ HCF已授权"));
        } else {
            console.log(chalk.green("✅ HCF已有授权"));
        }
        
        // 创建BSDT V2/USDT池子
        console.log(chalk.yellow.bold("\n3. 创建BSDT V2/USDT池子（1:1）..."));
        
        let bsdtUsdtPair = await factory.getPair(contracts.BSDT_V2, contracts.USDT);
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.cyan("创建池子..."));
            const tx4 = await factory.createPair(contracts.BSDT_V2, contracts.USDT);
            await tx4.wait();
            bsdtUsdtPair = await factory.getPair(contracts.BSDT_V2, contracts.USDT);
            console.log(chalk.green("✅ 池子已创建:"), bsdtUsdtPair);
        } else {
            console.log(chalk.green("✅ 池子已存在:"), bsdtUsdtPair);
        }
        
        // 添加流动性
        const usdtAmount = ethers.utils.parseUnits("1", 18);  // 1 USDT
        const bsdtAmount = ethers.utils.parseEther("1");      // 1 BSDT
        
        if (usdtBal.gte(usdtAmount) && bsdtBal.gte(bsdtAmount)) {
            console.log(chalk.cyan("添加流动性: 1 BSDT V2 + 1 USDT..."));
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            const tx5 = await router.addLiquidity(
                contracts.BSDT_V2,
                contracts.USDT,
                bsdtAmount,
                usdtAmount,
                0,
                0,
                signer.address,
                deadline
            );
            await tx5.wait();
            console.log(chalk.green("✅ 流动性已添加"));
        } else {
            console.log(chalk.yellow("⚠️ 余额不足，无法添加流动性"));
        }
        
        // 创建HCF/BSDT V2池子
        console.log(chalk.yellow.bold("\n4. 创建HCF/BSDT V2池子..."));
        
        let hcfBsdtPair = await factory.getPair(contracts.HCF, contracts.BSDT_V2);
        if (hcfBsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.cyan("创建池子..."));
            const tx6 = await factory.createPair(contracts.HCF, contracts.BSDT_V2);
            await tx6.wait();
            hcfBsdtPair = await factory.getPair(contracts.HCF, contracts.BSDT_V2);
            console.log(chalk.green("✅ 池子已创建:"), hcfBsdtPair);
        } else {
            console.log(chalk.green("✅ 池子已存在:"), hcfBsdtPair);
        }
        
        // 添加HCF/BSDT流动性
        const hcfAmount = ethers.utils.parseEther("1000000");    // 100万 HCF
        const bsdtForHcf = ethers.utils.parseEther("100000");    // 10万 BSDT
        
        if (hcfBal.gte(hcfAmount) && bsdtBal.gte(bsdtForHcf)) {
            console.log(chalk.cyan("添加流动性: 100万 HCF + 10万 BSDT V2..."));
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            const tx7 = await router.addLiquidity(
                contracts.HCF,
                contracts.BSDT_V2,
                hcfAmount,
                bsdtForHcf,
                0,
                0,
                signer.address,
                deadline
            );
            await tx7.wait();
            console.log(chalk.green("✅ 流动性已添加"));
        } else {
            console.log(chalk.yellow("⚠️ 余额不足，无法添加HCF/BSDT流动性"));
        }
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 池子创建完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("池子地址："));
        if (bsdtUsdtPair !== ethers.constants.AddressZero) {
            console.log(chalk.white("BSDT V2/USDT:"), bsdtUsdtPair);
            console.log(`https://pancakeswap.finance/info/v2/pair/${bsdtUsdtPair}`);
        }
        if (hcfBsdtPair !== ethers.constants.AddressZero) {
            console.log(chalk.white("HCF/BSDT V2:"), hcfBsdtPair);
            console.log(`https://pancakeswap.finance/info/v2/pair/${hcfBsdtPair}`);
        }
        
        console.log(chalk.cyan.bold("\n价格信息："));
        console.log(chalk.white("1 BSDT V2 = 1 USDT（锚定）"));
        console.log(chalk.white("1 HCF = 0.1 BSDT V2 = 0.1 USDT"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });