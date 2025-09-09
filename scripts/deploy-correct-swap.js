const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   部署正确的SWAP系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`部署账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    // 已有合约地址
    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        usdtToken: "0x55d398326f99059fF775485246999027B3197955",
        pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };

    const deployedContracts = {};

    // 1. 部署BSDTGateway（单向兑换）
    console.log(chalk.yellow.bold("【1】部署BSDT Gateway（USDT→BSDT单向）..."));
    try {
        const BSDTGateway = await ethers.getContractFactory("BSDTGateway");
        const gateway = await BSDTGateway.deploy(
            contracts.usdtToken,
            contracts.bsdtToken
        );
        await gateway.deployed();
        deployedContracts.bsdtGateway = gateway.address;
        console.log(chalk.green(`✅ BSDT Gateway: ${gateway.address}`));
        console.log(chalk.cyan("   功能: USDT→BSDT单向兑换（1:1）"));
        console.log(chalk.cyan("   特点: BSDT不能换回USDT"));
    } catch (e) {
        console.log(chalk.red(`❌ 部署失败: ${e.message}`));
    }

    // 2. 部署HCFSwapRouter
    console.log(chalk.yellow.bold("\n【2】部署HCF Swap Router..."));
    try {
        const HCFSwapRouter = await ethers.getContractFactory("HCFSwapRouter");
        const router = await HCFSwapRouter.deploy(
            contracts.hcfToken,
            contracts.bsdtToken,
            contracts.usdtToken,
            contracts.pancakeRouter,
            deployedContracts.bsdtGateway || "0x0000000000000000000000000000000000000000"
        );
        await router.deployed();
        deployedContracts.hcfSwapRouter = router.address;
        console.log(chalk.green(`✅ HCF Swap Router: ${router.address}`));
        console.log(chalk.cyan("   功能: HCF买卖路由"));
        console.log(chalk.cyan("   买入: USDT→BSDT→HCF"));
        console.log(chalk.cyan("   卖出: HCF→BSDT→USDT（扣3%）"));
    } catch (e) {
        console.log(chalk.red(`❌ 部署失败: ${e.message}`));
    }

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         SWAP系统架构"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.cyan("💱 资金流向:\n"));
    
    console.log(chalk.green("进入生态（买HCF）:"));
    console.log(chalk.white("  USDT → BSDT（1:1，单向）→ HCF"));
    console.log(chalk.gray("  • USDT进入后变成BSDT"));
    console.log(chalk.gray("  • BSDT只能用来买HCF"));
    console.log(chalk.gray("  • 不能直接BSDT→USDT\n"));
    
    console.log(chalk.yellow("退出生态（卖HCF）:"));
    console.log(chalk.white("  HCF → BSDT → USDT（扣3%手续费）"));
    console.log(chalk.gray("  • 只有通过卖HCF才能获得USDT"));
    console.log(chalk.gray("  • HCF是唯一的价值出口\n"));

    console.log(chalk.cyan("🎯 设计优势:\n"));
    console.log(chalk.white("  1. 锁定流动性 - BSDT被锁在生态内"));
    console.log(chalk.white("  2. 支撑HCF价值 - 必须持有HCF才能退出"));
    console.log(chalk.white("  3. 防止套利 - 不能绕过HCF直接兑换"));

    // 配置步骤
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         配置步骤"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.yellow("【1】准备储备金:"));
    console.log(chalk.white("  • 向BSDTGateway转入大量BSDT（供USDT兑换）"));
    console.log(chalk.white("  • 向HCFSwapRouter转入USDT（供HCF卖出）\n"));

    console.log(chalk.yellow("【2】创建流动性池:"));
    console.log(chalk.white("  A. BSDT/USDT锚定池（仅价格展示）"));
    console.log(chalk.gray("     • 1 BSDT + 1 USDT"));
    console.log(chalk.gray("     • LP锁死，永不交易"));
    console.log(chalk.white("  B. HCF/BSDT交易池（真实交易）"));
    console.log(chalk.gray("     • 1,000,000 HCF + 100,000 BSDT"));
    console.log(chalk.gray("     • LP锁定10年\n"));

    console.log(chalk.yellow("【3】前端集成:"));
    console.log(chalk.white("  • 只显示USDT⟷HCF"));
    console.log(chalk.white("  • 隐藏BSDT"));
    console.log(chalk.white("  • 一键完成所有步骤"));

    // 保存部署结果
    const fs = require('fs');
    const result = {
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            ...contracts,
            ...deployedContracts
        },
        architecture: {
            entry: "USDT → BSDT → HCF",
            exit: "HCF → BSDT → USDT (3% fee)",
            keyPoint: "BSDT cannot be converted back to USDT directly"
        }
    };
    
    fs.writeFileSync('./correct-swap-deployment.json', JSON.stringify(result, null, 2));
    console.log(chalk.gray("\n📄 部署结果已保存到 correct-swap-deployment.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });