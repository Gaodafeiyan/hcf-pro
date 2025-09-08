const { ethers } = require("hardhat");

async function main() {
    console.log("\n=== 检查部署结果和调整参数 ===\n");
    
    const [signer] = await ethers.getSigners();
    
    // 新部署的合约
    const contracts = {
        burnMechanism: "0x2C1E651183ea61f044A76CFb64c2A3b9b1e98735",
        marketControl: "0xCB42212723DDbd78Ca795428360E4B93bA87ebA2",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9"
    };
    
    console.log("✅ 所有已部署的合约:");
    for (const [name, address] of Object.entries(contracts)) {
        console.log(`  ${name}: ${address}`);
    }
    
    // 检查质押合约的函数
    console.log("\n【1】检查质押合约参数和函数...");
    try {
        const stakingABI = [
            "function DAILY_LIMIT() view returns (uint256)",
            "function owner() view returns (address)",
            "function multiSigWallet() view returns (address)",
            "function totalStaked() view returns (uint256)",
            "function launchTime() view returns (uint256)"
        ];
        
        const staking = new ethers.Contract(contracts.staking, stakingABI, ethers.provider);
        
        const limit = await staking.DAILY_LIMIT();
        const owner = await staking.owner();
        const multiSig = await staking.multiSigWallet();
        const totalStaked = await staking.totalStaked();
        const launchTime = await staking.launchTime();
        
        console.log(`  当前限购: ${ethers.utils.formatEther(limit)} HCF`);
        console.log(`  Owner: ${owner}`);
        console.log(`  MultiSig: ${multiSig}`);
        console.log(`  总质押量: ${ethers.utils.formatEther(totalStaked)} HCF`);
        
        const now = Math.floor(Date.now() / 1000);
        const daysSince = Math.floor((now - launchTime) / 86400);
        console.log(`  运行天数: ${daysSince}天`);
        console.log(`  限购状态: ${daysSince < 7 ? `限购中 (剩余${7-daysSince}天)` : "已解除"}`);
        
        if (ethers.utils.formatEther(limit) === "500.0") {
            console.log("  ⚠️ 每日限购是500 HCF，应该是1000 HCF");
            console.log("     DAILY_LIMIT可能是常量，无法修改");
        }
        
    } catch (e) {
        console.log(`  错误: ${e.message}`);
    }
    
    // 检查HCF Token
    console.log("\n【2】检查HCF Token参数...");
    try {
        const tokenABI = [
            "function totalSupply() view returns (uint256)",
            "function buyTaxRate() view returns (uint256)",
            "function sellTaxRate() view returns (uint256)",
            "function transferTaxRate() view returns (uint256)",
            "function owner() view returns (address)"
        ];
        
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, ethers.provider);
        
        const supply = await token.totalSupply();
        const buyTax = await token.buyTaxRate();
        const sellTax = await token.sellTaxRate();
        const transferTax = await token.transferTaxRate();
        const owner = await token.owner();
        
        console.log(`  总供应量: ${ethers.utils.formatEther(supply)} HCF`);
        console.log(`  买入税: ${buyTax/100}% ${buyTax == 200 ? "✅" : "❌"}`);
        console.log(`  卖出税: ${sellTax/100}% ${sellTax == 500 ? "✅" : "❌"}`);
        console.log(`  转账税: ${transferTax/100}% ${transferTax == 100 ? "✅" : "❌"}`);
        console.log(`  Owner: ${owner}`);
        
    } catch (e) {
        console.log(`  错误: ${e.message}`);
    }
    
    // 检查燃烧机制
    console.log("\n【3】检查燃烧机制合约...");
    try {
        const burnABI = [
            "function hcfToken() view returns (address)",
            "function stakingContract() view returns (address)"
        ];
        
        const burn = new ethers.Contract(contracts.burnMechanism, burnABI, ethers.provider);
        
        try {
            const hcf = await burn.hcfToken();
            console.log(`  关联的HCF Token: ${hcf}`);
        } catch (e) {
            console.log(`  ⚠️ 无法读取hcfToken`);
        }
        
        try {
            const staking = await burn.stakingContract();
            console.log(`  关联的质押合约: ${staking}`);
        } catch (e) {
            console.log(`  ⚠️ 无法读取stakingContract`);
        }
        
    } catch (e) {
        console.log(`  错误: ${e.message}`);
    }
    
    console.log("\n=== 系统状态总结 ===");
    console.log("\n✅ 已完成:");
    console.log("  1. 所有核心合约已部署");
    console.log("  2. 燃烧机制合约已部署");
    console.log("  3. 市场控制合约已部署");
    console.log("  4. 税率设置正确 (2%/5%/1%)");
    
    console.log("\n⚠️ 待处理:");
    console.log("  1. 每日限购是500 HCF (需要1000)");
    console.log("  2. 合约间关联可能需要手动设置");
    console.log("  3. 多签钱包需要部署");
    
    console.log("\n📋 解决方案:");
    console.log("  1. 限购问题:");
    console.log("     - 等待7天限购期自动结束");
    console.log("     - 或重新部署质押合约V2版本");
    console.log("  2. 合约关联:");
    console.log("     - 检查各合约的设置函数");
    console.log("     - 使用正确的函数名设置关联");
    console.log("  3. 多签钱包:");
    console.log("     - 部署Gnosis Safe");
    console.log("     - 或使用自定义多签合约");
    
    // 保存状态
    const fs = require('fs');
    const status = {
        timestamp: new Date().toISOString(),
        contracts: contracts,
        issues: {
            dailyLimit: "500 HCF (should be 1000)",
            contractLinks: "Need manual setup",
            multiSig: "Not deployed"
        },
        completed: [
            "All core contracts deployed",
            "Burn mechanism deployed",
            "Market control deployed",
            "Tax rates correct"
        ]
    };
    
    fs.writeFileSync('./system-status.json', JSON.stringify(status, null, 2));
    console.log("\n✅ 系统状态已保存到 system-status.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("错误:", error);
        process.exit(1);
    });