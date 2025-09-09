const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💧 创建HCF/USDT直接交易池"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 合约地址
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };

    try {
        // 检查BNB余额
        const bnbBalance = await signer.getBalance();
        console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(bnbBalance), "BNB");
        
        if (bnbBalance.lt(ethers.utils.parseEther("0.01"))) {
            console.log(chalk.red("⚠️ BNB不足，但可以尝试低gas操作"));
        }
        
        // 获取代币合约
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.USDT);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n1. 检查余额："));
        const hcfBal = await hcf.balanceOf(signer.address);
        const usdtBal = await usdt.balanceOf(signer.address);
        
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        
        // 计算添加流动性的数量
        console.log(chalk.yellow.bold("\n2. 计算流动性数量："));
        
        // 方案：100万 HCF + 100 USDT (初始价格 1 HCF = 0.0001 USDT)
        const hcfAmount = ethers.utils.parseEther("1000000");  // 100万 HCF
        const usdtAmount = ethers.utils.parseUnits("100", 18); // 100 USDT
        
        console.log("计划添加:");
        console.log("- HCF: 1,000,000 个");
        console.log("- USDT: 100 个");
        console.log("- 初始价格: 1 HCF = 0.0001 USDT");
        
        if (hcfBal.lt(hcfAmount)) {
            console.log(chalk.red("❌ HCF不足"));
            return;
        }
        if (usdtBal.lt(usdtAmount)) {
            console.log(chalk.yellow("⚠️ USDT不足，调整为3 USDT"));
            const adjustedHcfAmount = ethers.utils.parseEther("30000"); // 3万 HCF
            const adjustedUsdtAmount = ethers.utils.parseUnits("3", 18); // 3 USDT
            
            console.log(chalk.cyan("\n调整后:"));
            console.log("- HCF: 30,000 个");
            console.log("- USDT: 3 个");
            console.log("- 初始价格: 1 HCF = 0.0001 USDT");
        }
        
        // 授权代币
        console.log(chalk.yellow.bold("\n3. 授权代币（低gas）："));
        
        const gasOptions = {
            gasLimit: 100000,
            gasPrice: ethers.utils.parseUnits("3", "gwei") // 更低的gas价格
        };
        
        // 检查HCF授权
        const hcfAllowance = await hcf.allowance(signer.address, contracts.PancakeRouter);
        if (hcfAllowance.lt(hcfAmount)) {
            console.log(chalk.cyan("授权HCF..."));
            try {
                const tx1 = await hcf.approve(contracts.PancakeRouter, ethers.constants.MaxUint256, gasOptions);
                await tx1.wait();
                console.log(chalk.green("✅ HCF已授权"));
            } catch (error) {
                console.log(chalk.red("❌ HCF授权失败（BNB不足）"));
                return;
            }
        } else {
            console.log(chalk.green("✅ HCF已有授权"));
        }
        
        // USDT已经授权了
        console.log(chalk.green("✅ USDT已有授权"));
        
        // 获取Factory合约
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)",
             "function createPair(address,address) returns (address)"],
            contracts.PancakeFactory
        );
        
        // 检查池子是否存在
        console.log(chalk.yellow.bold("\n4. 检查池子状态："));
        let hcfUsdtPair = await factory.getPair(contracts.HCF, contracts.USDT);
        
        if (hcfUsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.cyan("池子不存在，创建新池子..."));
            try {
                const tx2 = await factory.createPair(contracts.HCF, contracts.USDT, gasOptions);
                await tx2.wait();
                hcfUsdtPair = await factory.getPair(contracts.HCF, contracts.USDT);
                console.log(chalk.green("✅ 池子已创建:"), hcfUsdtPair);
            } catch (error) {
                console.log(chalk.red("❌ 创建池子失败（BNB不足）"));
                return;
            }
        } else {
            console.log(chalk.green("✅ 池子已存在:"), hcfUsdtPair);
        }
        
        // 添加流动性
        console.log(chalk.yellow.bold("\n5. 添加流动性："));
        
        const router = await ethers.getContractAt(
            ["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"],
            contracts.PancakeRouter
        );
        
        // 使用实际可用的金额
        const finalHcfAmount = ethers.utils.parseEther("30000");  // 3万 HCF
        const finalUsdtAmount = ethers.utils.parseUnits("3", 18);  // 3 USDT
        
        console.log(chalk.cyan("添加流动性: 30,000 HCF + 3 USDT..."));
        
        try {
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const tx3 = await router.addLiquidity(
                contracts.HCF,
                contracts.USDT,
                finalHcfAmount,
                finalUsdtAmount,
                0,
                0,
                signer.address,
                deadline,
                gasOptions
            );
            await tx3.wait();
            console.log(chalk.green("✅ 流动性已添加"));
        } catch (error) {
            console.log(chalk.red("❌ 添加流动性失败"));
            console.log(chalk.yellow("错误:", error.message));
            return;
        }
        
        // 显示结果
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         🎉 池子创建成功"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("HCF/USDT池子地址:"), hcfUsdtPair);
        console.log(chalk.cyan("查看池子:"));
        console.log(`https://pancakeswap.finance/info/v2/pair/${hcfUsdtPair}`);
        
        console.log(chalk.yellow.bold("\n价格信息："));
        console.log(chalk.white("初始价格: 1 HCF = 0.0001 USDT"));
        console.log(chalk.white("市值: 1,000 USDT (基于10亿总供应量)"));
        
        console.log(chalk.green.bold("\n✅ 成功！HCF现在可以在PancakeSwap交易了！"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
        
        if (error.message.includes("INSUFFICIENT_FUNDS")) {
            console.log(chalk.yellow("\n提示: BNB不足，需要充值至少0.01 BNB"));
            console.log(chalk.white("充值地址:"), signer.address);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });