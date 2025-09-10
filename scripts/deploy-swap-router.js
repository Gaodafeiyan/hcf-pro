const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💱 部署HCFSwapRouter完整交易路径"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    if (balance.lt(ethers.utils.parseEther("0.05"))) {
        console.log(chalk.red("❌ BNB余额不足，至少需要0.05 BNB"));
        return;
    }
    
    // 合约地址
    const addresses = {
        HCF_TOKEN: "0xc5c3f24a212838968759045d1654d3643016d585",
        BSDT_TOKEN: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        USDT_TOKEN: "0x55d398326f99059fF775485246999027B3197955",
        PANCAKE_ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        BSDT_GATEWAY: "0x83714243313D69AE9d21B09d2f336e9A2713B8A5" // 使用AutoSwap作为gateway
    };
    
    try {
        console.log(chalk.cyan("1️⃣ 部署HCFSwapRouter合约...\n"));
        
        const HCFSwapRouter = await ethers.getContractFactory("HCFSwapRouter");
        
        // 部署参数
        const swapRouter = await HCFSwapRouter.deploy(
            addresses.HCF_TOKEN,
            addresses.BSDT_TOKEN,
            addresses.USDT_TOKEN,
            addresses.PANCAKE_ROUTER,
            addresses.BSDT_GATEWAY,
            {
                gasPrice: ethers.utils.parseUnits("1", "gwei"),
                gasLimit: 3000000
            }
        );
        
        console.log("交易哈希:", swapRouter.deployTransaction.hash);
        console.log("等待确认...");
        
        await swapRouter.deployed();
        console.log(chalk.green("✅ HCFSwapRouter已部署:", swapRouter.address));
        
        // 等待区块确认
        console.log(chalk.cyan("\n2️⃣ 等待3个区块确认..."));
        await swapRouter.deployTransaction.wait(3);
        console.log(chalk.green("✅ 已确认"));
        
        // 设置手续费和treasury
        console.log(chalk.cyan("\n3️⃣ 配置参数..."));
        
        // 设置卖出手续费3%
        const tx1 = await swapRouter.setSellFeeRate(
            300, // 3%
            {gasPrice: ethers.utils.parseUnits("1", "gwei")}
        );
        console.log("设置手续费交易:", tx1.hash);
        await tx1.wait();
        console.log(chalk.green("✅ 已设置卖出手续费: 3%"));
        
        // 验证配置
        console.log(chalk.cyan("\n4️⃣ 验证配置..."));
        const sellFeeRate = await swapRouter.sellFeeRate();
        const treasury = await swapRouter.treasury();
        
        console.log("SwapRouter配置:");
        console.log("  卖出手续费:", sellFeeRate.toNumber() / 100, "%");
        console.log("  Treasury地址:", treasury);
        console.log("  HCF地址:", addresses.HCF_TOKEN);
        console.log("  BSDT地址:", addresses.BSDT_TOKEN);
        console.log("  USDT地址:", addresses.USDT_TOKEN);
        
        // 测试路径
        console.log(chalk.cyan("\n5️⃣ 测试交易路径..."));
        try {
            // 测试买入路径预估
            const testAmount = ethers.utils.parseEther("100"); // 100 USDT
            const buyEstimate = await swapRouter.getBuyEstimate(testAmount);
            console.log(`买入预估: 100 USDT → ${ethers.utils.formatEther(buyEstimate)} HCF`);
            
            // 测试卖出路径预估
            const sellAmount = ethers.utils.parseEther("1000"); // 1000 HCF
            const sellEstimate = await swapRouter.getSellEstimate(sellAmount);
            console.log(`卖出预估: 1000 HCF → ${ethers.utils.formatEther(sellEstimate)} USDT (扣除手续费后)`);
        } catch (e) {
            console.log(chalk.yellow("⚠️ 预估测试失败（可能流动性不足）"));
        }
        
        // 保存部署信息
        const deploymentInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            HCFSwapRouter: swapRouter.address,
            config: {
                sellFeeRate: "3%",
                treasury: treasury,
                supportedTokens: {
                    HCF: addresses.HCF_TOKEN,
                    BSDT: addresses.BSDT_TOKEN,
                    USDT: addresses.USDT_TOKEN
                },
                routes: [
                    "USDT → BSDT → HCF (买入)",
                    "HCF → BSDT → USDT (卖出)"
                ]
            },
            external: {
                PancakeRouter: addresses.PANCAKE_ROUTER,
                BSDTGateway: addresses.BSDT_GATEWAY
            },
            deployer: deployer.address
        };
        
        fs.writeFileSync(
            "swap-router-deployment.json",
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n✅ HCFSwapRouter部署成功!"));
        console.log(chalk.cyan("\n部署信息:"));
        console.log("合约地址:", swapRouter.address);
        console.log("部署者:", deployer.address);
        
        console.log(chalk.yellow("\n⚠️ 注意事项:"));
        console.log("1. 用户需要先approve USDT/HCF给SwapRouter");
        console.log("2. 买入: USDT → BSDT → HCF");
        console.log("3. 卖出: HCF → BSDT → USDT (扣3%手续费)");
        console.log("4. 确保流动池有足够流动性");
        
        // 可选：注入初始USDT储备
        console.log(chalk.cyan("\n💡 提示:"));
        console.log("可以调用 depositUSDT() 注入USDT储备以支持卖出");
        console.log("命令: swapRouter.depositUSDT(amount)");
        
        return swapRouter.address;
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        
        // 如果是gas不足
        if (error.message.includes("insufficient funds")) {
            console.log(chalk.yellow("\n💡 提示: 请确保账户有足够的BNB支付gas费"));
        }
        
        throw error;
    }
}

main()
    .then((address) => {
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.green.bold("   🎉 SwapRouter部署完成!"));
        console.log(chalk.green.bold(`   地址: ${address}`));
        console.log(chalk.blue.bold("========================================\n"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });