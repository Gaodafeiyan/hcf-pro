// 独立测试脚本，不依赖Hardhat
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    console.log("=== 测试合约连接 ===\n");
    
    // BSC测试网RPC
    const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    
    // 合约地址
    const HCF_TOKEN = "0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc";
    const HCF_STAKING = "0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74";
    
    console.log("[1] 检查网络连接:");
    const network = await provider.getNetwork();
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Name:", network.name || "BSC Testnet");
    
    console.log("\n[2] 检查HCF Token合约:");
    const hcfCode = await provider.getCode(HCF_TOKEN);
    if (hcfCode === "0x") {
        console.log("   ❌ 合约不存在于地址:", HCF_TOKEN);
        console.log("   这个地址上没有部署合约！");
    } else {
        console.log("   ✅ 合约存在");
        console.log("   代码长度:", hcfCode.length);
        
        // 尝试调用
        try {
            const abi = [
                "function name() view returns (string)",
                "function symbol() view returns (string)",
                "function balanceOf(address) view returns (uint256)",
                "function allowance(address,address) view returns (uint256)"
            ];
            
            const contract = new ethers.Contract(HCF_TOKEN, abi, provider);
            
            const name = await contract.name();
            const symbol = await contract.symbol();
            console.log("   Name:", name);
            console.log("   Symbol:", symbol);
            
            // 测试allowance函数
            const testAddress = "0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9";
            const allowance = await contract.allowance(testAddress, HCF_STAKING);
            console.log("   Allowance测试成功:", ethers.formatUnits(allowance, 18), "HCF");
            
        } catch (error) {
            console.log("   ❌ 合约调用失败:", error.message);
        }
    }
    
    console.log("\n[3] 检查Staking合约:");
    const stakingCode = await provider.getCode(HCF_STAKING);
    if (stakingCode === "0x") {
        console.log("   ❌ 合约不存在于地址:", HCF_STAKING);
    } else {
        console.log("   ✅ 合约存在");
        console.log("   代码长度:", stakingCode.length);
    }
    
    console.log("\n[4] 检查其他合约:");
    const contracts = {
        "BSDT": "0x622e568976f6cC2eaE4cfd3836d92F111000E787",
        "HCFNode": "0xac851E1494a87dEb81D777AD34c02C6cA04e66Ea",
        "HCFReferral": "0x40C12569C35464CA7E3D9e5Fd30B949972694b8b",
    };
    
    for (const [name, address] of Object.entries(contracts)) {
        const code = await provider.getCode(address);
        console.log(`   ${name}: ${code === "0x" ? "❌ 不存在" : "✅ 存在"}`);
    }
    
    console.log("\n结论:");
    if (hcfCode === "0x") {
        console.log("❌ HCF Token合约未部署到指定地址，需要重新部署或更新地址！");
    } else {
        console.log("✅ 合约已部署，可能是ABI不匹配或其他问题");
    }
}

main().catch(console.error);