const { ethers } = require("hardhat");

async function main() {
    console.log("\n=== HCF-RWA 核心参数快速验证 ===\n");
    
    const contracts = {
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9"
    };

    console.log("✅ 已部署的合约地址:");
    for(const [name, addr] of Object.entries(contracts)) {
        console.log(`  ${name}: ${addr}`);
    }

    console.log("\n【1】HCF Token核心参数:");
    try {
        const tokenABI = [
            "function totalSupply() view returns (uint256)",
            "function buyTaxRate() view returns (uint256)",
            "function sellTaxRate() view returns (uint256)", 
            "function transferTaxRate() view returns (uint256)",
            "function owner() view returns (address)",
            "function multiSigWallet() view returns (address)"
        ];
        
        const token = new ethers.Contract(contracts.hcfToken, tokenABI, ethers.provider);
        
        const supply = await token.totalSupply();
        const buyTax = await token.buyTaxRate();
        const sellTax = await token.sellTaxRate();
        const transferTax = await token.transferTaxRate();
        const owner = await token.owner();
        const multiSig = await token.multiSigWallet();
        
        console.log(`  总供应量: ${ethers.utils.formatEther(supply)} HCF`);
        console.log(`  买入税: ${buyTax/100}% ${buyTax == 200 ? "✅" : "❌ 应为2%"}`);
        console.log(`  卖出税: ${sellTax/100}% ${sellTax == 500 ? "✅" : "❌ 应为5%"}`);
        console.log(`  转账税: ${transferTax/100}% ${transferTax == 100 ? "✅" : "❌ 应为1%"}`);
        console.log(`  Owner: ${owner}`);
        console.log(`  MultiSig: ${multiSig}`);
    } catch (e) {
        console.log(`  错误: ${e.message}`);
    }

    console.log("\n【2】质押合约核心参数:");
    try {
        const stakingABI = [
            "function DAILY_LIMIT() view returns (uint256)",
            "function totalStaked() view returns (uint256)",
            "function owner() view returns (address)",
            "function multiSigWallet() view returns (address)"
        ];
        
        const staking = new ethers.Contract(contracts.staking, stakingABI, ethers.provider);
        
        const dailyLimit = await staking.DAILY_LIMIT();
        const totalStaked = await staking.totalStaked();
        const owner = await staking.owner();
        let multiSig = "0x0000000000000000000000000000000000000000";
        try {
            multiSig = await staking.multiSigWallet();
        } catch (e) {}
        
        console.log(`  每日限购: ${ethers.utils.formatEther(dailyLimit)} HCF ${ethers.utils.formatEther(dailyLimit) == "1000.0" ? "✅" : "⚠️ 应为1000"}`);
        console.log(`  总质押量: ${ethers.utils.formatEther(totalStaked)} HCF`);
        console.log(`  Owner: ${owner}`);
        console.log(`  MultiSig: ${multiSig}`);
    } catch (e) {
        console.log(`  错误: ${e.message}`);
    }

    console.log("\n【3】节点NFT核心参数:");
    try {
        const nodeABI = [
            "function MAX_NODES() view returns (uint256)",
            "function nodeCount() view returns (uint256)"
        ];
        
        const node = new ethers.Contract(contracts.nodeNFT, nodeABI, ethers.provider);
        
        const maxNodes = await node.MAX_NODES();
        const nodeCount = await node.nodeCount();
        
        console.log(`  最大节点: ${maxNodes} ${maxNodes == 99 ? "✅" : "❌ 应为99"}`);
        console.log(`  当前节点: ${nodeCount}`);
    } catch (e) {
        console.log(`  错误: ${e.message}`);
    }

    console.log("\n=== 需要处理的问题 ===");
    console.log("1. ❌ 燃烧机制合约未部署");
    console.log("2. ⚠️ 每日限购需要调整为1000 HCF (当前500)");
    console.log("3. ❌ 市场控制合约未部署");
    console.log("4. ⚠️ 多签钱包未设置");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("错误:", error);
        process.exit(1);
    });