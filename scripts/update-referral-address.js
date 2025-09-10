const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔄 更新推荐合约地址"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 新的推荐合约地址
    const NEW_REFERRAL = "0x7fBc3bB1e4943f44CF158703B045a1198c99C405";
    
    // 需要更新的合约
    const TEAM_REWARDS = "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6";
    const MULTI_LEVEL = "0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6";
    
    try {
        console.log(chalk.cyan("新推荐合约地址:"), NEW_REFERRAL);
        
        // 1. 更新团队奖励合约
        console.log(chalk.cyan("\n1️⃣ 更新团队奖励合约..."));
        const teamRewards = await ethers.getContractAt("HCFTeamRewards", TEAM_REWARDS);
        
        const currentRef1 = await teamRewards.referralContract();
        console.log("当前地址:", currentRef1);
        
        if (currentRef1.toLowerCase() !== NEW_REFERRAL.toLowerCase()) {
            const tx1 = await teamRewards.updateContracts(
                ethers.constants.AddressZero,  // 不更新质押合约
                NEW_REFERRAL,
                {gasPrice: ethers.utils.parseUnits("1", "gwei")}
            );
            console.log("交易哈希:", tx1.hash);
            await tx1.wait();
            console.log(chalk.green("✅ 团队奖励合约已更新"));
        } else {
            console.log(chalk.yellow("已是最新地址"));
        }
        
        // 2. 更新20级推荐合约
        console.log(chalk.cyan("\n2️⃣ 更新20级推荐合约..."));
        const multiLevel = await ethers.getContractAt("HCFMultiLevelRewards", MULTI_LEVEL);
        
        const currentRef2 = await multiLevel.referralContract();
        console.log("当前地址:", currentRef2);
        
        if (currentRef2.toLowerCase() !== NEW_REFERRAL.toLowerCase()) {
            const tx2 = await multiLevel.updateContracts(
                ethers.constants.AddressZero,  // 不更新质押合约
                NEW_REFERRAL,
                {gasPrice: ethers.utils.parseUnits("1", "gwei")}
            );
            console.log("交易哈希:", tx2.hash);
            await tx2.wait();
            console.log(chalk.green("✅ 20级推荐合约已更新"));
        } else {
            console.log(chalk.yellow("已是最新地址"));
        }
        
        console.log(chalk.green.bold("\n✅ 所有合约地址更新完成!"));
        
        // 验证更新
        console.log(chalk.cyan("\n📊 验证更新结果:"));
        
        const newRef1 = await teamRewards.referralContract();
        const newRef2 = await multiLevel.referralContract();
        
        console.log("团队奖励推荐地址:", newRef1);
        console.log("20级推荐推荐地址:", newRef2);
        
        if (newRef1.toLowerCase() === NEW_REFERRAL.toLowerCase() && 
            newRef2.toLowerCase() === NEW_REFERRAL.toLowerCase()) {
            console.log(chalk.green("\n✅ 验证成功！所有地址已正确更新"));
        } else {
            console.log(chalk.yellow("\n⚠️ 部分地址可能未更新成功"));
        }
        
    } catch (error) {
        console.error(chalk.red("\n❌ 更新失败:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });