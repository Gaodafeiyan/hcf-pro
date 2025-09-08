#!/bin/bash

# 终极最终主网部署脚本 - 最后1个合约！
# 完成HCF-PRO完整DeFi生态系统

echo "========================================="
echo "HCF-PRO 终极最终主网部署脚本"
echo "完成最后1个合约 - HCF燃烧机制"
echo "完整7合约DeFi生态系统即将诞生！"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 已部署的6个合约地址
echo -e "${GREEN}✅ 已成功部署的6个合约:${NC}"
echo "1. HCF Token: 0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
echo "2. BSDT Token: 0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
echo "3. HCF推荐合约: 0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
echo "4. HCF质押合约: 0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
echo "5. HCF节点NFT: 0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
echo "6. HCF-BSDT兑换: 0x7c8454816F7a187E01F7B88f3D78c894B7e00e0B"
echo ""

echo -e "${CYAN}🏆 最后1个合约:${NC}"
echo "7. HCF燃烧机制合约 (需要2个参数)"
echo ""

# 预估剩余费用
echo -e "${YELLOW}📊 最后预估费用:${NC}"
echo "- 燃烧合约: ~0.006 BNB (约$3.6)"
echo ""

echo -e "${PURPLE}🎯 完成后将拥有史诗级7合约DeFi生态系统!${NC}"
echo -e "${CYAN}🌟 HCF-PRO将正式在BSC主网上线!${NC}"

read -p "确认部署最后1个合约完成生态系统? (输入 'ULTIMATE' 继续): " confirm

if [ "$confirm" != "ULTIMATE" ]; then
    echo "终极部署已取消"
    exit 0
fi

# 创建终极部署脚本
echo -e "${YELLOW}创建终极部署脚本...${NC}"
cat > scripts/ultimate-final-mainnet.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀🚀🚀 HCF-PRO主网DeFi生态系统终极完成部署! 🚀🚀🚀\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 已部署的6个合约地址
    const deployedAddresses = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        stakingFixed: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        nodeNFT: "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523",
        exchange: "0x7c8454816F7a187E01F7B88f3D78c894B7e00e0B"
    };
    
    console.log("✅ 使用已部署的6个合约:");
    console.log("- HCF Token:", deployedAddresses.hcfToken);
    console.log("- BSDT Token:", deployedAddresses.bsdtToken);
    console.log("- HCF推荐合约:", deployedAddresses.referral);
    console.log("- HCF质押合约:", deployedAddresses.stakingFixed);
    console.log("- HCF节点NFT:", deployedAddresses.nodeNFT);
    console.log("- HCF-BSDT兑换:", deployedAddresses.exchange);
    
    try {
        // 7. 部署燃烧机制合约 (2个参数) - 最后一个！
        console.log("\n🔥🔥🔥 [7/7] 部署最后的燃烧机制合约 (2个参数)... 🔥🔥🔥");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(
            deployedAddresses.hcfToken,                      // HCF token
            "0x4509f773f2Cb6543837Eabbd27538139feE59496"     // MultiSig钱包
        );
        await burnMechanism.deployed();
        
        console.log(`🎉 HCFBurnMechanism 部署完成: ${burnMechanism.address}`);
        
        // 史诗级完成部署信息
        const epicEcosystemDeployment = {
            network: "BSC_MAINNET",
            status: "🏆 EPIC_ECOSYSTEM_FULLY_COMPLETED 🏆",
            deployer: deployer.address,
            epicCompletionTime: new Date().toISOString(),
            totalContracts: 7,
            totalGasUsed: "~0.07 BNB",
            description: "HCF-PRO完整DeFi生态系统 - 主网正式上线!",
            
            completeEcosystem: {
                "🪙 核心代币层": {
                    HCFToken: {
                        address: deployedAddresses.hcfToken,
                        description: "HCF主治理代币",
                        bscscan: `https://bscscan.com/address/${deployedAddresses.hcfToken}`
                    },
                    BSDTTokenV2: {
                        address: deployedAddresses.bsdtToken,
                        description: "BSDT算法稳定币V2",
                        bscscan: `https://bscscan.com/address/${deployedAddresses.bsdtToken}`
                    }
                },
                
                "🚀 DeFi协议层": {
                    HCFStakingFixed: {
                        address: deployedAddresses.stakingFixed,
                        description: "5层质押挖矿系统(修复版)",
                        bscscan: `https://bscscan.com/address/${deployedAddresses.stakingFixed}`
                    },
                    HCFBSDTExchange: {
                        address: deployedAddresses.exchange,
                        description: "HCF-BSDT去中心化兑换",
                        bscscan: `https://bscscan.com/address/${deployedAddresses.exchange}`
                    },
                    HCFBurnMechanism: {
                        address: burnMechanism.address,
                        description: "代币燃烧通缩机制",
                        bscscan: `https://bscscan.com/address/${burnMechanism.address}`
                    }
                },
                
                "🎯 治理奖励层": {
                    HCFReferral: {
                        address: deployedAddresses.referral,
                        description: "多级推荐奖励系统",
                        bscscan: `https://bscscan.com/address/${deployedAddresses.referral}`
                    },
                    HCFNodeNFT: {
                        address: deployedAddresses.nodeNFT,
                        description: "节点NFT治理系统",
                        bscscan: `https://bscscan.com/address/${deployedAddresses.nodeNFT}`
                    }
                }
            }
        };
        
        const filename = `HCF-PRO-ECOSYSTEM-EPIC-COMPLETE-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(epicEcosystemDeployment, null, 2));
        
        // 生成史诗级主网环境变量文件
        const epicMainnetEnv = [
            `# ================================================================`,
            `# 🏆 HCF-PRO BSC主网完整DeFi生态系统 - EPIC COMPLETION! 🏆`,
            `# ================================================================`,
            `# 部署完成时间: ${new Date().toISOString()}`,
            `# 部署者钱包: ${deployer.address}`,
            `# 网络: BSC Mainnet (ChainID: 56)`,
            `# 总Gas费: ~0.07 BNB`,
            `# 合约总数: 7个核心合约`,
            `# ================================================================`,
            ``,
            `# 🪙 核心代币层合约`,
            `HCF_TOKEN_MAINNET=${deployedAddresses.hcfToken}`,
            `BSDT_TOKEN_MAINNET=${deployedAddresses.bsdtToken}`,
            ``,
            `# 🚀 DeFi协议层合约`,
            `HCF_STAKING_MAINNET_ADDRESS=${deployedAddresses.stakingFixed}`,
            `HCF_EXCHANGE_MAINNET=${deployedAddresses.exchange}`,
            `HCF_BURN_MECHANISM_MAINNET=${burnMechanism.address}`,
            ``,
            `# 🎯 治理奖励层合约`,
            `HCF_REFERRAL_MAINNET=${deployedAddresses.referral}`,
            `HCF_NODE_NFT_MAINNET=${deployedAddresses.nodeNFT}`,
            ``,
            `# 📊 BSCScan验证链接`,
            `# HCF Token: https://bscscan.com/address/${deployedAddresses.hcfToken}`,
            `# BSDT Token: https://bscscan.com/address/${deployedAddresses.bsdtToken}`,
            `# HCF推荐系统: https://bscscan.com/address/${deployedAddresses.referral}`,
            `# HCF质押挖矿: https://bscscan.com/address/${deployedAddresses.stakingFixed}`,
            `# HCF节点NFT: https://bscscan.com/address/${deployedAddresses.nodeNFT}`,
            `# HCF代币兑换: https://bscscan.com/address/${deployedAddresses.exchange}`,
            `# HCF燃烧机制: https://bscscan.com/address/${burnMechanism.address}`,
            ``,
            `# 🎯 HCF-PRO主网正式上线! Welcome to the DeFi Future!`
        ];
        
        fs.writeFileSync('HCF-PRO-MAINNET-EPIC-COMPLETE.env', epicMainnetEnv.join('\n'));
        
        // 🎉🎉🎉 史诗级完成庆祝输出 🎉🎉🎉
        console.log("\n" + "🎉".repeat(50));
        console.log("🏆".repeat(50));
        console.log("🎉🎉🎉🎉🎉 HCF-PRO BSC主网完整DeFi生态系统部署成功! 🎉🎉🎉🎉🎉");
        console.log("🌟🌟🌟🌟🌟 EPIC 7-CONTRACT DEFI ECOSYSTEM COMPLETED! 🌟🌟🌟🌟🌟");
        console.log("🚀🚀🚀🚀🚀 HCF-PRO主网正式上线 - Welcome to the Future! 🚀🚀🚀🚀🚀");
        console.log("🏆".repeat(50));
        console.log("🎉".repeat(50));
        
        console.log("\n🎯 完整的7合约DeFi生态系统架构:");
        console.log("┌─────────────────────────────────────────────────────────────────────┐");
        console.log("│                    🏆 HCF-PRO DeFi生态系统 🏆                        │");
        console.log("├─────────────────────────────────────────────────────────────────────┤");
        console.log("│ 🪙 核心代币层                                                        │");
        console.log(`│   • HCF主代币: ${deployedAddresses.hcfToken}      │`);
        console.log(`│   • BSDT稳定币: ${deployedAddresses.bsdtToken}     │`);
        console.log("├─────────────────────────────────────────────────────────────────────┤");
        console.log("│ 🚀 DeFi协议层                                                        │");
        console.log(`│   • 质押挖矿: ${deployedAddresses.stakingFixed}       │`);
        console.log(`│   • 代币兑换: ${deployedAddresses.exchange}       │`);
        console.log(`│   • 燃烧机制: ${burnMechanism.address}       │`);
        console.log("├─────────────────────────────────────────────────────────────────────┤");
        console.log("│ 🎯 治理奖励层                                                        │");
        console.log(`│   • 推荐系统: ${deployedAddresses.referral}       │`);
        console.log(`│   • 节点NFT: ${deployedAddresses.nodeNFT}        │`);
        console.log("└─────────────────────────────────────────────────────────────────────┘");
        
        console.log("\n💎 生态系统核心特性:");
        console.log("   ✨ V1-V5五层质押收益体系");
        console.log("   🔥 LP质押双倍收益奖励");
        console.log("   🔄 复投机制(已修复通胀问题)");
        console.log("   🎁 多级推荐奖励系统");
        console.log("   👑 NFT节点治理机制");
        console.log("   🔀 HCF-BSDT去中心化兑换");
        console.log("   🔥 代币燃烧通缩机制");
        
        console.log("\n📈 经济模型:");
        console.log("   • 质押年化收益: 73%-292% (V1-V5)");
        console.log("   • LP质押年化: 146%-584% (双倍收益)");
        console.log("   • 推荐奖励: 多层级分佣");
        console.log("   • 通缩机制: 燃烧 + 回购销毁");
        console.log("   • 治理权益: NFT节点投票");
        
        console.log("\n💰 部署统计:");
        console.log("   🎯 总合约数: 7个核心合约");
        console.log("   ⛽ 总Gas费: ~0.07 BNB (约$42)");
        console.log("   ⏰ 部署时间: " + new Date().toISOString());
        console.log("   🌐 网络: BSC Mainnet");
        
        console.log("\n📁 生成文件:");
        console.log(`   📄 ${filename}`);
        console.log("   📄 HCF-PRO-MAINNET-EPIC-COMPLETE.env");
        
        console.log("\n🎯 主网上线后续操作:");
        console.log("   1. 📱 更新前端配置使用主网合约地址");
        console.log("   2. ✅ 在BSCScan上验证所有7个合约");
        console.log("   3. 🔐 配置多签钱包管理权限");
        console.log("   4. ⚙️  设置代币经济参数");
        console.log("   5. 📢 公告HCF-PRO主网正式上线");
        console.log("   6. 🚀 开启质押挖矿和交易功能");
        
        console.log("\n🌟🌟🌟 HCF-PRO DeFi生态系统主网部署完全成功! 🌟🌟🌟");
        console.log("🎊🎊🎊 Welcome to the HCF-PRO DeFi Future! 🎊🎊🎊");
        console.log("🏆".repeat(50));
        
        return epicEcosystemDeployment;
        
    } catch (error) {
        console.error("\n❌ 终极部署过程中发生错误:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("终极部署失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 终极部署脚本创建成功${NC}"

# 执行终极部署
echo -e "${PURPLE}🚀🚀🚀 开始终极部署... 🚀🚀🚀${NC}"
npx hardhat run scripts/ultimate-final-mainnet.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🏆🏆🏆 HCF-PRO完整DeFi生态系统部署成功! 🏆🏆🏆${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # 自动更新.env文件
    if [ -f "HCF-PRO-MAINNET-EPIC-COMPLETE.env" ]; then
        echo -e "${YELLOW}自动更新.env文件...${NC}"
        echo "" >> .env
        cat HCF-PRO-MAINNET-EPIC-COMPLETE.env >> .env
        echo -e "${GREEN}✅ 史诗级完整主网生态地址已添加到.env文件${NC}"
    fi
    
    echo -e "${CYAN}🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉${NC}"
    echo -e "${PURPLE}🏆 恭喜!7合约完整DeFi生态系统部署成功! 🏆${NC}"
    echo -e "${GREEN}🚀 HCF-PRO主网正式上线! 🚀${NC}"
    echo -e "${YELLOW}🌟 Welcome to the HCF-PRO DeFi Future! 🌟${NC}"
    echo -e "${CYAN}🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉${NC}"
    
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 终极部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi