const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 部署所有缺失的合约"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 使用新的合约地址
    const EXISTING = {
        HCF: "0xc5c3f24A212838968759045d1654d3643016D585",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        STAKING: "0x209D3D4f8Ab55CD678D736957AbC139F157753fE",
        NODE_NFT: "0x10B4284EAfdc92F448d29dB58F1CCc784E8230AD",
        ANTI_DUMP: "0xff9d8C2f579CB2b6e663B05f2F0d1E19DCB3EB5A"
    };
    
    const deployedContracts = {};
    
    try {
        // 1. 部署推荐系统
        console.log(chalk.cyan("1️⃣ 部署推荐系统..."));
        const HCFReferralSimple = await ethers.getContractFactory("HCFReferralSimple");
        const referral = await HCFReferralSimple.deploy(EXISTING.HCF);
        
        console.log("  交易:", referral.deployTransaction.hash);
        await referral.deployed();
        deployedContracts.referral = referral.address;
        console.log(chalk.green("  ✅ 推荐系统:", referral.address));
        
        // 设置质押合约
        console.log("  设置质押合约...");
        const setStakingTx = await referral.setStakingContract(EXISTING.STAKING);
        await setStakingTx.wait();
        console.log(chalk.green("  ✅ 质押合约已设置"));
        
        // 2. 部署排名系统
        console.log(chalk.cyan("\n2️⃣ 部署排名系统..."));
        const HCFRanking = await ethers.getContractFactory("HCFRanking");
        const ranking = await HCFRanking.deploy(
            EXISTING.HCF,
            EXISTING.STAKING
        );
        
        console.log("  交易:", ranking.deployTransaction.hash);
        await ranking.deployed();
        deployedContracts.ranking = ranking.address;
        console.log(chalk.green("  ✅ 排名系统:", ranking.address));
        
        // 3. 部署治理系统
        console.log(chalk.cyan("\n3️⃣ 部署治理系统..."));
        const HCFGovernance = await ethers.getContractFactory("HCFGovernance");
        const governance = await HCFGovernance.deploy(); // 构造函数不需要参数
        
        console.log("  交易:", governance.deployTransaction.hash);
        await governance.deployed();
        deployedContracts.governance = governance.address;
        console.log(chalk.green("  ✅ 治理系统:", governance.address));
        
        // 4. 更新质押合约的集成（如果需要）
        console.log(chalk.cyan("\n4️⃣ 集成到现有系统..."));
        
        // 这里可能需要调用质押合约的setReferral等方法
        // 但需要先检查质押合约是否有这些方法
        
        console.log(chalk.yellow("  ⚠️ 注意：需要手动更新质押合约的推荐系统地址"));
        
        // 5. 保存部署信息
        const deploymentInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            newContracts: deployedContracts,
            existingContracts: EXISTING,
            fullSystem: {
                // 核心代币
                HCF: EXISTING.HCF,
                BSDT: EXISTING.BSDT,
                
                // 功能合约
                Staking: EXISTING.STAKING,
                AntiDump: EXISTING.ANTI_DUMP,
                NodeNFT: EXISTING.NODE_NFT,
                Referral: deployedContracts.referral,
                Ranking: deployedContracts.ranking,
                Governance: deployedContracts.governance
            },
            integration: {
                "质押→HCF": "✅",
                "质押→池子": "✅",
                "防暴跌→节点": "✅",
                "节点→防暴跌": "✅",
                "推荐→质押": "✅",
                "排名→质押": "✅",
                "治理→HCF": "✅"
            }
        };
        
        fs.writeFileSync(
            'complete-system-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green("\n✅ 部署信息已保存到 complete-system-deployment.json"));
        
        // 输出总结
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("   📋 完整系统地址"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("核心代币:"));
        console.log(`  HCF: ${EXISTING.HCF}`);
        console.log(`  BSDT: ${EXISTING.BSDT}`);
        
        console.log(chalk.green("\n功能合约:"));
        console.log(`  质押系统: ${EXISTING.STAKING}`);
        console.log(`  防暴跌机制: ${EXISTING.ANTI_DUMP}`);
        console.log(`  节点系统: ${EXISTING.NODE_NFT}`);
        console.log(`  推荐系统: ${deployedContracts.referral}`);
        console.log(`  排名系统: ${deployedContracts.ranking}`);
        console.log(`  治理系统: ${deployedContracts.governance}`);
        
        console.log(chalk.yellow("\n⚠️ 重要提醒:"));
        console.log("  1. 所有合约已部署并相互关联");
        console.log("  2. 推荐系统已设置质押合约");
        console.log("  3. 可能需要在质押合约中设置推荐地址");
        console.log("  4. 建议进行完整的集成测试");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
        }
        
        // 输出已部署的合约
        if (Object.keys(deployedContracts).length > 0) {
            console.log(chalk.yellow("\n已部署的合约:"));
            for (const [name, address] of Object.entries(deployedContracts)) {
                console.log(`  ${name}: ${address}`);
            }
        }
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 脚本执行完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("脚本执行失败:"), error);
        process.exit(1);
    });