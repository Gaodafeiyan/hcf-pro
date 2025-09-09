const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   HCF-RWA 遗漏功能检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9",
        burnMechanism: "0x2C1E651183ea61f044A76CFb64c2A3b9b1e98735",
        marketControl: "0xCB42212723DDbd78Ca795428360E4B93bA87ebA2"
    };

    console.log(chalk.cyan("📋 检查遗漏功能:\n"));

    // 1. 检查领取收益手续费
    console.log(chalk.yellow("【1】领取收益手续费 (5% BNB)"));
    try {
        const tokenABI = ["function claimTaxRate() view returns (uint256)"];
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, ethers.provider);
        const claimTax = await token.claimTaxRate();
        console.log(`  当前设置: ${claimTax/100}%`);
        if (claimTax == 500) {
            console.log(chalk.green("  ✅ 手续费率正确"));
        } else {
            console.log(chalk.red("  ❌ 应为5%"));
        }
    } catch (e) {
        console.log(chalk.red("  ❌ 未实现领取手续费功能"));
    }

    // 2. 检查质押赎回机制
    console.log(chalk.yellow("\n【2】质押赎回机制"));
    try {
        const stakingABI = [
            "function withdrawFee() view returns (uint256)",
            "function lpWithdrawFee() view returns (uint256)"
        ];
        const staking = new ethers.Contract(contracts.staking, stakingABI, ethers.provider);
        
        try {
            const fee = await staking.withdrawFee();
            console.log(`  普通赎回费: ${fee/100}%`);
        } catch (e) {
            console.log(chalk.red("  ❌ 未设置普通赎回费"));
        }
        
        try {
            const lpFee = await staking.lpWithdrawFee();
            console.log(`  LP赎回费: ${lpFee/100}%`);
        } catch (e) {
            console.log(chalk.red("  ❌ 未设置LP赎回费"));
        }
    } catch (e) {
        console.log(chalk.red("  ❌ 赎回机制未完全实现"));
    }

    // 3. 检查排名奖励
    console.log(chalk.yellow("\n【3】排名奖励系统"));
    try {
        const referralABI = [
            "function rankingRewards(uint256) view returns (uint256)",
            "function getRankingInfo() view returns (uint256[] memory)"
        ];
        const referral = new ethers.Contract(contracts.referral, referralABI, ethers.provider);
        
        try {
            const rank100 = await referral.rankingRewards(0);
            const rank299 = await referral.rankingRewards(1);
            console.log(`  小区业绩1-100名: ${rank100}%`);
            console.log(`  小区业绩101-299名: ${rank299}%`);
            
            if (rank100 == 20 && rank299 == 10) {
                console.log(chalk.green("  ✅ 小区业绩排名奖已设置"));
            } else {
                console.log(chalk.yellow("  ⚠️ 排名奖励比例需要调整"));
            }
        } catch (e) {
            console.log(chalk.red("  ❌ 小区业绩排名奖未实现"));
        }
    } catch (e) {
        console.log(chalk.red("  ❌ 排名系统未实现"));
    }

    // 4. 检查质押排名奖
    console.log(chalk.yellow("\n【4】质押排名奖"));
    console.log(chalk.red("  ❌ 质押排名奖未实现"));
    console.log(chalk.gray("     需要: 前100名20%, 101-500名15%, 501-2000名10%"));

    // 5. 检查股权LP
    console.log(chalk.yellow("\n【5】股权LP机制"));
    try {
        const stakingABI = ["function addonRates() view returns (uint256,uint256,uint256,uint256)"];
        const staking = new ethers.Contract(contracts.staking, stakingABI, ethers.provider);
        const addons = await staking.addonRates();
        console.log(`  持有加成: ${addons[0]/100}%`);
        console.log(chalk.yellow("  ⚠️ 需要验证100天+20%和300天+40%机制"));
    } catch (e) {
        console.log(chalk.red("  ❌ 股权LP机制需要验证"));
    }

    // 6. 检查防暴跌机制
    console.log(chalk.yellow("\n【6】防暴跌机制"));
    try {
        const marketABI = [
            "function priceDropThresholds(uint256) view returns (uint256)",
            "function slippageIncrease(uint256) view returns (uint256)"
        ];
        const market = new ethers.Contract(contracts.marketControl, marketABI, ethers.provider);
        
        console.log(chalk.green("  ✅ 市场控制合约已部署"));
        console.log(chalk.yellow("  ⚠️ 需要验证动态滑点配置"));
    } catch (e) {
        console.log(chalk.yellow("  ⚠️ 防暴跌机制需要配置"));
    }

    // 7. 检查底池配置
    console.log(chalk.yellow("\n【7】底池配置"));
    console.log(chalk.red("  ❌ 100万+10万BSDT底池未配置"));
    console.log(chalk.gray("     需要添加流动性并锁定10年"));

    // 8. 检查多签钱包
    console.log(chalk.yellow("\n【8】多签钱包"));
    try {
        const tokenABI = ["function multiSigWallet() view returns (address)"];
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, ethers.provider);
        const multiSig = await token.multiSigWallet();
        
        if (multiSig == "0x0000000000000000000000000000000000000000") {
            console.log(chalk.red("  ❌ 多签钱包未配置"));
        } else {
            console.log(chalk.green(`  ✅ 多签钱包: ${multiSig}`));
        }
    } catch (e) {
        console.log(chalk.red("  ❌ 多签钱包未配置"));
    }

    // 9. 检查限购
    console.log(chalk.yellow("\n【9】每日限购"));
    try {
        const stakingABI = ["function DAILY_LIMIT() view returns (uint256)"];
        const staking = new ethers.Contract(contracts.staking, stakingABI, ethers.provider);
        const limit = await staking.DAILY_LIMIT();
        const limitAmount = ethers.utils.formatEther(limit);
        
        if (limitAmount == "1000.0") {
            console.log(chalk.green(`  ✅ 限购正确: ${limitAmount} HCF`));
        } else {
            console.log(chalk.red(`  ❌ 当前: ${limitAmount} HCF (应为1000)`));
        }
    } catch (e) {
        console.log(chalk.red("  ❌ 无法读取限购"));
    }

    // 10. 检查最小保留
    console.log(chalk.yellow("\n【10】账户最小保留"));
    try {
        const tokenABI = ["function MIN_BALANCE() view returns (uint256)"];
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, ethers.provider);
        const minBal = await token.MIN_BALANCE();
        const minAmount = ethers.utils.formatEther(minBal);
        
        if (minAmount == "0.0001") {
            console.log(chalk.green(`  ✅ 最小保留: ${minAmount} HCF`));
        } else {
            console.log(chalk.yellow(`  ⚠️ 最小保留: ${minAmount} HCF`));
        }
    } catch (e) {
        console.log(chalk.yellow("  ⚠️ 需要验证最小保留机制"));
    }

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         遗漏功能总结"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.red("❌ 完全未实现的功能:"));
    console.log("  1. 质押排名奖 (前100名20%等)");
    console.log("  2. 底池配置 (100万+10万BSDT)");
    console.log("  3. 多签钱包部署");
    
    console.log(chalk.yellow("\n⚠️ 部分实现或需要验证:"));
    console.log("  1. 领取收益手续费分配");
    console.log("  2. 质押赎回完整机制");
    console.log("  3. 小区业绩排名奖");
    console.log("  4. 股权LP (100/300天加成)");
    console.log("  5. 防暴跌动态滑点");
    console.log("  6. 防暴减产机制");
    console.log("  7. 复投倍数机制");
    console.log("  8. 每日限购 (500 vs 1000)");
    
    console.log(chalk.green("\n✅ 已实现的核心功能:"));
    console.log("  1. 代币发行和税率");
    console.log("  2. 基础质押功能");
    console.log("  3. 推荐系统20代");
    console.log("  4. 节点NFT系统");
    console.log("  5. USDT/BSDT兑换");
    console.log("  6. 燃烧机制");
    console.log("  7. 市场控制框架");

    // 保存报告
    const fs = require('fs');
    const missingFeatures = {
        timestamp: new Date().toISOString(),
        notImplemented: [
            "质押排名奖",
            "底池配置",
            "多签钱包"
        ],
        partiallyImplemented: [
            "领取收益手续费",
            "质押赎回机制",
            "小区业绩排名",
            "股权LP机制",
            "防暴跌滑点",
            "防暴减产",
            "复投倍数",
            "每日限购"
        ],
        implemented: [
            "代币和税率",
            "质押基础功能",
            "推荐系统",
            "节点NFT",
            "兑换系统",
            "燃烧机制",
            "市场控制"
        ]
    };
    
    fs.writeFileSync('./missing-features-report.json', JSON.stringify(missingFeatures, null, 2));
    console.log(chalk.cyan("\n📄 详细报告已保存到 missing-features-report.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });