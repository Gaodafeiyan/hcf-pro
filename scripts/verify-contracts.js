const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔍 开始验证合约...\n");
    
    // 读取部署信息
    let deployments;
    try {
        const data = fs.readFileSync('./deployments.json', 'utf8');
        deployments = JSON.parse(data);
    } catch (error) {
        console.error("❌ 无法读取deployments.json，请先运行deploy-all.js");
        process.exit(1);
    }
    
    const contracts = deployments.contracts;
    const { ethers } = hre;

    // 验证合约列表
    const verifyList = [
        {
            name: "MultiSigWallet",
            address: contracts.MultiSigWallet,
            args: [
                [
                    deployments.deployer,
                    "0x1234567890123456789012345678901234567891",
                    "0x1234567890123456789012345678901234567892",
                    "0x1234567890123456789012345678901234567893",
                    "0x1234567890123456789012345678901234567894"
                ],
                3,
                48 * 3600
            ]
        },
        {
            name: "USDTOracle",
            address: contracts.USDTOracle,
            args: [
                "0x55d398326f99059fF775485246999027B3197955",
                3600,
                ethers.utils.parseUnits("1000000000", 18)
            ]
        },
        {
            name: "HCFToken",
            address: contracts.HCFToken,
            args: [
                deployments.deployer,
                deployments.deployer,
                deployments.deployer,
                deployments.deployer
            ]
        },
        {
            name: "BSDTToken",
            address: contracts.BSDTToken,
            args: [
                "0x55d398326f99059fF775485246999027B3197955",
                contracts.USDTOracle,
                deployments.deployer,
                deployments.deployer
            ]
        },
        {
            name: "HCFStakingV2",
            address: contracts.HCFStakingV2,
            args: [
                contracts.HCFToken,
                contracts.BSDTToken,
                deployments.deployer,
                deployments.deployer
            ]
        },
        {
            name: "HCFReferralV2",
            address: contracts.HCFReferralV2,
            args: [
                contracts.HCFToken,
                contracts.HCFStakingV2
            ]
        },
        {
            name: "HCFNodeNFTV2",
            address: contracts.HCFNodeNFTV2,
            args: [
                contracts.HCFToken,
                contracts.BSDTToken,
                contracts.HCFStakingV2,
                deployments.deployer,
                deployments.deployer
            ]
        },
        {
            name: "HCFExchangeV2",
            address: contracts.HCFExchangeV2,
            args: [
                contracts.HCFToken,
                contracts.BSDTToken,
                "0x55d398326f99059fF775485246999027B3197955",
                "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                contracts.HCFNodeNFTV2,
                deployments.deployer
            ]
        },
        {
            name: "HCFMarketControlV2",
            address: contracts.HCFMarketControlV2,
            args: [
                contracts.HCFToken,
                contracts.HCFStakingV2,
                contracts.HCFNodeNFTV2,
                contracts.HCFReferralV2,
                contracts.USDTOracle
            ]
        },
        {
            name: "HCFBurnMechanism",
            address: contracts.HCFBurnMechanism,
            args: [
                contracts.HCFToken,
                contracts.HCFStakingV2,
                contracts.HCFReferralV2
            ]
        }
    ];

    
    // 逐个验证
    for (const contract of verifyList) {
        console.log(`\n验证 ${contract.name}...`);
        try {
            await hre.run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.args,
            });
            console.log(`✅ ${contract.name} 验证成功`);
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log(`⚠️ ${contract.name} 已经验证过`);
            } else {
                console.error(`❌ ${contract.name} 验证失败:`, error.message);
            }
        }
    }
    
    console.log("\n✨ 合约验证完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("验证失败:", error);
    process.exit(1);
  });