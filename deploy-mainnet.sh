#!/bin/bash

# BSC主网部署脚本 - HCFStakingFixed
# 部署修复版质押合约到BSC主网

echo "========================================="
echo "HCF-PRO 主网部署脚本"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 安全检查
echo -e "${RED}⚠️  警告: 即将部署到BSC主网!${NC}"
echo -e "${RED}⚠️  请确保已经在测试网充分测试!${NC}"
echo -e "${RED}⚠️  请确保钱包有足够的BNB支付Gas费!${NC}"
echo ""
read -p "确认继续部署到主网? (输入 'YES' 继续): " confirm

if [ "$confirm" != "YES" ]; then
    echo "部署已取消"
    exit 0
fi

# 检查环境
echo -e "${YELLOW}[1/6] 检查环境...${NC}"
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
echo -e "${YELLOW}[2/6] 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 编译合约
echo -e "${YELLOW}[3/6] 编译合约...${NC}"
npx hardhat compile

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 合约编译失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 合约编译成功${NC}"

# 创建主网部署脚本
echo -e "${YELLOW}[4/6] 创建主网部署脚本...${NC}"
cat > scripts/deploy-mainnet.js << 'EOF'
const hre = require("hardhat");

async function main() {
    console.log("🚀 部署 HCFStakingFixed 到 BSC 主网...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查账户余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.log("⚠️  警告: 账户余额较低，请确保有足够BNB支付Gas费");
    }
    
    // 主网合约地址（请根据实际情况修改）
    const HCF_TOKEN = process.env.HCF_TOKEN_MAINNET || "0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc"; // 需要更新为主网地址
    const BSDT_TOKEN = process.env.BSDT_TOKEN_MAINNET || "0x91152b436A5b3535E01902Cf09a3c59Ab4c433BD"; // 需要更新为主网地址
    const MULTISIG = process.env.MULTISIG_MAINNET || deployer.address;
    const COLLECTION = process.env.COLLECTION_MAINNET || deployer.address;
    const BRIDGE = process.env.BRIDGE_MAINNET || deployer.address;
    
    console.log("📋 主网配置地址:");
    console.log("- HCF Token:", HCF_TOKEN);
    console.log("- BSDT Token:", BSDT_TOKEN);
    console.log("- MultiSig:", MULTISIG);
    console.log("- Collection:", COLLECTION);
    console.log("- Bridge:", BRIDGE);
    
    // 最后确认
    console.log("\n⚠️  最后确认: 即将部署到BSC主网");
    console.log("⚠️  Gas费约 0.005-0.01 BNB");
    console.log("⚠️  确保以上地址正确无误!");
    
    // 部署合约
    console.log("\n🚀 开始部署合约...");
    const HCFStakingFixed = await ethers.getContractFactory("HCFStakingFixed");
    const stakingFixed = await HCFStakingFixed.deploy(
        HCF_TOKEN,
        BSDT_TOKEN,
        MULTISIG,
        COLLECTION,
        BRIDGE,
        {
            gasLimit: 3000000, // 设置Gas限制
            gasPrice: ethers.utils.parseUnits("5", "gwei") // 5 gwei gas price
        }
    );
    
    console.log("⏳ 等待合约部署...");
    await stakingFixed.deployed();
    
    console.log("✅ HCFStakingFixed 主网部署成功!");
    console.log("📍 合约地址:", stakingFixed.address);
    console.log("🔗 BSCScan:", `https://bscscan.com/address/${stakingFixed.address}`);
    
    // 保存部署信息
    const fs = require('fs');
    const deploymentInfo = {
        network: "BSC_MAINNET",
        contract: "HCFStakingFixed",
        address: stakingFixed.address,
        deployTime: new Date().toISOString(),
        deployer: deployer.address,
        gasUsed: stakingFixed.deployTransaction.gasLimit.toString(),
        gasPrice: stakingFixed.deployTransaction.gasPrice.toString(),
        transactionHash: stakingFixed.deployTransaction.hash,
        bscscan: `https://bscscan.com/address/${stakingFixed.address}`,
        constructor: {
            hcfToken: HCF_TOKEN,
            bsdtToken: BSDT_TOKEN,
            multiSig: MULTISIG,
            collection: COLLECTION,
            bridge: BRIDGE
        }
    };
    
    const filename = `deployment-mainnet-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 部署信息已保存到:", filename);
    
    // 等待区块确认
    console.log("⏳ 等待区块确认 (5个区块)...");
    await stakingFixed.deployTransaction.wait(5);
    
    // 验证合约
    console.log("🔍 开始验证合约...");
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
        console.log("❌ 合约验证失败:", error.message);
        console.log("💡 可以稍后手动验证合约");
    }
    
    // 输出关键信息
    console.log("\n" + "=".repeat(50));
    console.log("🎉 BSC主网部署完成!");
    console.log("=".repeat(50));
    console.log("📍 HCFStakingFixed:", stakingFixed.address);
    console.log("🔗 BSCScan:", `https://bscscan.com/address/${stakingFixed.address}`);
    console.log("💾 部署文件:", filename);
    console.log("\n📋 下一步操作:");
    console.log("1. 更新前端的合约地址");
    console.log("2. 更新.env文件");
    console.log("3. 在合约中设置必要的权限");
    console.log("4. 公告新合约地址");
    console.log("5. 迁移用户数据（如需要）");
    console.log("=".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 主网部署脚本创建成功${NC}"

# 显示Gas费估算
echo -e "${YELLOW}[5/6] Gas费估算...${NC}"
echo "📊 预估费用:"
echo "- 合约部署: ~0.005-0.01 BNB"
echo "- 合约验证: 免费"
echo "- 总计: ~0.005-0.01 BNB (约 $3-6)"

# 执行部署
echo -e "${YELLOW}[6/6] 准备执行主网部署...${NC}"
echo -e "${BLUE}即将执行以下命令:${NC}"
echo "npx hardhat run scripts/deploy-mainnet.js --network bsc"
echo ""
read -p "最终确认部署到BSC主网? (输入 'DEPLOY' 继续): " final_confirm

if [ "$final_confirm" = "DEPLOY" ]; then
    echo -e "${GREEN}🚀 开始主网部署...${NC}"
    npx hardhat run scripts/deploy-mainnet.js --network bsc
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}🎉 主网部署成功完成!${NC}"
        echo -e "${GREEN}=========================================${NC}"
        
        # 更新.env文件
        echo -e "${YELLOW}更新.env文件...${NC}"
        if [ -f "deployment-mainnet-*.json" ]; then
            ADDRESS=$(cat deployment-mainnet-*.json | grep '"address"' | cut -d'"' -f4)
            echo "HCF_STAKING_MAINNET_ADDRESS=$ADDRESS" >> .env
            echo -e "${GREEN}✅ 主网合约地址已添加到.env${NC}"
            echo -e "${GREEN}📍 主网地址: $ADDRESS${NC}"
        fi
    else
        echo -e "${RED}=========================================${NC}"
        echo -e "${RED}❌ 主网部署失败${NC}"
        echo -e "${RED}=========================================${NC}"
        exit 1
    fi
else
    echo "主网部署已取消"
    exit 0
fi