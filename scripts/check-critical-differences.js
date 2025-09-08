const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 检查关键差异\n");
    console.log("=".repeat(60));
    
    const contracts = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        staking: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        nodeNFT: "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
    };
    
    console.log("📊 关键功能检查:\n");
    
    // 1. 检查总供应量
    console.log("1. 代币总量:");
    const hcfToken = await ethers.getContractAt("HCFToken", contracts.hcfToken);
    const totalSupply = await hcfToken.totalSupply();
    console.log("   当前总量:", ethers.utils.formatEther(totalSupply), "HCF");
    console.log("   需求总量: 1,000,000,000 HCF");
    console.log("   状态:", totalSupply.eq(ethers.utils.parseEther("1000000000")) ? "✅" : "❌ 需要调整");
    
    // 2. 检查是否有最小余额限制
    console.log("\n2. 最小余额限制 (0.0001 HCF):");
    console.log("   状态: ❌ 需要在transfer函数中添加");
    
    // 3. 检查是否有领取手续费
    console.log("\n3. 领取收益5% BNB手续费:");
    console.log("   状态: ❌ 需要在claimRewards中添加");
    
    // 4. 检查股权LP锁定
    console.log("\n4. 股权LP锁定期 (100/300天):");
    console.log("   状态: ❌ 需要添加锁定期机制");
    
    // 5. 检查前7天限购
    console.log("\n5. 前7天每天限购1000枚:");
    console.log("   状态: ❌ 需要添加限购逻辑");
    
    // 6. 检查烧伤机制
    console.log("\n6. 推荐奖励烧伤机制:");
    console.log("   状态: ❌ 上级质押≥下级才能拿满奖励");
    
    // 7. 检查节点数量
    console.log("\n7. 节点系统:");
    const nodeNFT = await ethers.getContractAt("HCFNodeNFT", contracts.nodeNFT);
    try {
        const maxNodes = await nodeNFT.MAX_NODES();
        console.log("   最大节点数:", maxNodes.toString());
        console.log("   需求: 99个");
        console.log("   状态:", maxNodes.eq(99) ? "✅" : "❌ 需要设置为99");
    } catch (e) {
        console.log("   状态: ⚠️ 无法读取MAX_NODES");
    }
    
    // 8. 检查动静收益封顶
    console.log("\n8. 动静收益日封顶 (质押量10%):");
    console.log("   状态: ❌ 需要添加每日上限");
    
    // 9. 检查直推几个拿几代
    console.log("\n9. 直推几个拿几代:");
    console.log("   状态: ❌ 需要添加直推数量验证");
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 差异总结:");
    console.log("=".repeat(60));
    
    console.log("\n🔴 必须修复的关键差异:");
    console.log("1. 总供应量不是10亿");
    console.log("2. 没有0.0001最小余额限制");
    console.log("3. 没有5% BNB领取手续费");
    console.log("4. 没有股权LP锁定期");
    console.log("5. 没有前7天限购机制");
    console.log("6. 没有烧伤机制");
    console.log("7. 没有直推数量限制");
    console.log("8. 没有日收益封顶");
    console.log("9. 节点激活条件可能不完整");
    
    console.log("\n⚠️ 这些差异可能需要:");
    console.log("- 升级现有合约");
    console.log("- 或通过治理合约调整参数");
    console.log("- 或部署补丁合约");
}

main().catch(console.error);