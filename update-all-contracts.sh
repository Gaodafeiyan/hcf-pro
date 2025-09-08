#!/bin/bash

echo "========================================="
echo "更新所有合约的HCF Token地址"
echo "========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}请输入新的HCF Token V3地址:${NC}"
read NEW_HCF_ADDRESS

if [ -z "$NEW_HCF_ADDRESS" ]; then
    echo "错误: 地址不能为空"
    exit 1
fi

echo -e "${YELLOW}新HCF地址: $NEW_HCF_ADDRESS${NC}"
echo ""

# 创建更新脚本
cat > scripts/update-contracts.js << EOF
const hre = require("hardhat");

async function main() {
    console.log("🔧 更新所有合约的HCF Token地址...\n");
    
    const [signer] = await ethers.getSigners();
    console.log("操作账户:", signer.address);
    
    const newHCFAddress = "$NEW_HCF_ADDRESS";
    console.log("新HCF Token地址:", newHCFAddress);
    
    // 需要更新的合约
    const contracts = {
        staking: "0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252",
        referral: "0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0",
        nodeNFT: "0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523",
        exchange: "0x7c8454816F7a187E01F7B88f3D78c894B7e00e0B",
        burn: "0xD7AB0Fe8d1833582029a515bC6b1B1e1a39175F6",
        ranking: "0x48B6b175bd24F2083f5997eC13D8AaD8220A15Ad",
        antiDump: "0x766ba9b2b870b96Fa312aBA9f5Cc790c718CF5FE",
        redemption: "0xB850F8842d8d569F4469021a34BF81dFa536F17F",
        governance: "0x830377fde4169b1a260a962712bfa90C1BEb8FE6"
    };
    
    console.log("\n开始更新各合约...\n");
    
    // 1. 更新质押合约
    try {
        console.log("1. 更新质押合约...");
        const stakingABI = ["function setHCFToken(address _hcfToken) external"];
        const staking = new ethers.Contract(contracts.staking, stakingABI, signer);
        const tx1 = await staking.setHCFToken(newHCFAddress);
        await tx1.wait();
        console.log("   ✅ 质押合约已更新");
    } catch (e) {
        console.log("   ⚠️ 质押合约更新失败:", e.message.substring(0, 50));
    }
    
    // 2. 更新推荐合约
    try {
        console.log("2. 更新推荐合约...");
        const referralABI = ["function setHCFToken(address _token) external"];
        const referral = new ethers.Contract(contracts.referral, referralABI, signer);
        const tx2 = await referral.setHCFToken(newHCFAddress);
        await tx2.wait();
        console.log("   ✅ 推荐合约已更新");
    } catch (e) {
        console.log("   ⚠️ 推荐合约更新失败:", e.message.substring(0, 50));
    }
    
    // 3. 更新节点NFT
    try {
        console.log("3. 更新节点NFT合约...");
        const nodeABI = ["function setHCFToken(address _token) external"];
        const node = new ethers.Contract(contracts.nodeNFT, nodeABI, signer);
        const tx3 = await node.setHCFToken(newHCFAddress);
        await tx3.wait();
        console.log("   ✅ 节点NFT已更新");
    } catch (e) {
        console.log("   ⚠️ 节点NFT更新失败:", e.message.substring(0, 50));
    }
    
    // 4. 更新治理合约
    try {
        console.log("4. 更新治理合约...");
        const govABI = ["function updateContracts(address,address,address,address,address) external"];
        const gov = new ethers.Contract(contracts.governance, govABI, signer);
        const tx4 = await gov.updateContracts(
            newHCFAddress,
            "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908", // BSDT保持不变
            contracts.staking,
            contracts.referral,
            contracts.nodeNFT
        );
        await tx4.wait();
        console.log("   ✅ 治理合约已更新");
    } catch (e) {
        console.log("   ⚠️ 治理合约更新失败:", e.message.substring(0, 50));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 更新结果:");
    console.log("=".repeat(60));
    console.log("注意: 某些合约可能没有更新函数，需要重新部署");
    console.log("\n建议:");
    console.log("1. 检查每个合约是否成功更新");
    console.log("2. 在PancakeSwap创建新的流动性池");
    console.log("3. 更新前端配置");
    console.log("4. 通知用户迁移");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
EOF

# 执行更新
echo -e "${YELLOW}开始更新所有合约...${NC}"
npx hardhat run scripts/update-contracts.js --network bsc

echo -e "${GREEN}✅ 更新脚本执行完成${NC}"
echo "请检查哪些合约成功更新，哪些需要重新部署"