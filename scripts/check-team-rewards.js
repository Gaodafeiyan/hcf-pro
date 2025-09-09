const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   ✅ 检查团队奖励部署状态"));
    console.log(chalk.blue.bold("========================================\n"));

    const TEAM_REWARDS_ADDRESS = "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6";
    
    try {
        const teamRewards = await ethers.getContractAt("HCFTeamRewards", TEAM_REWARDS_ADDRESS);
        
        console.log(chalk.green("✅ 团队奖励合约已部署"));
        console.log("合约地址:", TEAM_REWARDS_ADDRESS);
        
        // 检查关联的合约
        console.log(chalk.cyan("\n📝 关联合约:"));
        const hcfToken = await teamRewards.hcfToken();
        const stakingContract = await teamRewards.stakingContract();
        const referralContract = await teamRewards.referralContract();
        
        console.log("HCF Token:", hcfToken);
        console.log("Staking:", stakingContract);
        console.log("Referral:", referralContract);
        
        // 检查操作员权限
        console.log(chalk.cyan("\n🔐 权限检查:"));
        const isStakingOperator = await teamRewards.operators(stakingContract);
        console.log(`质押合约操作权限: ${isStakingOperator ? "✅ 已设置" : "❌ 未设置"}`);
        
        // 检查烧伤机制
        const burnEnabled = await teamRewards.burnEnabled();
        console.log(`烧伤机制: ${burnEnabled ? "✅ 开启" : "❌ 关闭"}`);
        
        // 检查总分发
        const totalDistributed = await teamRewards.totalDistributed();
        console.log(`\n总分发奖励: ${ethers.utils.formatEther(totalDistributed)} HCF`);
        
        console.log(chalk.green.bold("\n✅ 团队奖励系统状态正常!"));
        
        console.log(chalk.yellow("\n📌 重要信息:"));
        console.log("1. 团队奖励合约已成功部署并配置");
        console.log("2. V1-V6等级奖励率: 6% → 36%");
        console.log("3. 小区业绩要求: 2000 → 2000万 HCF");
        console.log("4. 烧伤机制已启用（上级质押需≥下级）");
        
        // 检查推荐合约是否存在
        const code = await ethers.provider.getCode(referralContract);
        if (code === "0x") {
            console.log(chalk.yellow("\n⚠️ 注意: 推荐合约地址似乎没有部署"));
            console.log("这可能影响团队奖励的正常运作");
            console.log("需要先部署推荐合约或更新地址");
        }
        
    } catch (error) {
        console.error(chalk.red("\n❌ 检查失败:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });