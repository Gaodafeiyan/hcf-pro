const { ethers } = require("hardhat");
const chalk = require("chalk");

// 已部署的合约地址
const DEPLOYED_CONTRACTS = {
    hcfToken: "", // 需要从质押合约获取
    staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
    referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D"
};

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   修复燃烧机制合约部署"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`部署账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    // 1. 获取HCF Token地址
    console.log(chalk.yellow("📋 [1/3] 获取HCF Token地址..."));
    const stakingABI = ["function hcfToken() view returns (address)"];
    const stakingContract = new ethers.Contract(DEPLOYED_CONTRACTS.staking, stakingABI, ethers.provider);
    
    try {
        DEPLOYED_CONTRACTS.hcfToken = await stakingContract.hcfToken();
        console.log(chalk.green(`✅ HCF Token: ${DEPLOYED_CONTRACTS.hcfToken}`));
    } catch (error) {
        console.log(chalk.red(`❌ 无法获取HCF Token地址: ${error.message}`));
        return;
    }

    // 2. 部署燃烧机制合约
    console.log(chalk.yellow("\n📋 [2/3] 部署燃烧机制合约..."));
    try {
        const BurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        
        // HCFBurnMechanism需要2个参数：HCF代币地址和质押合约地址
        const burnMechanism = await BurnMechanism.deploy(
            DEPLOYED_CONTRACTS.hcfToken,
            DEPLOYED_CONTRACTS.staking
        );
        
        await burnMechanism.deployed();
        console.log(chalk.green(`✅ 燃烧机制合约部署成功: ${burnMechanism.address}`));
        
        // 3. 配置合约关联
        console.log(chalk.yellow("\n📋 [3/3] 配置合约关联..."));
        
        // 设置推荐合约地址
        try {
            console.log(chalk.gray("  设置推荐合约地址..."));
            const tx = await burnMechanism.setReferralContract(DEPLOYED_CONTRACTS.referral);
            await tx.wait();
            console.log(chalk.green("  ✅ 推荐合约地址已设置"));
        } catch (error) {
            console.log(chalk.yellow(`  ⚠️ 设置推荐合约失败: ${error.message}`));
        }
        
        // 保存部署信息
        const fs = require('fs');
        const deploymentInfo = {
            burnMechanism: burnMechanism.address,
            hcfToken: DEPLOYED_CONTRACTS.hcfToken,
            staking: DEPLOYED_CONTRACTS.staking,
            referral: DEPLOYED_CONTRACTS.referral,
            timestamp: new Date().toISOString(),
            deployer: deployer.address
        };
        
        fs.writeFileSync(
            './burn-mechanism-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green.bold("\n========================================"));
        console.log(chalk.green.bold("         部署完成"));
        console.log(chalk.green.bold("========================================"));
        console.log(chalk.white("\n部署地址:"));
        console.log(chalk.white(`  燃烧机制: ${burnMechanism.address}`));
        console.log(chalk.white(`  HCF Token: ${DEPLOYED_CONTRACTS.hcfToken}`));
        console.log(chalk.white(`  质押合约: ${DEPLOYED_CONTRACTS.staking}`));
        console.log(chalk.white(`  推荐合约: ${DEPLOYED_CONTRACTS.referral}`));
        
        console.log(chalk.cyan("\n下一步操作:"));
        console.log(chalk.white("  1. 在质押合约中设置燃烧机制地址"));
        console.log(chalk.white("  2. 在推荐合约中设置燃烧机制地址"));
        console.log(chalk.white("  3. 部署市场控制合约"));
        console.log(chalk.white("  4. 运行验证脚本检查所有配置"));
        
    } catch (error) {
        console.log(chalk.red(`\n❌ 部署失败: ${error.message}`));
        
        // 如果是参数错误，提供修复建议
        if (error.message.includes("missing argument")) {
            console.log(chalk.yellow("\n💡 修复建议:"));
            console.log(chalk.white("  检查HCFBurnMechanism合约的构造函数参数"));
            console.log(chalk.white("  确保传入正确数量的参数"));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("\n❌ 脚本执行失败:"), error);
        process.exit(1);
    });