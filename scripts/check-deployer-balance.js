const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.getBalance();
    
    console.log("账户:", deployer.address);
    console.log("余额:", ethers.utils.formatEther(balance), "BNB");
    
    // 估算部署成本
    const gasPrice = await deployer.getGasPrice();
    console.log("当前Gas价格:", ethers.utils.formatUnits(gasPrice, "gwei"), "Gwei");
    
    const estimatedGas = 3000000; // 预估gas
    const estimatedCost = gasPrice.mul(estimatedGas);
    console.log("预估部署成本:", ethers.utils.formatEther(estimatedCost), "BNB");
    
    if (balance.lt(estimatedCost)) {
        console.log("\n⚠️ 余额不足!");
        const needed = estimatedCost.sub(balance);
        console.log("还需要:", ethers.utils.formatEther(needed), "BNB");
        console.log("\n请向以下地址转入BNB:");
        console.log(deployer.address);
    } else {
        console.log("\n✅ 余额充足，可以部署");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });