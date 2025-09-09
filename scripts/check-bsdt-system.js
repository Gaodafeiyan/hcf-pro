const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   BSDT系统完整检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const contracts = {
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9",
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC"
    };

    // 1. 检查BSDT代币信息
    console.log(chalk.yellow.bold("【1】BSDT代币信息:"));
    try {
        const bsdtABI = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function totalSupply() view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function owner() view returns (address)",
            "function INITIAL_SUPPLY() view returns (uint256)",
            "function MAX_SUPPLY() view returns (uint256)",
            "function mintEnabled() view returns (bool)",
            "function authorizedExchanges(address) view returns (bool)"
        ];
        
        const bsdt = new ethers.Contract(contracts.bsdtToken, bsdtABI, ethers.provider);
        
        const name = await bsdt.name();
        const symbol = await bsdt.symbol();
        const totalSupply = await bsdt.totalSupply();
        const decimals = await bsdt.decimals();
        const owner = await bsdt.owner();
        
        console.log(chalk.white(`  名称: ${name}`));
        console.log(chalk.white(`  符号: ${symbol}`));
        console.log(chalk.white(`  总供应量: ${ethers.utils.formatUnits(totalSupply, decimals)} BSDT`));
        console.log(chalk.white(`  小数位: ${decimals}`));
        console.log(chalk.white(`  Owner: ${owner}`));
        
        // 检查初始供应量和最大供应量
        try {
            const initialSupply = await bsdt.INITIAL_SUPPLY();
            const maxSupply = await bsdt.MAX_SUPPLY();
            console.log(chalk.white(`  初始供应量: ${ethers.utils.formatUnits(initialSupply, decimals)} BSDT`));
            console.log(chalk.white(`  最大供应量: ${ethers.utils.formatUnits(maxSupply, decimals)} BSDT`));
        } catch (e) {
            console.log(chalk.yellow(`  ⚠️ 无法读取供应量限制`));
        }
        
        // 检查mint状态
        try {
            const mintEnabled = await bsdt.mintEnabled();
            console.log(chalk.white(`  Mint状态: ${mintEnabled ? '开启' : '关闭'}`));
        } catch (e) {
            console.log(chalk.yellow(`  ⚠️ 无法读取mint状态`));
        }
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 检查失败: ${error.message}`));
    }

    // 2. 检查USDT-BSDT兑换合约
    console.log(chalk.yellow.bold("\n【2】USDT-BSDT兑换系统:"));
    try {
        const exchangeABI = [
            "function exchangeRate() view returns (uint256)",
            "function minExchange() view returns (uint256)",
            "function maxExchange() view returns (uint256)",
            "function totalExchanged() view returns (uint256)",
            "function isPaused() view returns (bool)",
            "function usdtToken() view returns (address)",
            "function bsdtToken() view returns (address)"
        ];
        
        const exchange = new ethers.Contract(contracts.exchange, exchangeABI, ethers.provider);
        
        try {
            const rate = await exchange.exchangeRate();
            const min = await exchange.minExchange();
            const max = await exchange.maxExchange();
            const total = await exchange.totalExchanged();
            const paused = await exchange.isPaused();
            
            console.log(chalk.white(`  兑换率: 1 USDT = ${rate} BSDT`));
            console.log(chalk.white(`  最小兑换: ${ethers.utils.formatEther(min)}`));
            console.log(chalk.white(`  最大兑换: ${ethers.utils.formatEther(max)}`));
            console.log(chalk.white(`  已兑换总量: ${ethers.utils.formatEther(total)}`));
            console.log(chalk.white(`  状态: ${paused ? '⚠️ 已暂停' : '✅ 运行中'}`));
            
            // 检查关联的代币地址
            try {
                const usdt = await exchange.usdtToken();
                const bsdt = await exchange.bsdtToken();
                console.log(chalk.gray(`  USDT地址: ${usdt}`));
                console.log(chalk.gray(`  BSDT地址: ${bsdt}`));
            } catch (e) {}
            
        } catch (e) {
            console.log(chalk.yellow(`  ⚠️ 兑换合约可能使用不同的接口`));
        }
        
    } catch (error) {
        console.log(chalk.red(`  ❌ 检查失败: ${error.message}`));
    }

    // 3. 检查BSDT的授权交易所
    console.log(chalk.yellow.bold("\n【3】BSDT授权系统:"));
    try {
        const bsdtABI = [
            "function authorizedExchanges(address) view returns (bool)",
            "function isAuthorizedExchange(address) view returns (bool)"
        ];
        
        const bsdt = new ethers.Contract(contracts.bsdtToken, bsdtABI, ethers.provider);
        
        // 检查兑换合约是否被授权
        try {
            const isAuthorized = await bsdt.authorizedExchanges(contracts.exchange);
            console.log(chalk.white(`  兑换合约授权状态: ${isAuthorized ? '✅ 已授权' : '❌ 未授权'}`));
        } catch (e) {
            try {
                const isAuthorized = await bsdt.isAuthorizedExchange(contracts.exchange);
                console.log(chalk.white(`  兑换合约授权状态: ${isAuthorized ? '✅ 已授权' : '❌ 未授权'}`));
            } catch (e2) {
                console.log(chalk.yellow(`  ⚠️ 无法检查授权状态`));
            }
        }
        
    } catch (error) {
        console.log(chalk.yellow(`  ⚠️ 检查授权失败`));
    }

    // 4. 检查监控系统
    console.log(chalk.yellow.bold("\n【4】BSDT监控系统:"));
    console.log(chalk.white("  监控功能通常包括:"));
    console.log(chalk.gray("  • 转账监控 - 追踪所有BSDT转账"));
    console.log(chalk.gray("  • 大额交易警报 - 超过阈值的交易"));
    console.log(chalk.gray("  • 价格监控 - BSDT/USDT价格维持1:1"));
    console.log(chalk.gray("  • 流动性监控 - 确保充足的兑换流动性"));
    
    // 查找监控相关脚本
    const fs = require('fs');
    const monitorScripts = [
        'scripts/liquidity-monitor.js',
        'scripts/test-report.json',
        'scripts/ecosystem.config.js'
    ];
    
    console.log(chalk.cyan("\n  已部署的监控组件:"));
    for (const script of monitorScripts) {
        if (fs.existsSync(script)) {
            console.log(chalk.green(`  ✅ ${script}`));
        }
    }

    // 5. 检查BSDT在HCF生态中的作用
    console.log(chalk.yellow.bold("\n【5】BSDT在HCF生态中的作用:"));
    console.log(chalk.white("  交易流程: USDT → BSDT → HCF → 质押"));
    console.log(chalk.white("  主要用途:"));
    console.log(chalk.gray("  • 稳定币兑换媒介"));
    console.log(chalk.gray("  • LP配对 (HCF/BSDT)"));
    console.log(chalk.gray("  • 节点申请费 (5000 BSDT)"));
    console.log(chalk.gray("  • 底池配置 (10万 BSDT)"));
    
    // 6. 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         BSDT系统总结"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("核心信息:"));
    console.log(chalk.white("  1. BSDT是1:1锚定USDT的稳定币"));
    console.log(chalk.white("  2. 通过兑换合约进行USDT-BSDT转换"));
    console.log(chalk.white("  3. 作为HCF生态的主要交易对"));
    console.log(chalk.white("  4. 用于节点申请和LP组合"));
    
    console.log(chalk.cyan("\n需要注意:"));
    console.log(chalk.yellow("  • 确保兑换合约有足够的BSDT储备"));
    console.log(chalk.yellow("  • 监控BSDT/USDT价格稳定性"));
    console.log(chalk.yellow("  • 定期检查授权状态"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });