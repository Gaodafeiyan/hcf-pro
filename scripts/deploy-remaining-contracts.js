const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 部署剩余的2个合约到BSC主网...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.02"))) {
        console.error("❌ BNB余额不足，需要至少0.02 BNB");
        return;
    }
    
    // 已部署的合约地址
    const deployedAddresses = {
        hcfToken: "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        staking: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        nodeNFT: "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
    };
    
    const newContracts = {};
    
    try {
        // 1. 部署HCF-BSDT兑换合约
        console.log("\n📍 部署HCF-BSDT兑换合约...");
        const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
        const exchange = await HCFBSDTExchange.deploy(
            deployedAddresses.hcfToken,                          // HCF token
            deployedAddresses.bsdtToken,                         // BSDT token
            "0x55d398326f99059fF775485246999027B3197955",        // USDT主网地址
            "0x4509f773f2Cb6543837Eabbd27538139feE59496",        // MultiSig钱包
            "0x10ED43C718714eb63d5aA57B78B54704E256024E",        // PancakeSwap Router主网
            "0x4509f773f2Cb6543837Eabbd27538139feE59496"         // Bridge地址
        );
        await exchange.deployed();
        newContracts.exchange = exchange.address;
        console.log("✅ HCF-BSDT兑换合约部署成功:", exchange.address);
        
        // 2. 部署燃烧机制合约
        console.log("\n📍 部署燃烧机制合约...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(deployedAddresses.hcfToken);
        await burnMechanism.deployed();
        newContracts.burnMechanism = burnMechanism.address;
        console.log("✅ 燃烧机制合约部署成功:", burnMechanism.address);
        
        // 保存新合约地址
        const allContracts = {
            ...deployedAddresses,
            exchange: newContracts.exchange,
            burnMechanism: newContracts.burnMechanism
        };
        
        // 更新.env文件
        const envAdditions = `
# 新部署的合约 (${new Date().toISOString()})
HCF_EXCHANGE_MAINNET=${newContracts.exchange}
HCF_BURN_MECHANISM_MAINNET=${newContracts.burnMechanism}
`;
        
        fs.appendFileSync('.env', envAdditions);
        
        // 输出总结
        console.log("\n" + "=".repeat(60));
        console.log("🎉 所有7个合约已成功部署到BSC主网!");
        console.log("=".repeat(60));
        console.log("\n📋 完整的主网合约地址:");
        console.log("1. HCF Token:", deployedAddresses.hcfToken);
        console.log("2. BSDT Token:", deployedAddresses.bsdtToken);
        console.log("3. HCF Referral:", deployedAddresses.referral);
        console.log("4. HCF Staking:", deployedAddresses.staking);
        console.log("5. HCF Node NFT:", deployedAddresses.nodeNFT);
        console.log("6. HCF Exchange:", newContracts.exchange);
        console.log("7. HCF Burn:", newContracts.burnMechanism);
        
        console.log("\n✅ 合约地址已添加到.env文件");
        console.log("\n🎯 下一步: 运行验证脚本验证所有合约");
        
    } catch (error) {
        console.error("\n❌ 部署失败:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });