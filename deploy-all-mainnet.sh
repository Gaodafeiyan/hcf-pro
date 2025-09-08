#!/bin/bash

# BSC主网完整部署脚本 - 按顺序部署所有合约
# 这个脚本会按正确顺序部署所有合约到BSC主网

echo "========================================="
echo "HCF-PRO 主网完整部署脚本"
echo "所有合约按顺序部署到BSC主网"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 部署计划
echo -e "${BLUE}📋 主网部署计划:${NC}"
echo "1. HCF代币合约"
echo "2. BSDT代币合约" 
echo "3. HCF质押合约(固定版)"
echo "4. HCF推荐合约"
echo "5. HCF节点NFT合约"
echo "6. HCF-BSDT兑换合约"
echo "7. 其他辅助合约"
echo ""

# 最终安全确认
echo -e "${RED}⚠️⚠️⚠️  最终警告  ⚠️⚠️⚠️${NC}"
echo -e "${RED}即将部署到BSC主网!${NC}"
echo -e "${RED}预计总Gas费: 0.05-0.1 BNB${NC}"
echo -e "${RED}请确保钱包有足够BNB!${NC}"
echo ""
read -p "确认开始主网部署? (输入 'DEPLOY_MAINNET' 继续): " confirm

if [ "$confirm" != "DEPLOY_MAINNET" ]; then
    echo "主网部署已取消"
    exit 0
fi

# 检查环境
echo -e "${YELLOW}[1/8] 检查部署环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js${NC}"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 未找到 npx${NC}"  
    exit 1
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    echo -e "${RED}错误: 未找到.env配置文件${NC}"
    echo "请先配置.env文件中的PRIVATE_KEY等信息"
    exit 1
fi

# 检查私钥
if ! grep -q "PRIVATE_KEY=" .env || grep -q "PRIVATE_KEY=你的主网私钥" .env; then
    echo -e "${RED}错误: 请在.env文件中配置正确的PRIVATE_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境检查通过${NC}"

# 安装依赖
echo -e "${YELLOW}[2/8] 检查项目依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 编译所有合约
echo -e "${YELLOW}[3/8] 编译所有合约...${NC}"
npx hardhat compile

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 合约编译失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 所有合约编译成功${NC}"

# 创建主网完整部署脚本
echo -e "${YELLOW}[4/8] 创建主网部署脚本...${NC}"
cat > scripts/deploy-all-mainnet.js << 'EOF'
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 开始 HCF-PRO 主网完整部署...\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB");
    
    if (balance.lt(ethers.utils.parseEther("0.05"))) {
        throw new Error("⚠️ 账户余额不足，需要至少0.05 BNB支付Gas费");
    }
    
    const deployedContracts = {};
    const deploymentLog = [];
    
    function logDeployment(contractName, address, description) {
        const info = {
            name: contractName,
            address: address,
            description: description,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            bscscan: `https://bscscan.com/address/${address}`
        };
        deployedContracts[contractName] = info;
        deploymentLog.push(`${contractName}: ${address}`);
        console.log(`✅ ${contractName} 部署完成: ${address}`);
    }
    
    try {
        // 1. 部署 HCF 代币
        console.log("\n📍 [1/7] 部署 HCF 代币合约...");
        const HCFToken = await ethers.getContractFactory("HCFToken");
        const hcfToken = await HCFToken.deploy();
        await hcfToken.deployed();
        logDeployment("HCFToken", hcfToken.address, "HCF主代币");
        
        // 2. 部署 BSDT 代币
        console.log("\n📍 [2/7] 部署 BSDT 代币合约...");
        const BSDTToken = await ethers.getContractFactory("BSDTTokenV2");
        const bsdtToken = await BSDTToken.deploy();
        await bsdtToken.deployed();
        logDeployment("BSDTTokenV2", bsdtToken.address, "BSDT代币V2版本");
        
        // 3. 部署推荐合约
        console.log("\n📍 [3/7] 部署推荐合约...");
        const HCFReferral = await ethers.getContractFactory("HCFReferral");
        const referral = await HCFReferral.deploy(hcfToken.address);
        await referral.deployed();
        logDeployment("HCFReferral", referral.address, "推荐奖励系统");
        
        // 4. 部署质押合约(固定版)
        console.log("\n📍 [4/7] 部署质押合约(固定版)...");
        const HCFStakingFixed = await ethers.getContractFactory("HCFStakingFixed");
        const stakingFixed = await HCFStakingFixed.deploy(
            hcfToken.address,      // HCF token
            bsdtToken.address,     // BSDT token  
            deployer.address,      // multisig (临时用deployer)
            deployer.address,      // collection (临时用deployer)
            deployer.address       // bridge (临时用deployer)
        );
        await stakingFixed.deployed();
        logDeployment("HCFStakingFixed", stakingFixed.address, "质押合约固定版");
        
        // 5. 部署节点NFT合约
        console.log("\n📍 [5/7] 部署节点NFT合约...");
        const HCFNodeNFT = await ethers.getContractFactory("HCFNodeNFT");
        const nodeNFT = await HCFNodeNFT.deploy(hcfToken.address);
        await nodeNFT.deployed();
        logDeployment("HCFNodeNFT", nodeNFT.address, "节点NFT系统");
        
        // 6. 部署兑换合约
        console.log("\n📍 [6/7] 部署HCF-BSDT兑换合约...");
        const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
        const exchange = await HCFBSDTExchange.deploy(
            hcfToken.address,
            bsdtToken.address
        );
        await exchange.deployed();
        logDeployment("HCFBSDTExchange", exchange.address, "HCF-BSDT兑换");
        
        // 7. 部署燃烧机制合约
        console.log("\n📍 [7/7] 部署燃烧机制合约...");
        const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
        const burnMechanism = await HCFBurnMechanism.deploy(hcfToken.address);
        await burnMechanism.deployed();
        logDeployment("HCFBurnMechanism", burnMechanism.address, "代币燃烧机制");
        
        // 等待区块确认
        console.log("\n⏳ 等待所有合约确认 (5个区块)...");
        await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
        
        // 保存完整部署信息
        const completeDeployment = {
            network: "BSC_MAINNET",
            deployer: deployer.address,
            deployTime: new Date().toISOString(),
            totalContracts: Object.keys(deployedContracts).length,
            contracts: deployedContracts,
            summary: deploymentLog
        };
        
        const filename = `mainnet-deployment-complete-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(completeDeployment, null, 2));
        
        // 生成环境变量更新
        const envUpdates = [
            `HCF_TOKEN_MAINNET=${hcfToken.address}`,
            `BSDT_TOKEN_MAINNET=${bsdtToken.address}`,
            `HCF_STAKING_MAINNET_ADDRESS=${stakingFixed.address}`,
            `HCF_REFERRAL_MAINNET=${referral.address}`,
            `HCF_NODE_NFT_MAINNET=${nodeNFT.address}`,
            `HCF_EXCHANGE_MAINNET=${exchange.address}`,
            `HCF_BURN_MECHANISM_MAINNET=${burnMechanism.address}`
        ];
        
        fs.writeFileSync('mainnet-addresses.env', envUpdates.join('\n'));
        
        // 输出最终结果
        console.log("\n" + "=".repeat(60));
        console.log("🎉 BSC主网完整部署成功!");
        console.log("=".repeat(60));
        console.log("📋 部署的合约:");
        deploymentLog.forEach(log => console.log(`  ${log}`));
        console.log("\n💾 文件生成:");
        console.log(`  - ${filename} (完整部署信息)`);
        console.log(`  - mainnet-addresses.env (环境变量更新)`);
        
        console.log("\n📋 下一步操作:");
        console.log("1. 更新.env文件中的合约地址");
        console.log("2. 更新前端配置");
        console.log("3. 验证所有合约");
        console.log("4. 设置合约权限");
        console.log("5. 公告新的主网地址");
        console.log("=".repeat(60));
        
        return completeDeployment;
        
    } catch (error) {
        console.error("\n❌ 部署过程中发生错误:", error.message);
        
        // 保存部分部署结果
        if (Object.keys(deployedContracts).length > 0) {
            const partialDeployment = {
                network: "BSC_MAINNET", 
                status: "PARTIAL_FAILURE",
                deployer: deployer.address,
                deployTime: new Date().toISOString(),
                error: error.message,
                deployedContracts: deployedContracts
            };
            
            fs.writeFileSync(`partial-deployment-${Date.now()}.json`, JSON.stringify(partialDeployment, null, 2));
            console.log("部分部署结果已保存，请检查已部署的合约");
        }
        
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });
EOF

echo -e "${GREEN}✓ 主网完整部署脚本创建成功${NC}"

# 预估费用
echo -e "${YELLOW}[5/8] Gas费用预估...${NC}"
echo "📊 预估部署费用:"
echo "- HCF代币: ~0.008 BNB"
echo "- BSDT代币: ~0.008 BNB" 
echo "- 质押合约: ~0.01 BNB"
echo "- 推荐合约: ~0.008 BNB"
echo "- 节点NFT: ~0.008 BNB"
echo "- 兑换合约: ~0.008 BNB"
echo "- 燃烧合约: ~0.006 BNB"
echo "- 总计: ~0.05-0.07 BNB (约$30-40)"

# 网络检查
echo -e "${YELLOW}[6/8] 网络连接检查...${NC}"
if ! curl -s https://bsc-dataseed1.binance.org/ > /dev/null; then
    echo -e "${RED}警告: BSC主网连接可能有问题${NC}"
fi

# 最后确认
echo -e "${YELLOW}[7/8] 最终部署确认...${NC}"
echo -e "${PURPLE}即将执行命令: npx hardhat run scripts/deploy-all-mainnet.js --network bsc${NC}"
echo ""
read -p "最终确认开始主网完整部署? (输入 'YES_DEPLOY_ALL' 继续): " final_confirm

if [ "$final_confirm" = "YES_DEPLOY_ALL" ]; then
    echo -e "${GREEN}[8/8] 🚀 开始主网完整部署...${NC}"
    npx hardhat run scripts/deploy-all-mainnet.js --network bsc
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}🎉 主网完整部署成功!${NC}"
        echo -e "${GREEN}=========================================${NC}"
        
        # 自动更新.env文件
        if [ -f "mainnet-addresses.env" ]; then
            echo -e "${YELLOW}自动更新.env文件...${NC}"
            cat mainnet-addresses.env >> .env
            echo -e "${GREEN}✅ 主网地址已添加到.env文件${NC}"
        fi
        
        echo -e "${GREEN}请检查生成的部署文件和地址配置${NC}"
        
    else
        echo -e "${RED}=========================================${NC}"
        echo -e "${RED}❌ 主网部署失败${NC}"
        echo -e "${RED}请检查错误信息和部分部署文件${NC}"
        echo -e "${RED}=========================================${NC}"
        exit 1
    fi
    
else
    echo "主网完整部署已取消"
    exit 0
fi

echo ""
echo "🎯 部署完成后的操作清单:"
echo "1. 验证所有合约在BSCScan上"
echo "2. 更新前端配置文件"
echo "3. 设置合约管理权限"
echo "4. 公告主网地址"
echo "5. 进行全面测试"