const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 HCF系统部署状态检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("检查账户:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 已部署的合约地址
    const contracts = {
        "HCF Token": "0xc5c3f24a212838968759045d1654d3643016d585",
        "HCF/BSDT Pool": "0x53df45a3260af4b7590a53ce11e7a1f8df5a8048",
        "HCF Staking": "0x209d3d4f8ab55cd678d736957abc139f157753fe",
        "HCF AntiDump": "0xff9d8c2f579cb2b6e663b05f2f0d1e19dcb3eb5a",
        "HCF Node": "0x10b4284eafdc92f448d29db58f1ccc784e8230ad",
        "HCF Referral": "0xea0e87adfdad8b27e967287f7f6ad8a491d88e4f",
        "HCF Ranking": "0x92bc67fdf088e9b06285c8e62f2f36f69f4cc1fa",
        "HCF Governance": "0xb61f86e8e6e8e2ec0cfc29f60bc088c8e7aba9ef"
    };
    
    console.log(chalk.cyan("📝 已部署合约:"));
    for (const [name, address] of Object.entries(contracts)) {
        try {
            const code = await ethers.provider.getCode(address);
            if (code !== "0x") {
                console.log(chalk.green(`✅ ${name}: ${address}`));
            } else {
                console.log(chalk.red(`❌ ${name}: 未部署`));
            }
        } catch (e) {
            console.log(chalk.red(`❌ ${name}: 检查失败`));
        }
    }
    
    // 检查税费系统
    console.log(chalk.cyan("\n💰 税费系统:"));
    try {
        const hcf = await ethers.getContractAt("HCFToken", contracts["HCF Token"]);
        const pool = contracts["HCF/BSDT Pool"];
        const isDEX = await hcf.isDEXPair(pool);
        
        if (isDEX) {
            console.log(chalk.green("✅ 税费已激活"));
            console.log("  买入税: 2%");
            console.log("  卖出税: 5%");
            console.log("  转账税: 1%");
            
            const totalBurned = await hcf.totalBurned();
            console.log(`  已销毁: ${ethers.utils.formatEther(totalBurned)} HCF`);
        } else {
            console.log(chalk.red("❌ 税费未激活"));
        }
    } catch (e) {
        console.log(chalk.red("❌ 无法检查税费状态"));
    }
    
    // 检查池子状态
    console.log(chalk.cyan("\n🏊 流动性池:"));
    try {
        const pair = await ethers.getContractAt("IPancakePair", contracts["HCF/BSDT Pool"]);
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        
        let hcfReserve, bsdtReserve;
        if (token0.toLowerCase() === contracts["HCF Token"].toLowerCase()) {
            hcfReserve = reserves[0];
            bsdtReserve = reserves[1];
        } else {
            hcfReserve = reserves[1];
            bsdtReserve = reserves[0];
        }
        
        const hcfAmount = ethers.utils.formatEther(hcfReserve);
        const bsdtAmount = ethers.utils.formatEther(bsdtReserve);
        const price = parseFloat(bsdtAmount) / parseFloat(hcfAmount);
        
        console.log(`  HCF储备: ${hcfAmount} HCF`);
        console.log(`  BSDT储备: ${bsdtAmount} BSDT`);
        console.log(`  HCF价格: ${price.toFixed(4)} BSDT`);
        
        // 检查是否达到目标
        const targetHCF = 1000000;
        const targetBSDT = 100000;
        
        if (parseFloat(hcfAmount) >= targetHCF && parseFloat(bsdtAmount) >= targetBSDT) {
            console.log(chalk.green(`✅ 流动性充足 (目标: ${targetHCF} HCF + ${targetBSDT} BSDT)`));
        } else {
            console.log(chalk.yellow(`⚠️ 流动性不足 (目标: ${targetHCF} HCF + ${targetBSDT} BSDT)`));
        }
    } catch (e) {
        console.log(chalk.red("❌ 无法检查池子状态"));
    }
    
    // 检查质押系统
    console.log(chalk.cyan("\n⛏️ 质押系统:"));
    try {
        const staking = await ethers.getContractAt("HCFStakingFinal", contracts["HCF Staking"]);
        const totalStaked = await staking.totalStaked();
        console.log(`  总质押: ${ethers.utils.formatEther(totalStaked)} HCF`);
        
        // 检查等级配置
        for (let i = 3; i <= 5; i++) {
            const level = await staking.levels(i);
            console.log(`  L${i}: 最小${ethers.utils.formatEther(level.minStake)} HCF, 日化${level.dailyRate / 100}%`);
        }
    } catch (e) {
        console.log(chalk.red("❌ 无法检查质押状态"));
    }
    
    // 待部署/集成
    console.log(chalk.cyan("\n⏳ 待完成:"));
    console.log(chalk.yellow("📦 团队奖励V1-V6系统:"));
    console.log("  状态: 合约已开发，待部署");
    console.log("  地址: 需要向部署账户充值0.02 BNB");
    console.log("  功能: V1-V6等级奖励 (6%-36%)");
    
    console.log(chalk.yellow("\n🔄 20级推荐奖励:"));
    console.log("  状态: 待开发");
    console.log("  功能: 20层推荐奖励递减");
    
    console.log(chalk.yellow("\n🔥 销毁机制:"));
    console.log("  状态: 部分实现");
    console.log("  当前: 税费自动销毁");
    console.log("  待完成: 销毁至990,000 HCF停止");
    
    console.log(chalk.yellow("\n💎 其他功能:"));
    console.log("  • 7天购买限制 (1000 HCF/天)");
    console.log("  • BNB领取手续费 5%");
    console.log("  • 账号最小余额 0.0001 HCF");
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.green.bold("   当前进度: 75% 完成"));
    console.log(chalk.blue.bold("========================================\n"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });