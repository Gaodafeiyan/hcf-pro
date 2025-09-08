#!/bin/bash

# 继续主网部署脚本 - 使用已部署的合约地址
# 避免重复部署，节省Gas费

echo "========================================="
echo "HCF-PRO 继续主网部署脚本"
echo "使用已部署的合约地址，继续部署剩余合约"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 已部署的合约地址
echo -e "${GREEN}✅ 已部署的合约:${NC}"
echo "HCF Token: 0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
echo "BSDT Token: 0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
echo ""

echo -e "${YELLOW}🔄 需要继续部署的合约:${NC}"
echo "3. HCF推荐合约"
echo "4. HCF质押合约(固定版)"
echo "5. HCF节点NFT合约"
echo "6. HCF-BSDT兑换合约"
echo "7. HCF燃烧机制合约"
echo ""

# 预估剩余费用
echo -e "${YELLOW}📊 剩余预估费用:${NC}"
echo "- 推荐合约: ~0.008 BNB"
echo "- 质押合约: ~0.01 BNB"
echo "- 节点NFT: ~0.008 BNB"
echo "- 兑换合约: ~0.008 BNB"
echo "- 燃烧合约: ~0.006 BNB"
echo "- 总计: ~0.04 BNB (约$24)"

read -p "确认继续部署剩余合约? (输入 'CONTINUE' 继续): " confirm

if [ "$confirm" != "CONTINUE" ]; then
    echo "继续部署已取消"
    exit 0
fi

# 检查环境
echo -e "${YELLOW}检查环境...${NC}"
if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 未找到 npx${NC}"
    exit 1
fi

# 创建继续部署脚本
echo -e "${YELLOW}创建继续部署脚本...${NC}"
cat > scripts/continue-mainnet.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔄 继续 HCF-PRO 主网部署...\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 已部署的合约地址
    const deployedAddresses = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
    };
    
    console.log("✅ 使用已部署的合约:");
    console.log("- HCF Token:", deployedAddresses.hcfToken);
    console.log("- BSDT Token:", deployedAddresses.bsdtToken);
    
    const newContracts = {};
    const deploymentLog = [];
    
    function logDeployment(contractName, address, description) {
        const info = {
            name: contractName,
            address: address,
            description: description,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            bscscan: `https://bscscan.com/address/${address}`
        };
        newContracts[contractName] = info;
        deploymentLog.push(`${contractName}: ${address}`);
        console.log(`✅ ${contractName} 部署完成: ${address}`);
    }
    
    try {
        // 3. 部署推荐合约
        console.log("\n📍 [3/5] 部署推荐合约...");
        const HCFReferral = await ethers.getContractFactory("HCFReferral");
        const referral = await HCFReferral.deploy(
            deployedAddresses.hcfToken, // HCF token地址
            "0x4509f773f2Cb6543837Eabbd27538139feE59496"  // 多签钱包
        );
        await referral.deployed();
        logDeployment("HCFReferral", referral.address, "推荐奖励系统");
        
        // 4. 部署质押合约(固定版)
        console.log("\n📍 [4/5] 部署质押合约(固定版)...");
        const HCFStakingFixed = await ethers.getContractFactory("HCFStakingFixed");
        const stakingFixed = await HCFStakingFixed.deploy(
            deployedAddresses.hcfToken,      // HCF token
            deployedAddresses.bsdtToken,     // BSDT token  
            "0x4509f773f2Cb6543837Eabbd27538139feE59496",      // multisig
            "0x4509f773f2Cb6543837Eabbd27538139feE59496",      // collection
            "0x4509f773f2Cb6543837Eabbd27538139feE59496"       // bridge
        );
        await stakingFixed.deployed();
        logDeployment("HCFStakingFixed", stakingFixed.address, "质押合约固定版");
        
        // 5. 部署节点NFT合约
        console.log("\n📍 [5/5] 部署节点NFT合约...");
        const HCFNodeNFT = await ethers.getContractFactory("HCFNodeNFT");
        const nodeNFT = await HCFNodeNFT.deploy(deployedAddresses.hcfToken);
        await nodeNFT.deployed();
        logDeployment("HCFNodeNFT", nodeNFT.address, "节点NFT系统");
        
        // 6. 部署兑换合约
        console.log("\n📍 [6/5] 部署HCF-BSDT兑换合约...");
        const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
        const exchange = await HCFBSDTExchange.deploy(
            deployedAddresses.hcfToken,
            deployedAddresses.bsdtToken
        );
        await exchange.deployed();
        logDeployment("HCFBSDTExchange", exchange.address, "HCF-BSDT兑换");
        
        // 7. 部署燃烧机制合约
        console.log("\n📍 [7/5] 部署燃烧机制合约...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(deployedAddresses.hcfToken);
        await burnMechanism.deployed();
        logDeployment("HCFBurnMechanism", burnMechanism.address, "代币燃烧机制");
        
        // 保存完整部署信息
        const completeDeployment = {
            network: "BSC_MAINNET",
            status: "COMPLETED",
            deployer: deployer.address,
            deployTime: new Date().toISOString(),
            previouslyDeployed: deployedAddresses,
            newlyDeployed: newContracts,
            allContracts: {
                HCFToken: deployedAddresses.hcfToken,
                BSDTTokenV2: deployedAddresses.bsdtToken,
                ...Object.fromEntries(Object.entries(newContracts).map(([key, value]) => [key, value.address]))
            }
        };
        
        const filename = `mainnet-deployment-complete-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(completeDeployment, null, 2));
        
        // 生成环境变量更新
        const envUpdates = [
            `HCF_TOKEN_MAINNET=${deployedAddresses.hcfToken}`,
            `BSDT_TOKEN_MAINNET=${deployedAddresses.bsdtToken}`,
            `HCF_REFERRAL_MAINNET=${referral.address}`,
            `HCF_STAKING_MAINNET_ADDRESS=${stakingFixed.address}`,
            `HCF_NODE_NFT_MAINNET=${nodeNFT.address}`,
            `HCF_EXCHANGE_MAINNET=${exchange.address}`,
            `HCF_BURN_MECHANISM_MAINNET=${burnMechanism.address}`
        ];
        
        fs.writeFileSync('mainnet-addresses.env', envUpdates.join('\n'));
        
        // 输出最终结果
        console.log("\n" + "=".repeat(60));
        console.log("🎉 BSC主网部署完全成功!");
        console.log("=".repeat(60));
        console.log("📋 所有合约地址:");
        console.log("- HCF Token:", deployedAddresses.hcfToken);
        console.log("- BSDT Token:", deployedAddresses.bsdtToken);
        deploymentLog.forEach(log => console.log(`- ${log}`));
        
        console.log("\n💾 文件生成:");
        console.log(`- ${filename} (完整部署信息)`);
        console.log("- mainnet-addresses.env (环境变量更新)");
        
        console.log("\n📋 下一步操作:");
        console.log("1. 更新.env文件中的合约地址");
        console.log("2. 更新前端配置");
        console.log("3. 验证所有合约");
        console.log("4. 设置合约权限");
        console.log("5. 公告新的主网地址");
        console.log("=".repeat(60));
        
        return completeDeployment;
        
    } catch (error) {
        console.error("\n❌ 部署过程中发生错误:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 继续部署脚本创建成功${NC}"

# 执行继续部署
echo -e "${YELLOW}开始继续部署...${NC}"
npx hardhat run scripts/continue-mainnet.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 继续部署成功完成!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # 自动更新.env文件
    if [ -f "mainnet-addresses.env" ]; then
        echo -e "${YELLOW}自动更新.env文件...${NC}"
        cat mainnet-addresses.env >> .env
        echo -e "${GREEN}✅ 主网地址已添加到.env文件${NC}"
    fi
    
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 继续部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi