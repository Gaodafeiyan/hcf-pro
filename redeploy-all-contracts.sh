#!/bin/bash

echo "========================================="
echo "重新部署所有合约使用新HCF Token V3"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 新HCF Token V3地址
NEW_HCF_TOKEN="0x24cA14001674fD9250c9E343e30Bc788bC3a64cC"
BSDT_TOKEN="0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"

echo -e "${GREEN}📋 使用的代币地址:${NC}"
echo "HCF Token V3: $NEW_HCF_TOKEN"
echo "BSDT Token: $BSDT_TOKEN (保持不变)"
echo ""

echo -e "${YELLOW}⚠️ 将重新部署以下合约:${NC}"
echo "1. 质押合约 (使用新HCF)"
echo "2. 推荐合约 (使用新HCF)"
echo "3. 节点NFT (使用新HCF)"
echo "4. 兑换合约 (使用新HCF)"
echo "5. 燃烧机制 (使用新HCF)"
echo "6. 排名奖励 (使用新HCF)"
echo "7. 防暴跌机制 (使用新HCF)"
echo "8. 赎回惩罚 (使用新HCF)"
echo ""

read -p "确认重新部署所有合约? (输入 'REDEPLOY' 继续): " confirm

if [ "$confirm" != "REDEPLOY" ]; then
    echo "重新部署已取消"
    exit 0
fi

# 创建重新部署脚本
cat > scripts/redeploy-all.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 重新部署所有合约使用新HCF Token V3...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 代币地址
    const HCF_TOKEN = "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC"; // 新的V3
    const BSDT_TOKEN = "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908";
    
    // 其他地址
    const multiSigWallet = "0x4509f773f2Cb6543837Eabbd27538139feE59496";
    const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    const pancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const priceOracle = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";
    
    const newContracts = {};
    
    try {
        // 1. 部署推荐合约
        console.log("📍 [1/8] 部署推荐合约...");
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
            multiSigWallet,      // multiSigWallet
            multiSigWallet,      // collectionAddress
            multiSigWallet       // bridgeAddress
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
        
        // 保存新合约地址
        const deployment = {
            network: "BSC_MAINNET",
            deployTime: new Date().toISOString(),
            hcfToken: HCF_TOKEN,
            bsdtToken: BSDT_TOKEN,
            contracts: newContracts,
            governance: "0x830377fde4169b1a260a962712bfa90C1BEb8FE6" // 保持不变
        };
        
        const filename = `NEW-DEPLOYMENT-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));
        
        // 生成新的环境变量
        const envContent = `
# ===================================
# 新部署的合约地址 (使用HCF V3)
# ${new Date().toISOString()}
# ===================================
HCF_TOKEN_V3=${HCF_TOKEN}
BSDT_TOKEN=${BSDT_TOKEN}
HCF_REFERRAL_V2=${referral.address}
HCF_STAKING_V2=${staking.address}
HCF_NODE_NFT_V2=${nodeNFT.address}
HCF_EXCHANGE_V2=${exchange.address}
HCF_BURN_V2=${burn.address}
HCF_RANKING_V2=${ranking.address}
HCF_ANTIDUMP_V2=${antiDump.address}
HCF_REDEMPTION_V2=${redemption.address}
HCF_GOVERNANCE=${deployment.governance}
`;
        
        fs.writeFileSync('NEW-CONTRACTS.env', envContent);
        
        console.log("\n" + "=".repeat(80));
        console.log("🎉 所有合约重新部署成功!");
        console.log("=".repeat(80));
        
        console.log("\n📋 新合约地址:");
        console.log("HCF Token V3:", HCF_TOKEN);
        console.log("BSDT Token:", BSDT_TOKEN);
        console.log("推荐合约:", referral.address);
        console.log("质押合约:", staking.address);
        console.log("节点NFT:", nodeNFT.address);
        console.log("兑换合约:", exchange.address);
        console.log("燃烧机制:", burn.address);
        console.log("排名奖励:", ranking.address);
        console.log("防暴跌:", antiDump.address);
        console.log("赎回惩罚:", redemption.address);
        console.log("治理合约:", deployment.governance);
        
        console.log("\n✅ 文件已生成:");
        console.log("- " + filename);
        console.log("- NEW-CONTRACTS.env");
        
        console.log("\n🎯 下一步:");
        console.log("1. 更新前端使用新合约地址");
        console.log("2. 在PancakeSwap创建HCF V3流动性");
        console.log("3. 配置合约参数");
        console.log("4. 测试所有功能");
        
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
EOF

# 执行重新部署
echo -e "${YELLOW}开始重新部署所有合约...${NC}"
npx hardhat run scripts/redeploy-all.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ 所有合约重新部署成功!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # 更新.env文件
    if [ -f "NEW-CONTRACTS.env" ]; then
        echo -e "${YELLOW}更新.env文件...${NC}"
        cat NEW-CONTRACTS.env >> .env
        echo -e "${GREEN}✅ 新合约地址已添加到.env${NC}"
    fi
    
    echo -e "${BLUE}🎯 完成! 所有合约现在使用新的HCF Token V3${NC}"
else
    echo -e "${RED}❌ 重新部署失败${NC}"
    exit 1
fi