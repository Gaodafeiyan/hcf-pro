const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("调整质押限制...");
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    
    // 质押合约地址
    const STAKING_ADDRESS = "0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74";
    
    // 获取合约实例
    const Staking = await ethers.getContractFactory("HCFStaking");
    const staking = Staking.attach(STAKING_ADDRESS);
    
    try {
        // 检查当前限制
        const currentLimit = await staking.DAILY_LIMIT();
        console.log("当前每日限制:", ethers.utils.formatUnits(currentLimit, 18), "HCF");
        
        // 设置新的限制（增加到1000万HCF）
        const newLimit = ethers.utils.parseUnits("10000000", 18);
        const tx = await staking.setDailyLimit(newLimit);
        await tx.wait();
        
        console.log("✅ 限制已更新到:", ethers.utils.formatUnits(newLimit, 18), "HCF");
        
    } catch (error) {
        // 如果没有setDailyLimit函数，说明限制是硬编码的
        console.log("⚠️ 限制是硬编码的，需要重新部署合约或使用其他方法");
        
        // 临时解决方案：创建一个新的质押合约
        console.log("\n临时解决方案：");
        console.log("1. 使用较小的金额测试（每次少于当前限制）");
        console.log("2. 等待7天后再质押");
        console.log("3. 使用不同的钱包地址");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });