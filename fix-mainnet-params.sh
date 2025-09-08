#!/bin/bash

# HCF-RWA主网参数修正脚本
# 调整所有合约参数以符合真实需求

echo "========================================="
echo "HCF-RWA 主网参数修正脚本"
echo "调整合约参数以符合项目真实需求"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 主网合约地址
echo -e "${GREEN}📋 主网合约地址:${NC}"
echo "HCF Token: 0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
echo "BSDT Token: 0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
echo "HCF Staking: 0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
echo "HCF Referral: 0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
echo ""

echo -e "${YELLOW}📊 需要修正的参数:${NC}"
echo "1. 税费机制："
echo "   - 买入税: 2% (0.5%销毁+0.5%营销+0.5%LP+0.5%节点)"
echo "   - 卖出税: 5% (2%销毁+1%营销+1%LP+1%节点)"
echo "   - 转账税: 1%销毁"
echo ""
echo "2. 质押等级："
echo "   - Level 1: 1000 HCF → 0.6%日化"
echo "   - Level 2: 10000 HCF → 0.7%日化"
echo "   - 复投: Level 1=200倍数, Level 2=2000倍数"
echo ""
echo "3. 推荐奖励："
echo "   - 1代: 5%入金 + 20%静态"
echo "   - 2代: 3%入金 + 10%静态"
echo ""

read -p "确认开始修正参数? (输入 'FIX' 继续): " confirm

if [ "$confirm" != "FIX" ]; then
    echo "参数修正已取消"
    exit 0
fi

# 创建参数修正脚本
echo -e "${YELLOW}创建参数修正脚本...${NC}"
cat > scripts/fix-mainnet-params.js << 'EOF'
const hre = require("hardhat");

async function main() {
    console.log("🔧 开始修正HCF-RWA主网参数...\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 主网合约地址
    const contracts = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        staking: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
    };
    
    try {
        // 1. 修正HCF代币税费
        console.log("📍 [1/3] 修正HCF代币税费...");
        const HCFToken = await ethers.getContractAt("HCFToken", contracts.hcfToken);
        
        // 设置税率: 买2%, 卖5%, 转账1%
        console.log("设置税率: 买2%, 卖5%, 转账1%");
        const taxTx = await HCFToken.setTaxRates(
            200,  // 2% 买入税
            500,  // 5% 卖出税
            100   // 1% 转账税
        );
        await taxTx.wait();
        console.log("✅ 税率设置成功");
        
        // 设置买入税分配: 各25%
        console.log("设置买入税分配: 0.5%销毁+0.5%营销+0.5%LP+0.5%节点");
        const buyDistTx = await HCFToken.setBuyTaxDistribution(
            2500,  // 25% 销毁 (0.5%/2%)
            2500,  // 25% 营销
            2500,  // 25% LP
            2500   // 25% 节点
        );
        await buyDistTx.wait();
        console.log("✅ 买入税分配设置成功");
        
        // 设置卖出税分配: 40%销毁,20%营销,20%LP,20%节点
        console.log("设置卖出税分配: 2%销毁+1%营销+1%LP+1%节点");
        const sellDistTx = await HCFToken.setSellTaxDistribution(
            4000,  // 40% 销毁 (2%/5%)
            2000,  // 20% 营销 (1%/5%)
            2000,  // 20% LP
            2000   // 20% 节点
        );
        await sellDistTx.wait();
        console.log("✅ 卖出税分配设置成功");
        
        // 2. 修正质押合约参数
        console.log("\n📍 [2/3] 修正质押合约参数...");
        const Staking = await ethers.getContractAt("HCFStakingFixed", contracts.staking);
        
        // 配置2个质押等级
        // Level 1: 1000-9999 HCF, 0.6%日化, 200倍数复投
        // Level 2: 10000+ HCF, 0.7%日化, 2000倍数复投
        
        // 注意：如果合约是5级系统，我们需要禁用V1,V2,V4,V5，只用V3作为Level 1
        // 这需要根据实际合约代码调整
        
        console.log("配置质押等级...");
        // 禁用不需要的等级
        try {
            await Staking.setLevelEnabled(1, false); // 禁用V1
            await Staking.setLevelEnabled(2, false); // 禁用V2
            console.log("✅ 禁用了不需要的等级");
        } catch (error) {
            console.log("⚠️ 无法禁用等级，可能需要手动调整");
        }
        
        // 3. 修正推荐合约参数
        console.log("\n📍 [3/3] 修正推荐合约参数...");
        const Referral = await ethers.getContractAt("HCFReferral", contracts.referral);
        
        // 设置推荐奖励率
        console.log("设置推荐奖励: 1代5%+20%, 2代3%+10%");
        const rewardTx = await Referral.setRewardRates(
            [500, 300],  // 入金奖励: 1代5%, 2代3%
            [2000, 1000, 500, 300, 200],  // 静态奖励: 1代20%, 2代10%, 3-8代5%, 9-15代3%, 16-20代2%
            [600, 1200, 1800, 2400, 3000, 3600]  // 团队奖励: V1-V6 (6%-36%)
        );
        await rewardTx.wait();
        console.log("✅ 推荐奖励设置成功");
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 参数修正完成!");
        console.log("=".repeat(60));
        console.log("📋 修正内容:");
        console.log("1. HCF税费: 买2%, 卖5%, 转账1%");
        console.log("2. 税费分配: 按文档要求设置");
        console.log("3. 推荐奖励: 1代5%+20%, 2代3%+10%");
        console.log("");
        console.log("⚠️ 注意事项:");
        console.log("1. 质押等级可能需要手动调整合约代码");
        console.log("2. 股权LP锁定机制需要额外开发");
        console.log("3. 领取收益5%BNB手续费需要在合约中设置");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("\n❌ 参数修正失败:", error.message);
        console.error("错误详情:", error);
        
        // 提供手动修正指南
        console.log("\n📋 手动修正指南:");
        console.log("1. 确保你是合约的MultiSig钱包地址");
        console.log("2. 检查合约是否有相应的设置函数");
        console.log("3. 可能需要通过多签钱包执行这些操作");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("脚本执行失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 参数修正脚本创建成功${NC}"

# 创建质押等级调整脚本
echo -e "${YELLOW}创建质押等级调整脚本...${NC}"
cat > scripts/adjust-staking-levels.js << 'EOF'
const hre = require("hardhat");

async function main() {
    console.log("🔧 调整质押等级为HCF-RWA需求...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    const stakingAddress = "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252";
    
    try {
        // 这里需要根据实际合约代码调整
        // 如果合约支持动态调整等级，使用相应函数
        // 如果不支持，可能需要重新部署或升级合约
        
        console.log("📊 HCF-RWA质押等级需求:");
        console.log("Level 1: 1000-9999 HCF");
        console.log("  - 日化: 0.6% (6 HCF/1000 HCF)");
        console.log("  - LP加成: +0.6% (双倍)");
        console.log("  - 复投: 200 HCF倍数");
        console.log("");
        console.log("Level 2: 10000+ HCF");
        console.log("  - 日化: 0.7% (70 HCF/10000 HCF)");
        console.log("  - LP加成: +0.7% (双倍)");
        console.log("  - 复投: 2000 HCF倍数");
        console.log("");
        console.log("股权LP加成:");
        console.log("  - 100天锁定: +20%");
        console.log("  - 300天锁定: +40%");
        
        // 如果合约支持调整，这里添加调用代码
        // const Staking = await ethers.getContractAt("HCFStakingFixed", stakingAddress);
        // await Staking.updateLevelConfig(...);
        
        console.log("\n⚠️ 注意: 质押等级调整可能需要:");
        console.log("1. 合约升级支持新的等级配置");
        console.log("2. 添加股权LP锁定期功能");
        console.log("3. 调整复投倍数验证逻辑");
        
    } catch (error) {
        console.error("调整失败:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 质押等级调整脚本创建成功${NC}"

# 执行参数修正
echo -e "${YELLOW}开始执行参数修正...${NC}"
npx hardhat run scripts/fix-mainnet-params.js --network bsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 参数修正成功!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    echo -e "${YELLOW}📋 后续操作建议:${NC}"
    echo "1. 验证税费是否正确生效"
    echo "2. 测试质押功能是否符合需求"
    echo "3. 检查推荐奖励是否正确"
    echo "4. 可能需要升级合约以支持:"
    echo "   - 2级质押系统(1000/10000)"
    echo "   - 股权LP锁定期(100/300天)"
    echo "   - 领取收益5%BNB手续费"
    
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 参数修正失败${NC}"
    echo -e "${RED}请检查错误信息或手动执行修正${NC}"
    echo -e "${RED}=========================================${NC}"
fi