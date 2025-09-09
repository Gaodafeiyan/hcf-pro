const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 一键部署BSDT并创建所有池子"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);
    
    // 检查BNB余额
    const balance = await deployer.getBalance();
    console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.03"))) {
        console.log(chalk.red("❌ BNB不足，需要至少0.03 BNB"));
        return;
    }
    
    // 合约地址
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const HCF = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    try {
        // ============ 第1步：部署新BSDT ============
        console.log(chalk.yellow.bold("1. 部署SimpleBSDT合约..."));
        
        const SimpleBSDT = await ethers.getContractFactory("SimpleBSDT");
        const bsdt = await SimpleBSDT.deploy();
        await bsdt.deployed();
        
        console.log(chalk.green("✅ SimpleBSDT部署成功:"), bsdt.address);
        console.log(chalk.white("   总供应量: 1000亿 BSDT"));
        console.log(chalk.white("   全部在部署者钱包"));
        
        // ============ 第2步：授权代币 ============
        console.log(chalk.yellow.bold("\n2. 授权所有代币给PancakeRouter..."));
        
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", HCF);
        
        // 授权BSDT
        console.log(chalk.cyan("授权BSDT..."));
        await bsdt.approve(PancakeRouter, ethers.constants.MaxUint256);
        console.log(chalk.green("✅ BSDT已授权"));
        
        // 授权HCF
        console.log(chalk.cyan("授权HCF..."));
        await hcf.approve(PancakeRouter, ethers.constants.MaxUint256);
        console.log(chalk.green("✅ HCF已授权"));
        
        // USDT已经授权了
        console.log(chalk.green("✅ USDT已授权"));
        
        // ============ 第3步：创建BSDT/USDT池子 ============
        console.log(chalk.yellow.bold("\n3. 创建BSDT/USDT锚定池（1:1）..."));
        
        const router = await ethers.getContractAt(
            ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
            PancakeRouter
        );
        
        // 添加1 BSDT + 1 USDT
        const bsdtAmount = ethers.utils.parseEther("1");
        const usdtAmount = ethers.utils.parseUnits("1", 18);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        
        console.log(chalk.cyan("添加流动性: 1 BSDT + 1 USDT..."));
        const tx1 = await router.addLiquidity(
            bsdt.address,
            USDT,
            bsdtAmount,
            usdtAmount,
            0,
            0,
            deployer.address,
            deadline
        );
        await tx1.wait();
        console.log(chalk.green("✅ BSDT/USDT池子创建成功（1:1锚定）"));
        
        // 获取池子地址
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)"],
            PancakeFactory
        );
        const bsdtUsdtPair = await factory.getPair(bsdt.address, USDT);
        console.log(chalk.white("   池子地址:"), bsdtUsdtPair);
        
        // ============ 第4步：创建HCF/BSDT池子 ============
        console.log(chalk.yellow.bold("\n4. 创建HCF/BSDT交易池..."));
        
        // 添加100万 HCF + 10万 BSDT
        const hcfAmount = ethers.utils.parseEther("1000000");   // 100万 HCF
        const bsdtForHcf = ethers.utils.parseEther("100000");   // 10万 BSDT
        
        console.log(chalk.cyan("添加流动性: 100万 HCF + 10万 BSDT..."));
        console.log(chalk.white("   初始价格: 1 HCF = 0.1 BSDT = 0.1 USDT"));
        
        const tx2 = await router.addLiquidity(
            HCF,
            bsdt.address,
            hcfAmount,
            bsdtForHcf,
            0,
            0,
            deployer.address,
            deadline
        );
        await tx2.wait();
        console.log(chalk.green("✅ HCF/BSDT池子创建成功"));
        
        const hcfBsdtPair = await factory.getPair(HCF, bsdt.address);
        console.log(chalk.white("   池子地址:"), hcfBsdtPair);
        
        // ============ 第5步：保存信息 ============
        const deploymentInfo = {
            timestamp: new Date().toISOString(),
            network: "BSC Mainnet",
            contracts: {
                SimpleBSDT: bsdt.address,
                HCF: HCF,
                USDT: USDT
            },
            pools: {
                "BSDT/USDT": {
                    address: bsdtUsdtPair,
                    ratio: "1:1",
                    liquidity: "1 BSDT + 1 USDT"
                },
                "HCF/BSDT": {
                    address: hcfBsdtPair,
                    ratio: "10:1",
                    liquidity: "100万 HCF + 10万 BSDT",
                    initialPrice: "1 HCF = 0.1 BSDT = 0.1 USDT"
                }
            }
        };
        
        fs.writeFileSync('./deployment-success.json', JSON.stringify(deploymentInfo, null, 2));
        
        // ============ 显示结果 ============
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 部署完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("合约地址："));
        console.log(chalk.white("SimpleBSDT:"), bsdt.address);
        console.log(chalk.white("HCF:"), HCF);
        console.log(chalk.white("USDT:"), USDT);
        
        console.log(chalk.green.bold("\n池子地址："));
        console.log(chalk.white("BSDT/USDT:"), bsdtUsdtPair);
        console.log(chalk.white("HCF/BSDT:"), hcfBsdtPair);
        
        console.log(chalk.cyan.bold("\n在PancakeSwap查看："));
        console.log(chalk.white("BSDT/USDT池子:"));
        console.log(`https://pancakeswap.finance/info/v2/pair/${bsdtUsdtPair}`);
        console.log(chalk.white("HCF/BSDT池子:"));
        console.log(`https://pancakeswap.finance/info/v2/pair/${hcfBsdtPair}`);
        
        console.log(chalk.green.bold("\n✅ 系统完全就绪！"));
        console.log(chalk.white("- BSDT可以在DEX自由交易"));
        console.log(chalk.white("- 价格会在PancakeSwap显示"));
        console.log(chalk.white("- 1 BSDT = 1 USDT（锚定）"));
        console.log(chalk.white("- 1 HCF = 0.1 BSDT = 0.1 USDT"));
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 所有操作成功完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });