const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 HCF-PRO Mainnet Status Check\n");
    console.log("=" . repeat(60));
    
    // Mainnet contract addresses
    const contracts = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        staking: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        nodeNFT: "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
    };
    
    const [signer] = await ethers.getSigners();
    console.log("检查账户:", signer.address);
    
    // Check BNB balance
    const balance = await signer.getBalance();
    console.log("BNB余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    console.log("📋 合约状态检查:");
    console.log("-".repeat(60));
    
    try {
        // 1. Check HCF Token
        console.log("\n1. HCF Token (0xcAA4...CDDf)");
        const hcfToken = await ethers.getContractAt("HCFToken", contracts.hcfToken);
        
        // Check basic info
        const hcfName = await hcfToken.name();
        const hcfSymbol = await hcfToken.symbol();
        const hcfTotalSupply = await hcfToken.totalSupply();
        const hcfOwner = await hcfToken.owner();
        
        console.log("   名称:", hcfName);
        console.log("   符号:", hcfSymbol);
        console.log("   总供应量:", ethers.utils.formatEther(hcfTotalSupply), "HCF");
        console.log("   Owner:", hcfOwner);
        console.log("   你是Owner吗?", hcfOwner.toLowerCase() === signer.address.toLowerCase() ? "✅ 是" : "❌ 否");
        
        // Check tax rates
        try {
            const buyTax = await hcfToken.buyTaxRate();
            const sellTax = await hcfToken.sellTaxRate();
            const transferTax = await hcfToken.transferTaxRate();
            console.log("   买入税:", buyTax.toString() / 100, "%");
            console.log("   卖出税:", sellTax.toString() / 100, "%");
            console.log("   转账税:", transferTax.toString() / 100, "%");
        } catch (e) {
            console.log("   ⚠️ 无法读取税率");
        }
        
        // 2. Check BSDT Token
        console.log("\n2. BSDT Token (0x6f5D...f908)");
        const bsdtToken = await ethers.getContractAt("BSDTTokenV2", contracts.bsdtToken);
        
        const bsdtName = await bsdtToken.name();
        const bsdtSymbol = await bsdtToken.symbol();
        const bsdtTotalSupply = await bsdtToken.totalSupply();
        
        console.log("   名称:", bsdtName);
        console.log("   符号:", bsdtSymbol);
        console.log("   总供应量:", ethers.utils.formatEther(bsdtTotalSupply), "BSDT");
        
        // 3. Check Staking Contract
        console.log("\n3. 质押合约 (0x2b74...9252)");
        const staking = await ethers.getContractAt("HCFStakingFixed", contracts.staking);
        
        try {
            // Check if levels are configured
            console.log("   检查质押等级配置...");
            for (let i = 1; i <= 5; i++) {
                try {
                    const level = await staking.stakingLevels(i);
                    if (level.enabled) {
                        console.log(`   V${i}: 最小${ethers.utils.formatEther(level.minAmount)} HCF, ` +
                                  `日化${level.dailyRate / 100}%, ` + 
                                  `复投${ethers.utils.formatEther(level.compoundUnit)} HCF`);
                    }
                } catch (e) {
                    // Level might not exist
                }
            }
        } catch (e) {
            console.log("   ⚠️ 无法读取质押等级");
        }
        
        // 4. Check Referral Contract
        console.log("\n4. 推荐合约 (0xdd9f...aDE0)");
        const referral = await ethers.getContractAt("HCFReferral", contracts.referral);
        
        try {
            const referralOwner = await referral.owner();
            console.log("   Owner:", referralOwner);
            console.log("   推荐合约已部署 ✅");
        } catch (e) {
            console.log("   ⚠️ 无法访问推荐合约");
        }
        
        // 5. Check Node NFT
        console.log("\n5. 节点NFT (0x229a...9523)");
        const nodeNFT = await ethers.getContractAt("HCFNodeNFT", contracts.nodeNFT);
        
        try {
            const nftName = await nodeNFT.name();
            const nftSymbol = await nodeNFT.symbol();
            console.log("   名称:", nftName);
            console.log("   符号:", nftSymbol);
            console.log("   节点NFT已部署 ✅");
        } catch (e) {
            console.log("   ⚠️ 无法访问节点NFT");
        }
        
    } catch (error) {
        console.error("\n❌ 错误:", error.message);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 部署总结:");
    console.log("- 已部署5个核心合约到BSC主网");
    console.log("- 合约地址已确认");
    console.log("- 需要配置税率和其他参数");
    console.log("=".repeat(60));
    
    console.log("\n🎯 下一步操作:");
    console.log("1. 更新.env文件添加主网地址");
    console.log("2. 在BSCScan验证合约");
    console.log("3. 配置税率和质押参数");
    console.log("4. 部署剩余的辅助合约");
    console.log("5. 集成前端并测试");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });