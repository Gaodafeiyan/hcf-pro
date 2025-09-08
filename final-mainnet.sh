#!/bin/bash

# 最终主网部署脚本 - 完成最后3个合约
# 使用所有已部署的合约地址

echo "========================================="
echo "HCF-PRO 最终主网部署脚本"
echo "完成最后3个合约的部署"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 已部署的合约地址
echo -e "${GREEN}✅ 已部署的4个合约:${NC}"
echo "1. HCF Token: 0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
echo "2. BSDT Token: 0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
echo "3. HCF推荐合约: 0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
echo "4. HCF质押合约: 0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
echo ""

echo -e "${YELLOW}🔄 最后需要部署的3个合约:${NC}"
echo "5. HCF节点NFT合约 (需要5个参数)"
echo "6. HCF-BSDT兑换合约"
echo "7. HCF燃烧机制合约"
echo ""

# 预估剩余费用
echo -e "${YELLOW}📊 最后预估费用:${NC}"
echo "- 节点NFT: ~0.008 BNB"
echo "- 兑换合约: ~0.008 BNB"
echo "- 燃烧合约: ~0.006 BNB"
echo "- 总计: ~0.022 BNB (约$13)"

read -p "确认完成最后3个合约部署? (输入 'FINAL' 继续): " confirm

if [ "$confirm" != "FINAL" ]; then
    echo "最终部署已取消"
    exit 0
fi

# 创建最终部署脚本
echo -e "${YELLOW}创建最终部署脚本...${NC}"
cat > scripts/final-mainnet.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🏁 完成 HCF-PRO 主网最终部署...\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 已部署的合约地址
    const deployedAddresses = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        stakingFixed: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
    };
    
    console.log("✅ 使用已部署的4个合约:");
    console.log("- HCF Token:", deployedAddresses.hcfToken);
    console.log("- BSDT Token:", deployedAddresses.bsdtToken);
    console.log("- HCF推荐合约:", deployedAddresses.referral);
    console.log("- HCF质押合约:", deployedAddresses.stakingFixed);
    
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
        // 5. 部署节点NFT合约 (5个参数)
        console.log("\n📍 [5/7] 部署节点NFT合约...");
        const HCFNodeNFT = await ethers.getContractFactory("HCFNodeNFT");
        const nodeNFT = await HCFNodeNFT.deploy(
            deployedAddresses.hcfToken,      // HCF token
            deployedAddresses.bsdtToken,     // BSDT token
            "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", // Price Oracle
            "0x4509f773f2Cb6543837Eabbd27538139feE59496", // MultiSig钱包
            "0x4509f773f2Cb6543837Eabbd27538139feE59496"  // LP收集地址
        );
        await nodeNFT.deployed();
        logDeployment("HCFNodeNFT", nodeNFT.address, "节点NFT系统");
        
        // 6. 部署兑换合约
        console.log("\n📍 [6/7] 部署HCF-BSDT兑换合约...");
        const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
        const exchange = await HCFBSDTExchange.deploy(
            deployedAddresses.hcfToken,
            deployedAddresses.bsdtToken
        );
        await exchange.deployed();
        logDeployment("HCFBSDTExchange", exchange.address, "HCF-BSDT兑换");
        
        // 7. 部署燃烧机制合约
        console.log("\n📍 [7/7] 部署燃烧机制合约...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(deployedAddresses.hcfToken);
        await burnMechanism.deployed();
        logDeployment("HCFBurnMechanism", burnMechanism.address, "代币燃烧机制");
        
        // 保存完整部署信息
        const completeDeployment = {
            network: "BSC_MAINNET",
            status: "FULLY_COMPLETED",
            deployer: deployer.address,
            deployTime: new Date().toISOString(),
            totalGasUsed: "~0.06 BNB",
            allContracts: {
                HCFToken: deployedAddresses.hcfToken,
                BSDTTokenV2: deployedAddresses.bsdtToken,
                HCFReferral: deployedAddresses.referral,
                HCFStakingFixed: deployedAddresses.stakingFixed,
                HCFNodeNFT: nodeNFT.address,
                HCFBSDTExchange: exchange.address,
                HCFBurnMechanism: burnMechanism.address
            }
        };
        
        const filename = `mainnet-deployment-FINAL-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(completeDeployment, null, 2));
        
        // 生成完整的环境变量
        const envUpdates = [
            `# BSC主网合约地址 - 完整部署完成`,
            `HCF_TOKEN_MAINNET=${deployedAddresses.hcfToken}`,
            `BSDT_TOKEN_MAINNET=${deployedAddresses.bsdtToken}`,
            `HCF_REFERRAL_MAINNET=${deployedAddresses.referral}`,
            `HCF_STAKING_MAINNET_ADDRESS=${deployedAddresses.stakingFixed}`,
            `HCF_NODE_NFT_MAINNET=${nodeNFT.address}`,
            `HCF_EXCHANGE_MAINNET=${exchange.address}`,
            `HCF_BURN_MECHANISM_MAINNET=${burnMechanism.address}`
        ];
        
        fs.writeFileSync('mainnet-addresses-FINAL.env', envUpdates.join('\n'));
        
        // 输出最终结果
        console.log("\n" + "=".repeat(80));
        console.log("🎉🎉🎉 BSC主网完整生态部署成功! 🎉🎉🎉");
        console.log("=".repeat(80));
        console.log("📋 完整的主网合约地址:");
        console.log("1. HCF代币:", deployedAddresses.hcfToken);
        console.log("   https://bscscan.com/address/" + deployedAddresses.hcfToken);
        console.log("2. BSDT代币:", deployedAddresses.bsdtToken);
        console.log("   https://bscscan.com/address/" + deployedAddresses.bsdtToken);
        console.log("3. HCF推荐合约:", deployedAddresses.referral);
        console.log("   https://bscscan.com/address/" + deployedAddresses.referral);
        console.log("4. HCF质押合约:", deployedAddresses.stakingFixed);
        console.log("   https://bscscan.com/address/" + deployedAddresses.stakingFixed);
        console.log("5. HCF节点NFT:", nodeNFT.address);
        console.log("   https://bscscan.com/address/" + nodeNFT.address);
        console.log("6. HCF-BSDT兑换:", exchange.address);
        console.log("   https://bscscan.com/address/" + exchange.address);
        console.log("7. HCF燃烧机制:", burnMechanism.address);
        console.log("   https://bscscan.com/address/" + burnMechanism.address);
        
        console.log("\n💾 生成文件:");
        console.log(`- ${filename} (完整部署信息)`);
        console.log("- mainnet-addresses-FINAL.env (环境变量)");
        
        console.log("\n🎯 HCF-PRO生态系统已完全部署到BSC主网!");
        console.log("总计花费: ~0.06 BNB");
        console.log("7个核心合约全部部署成功!");
        console.log("=".repeat(80));
        
        return completeDeployment;
        
    } catch (error) {
        console.error("\n❌ 最终部署过程中发生错误:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("最终部署失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 最终部署脚本创建成功${NC}"

# 执行最终部署
echo -e "${YELLOW}开始最终部署...${NC}"
npx hardhat run scripts/final-mainnet.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 HCF-PRO生态系统完全部署成功!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # 自动更新.env文件
    if [ -f "mainnet-addresses-FINAL.env" ]; then
        echo -e "${YELLOW}自动更新.env文件...${NC}"
        echo "" >> .env
        cat mainnet-addresses-FINAL.env >> .env
        echo -e "${GREEN}✅ 完整主网地址已添加到.env文件${NC}"
    fi
    
    echo -e "${GREEN}🎯 所有7个合约部署完成!${NC}"
    echo -e "${GREEN}HCF-PRO主网生态系统已准备就绪!${NC}"
    
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 最终部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi