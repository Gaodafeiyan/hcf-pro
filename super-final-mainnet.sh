#!/bin/bash

# 超级最终主网部署脚本 - 最后2个合约
# 完成HCF-PRO生态系统的最终部署

echo "========================================="
echo "HCF-PRO 超级最终主网部署脚本"
echo "完成最后2个合约，完整生态系统"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 已部署的5个合约地址
echo -e "${GREEN}✅ 已成功部署的5个合约:${NC}"
echo "1. HCF Token: 0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
echo "2. BSDT Token: 0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
echo "3. HCF推荐合约: 0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
echo "4. HCF质押合约: 0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
echo "5. HCF节点NFT: 0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
echo ""

echo -e "${YELLOW}🏁 最后需要部署的2个合约:${NC}"
echo "6. HCF-BSDT兑换合约 (需要6个参数)"
echo "7. HCF燃烧机制合约"
echo ""

# 预估剩余费用
echo -e "${YELLOW}📊 最后预估费用:${NC}"
echo "- 兑换合约: ~0.008 BNB"
echo "- 燃烧合约: ~0.006 BNB"
echo "- 总计: ~0.014 BNB (约$8)"

echo -e "${PURPLE}🎯 完成后将拥有完整的7合约生态系统!${NC}"

read -p "确认完成最后2个合约部署? (输入 'COMPLETE' 继续): " confirm

if [ "$confirm" != "COMPLETE" ]; then
    echo "超级最终部署已取消"
    exit 0
fi

# 创建超级最终部署脚本
echo -e "${YELLOW}创建超级最终部署脚本...${NC}"
cat > scripts/super-final-mainnet.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🏆 HCF-PRO主网生态系统超级最终部署...\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 已部署的5个合约地址
    const deployedAddresses = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        stakingFixed: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        nodeNFT: "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
    };
    
    console.log("✅ 使用已部署的5个合约:");
    console.log("- HCF Token:", deployedAddresses.hcfToken);
    console.log("- BSDT Token:", deployedAddresses.bsdtToken);
    console.log("- HCF推荐合约:", deployedAddresses.referral);
    console.log("- HCF质押合约:", deployedAddresses.stakingFixed);
    console.log("- HCF节点NFT:", deployedAddresses.nodeNFT);
    
    const finalContracts = {};
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
        finalContracts[contractName] = info;
        deploymentLog.push(`${contractName}: ${address}`);
        console.log(`✅ ${contractName} 部署完成: ${address}`);
    }
    
    try {
        // 6. 部署兑换合约 (6个参数)
        console.log("\n📍 [6/7] 部署HCF-BSDT兑换合约 (6个参数)...");
        const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
        const exchange = await HCFBSDTExchange.deploy(
            deployedAddresses.hcfToken,                          // HCF token
            deployedAddresses.bsdtToken,                         // BSDT token
            "0x55d398326f99059fF775485246999027B3197955",        // USDT主网地址
            "0x4509f773f2Cb6543837Eabbd27538139feE59496",        // MultiSig钱包
            "0x10ED43C718714eb63d5aA57B78B54704E256024E",        // PancakeSwap Router主网
            "0x4509f773f2Cb6543837Eabbd27538139feE59496"         // Bridge地址
        );
        await exchange.deployed();
        logDeployment("HCFBSDTExchange", exchange.address, "HCF-BSDT兑换系统");
        
        // 7. 部署燃烧机制合约
        console.log("\n📍 [7/7] 部署燃烧机制合约...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(deployedAddresses.hcfToken);
        await burnMechanism.deployed();
        logDeployment("HCFBurnMechanism", burnMechanism.address, "代币燃烧机制");
        
        // 保存完整生态系统部署信息
        const ecosystemDeployment = {
            network: "BSC_MAINNET",
            status: "ECOSYSTEM_COMPLETED",
            deployer: deployer.address,
            completionTime: new Date().toISOString(),
            totalContracts: 7,
            totalGasUsed: "~0.07 BNB",
            description: "HCF-PRO完整DeFi生态系统",
            completeEcosystem: {
                core: {
                    HCFToken: deployedAddresses.hcfToken,
                    BSDTTokenV2: deployedAddresses.bsdtToken
                },
                defi: {
                    HCFStakingFixed: deployedAddresses.stakingFixed,
                    HCFBSDTExchange: exchange.address,
                    HCFBurnMechanism: burnMechanism.address
                },
                governance: {
                    HCFReferral: deployedAddresses.referral,
                    HCFNodeNFT: deployedAddresses.nodeNFT
                }
            }
        };
        
        const filename = `HCF-PRO-ECOSYSTEM-COMPLETE-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(ecosystemDeployment, null, 2));
        
        // 生成完整的主网环境变量
        const mainnetEnv = [
            `# ==============================================`,
            `# HCF-PRO BSC主网完整生态系统合约地址`,
            `# 部署完成时间: ${new Date().toISOString()}`,
            `# 部署者: ${deployer.address}`,
            `# ==============================================`,
            ``,
            `# 核心代币合约`,
            `HCF_TOKEN_MAINNET=${deployedAddresses.hcfToken}`,
            `BSDT_TOKEN_MAINNET=${deployedAddresses.bsdtToken}`,
            ``,
            `# DeFi协议合约`,
            `HCF_STAKING_MAINNET_ADDRESS=${deployedAddresses.stakingFixed}`,
            `HCF_EXCHANGE_MAINNET=${exchange.address}`,
            `HCF_BURN_MECHANISM_MAINNET=${burnMechanism.address}`,
            ``,
            `# 治理和奖励合约`,
            `HCF_REFERRAL_MAINNET=${deployedAddresses.referral}`,
            `HCF_NODE_NFT_MAINNET=${deployedAddresses.nodeNFT}`,
            ``,
            `# BSCScan验证链接`,
            `# HCF Token: https://bscscan.com/address/${deployedAddresses.hcfToken}`,
            `# BSDT Token: https://bscscan.com/address/${deployedAddresses.bsdtToken}`,
            `# HCF推荐: https://bscscan.com/address/${deployedAddresses.referral}`,
            `# HCF质押: https://bscscan.com/address/${deployedAddresses.stakingFixed}`,
            `# HCF节点NFT: https://bscscan.com/address/${deployedAddresses.nodeNFT}`,
            `# HCF兑换: https://bscscan.com/address/${exchange.address}`,
            `# HCF燃烧: https://bscscan.com/address/${burnMechanism.address}`
        ];
        
        fs.writeFileSync('HCF-PRO-MAINNET-COMPLETE.env', mainnetEnv.join('\n'));
        
        // 输出史诗级完成信息
        console.log("\n" + "=".repeat(100));
        console.log("🎉🎉🎉🎉🎉 HCF-PRO BSC主网完整生态系统部署成功! 🎉🎉🎉🎉🎉");
        console.log("=".repeat(100));
        
        console.log("🏆 完整的7合约DeFi生态系统:");
        console.log("");
        console.log("📊 核心代币层:");
        console.log(`   1. HCF主代币: ${deployedAddresses.hcfToken}`);
        console.log(`      https://bscscan.com/address/${deployedAddresses.hcfToken}`);
        console.log(`   2. BSDT稳定币: ${deployedAddresses.bsdtToken}`);
        console.log(`      https://bscscan.com/address/${deployedAddresses.bsdtToken}`);
        
        console.log("");
        console.log("🚀 DeFi协议层:");
        console.log(`   3. 质押挖矿: ${deployedAddresses.stakingFixed}`);
        console.log(`      https://bscscan.com/address/${deployedAddresses.stakingFixed}`);
        console.log(`   4. 代币兑换: ${exchange.address}`);
        console.log(`      https://bscscan.com/address/${exchange.address}`);
        console.log(`   5. 燃烧机制: ${burnMechanism.address}`);
        console.log(`      https://bscscan.com/address/${burnMechanism.address}`);
        
        console.log("");
        console.log("🎯 治理奖励层:");
        console.log(`   6. 推荐系统: ${deployedAddresses.referral}`);
        console.log(`      https://bscscan.com/address/${deployedAddresses.referral}`);
        console.log(`   7. 节点NFT: ${deployedAddresses.nodeNFT}`);
        console.log(`      https://bscscan.com/address/${deployedAddresses.nodeNFT}`);
        
        console.log("");
        console.log("💎 生态系统特性:");
        console.log("   ✅ 5层质押收益系统 (V1-V5)");
        console.log("   ✅ LP质押双倍奖励");
        console.log("   ✅ 复投机制（修复版）");
        console.log("   ✅ 推荐奖励系统");
        console.log("   ✅ NFT节点治理");
        console.log("   ✅ HCF-BSDT去中心化兑换");
        console.log("   ✅ 代币燃烧通缩机制");
        
        console.log("");
        console.log("💰 部署成本统计:");
        console.log("   总Gas费: ~0.07 BNB (约$42)");
        console.log("   合约数量: 7个核心合约");
        console.log("   部署时间: " + new Date().toISOString());
        
        console.log("");
        console.log("📁 生成文件:");
        console.log(`   - ${filename} (完整生态部署信息)`);
        console.log("   - HCF-PRO-MAINNET-COMPLETE.env (主网环境变量)");
        
        console.log("");
        console.log("🎯 下一步操作:");
        console.log("   1. 更新前端配置使用主网地址");
        console.log("   2. 在BSCScan上验证所有合约");
        console.log("   3. 设置合约管理权限");
        console.log("   4. 配置代币经济参数");
        console.log("   5. 公告主网正式上线");
        console.log("");
        console.log("🌟 HCF-PRO主网生态系统已完全就绪!");
        console.log("=".repeat(100));
        
        return ecosystemDeployment;
        
    } catch (error) {
        console.error("\n❌ 超级最终部署过程中发生错误:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("超级最终部署失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 超级最终部署脚本创建成功${NC}"

# 执行超级最终部署
echo -e "${PURPLE}🚀 开始超级最终部署...${NC}"
npx hardhat run scripts/super-final-mainnet.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🏆 HCF-PRO完整生态系统部署成功!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # 自动更新.env文件
    if [ -f "HCF-PRO-MAINNET-COMPLETE.env" ]; then
        echo -e "${YELLOW}自动更新.env文件...${NC}"
        echo "" >> .env
        cat HCF-PRO-MAINNET-COMPLETE.env >> .env
        echo -e "${GREEN}✅ 完整主网生态地址已添加到.env文件${NC}"
    fi
    
    echo -e "${PURPLE}🎉🎉🎉 恭喜!7合约完整DeFi生态系统已部署! 🎉🎉🎉${NC}"
    echo -e "${GREEN}HCF-PRO主网正式上线!${NC}"
    
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 超级最终部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi