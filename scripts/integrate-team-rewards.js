const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔗 集成团队奖励到质押系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 合约地址 - 部署后需要更新TEAM_REWARDS_ADDRESS
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
    const TEAM_REWARDS_ADDRESS = ""; // 部署后填入团队奖励合约地址
    
    if (!TEAM_REWARDS_ADDRESS) {
        console.log(chalk.red("❌ 请先部署团队奖励合约并填入地址"));
        return;
    }
    
    try {
        // 获取合约实例
        const staking = await ethers.getContractAt("HCFStakingFinal", STAKING_ADDRESS);
        const teamRewards = await ethers.getContractAt("HCFTeamRewards", TEAM_REWARDS_ADDRESS);
        
        console.log(chalk.cyan("1️⃣ 设置团队奖励合约地址到质押合约..."));
        const tx1 = await staking.setTeamRewardsContract(TEAM_REWARDS_ADDRESS);
        await tx1.wait();
        console.log("✅ 已设置团队奖励合约");
        
        console.log(chalk.cyan("\n2️⃣ 验证集成状态..."));
        
        // 验证质押合约的团队奖励地址
        const teamAddr = await staking.teamRewardsContract();
        if (teamAddr.toLowerCase() === TEAM_REWARDS_ADDRESS.toLowerCase()) {
            console.log("✅ 质押合约已正确设置团队奖励地址");
        } else {
            console.log("❌ 地址设置错误");
            return;
        }
        
        // 验证团队奖励合约的操作权限
        const isOperator = await teamRewards.operators(STAKING_ADDRESS);
        if (isOperator) {
            console.log("✅ 质押合约已有团队奖励操作权限");
        } else {
            console.log("⚠️ 需要设置操作权限");
            const tx2 = await teamRewards.setOperator(STAKING_ADDRESS, true);
            await tx2.wait();
            console.log("✅ 已设置操作权限");
        }
        
        console.log(chalk.green.bold("\n✅ 集成完成!"));
        console.log("\n系统工作流程:");
        console.log("1. 用户质押HCF → 质押合约记录");
        console.log("2. 质押合约 → 调用团队奖励更新用户信息");
        console.log("3. 团队奖励 → 计算团队等级和小区业绩");
        console.log("4. 领取收益时 → 自动分发团队奖励");
        
        console.log(chalk.yellow("\n💡 测试方法:"));
        console.log("1. 创建推荐关系链");
        console.log("2. 质押不同数量HCF");
        console.log("3. 查看团队等级变化");
        console.log("4. 验证奖励分配");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 集成失败:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });