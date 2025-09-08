const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 验证所有可能部署的HCF-PRO合约\n");
    console.log("=" . repeat(80));
    
    // 所有可能的合约地址
    const possibleContracts = {
        // 确认已部署的5个
        "HCF Token": "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        "BSDT Token": "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        "HCF Referral": "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        "HCF Staking": "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        "HCF Node NFT": "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523",
        
        // 可能已部署的第6个
        "HCF-BSDT Exchange": "0x7c8454816F7a187E01F7B88f3D78c894B7e00e0B",
        
        // 之前提到的3个补充合约（需要验证）
        "HCF Ranking Rewards": null, // 需要查找地址
        "HCF AntiDump Mechanism": null, // 需要查找地址  
        "HCF Redemption Penalty": null, // 需要查找地址
        
        // 第7个燃烧合约（可能未部署）
        "HCF Burn Mechanism": null
    };
    
    const deployedContracts = [];
    const notDeployed = [];
    
    console.log("📋 检查每个合约地址...\n");
    
    for (const [name, address] of Object.entries(possibleContracts)) {
        if (address) {
            try {
                // 检查地址是否有代码
                const code = await ethers.provider.getCode(address);
                if (code !== "0x") {
                    deployedContracts.push({ name, address });
                    console.log(`✅ ${name}: ${address}`);
                    console.log(`   BSCScan: https://bscscan.com/address/${address}`);
                    
                    // 获取余额
                    const balance = await ethers.provider.getBalance(address);
                    console.log(`   合约BNB余额: ${ethers.utils.formatEther(balance)} BNB`);
                    
                    // 尝试获取一些基本信息
                    try {
                        // 尝试调用owner函数
                        const contract = new ethers.Contract(address, ["function owner() view returns (address)"], ethers.provider);
                        const owner = await contract.owner();
                        console.log(`   Owner: ${owner}`);
                    } catch (e) {
                        // 合约可能没有owner函数
                    }
                    console.log("");
                } else {
                    notDeployed.push({ name, address });
                    console.log(`❌ ${name}: 地址无代码 (${address})`);
                }
            } catch (error) {
                console.log(`⚠️ ${name}: 检查失败 - ${error.message}`);
            }
        } else {
            notDeployed.push({ name, address: "未知地址" });
            console.log(`❓ ${name}: 地址未知`);
        }
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("📊 部署统计:");
    console.log("=".repeat(80));
    console.log(`\n✅ 已部署合约数量: ${deployedContracts.length}`);
    deployedContracts.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name}: ${c.address}`);
    });
    
    console.log(`\n❌ 未部署或未知: ${notDeployed.length}`);
    notDeployed.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name}: ${c.address}`);
    });
    
    // 搜索可能遗漏的合约
    console.log("\n" + "=".repeat(80));
    console.log("🔍 搜索其他可能的HCF合约...");
    console.log("=".repeat(80));
    
    // 检查是否有其他3个补充合约的部署记录
    console.log("\n注意: 如果之前部署了HCFRankingRewards、HCFAntiDumpMechanism、");
    console.log("HCFRedemptionPenalty这3个合约，请提供它们的地址。");
    
    console.log("\n" + "=".repeat(80));
    console.log("📊 最终总结:");
    console.log("=".repeat(80));
    console.log(`确认已部署: ${deployedContracts.length}个合约`);
    console.log("HCF-PRO生态系统部署进度: " + (deployedContracts.length / 10 * 100).toFixed(0) + "%");
    
    if (deployedContracts.length === 10) {
        console.log("\n🎉 恭喜！完整的10合约生态系统已全部部署！");
    } else {
        console.log(`\n⚠️ 还需要部署${10 - deployedContracts.length}个合约来完成完整生态系统。`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });