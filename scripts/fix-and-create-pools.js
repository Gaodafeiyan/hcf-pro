const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💧 修复并创建流动性池"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), deployer.address);
    
    // 新部署的SimpleBSDT地址
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const HCF = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    console.log(chalk.green("✅ SimpleBSDT已部署:"), SimpleBSDT_ADDRESS);
    
    try {
        // 获取合约实例
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", HCF);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n1. 检查余额："));
        const bsdtBal = await bsdt.balanceOf(deployer.address);
        const usdtBal = await usdt.balanceOf(deployer.address);
        const hcfBal = await hcf.balanceOf(deployer.address);
        
        console.log("BSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        
        // 检查并授权USDT
        console.log(chalk.yellow.bold("\n2. 检查并授权USDT..."));
        const usdtAllowance = await usdt.allowance(deployer.address, PancakeRouter);
        console.log("USDT当前授权:", ethers.utils.formatUnits(usdtAllowance, 18));
        
        if (usdtAllowance.lt(ethers.utils.parseUnits("1", 18))) {
            console.log(chalk.cyan("重新授权USDT..."));
            const tx0 = await usdt.approve(PancakeRouter, ethers.constants.MaxUint256);
            await tx0.wait();
            console.log(chalk.green("✅ USDT已重新授权"));
        } else {
            console.log(chalk.green("✅ USDT授权充足"));
        }
        
        // 检查BSDT授权
        const bsdtAllowance = await bsdt.allowance(deployer.address, PancakeRouter);
        console.log("BSDT授权:", bsdtAllowance.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatEther(bsdtAllowance));
        
        // 检查HCF授权
        const hcfAllowance = await hcf.allowance(deployer.address, PancakeRouter);
        console.log("HCF授权:", hcfAllowance.eq(ethers.constants.MaxUint256) ? "✅ 无限制" : ethers.utils.formatEther(hcfAllowance));
        
        // 获取Router合约
        const router = await ethers.getContractAt(
            ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
            PancakeRouter
        );
        
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)"],
            PancakeFactory
        );
        
        // 创建BSDT/USDT池子
        console.log(chalk.yellow.bold("\n3. 创建BSDT/USDT锚定池（1:1）..."));
        
        let bsdtUsdtPair = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
        
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            const bsdtAmount = ethers.utils.parseEther("1");
            const usdtAmount = ethers.utils.parseUnits("1", 18);
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            console.log(chalk.cyan("添加流动性: 1 BSDT + 1 USDT..."));
            
            try {
                const tx1 = await router.addLiquidity(
                    SimpleBSDT_ADDRESS,
                    USDT,
                    bsdtAmount,
                    usdtAmount,
                    0,
                    0,
                    deployer.address,
                    deadline,
                    {
                        gasLimit: 500000,
                        gasPrice: ethers.utils.parseUnits("5", "gwei")
                    }
                );
                await tx1.wait();
                console.log(chalk.green("✅ BSDT/USDT池子创建成功"));
                
                bsdtUsdtPair = await factory.getPair(SimpleBSDT_ADDRESS, USDT);
                console.log(chalk.white("池子地址:"), bsdtUsdtPair);
            } catch (error) {
                console.log(chalk.red("❌ 创建失败:"), error.message);
                console.log(chalk.yellow("可能原因: USDT余额不足或授权问题"));
            }
        } else {
            console.log(chalk.green("✅ BSDT/USDT池子已存在:"), bsdtUsdtPair);
        }
        
        // 创建HCF/BSDT池子
        console.log(chalk.yellow.bold("\n4. 创建HCF/BSDT交易池..."));
        
        let hcfBsdtPair = await factory.getPair(HCF, SimpleBSDT_ADDRESS);
        
        if (hcfBsdtPair === ethers.constants.AddressZero) {
            const hcfAmount = ethers.utils.parseEther("1000000");   // 100万 HCF
            const bsdtForHcf = ethers.utils.parseEther("100000");   // 10万 BSDT
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            console.log(chalk.cyan("添加流动性: 100万 HCF + 10万 BSDT..."));
            console.log(chalk.white("初始价格: 1 HCF = 0.1 BSDT = 0.1 USDT"));
            
            try {
                const tx2 = await router.addLiquidity(
                    HCF,
                    SimpleBSDT_ADDRESS,
                    hcfAmount,
                    bsdtForHcf,
                    0,
                    0,
                    deployer.address,
                    deadline,
                    {
                        gasLimit: 500000,
                        gasPrice: ethers.utils.parseUnits("5", "gwei")
                    }
                );
                await tx2.wait();
                console.log(chalk.green("✅ HCF/BSDT池子创建成功"));
                
                hcfBsdtPair = await factory.getPair(HCF, SimpleBSDT_ADDRESS);
                console.log(chalk.white("池子地址:"), hcfBsdtPair);
            } catch (error) {
                console.log(chalk.red("❌ 创建失败:"), error.message);
            }
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子已存在:"), hcfBsdtPair);
        }
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📊 最终结果"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("合约地址："));
        console.log(chalk.white("SimpleBSDT:"), SimpleBSDT_ADDRESS);
        console.log(chalk.white("HCF:"), HCF);
        console.log(chalk.white("USDT:"), USDT);
        
        if (bsdtUsdtPair !== ethers.constants.AddressZero) {
            console.log(chalk.green.bold("\nBSDT/USDT池子："));
            console.log(chalk.white("地址:"), bsdtUsdtPair);
            console.log(chalk.white("查看:"), `https://pancakeswap.finance/info/v2/pair/${bsdtUsdtPair}`);
        }
        
        if (hcfBsdtPair !== ethers.constants.AddressZero) {
            console.log(chalk.green.bold("\nHCF/BSDT池子："));
            console.log(chalk.white("地址:"), hcfBsdtPair);
            console.log(chalk.white("查看:"), `https://pancakeswap.finance/info/v2/pair/${hcfBsdtPair}`);
        }
        
        console.log(chalk.cyan.bold("\n价格关系："));
        console.log(chalk.white("1 BSDT = 1 USDT（锚定）"));
        console.log(chalk.white("1 HCF = 0.1 BSDT = 0.1 USDT"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 操作完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });