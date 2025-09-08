const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 验证第7个合约（燃烧机制）\n");
    
    const burnAddress = "0xD7AB0Fe8d1833582029a515bC6b1B1e1a39175F6";
    
    try {
        // 检查合约是否存在
        const code = await ethers.provider.getCode(burnAddress);
        
        if (code !== "0x") {
            console.log("✅ HCF Burn Mechanism 合约确实存在!");
            console.log("地址:", burnAddress);
            console.log("BSCScan: https://bscscan.com/address/" + burnAddress);
            
            // 尝试获取owner
            try {
                const burn = new ethers.Contract(burnAddress, ["function owner() view returns (address)"], ethers.provider);
                const owner = await burn.owner();
                console.log("Owner:", owner);
            } catch (e) {
                console.log("无法读取owner");
            }
            
            console.log("\n这是第7个合约，之前我的检查脚本遗漏了它!");
        } else {
            console.log("❌ 地址上没有合约代码");
        }
    } catch (error) {
        console.error("检查失败:", error.message);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 错误原因分析:");
    console.log("=".repeat(60));
    console.log("我之前说只有5个合约是因为:");
    console.log("1. 我的检查脚本不完整，只包含了5个地址");
    console.log("2. 第6个Exchange合约后来发现了");
    console.log("3. 第7个Burn合约地址没有包含在我的检查脚本中");
    console.log("4. 实际上您之前就部署了7个合约");
    console.log("5. 加上刚才新部署的3个，总共10个合约");
    console.log("\n抱歉造成了混淆!");
}

main().catch(console.error);