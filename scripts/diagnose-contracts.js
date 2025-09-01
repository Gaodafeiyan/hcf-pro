const { ethers } = require("hardhat");

async function main() {
    console.log("=== 诊断合约状态 ===\n");
    
    const HCF_TOKEN = "0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc";
    const HCF_STAKING = "0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74";
    
    const [signer] = await ethers.getSigners();
    console.log("使用账户:", signer.address);
    
    const provider = signer.provider;
    
    // 1. 检查HCF Token合约
    console.log("\n[1] 检查HCF Token合约:");
    const hcfCode = await provider.getCode(HCF_TOKEN);
    if (hcfCode === "0x") {
        console.log("❌ HCF Token合约地址无代码，合约不存在！");
        console.log("   地址:", HCF_TOKEN);
        return;
    } else {
        console.log("✅ HCF Token合约存在");
        console.log("   代码长度:", hcfCode.length);
    }
    
    // 2. 检查Staking合约
    console.log("\n[2] 检查Staking合约:");
    const stakingCode = await provider.getCode(HCF_STAKING);
    if (stakingCode === "0x") {
        console.log("❌ Staking合约地址无代码，合约不存在！");
        console.log("   地址:", HCF_STAKING);
        return;
    } else {
        console.log("✅ Staking合约存在");
        console.log("   代码长度:", stakingCode.length);
    }
    
    // 3. 尝试基本调用
    console.log("\n[3] 测试合约调用:");
    
    try {
        // 创建最小ABI
        const minimalABI = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ];
        
        const hcfToken = new ethers.Contract(HCF_TOKEN, minimalABI, signer);
        
        // 测试基本函数
        console.log("   测试name()...");
        const name = await hcfToken.name();
        console.log("   ✅ Name:", name);
        
        console.log("   测试symbol()...");
        const symbol = await hcfToken.symbol();
        console.log("   ✅ Symbol:", symbol);
        
        console.log("   测试decimals()...");
        const decimals = await hcfToken.decimals();
        console.log("   ✅ Decimals:", decimals);
        
        console.log("   测试totalSupply()...");
        const totalSupply = await hcfToken.totalSupply();
        console.log("   ✅ Total Supply:", ethers.formatUnits(totalSupply, decimals));
        
        console.log("   测试balanceOf()...");
        const balance = await hcfToken.balanceOf(signer.address);
        console.log("   ✅ Balance:", ethers.formatUnits(balance, decimals));
        
        console.log("   测试allowance()...");
        const allowance = await hcfToken.allowance(signer.address, HCF_STAKING);
        console.log("   ✅ Allowance:", ethers.formatUnits(allowance, decimals));
        
    } catch (error) {
        console.log("❌ 合约调用失败:");
        console.log("   错误:", error.message);
        
        // 可能是代理合约，尝试其他方法
        console.log("\n[4] 尝试直接RPC调用:");
        try {
            // 使用eth_call直接调用
            const result = await provider.call({
                to: HCF_TOKEN,
                data: "0x06fdde03" // name()的函数选择器
            });
            console.log("   name() raw result:", result);
        } catch (e) {
            console.log("   直接调用也失败:", e.message);
        }
    }
    
    // 4. 列出所有已知合约地址
    console.log("\n[4] 所有合约地址:");
    const contracts = {
        HCFToken: "0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc",
        BSDT: "0x622e568976f6cC2eaE4cfd3836d92F111000E787",
        HCFStaking: "0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74",
        HCFNode: "0xac851E1494a87dEb81D777AD34c02C6cA04e66Ea",
        HCFReferral: "0x40C12569C35464CA7E3D9e5Fd30B949972694b8b",
        MultiSigWallet: "0x3df246f746e9Ec8FF7d72056DAec0bC0FbdFe4eC",
    };
    
    for (const [name, address] of Object.entries(contracts)) {
        const code = await provider.getCode(address);
        console.log(`   ${name}: ${code === "0x" ? "❌ 不存在" : "✅ 存在"} (${address})`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });