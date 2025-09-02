const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');

async function main() {
    console.log("💰 初始化交易池和配置系统...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);
    
    // 读取部署信息
    let deployments;
    try {
        const data = fs.readFileSync('./deployments.json', 'utf8');
        deployments = JSON.parse(data);
    } catch (error) {
        console.error("❌ 无法读取deployments.json");
        process.exit(1);
    }
    
    const contracts = deployments.contracts;
    
    try {
        // ============ 1. 初始化HCF代币储备 ============
        console.log("1. 设置HCF储备金...");
        const HCFToken = await ethers.getContractAt("HCFToken", contracts.HCFToken);
        
        // 设置多签为储备钱包
        const tx1 = await HCFToken.setMultiSigWallet(contracts.MultiSigWallet);
        await tx1.wait();
        console.log("✅ 多签钱包已设置为储备管理");
        
        // ============ 2. 初始化交易所底池 ============
        console.log("\n2. 初始化交易所底池...");
        const HCFExchange = await ethers.getContractAt("HCFExchangeV2", contracts.HCFExchangeV2);
        const BSDTToken = await ethers.getContractAt("BSDTToken", contracts.BSDTToken);
        
        // 批准代币
        console.log("- 批准HCF代币...");
        const approveHCF = await HCFToken.approve(
            contracts.HCFExchangeV2,
            ethers.utils.parseEther("1000000") // 100万HCF
        );
        await approveHCF.wait();
        
        console.log("- 批准BSDT代币...");
        const approveBSDT = await BSDTToken.approve(
            contracts.HCFExchangeV2,
            ethers.utils.parseEther("100000") // 10万BSDT
        );
        await approveBSDT.wait();
        
        // 初始化底池
        console.log("- 初始化底池（100万HCF + 10万BSDT）...");
        const initPool = await HCFExchange.initializePool();
        await initPool.wait();
        console.log("✅ 底池初始化完成，初始价格0.1 USD");
        
        // ============ 3. 配置质押合约 ============
        console.log("\n3. 配置质押合约...");
        const HCFStaking = await ethers.getContractAt("HCFStakingV2", contracts.HCFStakingV2);
        
        // 设置多签
        const tx2 = await HCFStaking.setMultiSigWallet(contracts.MultiSigWallet);
        await tx2.wait();
        console.log("✅ 质押合约多签已设置");
        
        // ============ 4. 配置推荐合约 ============
        console.log("\n4. 配置推荐合约...");
        const HCFReferral = await ethers.getContractAt("HCFReferralV2", contracts.HCFReferralV2);
        
        // 设置多签
        const tx3 = await HCFReferral.setMultiSigWallet(contracts.MultiSigWallet);
        await tx3.wait();
        
        // 设置动态收益比例（70%）
        const tx4 = await HCFReferral.setDynamicYieldRatio(7000);
        await tx4.wait();
        console.log("✅ 推荐合约配置完成，动态收益70%");
        
        // ============ 5. 配置节点NFT ============
        console.log("\n5. 配置节点NFT合约...");
        const HCFNodeNFT = await ethers.getContractAt("HCFNodeNFTV2", contracts.HCFNodeNFTV2);
        
        // 设置多签
        const tx5 = await HCFNodeNFT.setMultiSigWallet(contracts.MultiSigWallet);
        await tx5.wait();
        console.log("✅ 节点NFT配置完成，限量99个");
        
        // ============ 6. 配置市场控制 ============
        console.log("\n6. 配置市场控制合约...");
        const MarketControl = await ethers.getContractAt("HCFMarketControlV2", contracts.HCFMarketControlV2);
        
        // 设置多签
        const tx6 = await MarketControl.setMultiSigWallet(contracts.MultiSigWallet);
        await tx6.wait();
        
        // 启用所有保护机制
        const tx7 = await MarketControl.setMechanismStatus(true, true, true);
        await tx7.wait();
        console.log("✅ 市场控制已启用：防暴跌✓ 减产✓ 衰减✓");
        
        // ============ 7. 显示系统状态 ============
        console.log("\n📊 系统初始化完成！");
        console.log("=====================================");
        console.log("底池状态:");
        const poolInfo = await HCFExchange.getPoolInfo();
        console.log("- HCF储备:", ethers.utils.formatEther(poolInfo.hcfRes), "HCF");
        console.log("- BSDT储备:", ethers.utils.formatEther(poolInfo.bsdtRes), "BSDT");
        console.log("- 当前价格:", ethers.utils.formatEther(poolInfo.price), "USD");
        console.log("=====================================");
        
        console.log("\n⚠️ 下一步操作:");
        console.log("1. 配置Keeper自动化监控");
        console.log("2. 添加多签签名者");
        console.log("3. 开放用户注册和质押");
        console.log("4. 启动节点NFT销售");
        
    } catch (error) {
        console.error("❌ 初始化失败:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });