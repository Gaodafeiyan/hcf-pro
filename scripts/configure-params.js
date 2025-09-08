const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 配置HCF-RWA参数\n");
    
    const [signer] = await ethers.getSigners();
    console.log("使用账户:", signer.address);
    
    const governanceAddress = "0x830377fde4169b1a260a962712bfa90C1BEb8FE6";
    const governance = await ethers.getContractAt("HCFGovernance", governanceAddress);
    
    // 检查是否是owner
    const owner = await governance.owner();
    console.log("治理合约Owner:", owner);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log("❌ 错误：当前账户不是治理合约的Owner");
        console.log("请使用正确的账户：", owner);
        return;
    }
    
    console.log("\n📊 开始配置参数...\n");
    
    try {
        // 1. 设置质押日化收益率
        console.log("1. 设置质押日化收益率...");
        console.log("   L1: 0.6%, L2: 0.7%, L3: 0.8%");
        const tx1 = await governance.setDailyRates(60, 70, 80);
        await tx1.wait();
        console.log("   ✅ 完成");
        
        // 2. 设置税率
        console.log("\n2. 设置税率...");
        console.log("   买入: 2%, 卖出: 5%, 转账: 1%");
        const tx2 = await governance.setTaxRates(200, 500, 100);
        await tx2.wait();
        console.log("   ✅ 完成");
        
        // 3. 设置领取手续费
        console.log("\n3. 设置领取手续费...");
        console.log("   总费用: 5% BNB");
        console.log("   节点: 2% (40%), 营销: 3% (60%)");
        const tx3 = await governance.setClaimFee(500, 40, 60);
        await tx3.wait();
        console.log("   ✅ 完成");
        
        // 4. 设置推荐奖励
        console.log("\n4. 设置推荐奖励...");
        console.log("   入金: 1代5%, 2代3%");
        console.log("   静态: 1代20%, 2代10%, 3-8代5%, 9-15代3%, 16-20代2%");
        
        const depositBonus = [500, 300]; // 5%, 3%
        const staticBonus = [
            2000, 1000,           // 1-2代: 20%, 10%
            500, 500, 500, 500, 500, 500,  // 3-8代: 5%
            300, 300, 300, 300, 300, 300, 300,  // 9-15代: 3%
            200, 200, 200, 200, 200    // 16-20代: 2%
        ];
        
        const tx4 = await governance.setReferralBonus(depositBonus, staticBonus);
        await tx4.wait();
        console.log("   ✅ 完成");
        
        // 5. 设置日收益封顶
        console.log("\n5. 设置日收益封顶...");
        console.log("   封顶: 质押量的10%");
        const tx5 = await governance.setDailyRewardCap(1000);
        await tx5.wait();
        console.log("   ✅ 完成");
        
        // 6. 设置限购参数
        console.log("\n6. 设置限购参数...");
        console.log("   前7天, 每天限购1000 HCF");
        const tx6 = await governance.setPurchaseLimit(7, ethers.utils.parseEther("1000"));
        await tx6.wait();
        console.log("   ✅ 完成");
        
        // 7. 设置节点参数
        console.log("\n7. 设置节点参数...");
        console.log("   申请费: 5000 BSDT");
        console.log("   激活: 1000 HCF + 1000 LP");
        const tx7 = await governance.setNodeParams(
            ethers.utils.parseEther("5000"),
            ethers.utils.parseEther("1000"),
            ethers.utils.parseEther("1000")
        );
        await tx7.wait();
        console.log("   ✅ 完成");
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 所有参数配置完成!");
        console.log("=".repeat(60));
        
        // 显示最终配置
        console.log("\n📊 最终配置:");
        console.log("- 质押日化: L1=0.6%, L2=0.7%, L3=0.8%");
        console.log("- 税率: 买2%, 卖5%, 转账1%");
        console.log("- 领取手续费: 5% BNB (节点2%, 营销3%)");
        console.log("- 推荐奖励: 20层已配置");
        console.log("- 日收益封顶: 10%");
        console.log("- 限购: 7天, 1000枚/天");
        console.log("- 节点: 99个, 5000 BSDT申请费");
        
    } catch (error) {
        console.error("\n❌ 配置失败:", error.message);
        console.log("\n可能的原因:");
        console.log("1. 账户不是治理合约的Owner");
        console.log("2. BNB余额不足支付Gas费");
        console.log("3. 参数超出允许范围");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });