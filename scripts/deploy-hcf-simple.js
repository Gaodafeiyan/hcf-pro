const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("\n部署新HCF合约...");
    
    const [deployer] = await ethers.getSigners();
    console.log("账户:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("BNB:", ethers.utils.formatEther(balance));
    
    if (balance.lt(ethers.utils.parseEther("0.05"))) {
        console.log("BNB不足");
        return;
    }
    
    try {
        const addr = deployer.address;
        
        console.log("开始部署...");
        const HCFToken = await ethers.getContractFactory("HCFToken");
        const hcf = await HCFToken.deploy(
            addr,  // marketingWallet
            addr,  // nodePool
            addr,  // lpPool
            addr   // bridgeAddress
        );
        
        await hcf.deployed();
        
        console.log("✅ HCF部署成功!");
        console.log("地址:", hcf.address);
        
        const totalSupply = await hcf.totalSupply();
        console.log("总量:", ethers.utils.formatEther(totalSupply), "HCF");
        
        // 保存地址
        const info = {
            HCF_NEW: hcf.address,
            totalSupply: ethers.utils.formatEther(totalSupply),
            deployTime: new Date().toISOString()
        };
        
        fs.writeFileSync('./new-hcf.json', JSON.stringify(info, null, 2));
        console.log("已保存到 new-hcf.json");
        
    } catch (error) {
        console.log("错误:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });