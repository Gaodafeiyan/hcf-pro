const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🚀 开始部署HCF-PRO全部合约...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");
    
    // 部署地址存储
    const deployedContracts = {};
    
    try {
        // ============ 1. 部署MultiSigWallet (3/5签名) ============
        console.log("1. 部署MultiSigWallet...");
        const signers = [
            deployer.address,
            "0x1234567890123456789012345678901234567891", // 替换为实际签名者
            "0x1234567890123456789012345678901234567892",
            "0x1234567890123456789012345678901234567893",
            "0x1234567890123456789012345678901234567894"
        ];
        
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        const multiSig = await MultiSigWallet.deploy(signers, 3, 48 * 3600); // 3/5签名，48小时时间锁
        await multiSig.deployed();
        deployedContracts.MultiSigWallet = multiSig.address;
        console.log("✅ MultiSigWallet部署于:", multiSig.address);
        
        // ============ 2. 部署USDTOracle ============
        console.log("\n2. 部署USDTOracle...");
        const USDTOracle = await ethers.getContractFactory("USDTOracle");
        const oracle = await USDTOracle.deploy(
            "0x55d398326f99059fF775485246999027B3197955", // BSC主网USDT地址
            3600, // 1小时更新间隔
            ethers.utils.parseUnits("1000000000", 18) // 10亿变化限制
        );
        await oracle.deployed();
        deployedContracts.USDTOracle = oracle.address;
        console.log("✅ USDTOracle部署于:", oracle.address);
        
        // ============ 3. 部署核心代币合约 ============
        console.log("\n3. 部署HCFToken...");
        const HCFToken = await ethers.getContractFactory("HCFToken");
        const hcfToken = await HCFToken.deploy(
            deployer.address, // 临时营销钱包
            deployer.address, // 临时节点池
            deployer.address, // 临时LP池
            deployer.address  // 临时桥地址
        );
        await hcfToken.deployed();
        deployedContracts.HCFToken = hcfToken.address;
        console.log("✅ HCFToken部署于:", hcfToken.address);
        
        // ============ 4. 部署BSDTToken ============
        console.log("\n4. 部署BSDTToken...");
        const BSDTToken = await ethers.getContractFactory("BSDTToken");
        const bsdtToken = await BSDTToken.deploy(
            "0x55d398326f99059fF775485246999027B3197955", // USDT地址
            oracle.address,
            deployer.address, // 临时Keeper
            deployer.address  // 临时LP池
        );
        await bsdtToken.deployed();
        deployedContracts.BSDTToken = bsdtToken.address;
        console.log("✅ BSDTToken部署于:", bsdtToken.address);
        
        // ============ 5. 部署质押合约V2 ============
        console.log("\n5. 部署HCFStakingV2...");
        const HCFStakingV2 = await ethers.getContractFactory("HCFStakingV2");
        const staking = await HCFStakingV2.deploy(
            hcfToken.address,
            bsdtToken.address,
            deployer.address, // 临时桥地址
            deployer.address  // 临时LP池
        );
        await staking.deployed();
        deployedContracts.HCFStakingV2 = staking.address;
        console.log("✅ HCFStakingV2部署于:", staking.address);
        
        // ============ 6. 部署推荐合约V2 ============
        console.log("\n6. 部署HCFReferralV2...");
        const HCFReferralV2 = await ethers.getContractFactory("HCFReferralV2");
        const referral = await HCFReferralV2.deploy(
            hcfToken.address,
            staking.address
        );
        await referral.deployed();
        deployedContracts.HCFReferralV2 = referral.address;
        console.log("✅ HCFReferralV2部署于:", referral.address);
        
        // ============ 7. 部署节点NFT合约V2 ============
        console.log("\n7. 部署HCFNodeNFTV2...");
        const HCFNodeNFTV2 = await ethers.getContractFactory("HCFNodeNFTV2");
        const nodeNFT = await HCFNodeNFTV2.deploy(
            hcfToken.address,
            bsdtToken.address,
            staking.address,
            deployer.address, // 临时交易所地址
            deployer.address  // 临时池地址
        );
        await nodeNFT.deployed();
        deployedContracts.HCFNodeNFTV2 = nodeNFT.address;
        console.log("✅ HCFNodeNFTV2部署于:", nodeNFT.address);
        
        // ============ 8. 部署交易所合约V2 ============
        console.log("\n8. 部署HCFExchangeV2...");
        const HCFExchangeV2 = await ethers.getContractFactory("HCFExchangeV2");
        const exchange = await HCFExchangeV2.deploy(
            hcfToken.address,
            bsdtToken.address,
            "0x55d398326f99059fF775485246999027B3197955", // USDT
            "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
            nodeNFT.address,
            deployer.address // 临时营销钱包
        );
        await exchange.deployed();
        deployedContracts.HCFExchangeV2 = exchange.address;
        console.log("✅ HCFExchangeV2部署于:", exchange.address);
        
        // ============ 9. 部署市场控制合约V2 ============
        console.log("\n9. 部署HCFMarketControlV2...");
        const HCFMarketControlV2 = await ethers.getContractFactory("HCFMarketControlV2");
        const marketControl = await HCFMarketControlV2.deploy(
            hcfToken.address,
            staking.address,
            nodeNFT.address,
            referral.address,
            oracle.address
        );
        await marketControl.deployed();
        deployedContracts.HCFMarketControlV2 = marketControl.address;
        console.log("✅ HCFMarketControlV2部署于:", marketControl.address);
        
        // ============ 10. 部署销毁机制合约 ============
        console.log("\n10. 部署HCFBurnMechanism...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(
            hcfToken.address,
            staking.address,
            referral.address
        );
        await burnMechanism.deployed();
        deployedContracts.HCFBurnMechanism = burnMechanism.address;
        console.log("✅ HCFBurnMechanism部署于:", burnMechanism.address);
        
        // ============ 11. 配置合约关联 ============
        console.log("\n📝 配置合约关联...");
        
        // 设置多签钱包
        console.log("- 设置多签钱包...");
        await hcfToken.setMultiSigWallet(multiSig.address);
        await bsdtToken.setMultiSigWallet(multiSig.address);
        await staking.setMultiSigWallet(multiSig.address);
        await referral.setMultiSigWallet(multiSig.address);
        await nodeNFT.setMultiSigWallet(multiSig.address);
        await exchange.setMultiSigWallet(multiSig.address);
        await marketControl.setMultiSigWallet(multiSig.address);
        
        // 设置授权合约（BSDT）
        console.log("- 授权BSDT交易合约...");
        await bsdtToken.addAuthorizedContract(exchange.address);
        await bsdtToken.addAuthorizedContract(staking.address);
        
        // 设置DEX对（HCF）
        console.log("- 设置DEX交易对...");
        await hcfToken.setDEXPair(exchange.address, true);
        
        // 设置免税地址
        console.log("- 设置免税地址...");
        await hcfToken.setExcludedFromTax(staking.address, true);
        await hcfToken.setExcludedFromTax(referral.address, true);
        await hcfToken.setExcludedFromTax(nodeNFT.address, true);
        await hcfToken.setExcludedFromTax(exchange.address, true);
        
        // ============ 12. 初始化底池 ============
        console.log("\n💰 准备初始化底池...");
        console.log("需要手动执行以下步骤:");
        console.log("1. 向HCF合约转入1000万HCF（首发）+ 900万HCF（储备）");
        console.log("2. 设置多签为HCF储备钱包");
        console.log("3. 初始化交易所底池：100万HCF + 10万BSDT");
        console.log("4. 配置Keeper自动化");
        
        // ============ 保存部署地址 ============
        const fs = require('fs');
        const deploymentInfo = {
            network: hre.network.name,
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: deployedContracts
        };
        
        fs.writeFileSync(
            './deployments.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("\n✨ 所有合约部署完成！");
        console.log("📄 部署信息已保存至 deployments.json");
        
        // 打印汇总
        console.log("\n📋 合约地址汇总:");
        console.log("=====================================");
        for (const [name, address] of Object.entries(deployedContracts)) {
            console.log(`${name}: ${address}`);
        }
        console.log("=====================================");
        
    } catch (error) {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });