const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 使用正确的钱包重新部署所有合约...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("当前部署账户:", deployer.address);
    
    // 检查是否是正确的钱包
    const expectedWallet = "0x4509f773f2Cb6543837Eabbd27538139feE59496";
    if (deployer.address.toLowerCase() !== expectedWallet.toLowerCase()) {
        console.log("⚠️ 警告: 当前账户不是主钱包!");
        console.log("期望的钱包:", expectedWallet);
        console.log("\n请确保.env文件中的PRIVATE_KEY是主钱包的私钥");
        console.log("然后重新运行此脚本");
        return;
    }
    
    console.log("✅ 使用正确的主钱包!");
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.08"))) {
        console.log("❌ BNB余额不足，需要至少0.08 BNB");
        return;
    }
    
    // 代币地址
    const HCF_TOKEN = "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC"; // 新的V3
    const BSDT_TOKEN = "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908";
    
    // 其他地址
    const multiSigWallet = deployer.address; // 使用部署者地址
    const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    const pancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const priceOracle = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";
    
    const newContracts = {};
    
    try {
        // 1. 部署推荐合约
        console.log("\n📍 [1/8] 部署推荐合约...");
        const HCFReferral = await ethers.getContractFactory("HCFReferral");
        const referral = await HCFReferral.deploy(HCF_TOKEN, BSDT_TOKEN);
        await referral.deployed();
        newContracts.referral = referral.address;
        console.log("✅ 推荐合约:", referral.address);
        
        // 2. 部署质押合约
        console.log("\n📍 [2/8] 部署质押合约...");
        const HCFStakingFixed = await ethers.getContractFactory("HCFStakingFixed");
        const staking = await HCFStakingFixed.deploy(
            HCF_TOKEN,
            BSDT_TOKEN,
            multiSigWallet,
            multiSigWallet,
            multiSigWallet
        );
        await staking.deployed();
        newContracts.staking = staking.address;
        console.log("✅ 质押合约:", staking.address);
        
        // 3. 部署节点NFT
        console.log("\n📍 [3/8] 部署节点NFT...");
        const HCFNodeNFT = await ethers.getContractFactory("HCFNodeNFT");
        const nodeNFT = await HCFNodeNFT.deploy(
            HCF_TOKEN,
            BSDT_TOKEN,
            priceOracle,
            multiSigWallet,
            multiSigWallet
        );
        await nodeNFT.deployed();
        newContracts.nodeNFT = nodeNFT.address;
        console.log("✅ 节点NFT:", nodeNFT.address);
        
        // 4. 部署兑换合约
        console.log("\n📍 [4/8] 部署兑换合约...");
        const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
        const exchange = await HCFBSDTExchange.deploy(
            HCF_TOKEN,
            BSDT_TOKEN,
            usdtAddress,
            multiSigWallet,
            pancakeRouter,
            multiSigWallet
        );
        await exchange.deployed();
        newContracts.exchange = exchange.address;
        console.log("✅ 兑换合约:", exchange.address);
        
        // 5. 部署燃烧机制
        console.log("\n📍 [5/8] 部署燃烧机制...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burn = await HCFBurnMechanism.deploy(HCF_TOKEN);
        await burn.deployed();
        newContracts.burn = burn.address;
        console.log("✅ 燃烧机制:", burn.address);
        
        // 6. 部署排名奖励
        console.log("\n📍 [6/8] 部署排名奖励...");
        const HCFRankingRewards = await ethers.getContractFactory("HCFRankingRewards");
        const ranking = await HCFRankingRewards.deploy(
            HCF_TOKEN,
            staking.address,
            referral.address
        );
        await ranking.deployed();
        newContracts.ranking = ranking.address;
        console.log("✅ 排名奖励:", ranking.address);
        
        // 7. 部署防暴跌机制
        console.log("\n📍 [7/8] 部署防暴跌机制...");
        const HCFAntiDumpMechanism = await ethers.getContractFactory("HCFAntiDumpMechanism");
        const antiDump = await HCFAntiDumpMechanism.deploy(
            HCF_TOKEN,
            pancakeRouter,
            staking.address
        );
        await antiDump.deployed();
        newContracts.antiDump = antiDump.address;
        console.log("✅ 防暴跌机制:", antiDump.address);
        
        // 8. 部署赎回惩罚
        console.log("\n📍 [8/8] 部署赎回惩罚...");
        const HCFRedemptionPenalty = await ethers.getContractFactory("HCFRedemptionPenalty");
        const redemption = await HCFRedemptionPenalty.deploy(
            HCF_TOKEN,
            BSDT_TOKEN,
            staking.address,
            multiSigWallet
        );
        await redemption.deployed();
        newContracts.redemption = redemption.address;
        console.log("✅ 赎回惩罚:", redemption.address);
        
        // 保存所有地址
        const finalDeployment = {
            network: "BSC_MAINNET",
            deployTime: new Date().toISOString(),
            deployer: deployer.address,
            tokens: {
                HCF: HCF_TOKEN,
                BSDT: BSDT_TOKEN
            },
            contracts: {
                referral: referral.address,
                staking: staking.address,
                nodeNFT: nodeNFT.address,
                exchange: exchange.address,
                burn: burn.address,
                ranking: ranking.address,
                antiDump: antiDump.address,
                redemption: redemption.address,
                governance: "0x830377fde4169b1a260a962712bfa90C1BEb8FE6"
            }
        };
        
        const filename = `FINAL-V3-DEPLOYMENT-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(finalDeployment, null, 2));
        
        console.log("\n" + "=".repeat(80));
        console.log("🎉🎉🎉 完整生态系统部署成功! 🎉🎉🎉");
        console.log("=".repeat(80));
        
        console.log("\n📋 最终部署地址（使用HCF V3 - 10亿总量）:");
        console.log("-".repeat(80));
        console.log("代币:");
        console.log("  HCF Token V3:", HCF_TOKEN);
        console.log("  BSDT Token:", BSDT_TOKEN);
        console.log("\n核心合约:");
        console.log("  推荐系统:", referral.address);
        console.log("  质押挖矿:", staking.address);
        console.log("  节点NFT:", nodeNFT.address);
        console.log("  代币兑换:", exchange.address);
        console.log("\n辅助合约:");
        console.log("  燃烧机制:", burn.address);
        console.log("  排名奖励:", ranking.address);
        console.log("  防暴跌:", antiDump.address);
        console.log("  赎回惩罚:", redemption.address);
        console.log("  治理合约:", finalDeployment.contracts.governance);
        
        console.log("\n✅ 部署完成！文件已保存:", filename);
        console.log("\n🎯 下一步:");
        console.log("1. 创建流动性池 (HCF-BNB, HCF-BSDT)");
        console.log("2. 配置合约参数");
        console.log("3. 更新前端配置");
        console.log("4. 开始运营!");
        
    } catch (error) {
        console.error("\n❌ 部署失败:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });