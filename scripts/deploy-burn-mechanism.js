const { ethers } = require("hardhat");

// 单独部署燃烧机制合约的脚本
async function main() {
    console.log("\n=== 部署燃烧机制合约 ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`部署账户: ${deployer.address}`);
    
    const hcfToken = "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC";
    const staking = "0x42C343c61a630d0107B752001caCd50EfbDD13f6";
    
    console.log(`HCF Token: ${hcfToken}`);
    console.log(`质押合约: ${staking}`);
    
    try {
        console.log("\n尝试方式1: 两个参数...");
        const BurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await BurnMechanism.deploy(hcfToken, staking);
        await burnMechanism.deployed();
        
        console.log(`✅ 燃烧机制部署成功: ${burnMechanism.address}`);
        
        // 保存地址
        const fs = require('fs');
        fs.writeFileSync('./burn-mechanism-address.txt', burnMechanism.address);
        
        return burnMechanism.address;
        
    } catch (e1) {
        console.log(`❌ 方式1失败: ${e1.message}`);
        
        try {
            console.log("\n尝试方式2: 一个参数...");
            const BurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
            const burnMechanism = await BurnMechanism.deploy(hcfToken);
            await burnMechanism.deployed();
            
            console.log(`✅ 燃烧机制部署成功: ${burnMechanism.address}`);
            
            // 设置质押合约
            const tx = await burnMechanism.setStakingContract(staking);
            await tx.wait();
            console.log("✅ 已设置质押合约");
            
            // 保存地址
            const fs = require('fs');
            fs.writeFileSync('./burn-mechanism-address.txt', burnMechanism.address);
            
            return burnMechanism.address;
            
        } catch (e2) {
            console.log(`❌ 方式2失败: ${e2.message}`);
            
            // 查看合约代码判断需要什么参数
            console.log("\n请检查 contracts/HCFBurnMechanism.sol 的构造函数需要什么参数");
            console.log("可能的问题:");
            console.log("1. 构造函数参数数量不对");
            console.log("2. 合约未编译");
            console.log("3. 合约名称不对");
            
            // 尝试编译
            console.log("\n尝试编译合约...");
            const { exec } = require('child_process');
            exec('npx hardhat compile', (error, stdout, stderr) => {
                if (error) {
                    console.log(`编译错误: ${error.message}`);
                } else {
                    console.log("编译完成，请重新运行脚本");
                }
            });
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("错误:", error);
        process.exit(1);
    });