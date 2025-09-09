const { ethers } = require("hardhat");

async function main() {
    console.log("\n检查税费激活状态...\n");
    
    const HCF = "0xc5c3f24A212838968759045d1654d3643016D585";
    const POOL = "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048";
    
    const hcf = await ethers.getContractAt("HCFToken", HCF);
    const isDEX = await hcf.isDEXPair(POOL);
    
    if (isDEX) {
        console.log("🎉 税费系统已激活！");
        console.log("\n现在PancakeSwap交易会自动扣税:");
        console.log("  买入: 扣2% (0.5%销毁+0.5%营销+0.5%LP+0.5%节点)");
        console.log("  卖出: 扣5% (2%销毁+1%营销+1%LP+1%节点)");
        console.log("  转账: 扣1% (100%销毁)");
        
        const totalBurned = await hcf.totalBurned();
        console.log(`\n已销毁: ${ethers.utils.formatEther(totalBurned)} HCF`);
    } else {
        console.log("❌ 税费系统未激活");
    }
}

main().catch(console.error);