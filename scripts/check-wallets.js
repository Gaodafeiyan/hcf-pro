const { ethers } = require("hardhat");

async function main() {
    console.log("💰 检查钱包余额\n");
    
    const provider = ethers.provider;
    
    // 检查两个钱包
    const wallets = [
        { name: "部署钱包", address: "0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9" },
        { name: "主钱包(MultiSig)", address: "0x4509f773f2Cb6543837Eabbd27538139feE59496" }
    ];
    
    for (const wallet of wallets) {
        const balance = await provider.getBalance(wallet.address);
        console.log(`${wallet.name}: ${wallet.address}`);
        console.log(`余额: ${ethers.utils.formatEther(balance)} BNB\n`);
    }
    
    console.log("建议:");
    console.log("从主钱包转 0.1 BNB 到部署钱包");
    console.log("或者使用主钱包的私钥进行部署");
}

main().catch(console.error);