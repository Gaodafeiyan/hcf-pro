const { ethers } = require("hardhat");

async function main() {
    console.log("=== 检查质押系统状态 ===\n");
    
    // 合约地址
    const HCF_TOKEN = "0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc";
    const HCF_STAKING = "0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74";
    
    // 获取签名者
    const [signer] = await ethers.getSigners();
    console.log("检查账户:", signer.address);
    
    // 连接合约
    const hcfToken = await ethers.getContractAt("HCFToken", HCF_TOKEN);
    const stakingContract = await ethers.getContractAt("HCFStaking", HCF_STAKING);
    
    try {
        // 1. 检查HCF余额
        const balance = await hcfToken.balanceOf(signer.address);
        console.log("\n1. HCF余额:", ethers.formatUnits(balance, 18), "HCF");
        
        // 2. 检查授权额度
        const allowance = await hcfToken.allowance(signer.address, HCF_STAKING);
        console.log("2. 质押合约授权额度:", ethers.formatUnits(allowance, 18), "HCF");
        
        // 3. 检查质押信息
        const userInfo = await stakingContract.getUserInfo(signer.address);
        console.log("\n3. 质押信息:");
        console.log("   - 质押数量:", ethers.formatUnits(userInfo.amount, 18), "HCF");
        console.log("   - 质押等级:", userInfo.level.toString());
        console.log("   - 待领取奖励:", ethers.formatUnits(userInfo.pending, 18), "HCF");
        console.log("   - 累计已领取:", ethers.formatUnits(userInfo.totalClaimed, 18), "HCF");
        
        // 4. 检查系统总质押量
        const totalStaked = await stakingContract.getTotalStaked();
        console.log("\n4. 系统总质押量:", ethers.formatUnits(totalStaked, 18), "HCF");
        
        // 5. 测试授权（如果余额足够且授权不足）
        if (balance > 0 && allowance < ethers.parseUnits("100", 18)) {
            console.log("\n5. 执行授权测试...");
            const approveTx = await hcfToken.approve(HCF_STAKING, ethers.parseUnits("10000", 18));
            console.log("   授权交易:", approveTx.hash);
            await approveTx.wait();
            console.log("   ✅ 授权成功!");
            
            // 再次检查授权
            const newAllowance = await hcfToken.allowance(signer.address, HCF_STAKING);
            console.log("   新授权额度:", ethers.formatUnits(newAllowance, 18), "HCF");
        }
        
        // 6. 测试小额质押（如果有余额和授权）
        if (balance >= ethers.parseUnits("100", 18) && allowance >= ethers.parseUnits("100", 18)) {
            console.log("\n6. 执行质押测试...");
            const stakeTx = await stakingContract.stake(ethers.parseUnits("100", 18));
            console.log("   质押交易:", stakeTx.hash);
            await stakeTx.wait();
            console.log("   ✅ 质押成功!");
            
            // 检查新余额
            const newBalance = await hcfToken.balanceOf(signer.address);
            console.log("   新HCF余额:", ethers.formatUnits(newBalance, 18), "HCF");
            
            // 检查新质押信息
            const newUserInfo = await stakingContract.getUserInfo(signer.address);
            console.log("   新质押数量:", ethers.formatUnits(newUserInfo.amount, 18), "HCF");
        }
        
    } catch (error) {
        console.error("\n❌ 错误:", error.message);
        if (error.data) {
            console.error("错误数据:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });