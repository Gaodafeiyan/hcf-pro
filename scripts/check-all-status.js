const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 完整系统状态检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("当前账户:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 所有已知的合约地址
    const contracts = {
        "HCF Token": "0xc5c3f24a212838968759045d1654d3643016d585",
        "流动池": "0x53df45a3260af4b7590a53ce11e7a1f8df5a8048", 
        "质押系统": "0x209d3d4f8ab55cd678d736957abc139f157753fe",
        "防砸盘": "0xff9d8c2f579cb2b6e663b05f2f0d1e19dcb3eb5a",
        "节点NFT": "0x10b4284eafdc92f448d29db58f1ccc784e8230ad",
        "推荐系统": "0xea0e87adfdad8b27e967287f7f6ad8a491d88e4f",
        "排行榜": "0x92bc67fdf088e9b06285c8e62f2f36f69f4cc1fa",
        "治理": "0xb61f86e8e6e8e2ec0cfc29f60bc088c8e7aba9ef",
        "团队奖励V1-V6": "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6",
        "20级推荐": "0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6"
    };
    
    console.log(chalk.cyan("\n✅ 已部署的合约:"));
    let deployedCount = 0;
    
    for (const [name, address] of Object.entries(contracts)) {
        try {
            const code = await ethers.provider.getCode(address);
            if (code !== "0x" && code.length > 2) {
                console.log(chalk.green(`✅ ${name}: ${address}`));
                deployedCount++;
            } else {
                console.log(chalk.red(`❌ ${name}: 未部署`));
            }
        } catch (e) {
            console.log(chalk.yellow(`⚠️ ${name}: 检查失败`));
        }
    }
    
    console.log(chalk.blue(`\n总计: ${deployedCount}/10 个合约已部署`));
    
    // 检查20级推荐的权限设置
    if (deployedCount >= 10) {
        console.log(chalk.cyan("\n🔧 检查20级推荐权限设置:"));
        
        try {
            const multiLevel = await ethers.getContractAt(
                "HCFMultiLevelRewards",
                "0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6"
            );
            
            const stakingAddress = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
            const isOperator = await multiLevel.operators(stakingAddress);
            
            if (isOperator) {
                console.log(chalk.green("✅ 质押合约已有操作权限"));
            } else {
                console.log(chalk.yellow("⚠️ 质押合约未设置操作权限"));
                console.log("需要运行: npx hardhat run scripts/setup-multilevel.js --network bsc");
            }
            
            const rewardsEnabled = await multiLevel.rewardsEnabled();
            console.log(`奖励系统: ${rewardsEnabled ? "✅ 开启" : "❌ 关闭"}`);
            
        } catch (e) {
            console.log(chalk.red("无法检查20级推荐状态"));
        }
    }
    
    // 检查团队奖励权限
    console.log(chalk.cyan("\n🔧 检查团队奖励权限设置:"));
    
    try {
        const teamRewards = await ethers.getContractAt(
            "HCFTeamRewards",
            "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6"
        );
        
        const stakingAddress = "0x209d3d4f8ab55cd678d736957abc139f157753fe";
        const isOperator = await teamRewards.operators(stakingAddress);
        
        if (isOperator) {
            console.log(chalk.green("✅ 团队奖励权限已设置"));
        } else {
            console.log(chalk.yellow("⚠️ 团队奖励权限未设置"));
        }
        
    } catch (e) {
        console.log(chalk.red("无法检查团队奖励状态"));
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    
    if (deployedCount === 10) {
        console.log(chalk.green.bold("   🎉 所有合约已部署完成！"));
        console.log(chalk.yellow("   ⚠️ 部分权限可能需要设置"));
    } else {
        console.log(chalk.yellow.bold(`   ⚠️ 还有 ${10 - deployedCount} 个合约未部署`));
    }
    
    console.log(chalk.blue.bold("========================================\n"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });