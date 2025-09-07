#!/bin/bash

# 部署修复版质押合约脚本
# 用于在远程服务器上部署HCFStakingFixed

echo "========================================="
echo "HCF-PRO 质押合约修复版部署脚本"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境
echo -e "${YELLOW}[1/5] 检查环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js${NC}"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 未找到 npx${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境检查通过${NC}"

# 安装依赖（如果需要）
echo -e "${YELLOW}[2/5] 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 编译合约
echo -e "${YELLOW}[3/5] 编译合约...${NC}"
npx hardhat compile

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 合约编译失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 合约编译成功${NC}"

# 创建部署脚本
echo -e "${YELLOW}[4/5] 创建部署脚本...${NC}"
cat > scripts/deploy-staking-fixed.js << 'EOF'
const hre = require("hardhat");

async function main() {
    console.log("部署 HCFStakingFixed 合约...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 从环境变量或配置文件读取地址
    const HCF_TOKEN = process.env.HCF_TOKEN_ADDRESS || "0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc";
    const BSDT_TOKEN = process.env.BSDT_TOKEN_V2_ADDRESS || "0x91152b436A5b3535E01902Cf09a3c59Ab4c433BD";
    const MULTISIG = process.env.MULTISIG_ADDRESS || deployer.address;
    const COLLECTION = process.env.COLLECTION_ADDRESS || deployer.address;
    const BRIDGE = process.env.BRIDGE_ADDRESS || deployer.address;
    
    console.log("配置地址:");
    console.log("- HCF Token:", HCF_TOKEN);
    console.log("- BSDT Token V2:", BSDT_TOKEN);
    console.log("- MultiSig:", MULTISIG);
    console.log("- Collection:", COLLECTION);
    console.log("- Bridge:", BRIDGE);
    
    // 部署合约
    const HCFStakingFixed = await ethers.getContractFactory("HCFStakingFixed");
    const stakingFixed = await HCFStakingFixed.deploy(
        HCF_TOKEN,
        BSDT_TOKEN,
        MULTISIG,
        COLLECTION,
        BRIDGE
    );
    
    await stakingFixed.deployed();
    
    console.log("✅ HCFStakingFixed 部署成功!");
    console.log("合约地址:", stakingFixed.address);
    
    // 保存地址到文件
    const fs = require('fs');
    const deploymentInfo = {
        network: hre.network.name,
        contract: "HCFStakingFixed",
        address: stakingFixed.address,
        deployTime: new Date().toISOString(),
        constructor: {
            hcfToken: HCF_TOKEN,
            bsdtToken: BSDT_TOKEN,
            multiSig: MULTISIG,
            collection: COLLECTION,
            bridge: BRIDGE
        }
    };
    
    fs.writeFileSync(
        `deployment-staking-fixed-${Date.now()}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("部署信息已保存");
    
    // 验证合约（如果在BSC主网）
    if (hre.network.name === "bsc" || hre.network.name === "bscTestnet") {
        console.log("等待区块确认...");
        await stakingFixed.deployTransaction.wait(5);
        
        console.log("验证合约...");
        try {
            await hre.run("verify:verify", {
                address: stakingFixed.address,
                constructorArguments: [
                    HCF_TOKEN,
                    BSDT_TOKEN,
                    MULTISIG,
                    COLLECTION,
                    BRIDGE
                ],
            });
            console.log("✅ 合约验证成功!");
        } catch (error) {
            console.log("合约验证失败:", error.message);
        }
    }
    
    // 输出关键信息
    console.log("\n========== 部署完成 ==========");
    console.log("HCFStakingFixed:", stakingFixed.address);
    console.log("请更新前端配置和.env文件");
    console.log("==============================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 部署脚本创建成功${NC}"

# 执行部署
echo -e "${YELLOW}[5/5] 执行部署...${NC}"
echo "选择网络:"
echo "1) BSC 测试网"
echo "2) BSC 主网"
echo "3) 本地网络"
read -p "请选择 (1-3): " choice

case $choice in
    1)
        NETWORK="bscTestnet"
        ;;
    2)
        NETWORK="bsc"
        echo -e "${RED}警告: 即将部署到主网!${NC}"
        read -p "确认继续? (y/n): " confirm
        if [ "$confirm" != "y" ]; then
            echo "部署已取消"
            exit 0
        fi
        ;;
    3)
        NETWORK="localhost"
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo -e "${YELLOW}部署到 $NETWORK...${NC}"
npx hardhat run scripts/deploy-staking-fixed.js --network $NETWORK

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ 部署成功完成!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # 更新.env文件
    echo -e "${YELLOW}更新.env文件...${NC}"
    if [ -f "deployment-staking-fixed-*.json" ]; then
        ADDRESS=$(cat deployment-staking-fixed-*.json | grep '"address"' | cut -d'"' -f4)
        echo "HCF_STAKING_FIXED_ADDRESS=$ADDRESS" >> .env
        echo -e "${GREEN}✅ 新合约地址已添加到.env${NC}"
    fi
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi

echo ""
echo "下一步操作:"
echo "1. 更新前端的合约地址"
echo "2. 在合约中设置必要的权限"
echo "3. 转移用户数据（如果需要）"
echo "4. 测试所有功能"