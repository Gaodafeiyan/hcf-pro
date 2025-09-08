#!/bin/bash

echo "========================================="
echo "HCF 治理合约部署 - 参数管理中心"
echo "========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📋 治理合约功能:${NC}"
echo "✅ 随时调整日化收益率"
echo "✅ 修改税率和分配比例"
echo "✅ 设置领取手续费"
echo "✅ 调整推荐奖励"
echo "✅ 控制限购参数"
echo "✅ 管理节点配置"
echo "✅ 调整防护机制"
echo ""

echo -e "${GREEN}优势:${NC}"
echo "1. 不需要重新部署主合约"
echo "2. 所有参数统一管理"
echo "3. 方便项目方随时调整"
echo "4. 支持紧急暂停功能"
echo ""

read -p "确认部署治理合约? (输入 'DEPLOY' 继续): " confirm

if [ "$confirm" != "DEPLOY" ]; then
    echo "部署已取消"
    exit 0
fi

# 创建部署脚本
cat > scripts/deploy-governance.js << 'EOF'
const hre = require("hardhat");

async function main() {
    console.log("🚀 部署HCF治理合约...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    // 部署治理合约
    console.log("📍 部署治理合约...");
    const HCFGovernance = await ethers.getContractFactory("HCFGovernance");
    const governance = await HCFGovernance.deploy();
    await governance.deployed();
    
    console.log("✅ 治理合约部署成功:", governance.address);
    console.log("BSCScan: https://bscscan.com/address/" + governance.address);
    
    // 设置已部署的合约地址
    console.log("\n📍 设置合约地址...");
    await governance.updateContracts(
        "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf", // HCF Token
        "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908", // BSDT Token
        "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252", // Staking
        "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0", // Referral
        "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"  // Node NFT
    );
    console.log("✅ 合约地址已设置");
    
    // 保存地址
    const fs = require('fs');
    fs.appendFileSync('.env', `\n# 治理合约\nHCF_GOVERNANCE=${governance.address}\n`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 治理合约部署成功!");
    console.log("=".repeat(60));
    console.log("\n📊 可调整的参数:");
    console.log("- 质押日化收益率 (0.6%, 0.7%, 0.8%)");
    console.log("- 税率 (买2%, 卖5%, 转账1%)");
    console.log("- 领取手续费 (5% BNB)");
    console.log("- 推荐奖励 (20层)");
    console.log("- 日收益封顶 (10%)");
    console.log("- 限购参数 (7天, 1000枚/天)");
    console.log("- 节点参数 (99个, 5000 BSDT)");
    console.log("\n使用示例:");
    console.log("// 调整日化收益率");
    console.log("governance.setDailyRates(65, 75, 85) // 0.65%, 0.75%, 0.85%");
    console.log("\n// 调整税率");
    console.log("governance.setTaxRates(150, 400, 100) // 1.5%, 4%, 1%");
}

main().catch(console.error);
EOF

# 编译合约
echo -e "${YELLOW}编译合约...${NC}"
npx hardhat compile

# 部署治理合约
echo -e "${YELLOW}部署治理合约...${NC}"
npx hardhat run scripts/deploy-governance.js --network bsc

echo -e "${GREEN}✅ 治理合约部署完成!${NC}"
echo "现在您可以通过治理合约随时调整所有参数"