const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🧪 测试团队奖励系统"));
    console.log(chalk.blue.bold("========================================\n"));

    // 合约地址 - 已部署
    const TEAM_REWARDS_ADDRESS = "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6";
    const REFERRAL_ADDRESS = "0xea0e87adfdad8b27e967287f7f6ad8a491d88e4f";
    const STAKING_ADDRESS = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
    
    
    const [deployer] = await ethers.getSigners();
    
    try {
        const teamRewards = await ethers.getContractAt("HCFTeamRewards", TEAM_REWARDS_ADDRESS);
        const referral = await ethers.getContractAt("HCFReferral", REFERRAL_ADDRESS);
        
        // 测试用户地址
        const testUser = deployer.address;
        console.log("测试用户:", testUser);
        
        console.log(chalk.cyan("\n1️⃣ 检查团队等级配置..."));
        for (let i = 1; i <= 6; i++) {
            const level = await teamRewards.getTeamLevelRequirement(i);
            console.log(`\nV${i}:`);
            console.log(`  小区最小: ${ethers.utils.formatEther(level[0])} HCF`);
            console.log(`  奖励比例: ${level[1] / 100}%`);
            if (level[2] > 0) {
                console.log(`  需要: ${level[2]}个V${level[3]}`);
            }
        }
        
        console.log(chalk.cyan("\n2️⃣ 更新用户团队信息..."));
        await teamRewards.updateUserTeamInfo(testUser);
        console.log("✅ 团队信息已更新");
        
        console.log(chalk.cyan("\n3️⃣ 查询用户团队状态..."));
        const userInfo = await teamRewards.getUserTeamInfo(testUser);
        
        console.log("\n用户团队信息:");
        console.log(`  等级: ${userInfo[5]} (${userInfo[0]})`);
        console.log(`  团队总质押: ${ethers.utils.formatEther(userInfo[1])} HCF`);
        console.log(`  小区质押: ${ethers.utils.formatEther(userInfo[2])} HCF`);
        console.log(`  总奖励: ${ethers.utils.formatEther(userInfo[3])} HCF`);
        console.log(`  未领取: ${ethers.utils.formatEther(userInfo[4])} HCF`);
        
        console.log(chalk.cyan("\n4️⃣ 计算团队质押..."));
        const teamStake = await teamRewards.calculateTeamStake(testUser);
        console.log(`  总质押: ${ethers.utils.formatEther(teamStake[0])} HCF`);
        console.log(`  最大区: ${ethers.utils.formatEther(teamStake[1])} HCF`);
        console.log(`  小区: ${ethers.utils.formatEther(teamStake[2])} HCF`);
        
        // 检查直推团队
        console.log(chalk.cyan("\n5️⃣ 检查直推团队..."));
        const directs = await referral.getDirectReferrals(testUser);
        console.log(`直推数量: ${directs.length}`);
        
        if (directs.length > 0) {
            console.log("\n直推成员:");
            for (let i = 0; i < Math.min(5, directs.length); i++) {
                const memberInfo = await teamRewards.userTeamInfo(directs[i]);
                console.log(`  ${directs[i].slice(0, 10)}... - 等级V${memberInfo.level}`);
            }
        }
        
        // 检查烧伤机制状态
        console.log(chalk.cyan("\n6️⃣ 系统配置..."));
        const burnEnabled = await teamRewards.burnEnabled();
        console.log(`  烧伤机制: ${burnEnabled ? "✅ 开启" : "❌ 关闭"}`);
        
        const totalDistributed = await teamRewards.totalDistributed();
        console.log(`  总分发奖励: ${ethers.utils.formatEther(totalDistributed)} HCF`);
        
        console.log(chalk.green.bold("\n✅ 测试完成!"));
        
        console.log(chalk.yellow("\n💡 升级团队等级方法:"));
        console.log("1. 邀请更多用户加入并质押");
        console.log("2. 培养直推成员达到更高等级");
        console.log("3. 增加小区业绩（非最大区）");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 测试失败:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });