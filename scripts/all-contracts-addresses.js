const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 HCF-RWA 所有合约地址汇总"));
    console.log(chalk.blue.bold("========================================\n"));

    // 核心代币合约
    console.log(chalk.cyan.bold("【1】核心代币合约"));
    console.log(chalk.white("HCF Token:"));
    console.log(chalk.green("  0x24cA14001674fD9250c9E343e30Bc788bC3a64cC"));
    console.log(chalk.gray("  • 总量：10亿"));
    console.log(chalk.gray("  • 税率：买2%/卖5%/转1%"));
    console.log(chalk.gray("  • 销毁至99万停止\n"));
    
    console.log(chalk.white("BSDT Token:"));
    console.log(chalk.green("  0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"));
    console.log(chalk.gray("  • 总量：1000亿"));
    console.log(chalk.gray("  • 1:1锚定USDT"));
    console.log(chalk.gray("  • 单向兑换（只进不出）\n"));

    // 业务逻辑合约
    console.log(chalk.cyan.bold("【2】业务逻辑合约"));
    console.log(chalk.white("质押系统 (HCFStaking):"));
    console.log(chalk.green("  0x42C343c61a630d0107B752001caCd50EfbDD13f6"));
    console.log(chalk.gray("  • 三级质押：1000/10000/100000 HCF"));
    console.log(chalk.gray("  • 支持LP质押和股权LP\n"));
    
    console.log(chalk.white("推荐系统 (ReferralSystem):"));
    console.log(chalk.green("  0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D"));
    console.log(chalk.gray("  • 20代推荐关系"));
    console.log(chalk.gray("  • 烧伤机制\n"));
    
    console.log(chalk.white("节点NFT (NodeNFT):"));
    console.log(chalk.green("  0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55"));
    console.log(chalk.gray("  • 99个节点限制"));
    console.log(chalk.gray("  • 5000 BSDT申请费\n"));

    // 交易和兑换合约
    console.log(chalk.cyan.bold("【3】交易和兑换合约"));
    console.log(chalk.white("BSDT Gateway (单向兑换):"));
    console.log(chalk.green("  0xb4c9C3E8CA4365c04d47dD6113831449213731ca"));
    console.log(chalk.gray("  • USDT → BSDT（单向）"));
    console.log(chalk.gray("  • 不能反向兑换\n"));
    
    console.log(chalk.white("HCF Swap Router:"));
    console.log(chalk.green("  0x266b661f952dF7f5FBC97b28E9828775d9F0e75d"));
    console.log(chalk.gray("  • 买入：USDT→BSDT→HCF"));
    console.log(chalk.gray("  • 卖出：HCF→BSDT→USDT（3%手续费）\n"));

    // 辅助功能合约
    console.log(chalk.cyan.bold("【4】辅助功能合约"));
    console.log(chalk.white("燃烧机制 (BurnManager):"));
    console.log(chalk.green("  0x2C1E651183ea61f044A76CFb64c2A3b9b1e98735"));
    console.log(chalk.gray("  • 管理代币销毁\n"));
    
    console.log(chalk.white("市场控制 (MarketControl):"));
    console.log(chalk.green("  0xCB42212723DDbd78Ca795428360E4B93bA87ebA2"));
    console.log(chalk.gray("  • 防暴跌动态滑点\n"));
    
    console.log(chalk.white("排名奖励 (StakingRankingRewards):"));
    console.log(chalk.green("  0xB83742944eE696318d9087076DC2D1bFF946E6Be"));
    console.log(chalk.gray("  • 质押排名奖励"));
    console.log(chalk.gray("  • 小区业绩排名\n"));

    // PancakeSwap相关
    console.log(chalk.cyan.bold("【5】PancakeSwap合约（BSC主网）"));
    console.log(chalk.white("PancakeSwap Factory:"));
    console.log(chalk.yellow("  0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"));
    
    console.log(chalk.white("PancakeSwap Router:"));
    console.log(chalk.yellow("  0x10ED43C718714eb63d5aA57B78B54704E256024E"));
    
    console.log(chalk.white("USDT (BSC):"));
    console.log(chalk.yellow("  0x55d398326f99059fF775485246999027B3197955\n"));

    // 流动性池创建步骤
    console.log(chalk.blue.bold("========================================"));
    console.log(chalk.blue.bold("   📋 流动性池创建步骤"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green.bold("第1步：准备资金"));
    console.log(chalk.white("  ✅ 已有：100,000 BSDT"));
    console.log(chalk.white("  ❌ 需要：1 USDT（锚定池）"));
    console.log(chalk.white("  ❌ 需要：1 额外BSDT（共需100,001）\n"));
    
    console.log(chalk.green.bold("第2步：创建BSDT/USDT锚定池（价格参考）"));
    console.log(chalk.white("  1. 批准1 USDT给PancakeRouter"));
    console.log(chalk.white("  2. 批准1 BSDT给PancakeRouter"));
    console.log(chalk.white("  3. 调用addLiquidity创建1:1池子\n"));
    
    console.log(chalk.green.bold("第3步：创建HCF/BSDT交易池"));
    console.log(chalk.white("  1. 批准100万HCF给PancakeRouter"));
    console.log(chalk.white("  2. 批准10万BSDT给PancakeRouter"));
    console.log(chalk.white("  3. 调用addLiquidity创建交易池"));
    console.log(chalk.white("  4. 初始价格：1 HCF = 0.1 BSDT\n"));
    
    console.log(chalk.green.bold("第4步：锁定LP代币"));
    console.log(chalk.white("  1. 获取LP代币地址"));
    console.log(chalk.white("  2. 将LP发送到时间锁合约"));
    console.log(chalk.white("  3. 设置锁定期10年\n"));
    
    console.log(chalk.green.bold("第5步：系统测试"));
    console.log(chalk.white("  1. 测试USDT→BSDT兑换"));
    console.log(chalk.white("  2. 测试买入HCF"));
    console.log(chalk.white("  3. 测试卖出HCF"));
    console.log(chalk.white("  4. 测试质押功能\n"));

    // 重要提醒
    console.log(chalk.red.bold("⚠️ 重要提醒："));
    console.log(chalk.yellow("1. 确保所有操作在BSC主网进行"));
    console.log(chalk.yellow("2. 批准代币前检查合约地址"));
    console.log(chalk.yellow("3. 添加流动性时注意滑点设置"));
    console.log(chalk.yellow("4. LP锁定后无法取回，请谨慎操作\n"));

    // 保存到JSON
    const fs = require('fs');
    const contractsData = {
        network: "BSC Mainnet",
        chainId: 56,
        contracts: {
            tokens: {
                HCF: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
                BSDT: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
                USDT: "0x55d398326f99059fF775485246999027B3197955"
            },
            business: {
                Staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
                Referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
                NodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55"
            },
            swap: {
                BSDTGateway: "0xb4c9C3E8CA4365c04d47dD6113831449213731ca",
                HCFRouter: "0x266b661f952dF7f5FBC97b28E9828775d9F0e75d"
            },
            utils: {
                BurnManager: "0x2C1E651183ea61f044A76CFb64c2A3b9b1e98735",
                MarketControl: "0xCB42212723DDbd78Ca795428360E4B93bA87ebA2",
                RankingRewards: "0xB83742944eE696318d9087076DC2D1bFF946E6Be"
            },
            pancakeswap: {
                Factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
                Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
            }
        },
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('./contracts-addresses.json', JSON.stringify(contractsData, null, 2));
    console.log(chalk.gray("📄 合约地址已保存到 contracts-addresses.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });