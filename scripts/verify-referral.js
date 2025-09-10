const { ethers } = require("hardhat");

async function main() {
    console.log("\n检查推荐合约状态...\n");
    
    const REFERRAL_ADDRESS = "0xeA0E87ADFdAD8b27E967287f7f6AD8a491d88E4f";
    
    // 检查小写地址
    const lowerAddress = REFERRAL_ADDRESS.toLowerCase();
    console.log("原始地址:", REFERRAL_ADDRESS);
    console.log("小写地址:", lowerAddress);
    
    try {
        // 检查原始地址
        const code1 = await ethers.provider.getCode(REFERRAL_ADDRESS);
        console.log("原始地址代码长度:", code1.length);
        
        // 检查小写地址
        const code2 = await ethers.provider.getCode(lowerAddress);
        console.log("小写地址代码长度:", code2.length);
        
        if (code1.length > 2 || code2.length > 2) {
            console.log("\n✅ 推荐合约已部署!");
            
            // 尝试调用合约
            try {
                const referral = await ethers.getContractAt("HCFReferral", lowerAddress);
                const owner = await referral.owner();
                console.log("合约Owner:", owner);
            } catch (e) {
                console.log("无法读取合约信息");
            }
        } else {
            console.log("\n❌ 推荐合约未部署");
            console.log("需要部署 HCFReferral.sol");
        }
    } catch (error) {
        console.error("检查失败:", error.message);
    }
}

main().catch(console.error);