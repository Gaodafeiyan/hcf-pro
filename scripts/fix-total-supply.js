const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 修复HCF代币总量到10亿\n");
    console.log("=".repeat(60));
    
    const [signer] = await ethers.getSigners();
    console.log("操作账户:", signer.address);
    
    const hcfTokenAddress = "0xcAA4532032fd78173B3E15d0201d34B78b41CDDf";
    const hcfToken = await ethers.getContractAt("HCFToken", hcfTokenAddress);
    
    try {
        // 检查当前状态
        console.log("\n📊 当前状态:");
        const currentSupply = await hcfToken.totalSupply();
        const owner = await hcfToken.owner();
        const decimals = await hcfToken.decimals();
        
        console.log("当前总供应量:", ethers.utils.formatEther(currentSupply), "HCF");
        console.log("目标总供应量: 1,000,000,000 HCF");
        console.log("差额:", ethers.utils.formatEther(
            ethers.utils.parseEther("1000000000").sub(currentSupply)
        ), "HCF");
        console.log("合约Owner:", owner);
        console.log("你是Owner吗?", owner.toLowerCase() === signer.address.toLowerCase());
        
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log("\n❌ 错误: 你不是合约Owner，无法铸造代币");
            return;
        }
        
        // 计算需要铸造的数量
        const targetSupply = ethers.utils.parseEther("1000000000"); // 10亿
        const amountToMint = targetSupply.sub(currentSupply);
        
        console.log("\n📝 铸造计划:");
        console.log("需要铸造:", ethers.utils.formatEther(amountToMint), "HCF");
        console.log("铸造到地址:", signer.address);
        
        // 检查是否有mint函数
        console.log("\n🔍 检查铸造功能...");
        
        // 方案1: 尝试直接mint（如果合约有mint函数）
        try {
            const mintABI = ["function mint(address to, uint256 amount) external"];
            const hcfWithMint = new ethers.Contract(hcfTokenAddress, mintABI, signer);
            
            console.log("尝试使用mint函数...");
            const tx = await hcfWithMint.mint(signer.address, amountToMint, {
                gasLimit: 200000
            });
            await tx.wait();
            console.log("✅ 成功铸造!");
            
        } catch (mintError) {
            console.log("⚠️ mint函数不可用:", mintError.message.substring(0, 100));
            
            // 方案2: 检查是否有其他铸造方式
            console.log("\n尝试其他方式...");
            
            // 检查是否有_mint内部函数的公开版本
            try {
                const mintToABI = ["function mintTo(address account, uint256 amount) external"];
                const hcfWithMintTo = new ethers.Contract(hcfTokenAddress, mintToABI, signer);
                
                console.log("尝试使用mintTo函数...");
                const tx2 = await hcfWithMintTo.mintTo(signer.address, amountToMint, {
                    gasLimit: 200000
                });
                await tx2.wait();
                console.log("✅ 成功铸造!");
                
            } catch (mintToError) {
                console.log("⚠️ mintTo函数也不可用");
                
                // 方案3: 检查初始供应量设置
                console.log("\n❌ 无法找到铸造函数");
                console.log("\n可能的解决方案:");
                console.log("1. HCF合约可能没有铸造功能");
                console.log("2. 总供应量可能在部署时就固定了");
                console.log("3. 需要部署新的代币合约");
                
                // 读取合约代码看看有什么函数
                console.log("\n📋 尝试读取合约可用函数...");
                
                // 这里我们需要查看HCFToken.sol的源代码
                console.log("\n建议查看contracts/HCFToken.sol确认是否有铸造功能");
            }
        }
        
        // 验证最终结果
        const finalSupply = await hcfToken.totalSupply();
        console.log("\n📊 最终状态:");
        console.log("最终总供应量:", ethers.utils.formatEther(finalSupply), "HCF");
        
        if (finalSupply.eq(targetSupply)) {
            console.log("✅ 总供应量已成功调整到10亿!");
        } else {
            console.log("⚠️ 总供应量未达到目标");
            
            console.log("\n🔧 替代解决方案:");
            console.log("如果合约没有铸造功能，需要:");
            console.log("1. 部署新的HCF代币合约（支持铸造）");
            console.log("2. 或接受当前供应量");
            console.log("3. 或通过销毁机制逐步调整");
        }
        
    } catch (error) {
        console.error("\n❌ 操作失败:", error.message);
        
        console.log("\n📝 错误分析:");
        if (error.message.includes("mint")) {
            console.log("合约可能没有铸造功能");
        }
        if (error.message.includes("Ownable")) {
            console.log("权限问题，需要Owner账户");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });