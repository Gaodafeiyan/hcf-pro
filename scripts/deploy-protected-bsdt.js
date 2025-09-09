const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔒 部署受保护的BSDT（限制交易）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);
    
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const PancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const PancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    try {
        // 1. 部署ProtectedBSDT
        console.log(chalk.yellow.bold("1. 部署ProtectedBSDT合约..."));
        const ProtectedBSDT = await ethers.getContractFactory("ProtectedBSDT");
        const bsdt = await ProtectedBSDT.deploy();
        await bsdt.deployed();
        
        console.log(chalk.green("✅ ProtectedBSDT部署成功:"), bsdt.address);
        
        // 2. 验证部署
        const totalSupply = await bsdt.totalSupply();
        console.log("总供应量:", ethers.utils.formatEther(totalSupply), "BSDT");
        
        // 3. 创建BSDT/USDT池子（用于显示价格）
        console.log(chalk.yellow.bold("\n2. 创建BSDT/USDT池子（显示价格）..."));
        
        // 检查USDT余额
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        const usdtBal = await usdt.balanceOf(deployer.address);
        console.log("USDT余额:", ethers.utils.formatUnits(usdtBal, 18));
        
        // 使用少量创建池子（只为显示价格）
        const bsdtAmount = ethers.utils.parseEther("1000"); // 1000 BSDT
        const usdtAmount = ethers.utils.parseUnits("1000", 18); // 1000 USDT
        
        if (usdtBal.lt(usdtAmount)) {
            console.log(chalk.yellow("USDT不足，使用可用余额..."));
            const availableAmount = usdtBal.gt(ethers.utils.parseUnits("10", 18)) 
                ? ethers.utils.parseUnits("10", 18) 
                : usdtBal;
            
            await createPool(bsdt, usdt, availableAmount, availableAmount);
        } else {
            await createPool(bsdt, usdt, bsdtAmount, usdtAmount);
        }
        
        async function createPool(bsdtContract, usdtContract, bsdtAmt, usdtAmt) {
            // 授权
            console.log(chalk.cyan("授权代币..."));
            await bsdtContract.approve(PancakeRouter, ethers.constants.MaxUint256);
            await usdtContract.approve(PancakeRouter, ethers.constants.MaxUint256);
            
            // 添加流动性
            const router = await ethers.getContractAt(
                ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
                PancakeRouter
            );
            
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const tx = await router.addLiquidity(
                bsdtContract.address,
                USDT,
                bsdtAmt,
                usdtAmt,
                0,
                0,
                deployer.address,
                deadline
            );
            await tx.wait();
            console.log(chalk.green("✅ 池子创建成功"));
            
            // 获取池子地址
            const factory = await ethers.getContractAt(
                ["function getPair(address,address) view returns (address)"],
                PancakeFactory
            );
            const pairAddress = await factory.getPair(bsdtContract.address, USDT);
            console.log("池子地址:", pairAddress);
            
            // 4. 设置池子为受限地址
            console.log(chalk.yellow.bold("\n3. 设置交易限制..."));
            await bsdtContract.setPairAddress(pairAddress, true);
            console.log(chalk.green("✅ 已标记池子地址"));
            
            return pairAddress;
        }
        
        // 5. 设置白名单（后端地址）
        console.log(chalk.yellow.bold("\n4. 设置白名单..."));
        // 这里添加您的后端地址
        const backendAddress = deployer.address; // 替换为实际后端地址
        await bsdt.setWhitelist(backendAddress, true);
        console.log(chalk.green("✅ 后端地址已加白名单"));
        
        // 保存信息
        const info = {
            ProtectedBSDT: bsdt.address,
            USDT: USDT,
            tradingRestricted: true,
            deployTime: new Date().toISOString()
        };
        fs.writeFileSync('./protected-bsdt.json', JSON.stringify(info, null, 2));
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         ✅ 部署完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("ProtectedBSDT地址:"), bsdt.address);
        console.log(chalk.green.bold("\n功能特性："));
        console.log("✅ 总量1000亿");
        console.log("✅ 池子显示1:1价格");
        console.log("❌ 其他人不能从池子买卖");
        console.log("❌ 其他人不能添加流动性");
        console.log("✅ 只有白名单地址可以交易");
        
        console.log(chalk.yellow.bold("\n用户获取BSDT方式："));
        console.log("1. 转USDT到指定地址");
        console.log("2. 后端监控到转账");
        console.log("3. 后端从白名单地址发送等量BSDT");
        console.log("4. 用户获得BSDT（1:1）");
        
        console.log(chalk.cyan.bold("\n下一步："));
        console.log("1. 设置后端监控USDT转账");
        console.log("2. 创建HCF/BSDT交易池");
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
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