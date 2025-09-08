const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   HCF-RWA 问题修复脚本"));
    console.log(chalk.blue.bold("========================================\n"));
    
    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`操作账户: ${deployer.address}`));
    
    const balance = await deployer.getBalance();
    console.log(chalk.gray(`账户余额: ${ethers.utils.formatEther(balance)} BNB\n`));

    if (balance.lt(ethers.utils.parseEther("0.05"))) {
        console.log(chalk.red("❌ BNB余额不足，需要至少0.05 BNB"));
        return;
    }

    // 已部署的合约地址
    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9"
    };

    let burnMechanismAddress = "";
    let marketControlAddress = "";

    // ========== 1. 部署燃烧机制合约 ==========
    console.log(chalk.yellow.bold("【1/5】部署燃烧机制合约..."));
    try {
        const BurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await BurnMechanism.deploy(
            contracts.hcfToken,
            contracts.staking
        );
        await burnMechanism.deployed();
        burnMechanismAddress = burnMechanism.address;
        console.log(chalk.green(`✅ 燃烧机制部署成功: ${burnMechanismAddress}`));
        
        // 设置推荐合约
        console.log(chalk.gray("  设置推荐合约关联..."));
        const tx1 = await burnMechanism.setReferralContract(contracts.referral);
        await tx1.wait();
        console.log(chalk.green("  ✅ 已关联推荐合约"));
        
    } catch (e) {
        console.log(chalk.red(`❌ 燃烧机制部署失败: ${e.message}`));
        // 如果是参数问题，尝试不同的构造方式
        if (e.message.includes("missing argument")) {
            console.log(chalk.yellow("  尝试修复构造参数..."));
            try {
                const BurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
                // 可能只需要一个参数
                const burnMechanism = await BurnMechanism.deploy(contracts.hcfToken);
                await burnMechanism.deployed();
                burnMechanismAddress = burnMechanism.address;
                console.log(chalk.green(`  ✅ 燃烧机制部署成功 (备用): ${burnMechanismAddress}`));
            } catch (e2) {
                console.log(chalk.red(`  ❌ 备用部署也失败: ${e2.message}`));
            }
        }
    }

    // ========== 2. 部署市场控制合约 ==========
    console.log(chalk.yellow.bold("\n【2/5】部署市场控制合约..."));
    try {
        const MarketControl = await ethers.getContractFactory("HCFMarketControl");
        const marketControl = await MarketControl.deploy(contracts.hcfToken);
        await marketControl.deployed();
        marketControlAddress = marketControl.address;
        console.log(chalk.green(`✅ 市场控制部署成功: ${marketControlAddress}`));
        
        // 设置相关合约
        console.log(chalk.gray("  设置合约关联..."));
        const tx2 = await marketControl.setStakingContract(contracts.staking);
        await tx2.wait();
        console.log(chalk.green("  ✅ 已关联质押合约"));
        
    } catch (e) {
        console.log(chalk.red(`❌ 市场控制部署失败: ${e.message}`));
    }

    // ========== 3. 调整每日限购 ==========
    console.log(chalk.yellow.bold("\n【3/5】调整每日限购为1000 HCF..."));
    try {
        const stakingABI = [
            "function owner() view returns (address)",
            "function multiSigWallet() view returns (address)",
            "function setDailyLimit(uint256) external"
        ];
        
        const staking = new ethers.Contract(contracts.staking, stakingABI, deployer);
        
        // 检查权限
        const owner = await staking.owner();
        let multiSig = "0x0000000000000000000000000000000000000000";
        try {
            multiSig = await staking.multiSigWallet();
        } catch (e) {}
        
        console.log(chalk.gray(`  Owner: ${owner}`));
        console.log(chalk.gray(`  MultiSig: ${multiSig}`));
        console.log(chalk.gray(`  当前账户: ${deployer.address}`));
        
        if (deployer.address.toLowerCase() === owner.toLowerCase() || 
            deployer.address.toLowerCase() === multiSig.toLowerCase()) {
            
            // 尝试调整限购
            const newLimit = ethers.utils.parseEther("1000");
            const tx3 = await staking.setDailyLimit(newLimit);
            await tx3.wait();
            console.log(chalk.green("✅ 每日限购已调整为1000 HCF"));
            
        } else {
            console.log(chalk.yellow("⚠️ 当前账户没有权限调整限购"));
            console.log(chalk.gray("  需要使用Owner或MultiSig账户"));
        }
    } catch (e) {
        console.log(chalk.yellow(`⚠️ 无法调整限购: ${e.message}`));
        console.log(chalk.gray("  可能没有setDailyLimit函数或权限不足"));
    }

    // ========== 4. 设置多签钱包 ==========
    console.log(chalk.yellow.bold("\n【4/5】配置多签钱包..."));
    console.log(chalk.yellow("⚠️ 多签钱包需要单独部署和配置"));
    console.log(chalk.gray("  建议使用Gnosis Safe或自定义多签合约"));

    // ========== 5. 完成合约关联 ==========
    console.log(chalk.yellow.bold("\n【5/5】设置合约间关联..."));
    
    if (burnMechanismAddress) {
        try {
            // 在质押合约中设置燃烧机制
            const stakingABI = ["function setBurnMechanism(address) external"];
            const staking = new ethers.Contract(contracts.staking, stakingABI, deployer);
            const tx4 = await staking.setBurnMechanism(burnMechanismAddress);
            await tx4.wait();
            console.log(chalk.green("✅ 质押合约已关联燃烧机制"));
        } catch (e) {
            console.log(chalk.yellow("⚠️ 无法在质押合约设置燃烧机制"));
        }
    }
    
    if (marketControlAddress) {
        try {
            // 在HCF Token中设置市场控制
            const tokenABI = ["function setMarketControl(address) external"];
            const token = new ethers.Contract(contracts.hcfToken, tokenABI, deployer);
            const tx5 = await token.setMarketControl(marketControlAddress);
            await tx5.wait();
            console.log(chalk.green("✅ HCF Token已关联市场控制"));
        } catch (e) {
            console.log(chalk.yellow("⚠️ 无法在Token设置市场控制"));
        }
    }

    // ========== 总结 ==========
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         修复总结"));
    console.log(chalk.blue.bold("========================================"));
    
    console.log(chalk.cyan("\n新部署的合约:"));
    if (burnMechanismAddress) {
        console.log(chalk.green(`  ✅ 燃烧机制: ${burnMechanismAddress}`));
    } else {
        console.log(chalk.red(`  ❌ 燃烧机制: 未部署`));
    }
    
    if (marketControlAddress) {
        console.log(chalk.green(`  ✅ 市场控制: ${marketControlAddress}`));
    } else {
        console.log(chalk.red(`  ❌ 市场控制: 未部署`));
    }
    
    console.log(chalk.cyan("\n下一步操作:"));
    console.log(chalk.white("  1. 运行 simple-verify.js 验证修复结果"));
    console.log(chalk.white("  2. 如有权限问题，使用正确的Owner账户"));
    console.log(chalk.white("  3. 部署多签钱包合约"));
    console.log(chalk.white("  4. 在BSCScan验证所有合约"));
    
    // 保存部署结果
    const fs = require('fs');
    const deploymentResult = {
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        burnMechanism: burnMechanismAddress,
        marketControl: marketControlAddress,
        existingContracts: contracts
    };
    
    fs.writeFileSync(
        './fix-deployment-result.json',
        JSON.stringify(deploymentResult, null, 2)
    );
    
    console.log(chalk.green("\n✅ 部署结果已保存到 fix-deployment-result.json"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("\n❌ 脚本执行失败:"), error);
        process.exit(1);
    });