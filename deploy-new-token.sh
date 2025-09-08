#!/bin/bash

echo "========================================="
echo "HCF Token V3 部署 - 10亿总量版本"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️ 重要提醒:${NC}"
echo "这将部署新的HCF代币合约，总量10亿"
echo "部署后需要："
echo "1. 更新所有11个合约的HCF地址"
echo "2. 重新添加流动性"
echo "3. 通知所有用户迁移"
echo ""

echo -e "${YELLOW}📊 新代币特性:${NC}"
echo "✅ 总量10亿（正确的数量）"
echo "✅ 首发1000万（流通）"
echo "✅ 挖矿储备9.9亿"
echo "✅ 最小余额0.0001 HCF"
echo "✅ 前7天限购机制"
echo "✅ 税费2%/5%/1%"
echo ""

read -p "确认部署新的HCF Token V3? (输入 'DEPLOY_V3' 继续): " confirm

if [ "$confirm" != "DEPLOY_V3" ]; then
    echo "部署已取消"
    exit 0
fi

# 创建部署脚本
cat > scripts/deploy-new-token.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 部署HCF Token V3 (10亿总量)...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        console.error("❌ BNB余额不足，需要至少0.01 BNB");
        return;
    }
    
    // 已知的地址
    const marketingWallet = "0x4509f773f2Cb6543837Eabbd27538139feE59496";
    const nodePool = "0x4509f773f2Cb6543837Eabbd27538139feE59496";
    const lpPool = "0x4509f773f2Cb6543837Eabbd27538139feE59496";
    
    try {
        console.log("📍 部署HCF Token V3...");
        const HCFTokenV3 = await ethers.getContractFactory("HCFTokenV3");
        const hcfTokenV3 = await HCFTokenV3.deploy(
            marketingWallet,
            nodePool,
            lpPool
        );
        await hcfTokenV3.deployed();
        
        console.log("✅ HCF Token V3部署成功!");
        console.log("   地址:", hcfTokenV3.address);
        console.log("   BSCScan: https://bscscan.com/address/" + hcfTokenV3.address);
        
        // 验证部署
        console.log("\n📊 验证代币信息:");
        const name = await hcfTokenV3.name();
        const symbol = await hcfTokenV3.symbol();
        const totalSupply = await hcfTokenV3.totalSupply();
        const deployerBalance = await hcfTokenV3.balanceOf(deployer.address);
        
        console.log("   名称:", name);
        console.log("   符号:", symbol);
        console.log("   总供应量:", ethers.utils.formatEther(totalSupply), "HCF");
        console.log("   部署者余额:", ethers.utils.formatEther(deployerBalance), "HCF");
        
        // 检查是否正确
        if (totalSupply.eq(ethers.utils.parseEther("1000000000"))) {
            console.log("   ✅ 总量正确: 10亿 HCF");
        } else {
            console.log("   ❌ 总量错误!");
        }
        
        // 保存新地址
        const deployment = {
            network: "BSC_MAINNET",
            contractName: "HCFTokenV3",
            address: hcfTokenV3.address,
            deployTime: new Date().toISOString(),
            deployer: deployer.address,
            totalSupply: "1,000,000,000 HCF",
            oldTokenAddress: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
        };
        
        fs.writeFileSync(
            `HCF-TOKEN-V3-${Date.now()}.json`,
            JSON.stringify(deployment, null, 2)
        );
        
        // 更新.env
        fs.appendFileSync('.env', `\n# 新HCF Token V3\nHCF_TOKEN_V3=${hcfTokenV3.address}\n`);
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 HCF Token V3部署成功!");
        console.log("=".repeat(60));
        
        console.log("\n⚠️ 下一步操作:");
        console.log("1. 更新所有合约中的HCF地址");
        console.log("   - 质押合约");
        console.log("   - 推荐合约");
        console.log("   - 节点NFT");
        console.log("   - 兑换合约");
        console.log("   - 其他所有合约");
        console.log("\n2. 在PancakeSwap创建新的流动性池");
        console.log("\n3. 通知用户迁移到新代币");
        console.log("\n4. 更新前端配置");
        
        console.log("\n📝 新代币地址:", hcfTokenV3.address);
        console.log("请保存此地址!");
        
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

# 编译合约
echo -e "${YELLOW}编译合约...${NC}"
npx hardhat compile

# 部署新代币
echo -e "${YELLOW}部署HCF Token V3...${NC}"
npx hardhat run scripts/deploy-new-token.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ HCF Token V3部署成功!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}⚠️ 重要: 请记录新的代币地址${NC}"
    echo -e "${YELLOW}然后运行 update-all-contracts.sh 更新所有合约${NC}"
else
    echo -e "${RED}❌ 部署失败${NC}"
    exit 1
fi