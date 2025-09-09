const { ethers } = require("hardhat");

async function main() {
    console.log("\n检查账户信息...\n");
    
    const [signer] = await ethers.getSigners();
    const address = signer.address;
    const balance = await signer.getBalance();
    
    console.log("当前账户:", address);
    console.log("BNB余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 检查是否是owner
    const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
    const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
    const owner = await hcf.owner();
    
    console.log("HCF合约Owner:", owner);
    console.log("是否匹配:", address.toLowerCase() === owner.toLowerCase() ? "✅" : "❌");
    
    if (balance.gte(ethers.utils.parseEther("0.001"))) {
        console.log("\n✅ 余额充足，可以激活税费");
        
        if (address.toLowerCase() === owner.toLowerCase()) {
            console.log("✅ 是合约Owner，可以执行激活");
            console.log("\n运行: npx hardhat run scripts/activate-tax-system.js --network bsc");
        } else {
            console.log("❌ 不是合约Owner，需要转移ownership或使用正确的账户");
        }
    } else {
        console.log("\n❌ BNB余额不足，需要至少0.001 BNB");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("错误:", error);
        process.exit(1);
    });