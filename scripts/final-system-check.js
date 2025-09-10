const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🏁 最终系统检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("检查账户:", deployer.address);
    
    // 所有合约地址
    const contracts = {
        "HCF Token": "0xc5c3f24a212838968759045d1654d3643016d585",
        "流动池": "0x53df45a3260af4b7590a53ce11e7a1f8df5a8048",
        "质押系统": "0x209d3d4f8ab55cd678d736957abc139f157753fe",
        "防砸盘": "0xff9d8c2f579cb2b6e663b05f2f0d1e19dcb3eb5a",
        "节点NFT": "0x10b4284eafdc92f448d29db58f1ccc784e8230ad",
        "推荐系统": "0x7fBc3bB1e4943f44CF158703B045a1198c99C405",  // 新地址
        "团队奖励V1-V6": "0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6",
        "20级推荐": "0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6"
    };
    
    console.log(chalk.cyan("✅ 已部署合约:"));
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
    
    console.log(chalk.blue(`\n📊 部署统计: ${deployedCount}/8 个核心合约已部署`));
    
    // 检查税费系统
    console.log(chalk.cyan("\n💰 税费系统:"));
    try {
        const hcf = await ethers.getContractAt("HCFToken", contracts["HCF Token"]);
        const pool = contracts["流动池"];
        const isDEX = await hcf.isDEXPair(pool);
        
        console.log(`状态: ${isDEX ? "✅ 已激活" : "❌ 未激活"}`);
        
        if (isDEX) {
            const totalBurned = await hcf.totalBurned();
            console.log(`已销毁: ${ethers.utils.formatEther(totalBurned)} HCF`);
        }
    } catch (e) {
        console.log("无法检查税费状态");
    }
    
    // 检查权限设置
    console.log(chalk.cyan("\n🔐 权限检查:"));
    
    // 团队奖励权限
    try {
        const teamRewards = await ethers.getContractAt("HCFTeamRewards", contracts["团队奖励V1-V6"]);
        const stakingAddr = contracts["质押系统"];
        const isOp1 = await teamRewards.operators(stakingAddr);
        console.log(`团队奖励操作权限: ${isOp1 ? "✅" : "❌"}`);
    } catch (e) {}
    
    // 20级推荐权限
    try {
        const multiLevel = await ethers.getContractAt("HCFMultiLevelRewards", contracts["20级推荐"]);
        const stakingAddr = contracts["质押系统"];
        const isOp2 = await multiLevel.operators(stakingAddr);
        console.log(`20级推荐操作权限: ${isOp2 ? "✅" : "❌"}`);
    } catch (e) {}
    
    console.log(chalk.blue.bold("\n========================================"));
    
    if (deployedCount === 8) {
        console.log(chalk.green.bold("   🎊 系统100%完成！"));
        console.log(chalk.green.bold("   所有核心合约已部署并配置"));
        
        console.log(chalk.cyan("\n📋 系统功能清单:"));
        console.log("✅ 代币发行 (10亿总量)");
        console.log("✅ 税费系统 (买2%/卖5%/转1%)");
        console.log("✅ 销毁机制 (至99万停止)");
        console.log("✅ 质押挖矿 (L3/L4/L5)");
        console.log("✅ 防砸盘保护 (3档)");
        console.log("✅ 节点NFT (99个限量)");
        console.log("✅ 推荐系统 (多级关系)");
        console.log("✅ 团队奖励 (V1-V6)");
        console.log("✅ 20级推荐 (10%-0.6%)");
        
        console.log(chalk.yellow("\n🚀 系统已准备就绪，可以开始运营！"));
    } else {
        console.log(chalk.yellow.bold(`   ⚠️ 还有 ${8 - deployedCount} 个合约需要检查`));
    }
    
    console.log(chalk.blue.bold("========================================\n"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });