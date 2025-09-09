const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📋 所有已部署合约完整列表"));
    console.log(chalk.blue.bold("========================================\n"));

    // 已部署的合约
    const deployedContracts = {
        core: {
            title: "核心代币合约",
            contracts: {
                "HCF Token": {
                    address: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
                    description: "主代币，总量10亿，税率买2%/卖5%/转1%"
                },
                "BSDT Token": {
                    address: "0xf460422388C1205724EF699051aBe300215E490b",
                    description: "稳定币，总量100亿，1:1锚定USDT"
                }
            }
        },
        swap: {
            title: "交易系统合约",
            contracts: {
                "BSDTGateway": {
                    address: "0xcED40bF4AF4dD04F821Bd777f7d953861cfD9cda",
                    description: "USDT→BSDT单向兑换网关"
                },
                "HCFSwapRouter": {
                    address: "0x2e386A8313Cc33a24370A25Fdae5E8d5C548760a",
                    description: "HCF买卖路由，处理USDT↔HCF交易"
                }
            }
        },
        external: {
            title: "外部合约（BSC主网）",
            contracts: {
                "USDT (BSC)": {
                    address: "0x55d398326f99059fF775485246999027B3197955",
                    description: "BSC链上的USDT合约"
                },
                "PancakeSwap Router": {
                    address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
                    description: "PancakeSwap V2路由器"
                },
                "PancakeSwap Factory": {
                    address: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
                    description: "PancakeSwap V2工厂合约"
                }
            }
        },
        notDeployed: {
            title: "待部署合约（可选）",
            contracts: {
                "HCFStaking": {
                    address: "未部署",
                    description: "质押系统，三级质押1000/10000/100000 HCF"
                },
                "ReferralSystem": {
                    address: "未部署",
                    description: "推荐系统，20代推荐关系"
                },
                "NodeNFT": {
                    address: "未部署",
                    description: "节点NFT，99个节点限制"
                },
                "BurnManager": {
                    address: "未部署",
                    description: "燃烧管理，销毁至99万停止"
                },
                "MarketControl": {
                    address: "未部署",
                    description: "市场控制，防暴跌动态滑点"
                },
                "StakingRankingRewards": {
                    address: "未部署",
                    description: "排名奖励系统"
                }
            }
        }
    };

    // 显示已部署合约
    console.log(chalk.green.bold("✅ 已部署合约：\n"));
    
    // 核心代币
    console.log(chalk.cyan.bold(`【${deployedContracts.core.title}】`));
    for (const [name, info] of Object.entries(deployedContracts.core.contracts)) {
        console.log(chalk.white(`${name}:`));
        console.log(chalk.green(`  ${info.address}`));
        console.log(chalk.gray(`  ${info.description}\n`));
    }
    
    // 交易系统
    console.log(chalk.cyan.bold(`【${deployedContracts.swap.title}】`));
    for (const [name, info] of Object.entries(deployedContracts.swap.contracts)) {
        console.log(chalk.white(`${name}:`));
        console.log(chalk.green(`  ${info.address}`));
        console.log(chalk.gray(`  ${info.description}\n`));
    }
    
    // 外部合约
    console.log(chalk.cyan.bold(`【${deployedContracts.external.title}】`));
    for (const [name, info] of Object.entries(deployedContracts.external.contracts)) {
        console.log(chalk.white(`${name}:`));
        console.log(chalk.yellow(`  ${info.address}`));
        console.log(chalk.gray(`  ${info.description}\n`));
    }
    
    // 未部署合约
    console.log(chalk.red.bold("❌ 待部署合约（可选）：\n"));
    console.log(chalk.cyan.bold(`【${deployedContracts.notDeployed.title}】`));
    for (const [name, info] of Object.entries(deployedContracts.notDeployed.contracts)) {
        console.log(chalk.white(`${name}:`));
        console.log(chalk.red(`  ${info.address}`));
        console.log(chalk.gray(`  ${info.description}\n`));
    }
    
    // 系统状态
    console.log(chalk.blue.bold("========================================"));
    console.log(chalk.blue.bold("         系统状态"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green.bold("✅ 可以运行的功能："));
    console.log(chalk.white("  • USDT → BSDT 兑换（单向）"));
    console.log(chalk.white("  • 买入HCF（USDT→BSDT→HCF）"));
    console.log(chalk.white("  • 卖出HCF（HCF→BSDT→USDT）"));
    console.log(chalk.white("  • 税率机制（买2%/卖5%/转1%）\n"));
    
    console.log(chalk.yellow.bold("⏳ 需要流动性池才能运行："));
    console.log(chalk.white("  • BSDT/USDT锚定池（1:1）"));
    console.log(chalk.white("  • HCF/BSDT交易池\n"));
    
    console.log(chalk.red.bold("❌ 暂不可用（合约未部署）："));
    console.log(chalk.white("  • 质押挖矿"));
    console.log(chalk.white("  • 推荐奖励"));
    console.log(chalk.white("  • 节点系统"));
    console.log(chalk.white("  • 排名奖励\n"));
    
    // 创建池子指令
    console.log(chalk.blue.bold("========================================"));
    console.log(chalk.blue.bold("         创建流动性池指令"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan.bold("方法1：通过PancakeSwap网页"));
    console.log(chalk.white("1. 访问: https://pancakeswap.finance/add"));
    console.log(chalk.white("2. 连接钱包（需要有1 USDT）"));
    console.log(chalk.white("3. 创建BSDT/USDT池子（1:1）"));
    console.log(chalk.white("4. 创建HCF/BSDT池子\n"));
    
    console.log(chalk.cyan.bold("方法2：通过脚本（需要私钥）"));
    console.log(chalk.white("npx hardhat run scripts/create-liquidity-pools.js --network bsc\n"));
    
    // 保存到文件
    const allContracts = {
        network: "BSC Mainnet",
        chainId: 56,
        timestamp: new Date().toISOString(),
        deployed: {
            HCF: deployedContracts.core.contracts["HCF Token"].address,
            BSDT: deployedContracts.core.contracts["BSDT Token"].address,
            BSDTGateway: deployedContracts.swap.contracts["BSDTGateway"].address,
            HCFSwapRouter: deployedContracts.swap.contracts["HCFSwapRouter"].address
        },
        external: {
            USDT: deployedContracts.external.contracts["USDT (BSC)"].address,
            PancakeRouter: deployedContracts.external.contracts["PancakeSwap Router"].address,
            PancakeFactory: deployedContracts.external.contracts["PancakeSwap Factory"].address
        },
        notDeployed: Object.keys(deployedContracts.notDeployed.contracts),
        status: "核心系统已就绪，等待创建流动性池"
    };
    
    fs.writeFileSync('./ALL-CONTRACTS-FINAL.json', JSON.stringify(allContracts, null, 2));
    console.log(chalk.gray("📄 所有合约地址已保存到 ALL-CONTRACTS-FINAL.json\n"));
    
    // 最终总结
    console.log(chalk.green.bold("========================================"));
    console.log(chalk.green.bold("         💎 最终总结"));
    console.log(chalk.green.bold("========================================\n"));
    
    console.log(chalk.green.bold("核心系统已100%部署完成！"));
    console.log(chalk.yellow.bold("只需1 USDT即可启动整个系统！"));
    console.log(chalk.cyan.bold("\n立即行动："));
    console.log(chalk.white("1. 获取1 USDT"));
    console.log(chalk.white("2. 创建两个池子"));
    console.log(chalk.white("3. 系统正式运行！"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });