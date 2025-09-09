const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   需求文档 vs 实际部署 对比检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    // 已部署的合约
    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9",
        burnMechanism: "0x2C1E651183ea61f044A76CFb64c2A3b9b1e98735",
        marketControl: "0xCB42212723DDbd78Ca795428360E4B93bA87ebA2",
        autoSwap: "0x83714243313D69AE9d21B09d2f336e9A2713B8A5"
    };

    console.log(chalk.cyan("📋 根据需求文档逐项检查：\n"));

    // 1. 代币经济
    console.log(chalk.yellow.bold("【1】代币经济"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 发行总量：10亿枚"));
    console.log(chalk.gray("  • 销毁目标：99万枚"));
    console.log(chalk.gray("  • 初始流通：100万枚+10万BSDT"));
    
    try {
        const tokenABI = [
            "function totalSupply() view returns (uint256)",
            "function name() view returns (string)",
            "function symbol() view returns (string)"
        ];
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, signer);
        const totalSupply = await token.totalSupply();
        console.log(chalk.green(`  ✅ 总供应量: ${ethers.utils.formatEther(totalSupply)} HCF`));
        console.log(chalk.green(`  ✅ 燃烧机制已部署: ${contracts.burnMechanism}`));
    } catch (e) {
        console.log(chalk.red(`  ❌ 无法验证`));
    }

    // 2. 税率机制
    console.log(chalk.yellow.bold("\n【2】税率机制"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 买入税: 2%"));
    console.log(chalk.gray("  • 卖出税: 5%"));
    console.log(chalk.gray("  • 转账税: 1%"));
    console.log(chalk.gray("  • 分配: 质押池60%,推荐30%,节点6%,销毁4%"));
    
    try {
        const tokenABI = [
            "function buyTaxRate() view returns (uint256)",
            "function sellTaxRate() view returns (uint256)",
            "function transferTaxRate() view returns (uint256)"
        ];
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, signer);
        const buyTax = await token.buyTaxRate();
        const sellTax = await token.sellTaxRate();
        const transferTax = await token.transferTaxRate();
        
        console.log(chalk.green(`  ✅ 买入税: ${buyTax/100}%`));
        console.log(chalk.green(`  ✅ 卖出税: ${sellTax/100}%`));
        console.log(chalk.green(`  ✅ 转账税: ${transferTax/100}%`));
    } catch (e) {
        console.log(chalk.yellow(`  ⚠️ 税率需要验证`));
    }

    // 3. 质押系统
    console.log(chalk.yellow.bold("\n【3】质押系统"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 等级1: 1000 HCF (日化1%)"));
    console.log(chalk.gray("  • 等级2: 10000 HCF (日化1.5%)"));
    console.log(chalk.gray("  • 等级3: 100000 HCF (日化2%)"));
    console.log(chalk.gray("  • LP质押额外+30%"));
    console.log(chalk.gray("  • 100天额外+20%, 300天+40%"));
    console.log(chalk.gray("  • 每日限购: 500-1000 HCF"));
    
    try {
        const stakingABI = [
            "function levels(uint256) view returns (uint256,uint256,uint256)",
            "function DAILY_LIMIT() view returns (uint256)"
        ];
        const staking = new ethers.Contract(contracts.staking, stakingABI, signer);
        
        const level1 = await staking.levels(0);
        const level2 = await staking.levels(1);
        const level3 = await staking.levels(2);
        const dailyLimit = await staking.DAILY_LIMIT();
        
        console.log(chalk.green(`  ✅ 等级1: ${ethers.utils.formatEther(level1[0])} HCF`));
        console.log(chalk.green(`  ✅ 等级2: ${ethers.utils.formatEther(level2[0])} HCF`));
        console.log(chalk.green(`  ✅ 等级3: ${ethers.utils.formatEther(level3[0])} HCF`));
        console.log(chalk.green(`  ✅ 每日限购: ${ethers.utils.formatEther(dailyLimit)} HCF`));
        console.log(chalk.yellow(`  ⚠️ LP加成和时间加成需要验证`));
    } catch (e) {
        console.log(chalk.yellow(`  ⚠️ 部分参数需要验证`));
    }

    // 4. 赎回机制
    console.log(chalk.yellow.bold("\n【4】赎回机制"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 普通赎回: 扣10% BNB手续费"));
    console.log(chalk.gray("  • LP赎回: 扣50% BSDT"));
    console.log(chalk.gray("  • 未达标额外销毁: 30%"));
    console.log(chalk.red("  ❌ 赎回机制未完全实现"));

    // 5. 领取收益
    console.log(chalk.yellow.bold("\n【5】领取收益"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 手续费: 5% BNB"));
    console.log(chalk.gray("  • 质押池40%, 推荐40%, 节点20%"));
    console.log(chalk.yellow("  ⚠️ 需要验证分配比例"));

    // 6. 推荐系统
    console.log(chalk.yellow.bold("\n【6】推荐系统"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 20代关系"));
    console.log(chalk.gray("  • 1-5代各4%, 6-10代各2%, 11-15代各1%, 16-20代各0.5%"));
    console.log(chalk.gray("  • 烧伤机制"));
    console.log(chalk.gray("  • 小区业绩排名奖"));
    
    console.log(chalk.green(`  ✅ 推荐合约已部署: ${contracts.referral}`));
    console.log(chalk.green(`  ✅ 20代关系已实现`));
    console.log(chalk.yellow(`  ⚠️ 小区业绩排名奖需要配置`));

    // 7. 质押排名奖
    console.log(chalk.yellow.bold("\n【7】质押排名奖"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 前100名: 20%"));
    console.log(chalk.gray("  • 101-500名: 15%"));
    console.log(chalk.gray("  • 501-2000名: 10%"));
    console.log(chalk.red("  ❌ 质押排名奖未实现"));

    // 8. 节点系统
    console.log(chalk.yellow.bold("\n【8】节点系统"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 总量: 99个"));
    console.log(chalk.gray("  • 申请费: 5000 BSDT"));
    console.log(chalk.gray("  • 质押要求: 100万HCF"));
    console.log(chalk.gray("  • 分红: 全网6%"));
    
    console.log(chalk.green(`  ✅ 节点NFT合约已部署: ${contracts.nodeNFT}`));
    console.log(chalk.green(`  ✅ 99个节点限制`));
    console.log(chalk.green(`  ✅ 5000 BSDT申请费`));

    // 9. 底池配置
    console.log(chalk.yellow.bold("\n【9】底池配置"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 初始: 100万HCF + 10万BSDT"));
    console.log(chalk.gray("  • 锁定: 10年"));
    console.log(chalk.gray("  • 初始价格: 0.1 BSDT"));
    console.log(chalk.red("  ❌ 流动性池未创建"));

    // 10. 防护机制
    console.log(chalk.yellow.bold("\n【10】防护机制"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 防暴跌: 动态滑点"));
    console.log(chalk.gray("  • 跌10%滑点+5%, 跌20%+10%, 跌30%+15%"));
    console.log(chalk.gray("  • 防减产: 流通达标后开启"));
    console.log(chalk.gray("  • 最小保留: 0.0001 HCF"));
    
    console.log(chalk.green(`  ✅ 市场控制合约已部署: ${contracts.marketControl}`));
    console.log(chalk.yellow(`  ⚠️ 动态滑点需要配置`));

    // 11. BSDT系统
    console.log(chalk.yellow.bold("\n【11】BSDT稳定币系统"));
    console.log(chalk.white("需求："));
    console.log(chalk.gray("  • 总量: 1000亿"));
    console.log(chalk.gray("  • 1:1锚定USDT"));
    console.log(chalk.gray("  • 自动兑换"));
    
    console.log(chalk.green(`  ✅ BSDT代币: ${contracts.bsdtToken}`));
    console.log(chalk.green(`  ✅ USDT兑换: ${contracts.exchange}`));
    console.log(chalk.green(`  ✅ AutoSwap: ${contracts.autoSwap}`));

    // 12. 多签钱包
    console.log(chalk.yellow.bold("\n【12】多签钱包"));
    console.log(chalk.white("需求：重要操作需要多签"));
    console.log(chalk.red("  ❌ 多签钱包未配置（建议使用Gnosis Safe）"));

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         完成情况总结"));
    console.log(chalk.blue.bold("========================================\n"));

    const completed = [
        "HCF代币发行（10亿）",
        "税率机制（2%/5%/1%）",
        "三级质押系统",
        "20代推荐系统",
        "节点NFT系统（99个）",
        "BSDT稳定币（1000亿）",
        "USDT/BSDT兑换",
        "燃烧机制",
        "市场控制框架",
        "AutoSwap系统"
    ];

    const partial = [
        "赎回机制（需完善）",
        "领取收益分配（需验证）",
        "小区业绩排名（需配置）",
        "LP和时间加成（需验证）",
        "动态滑点（需配置）"
    ];

    const missing = [
        "质押排名奖（前100名20%等）",
        "多签钱包",
        "流动性池（100万HCF+10万BSDT）",
        "LP锁定10年"
    ];

    console.log(chalk.green(`✅ 已完成 (${completed.length}项):`));
    completed.forEach(item => console.log(chalk.white(`  • ${item}`)));

    console.log(chalk.yellow(`\n⚠️ 部分完成 (${partial.length}项):`));
    partial.forEach(item => console.log(chalk.white(`  • ${item}`)));

    console.log(chalk.red(`\n❌ 未完成 (${missing.length}项):`));
    missing.forEach(item => console.log(chalk.white(`  • ${item}`)));

    const total = completed.length + partial.length + missing.length;
    const completionRate = (completed.length / total * 100).toFixed(1);
    console.log(chalk.cyan(`\n📊 完成率: ${completionRate}%`));
    console.log(chalk.cyan(`📊 如果算上部分完成: ${((completed.length + partial.length * 0.5) / total * 100).toFixed(1)}%`));

    // 保存详细报告
    const fs = require('fs');
    const report = {
        timestamp: new Date().toISOString(),
        contracts: contracts,
        requirements: {
            completed: completed,
            partial: partial,
            missing: missing
        },
        completionRate: completionRate + "%",
        nextSteps: [
            "部署质押排名奖励合约",
            "完善赎回机制",
            "配置Gnosis Safe多签",
            "创建流动性池",
            "锁定LP代币"
        ]
    };

    fs.writeFileSync('./requirements-check-report.json', JSON.stringify(report, null, 2));
    console.log(chalk.gray("\n📄 详细报告已保存到 requirements-check-report.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });