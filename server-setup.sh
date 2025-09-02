#!/bin/bash

echo "🚀 HCF-PRO 服务器设置脚本"
echo "=========================="

# 1. 安装依赖
echo "📦 安装 npm 依赖..."
npm install

# 2. 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cat > .env << 'EOF'
# ===========================
# BSC 网络配置
# ===========================
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY=4b5a2b67ce354bbc58749dc9fb4769c1329b8cd0ffb4118078c84922ee436f29

# ===========================
# 合约地址（2025-09-02 最新部署 - V2版本完整部署）
# ===========================
MULTISIG_ADDRESS=0x534C2c0DF7F06aB6e66E704D4aE809DDa6883737
USDT_ORACLE_ADDRESS=0x74F6cFFa06f346b4DF40BF4121f4B27Ab4b22140
BSDT_TOKEN_ADDRESS=0x52E9C19DFF5C8636A6725bd78A9c85ee5045ac15
HCF_TOKEN_ADDRESS=0x78B7D17C3f98BB47955A155F661f9042F1717288
HCF_STAKING_ADDRESS=0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD
HCF_REFERRAL_ADDRESS=0x18A468b3dfC71C3bA9F5A801734B219d253C7F27
HCF_NODE_NFT_ADDRESS=0x6fDB1B1F09665Ac00C26701F5E1F92F4652D6F85
HCF_BSDT_EXCHANGE_ADDRESS=0x6729c0977325772cF6750eD65f9e3E07f331E104
HCF_BURN_MECHANISM_ADDRESS=0x693Ac6472a98BFDedfEE8B9892CAb1A00dc7FD24
HCF_IMPERMANENT_LOSS_PROTECTION_ADDRESS=0x32De00900bD63e8899930778118365ef4556DB0D
HCF_MARKET_CONTROL_ADDRESS=0x532e69A732Ac9152CA2c1212eC55cD7d5c470730
HCF_RANKING_ADDRESS=0x9A27E7f4139aD7a12591ce25e40c863f8A34e956

# Testnet External Addresses
USDT_TESTNET_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
PANCAKE_TESTNET_ROUTER=0xD99D1c33F9fC3444f8101754aBC46c52416550D1
USDC_TESTNET_ADDRESS=0x64544969ed7EBf5f083679233325356EbE738930
EOF
fi

# 3. 编译合约
echo "🔨 编译智能合约..."
npx hardhat compile

# 4. 检查编译结果
if [ $? -eq 0 ]; then
    echo "✅ 编译成功！"
else
    echo "❌ 编译失败，请检查错误信息"
    exit 1
fi

# 5. 显示合约信息
echo ""
echo "📋 部署的合约地址："
echo "===================="
echo "HCF Token: 0x78B7D17C3f98BB47955A155F661f9042F1717288"
echo "Staking: 0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD"
echo "Node NFT: 0x6fDB1B1F09665Ac00C26701F5E1F92F4652D6F85"
echo "Exchange: 0x6729c0977325772cF6750eD65f9e3E07f331E104"
echo ""
echo "🌐 BSCScan 测试网查看："
echo "https://testnet.bscscan.com/address/0x78B7D17C3f98BB47955A155F661f9042F1717288"
echo ""

# 6. 启动前端（可选）
echo "要启动前端服务吗？(y/n)"
read -r answer
if [ "$answer" = "y" ]; then
    echo "🚀 启动前端服务..."
    cd frontend && npm install && npm run build
    echo "✅ 前端构建完成！"
    echo "使用 'npm run preview' 启动生产服务器"
fi

echo ""
echo "✅ 服务器设置完成！"
echo ""
echo "下一步操作："
echo "1. 验证合约: npx hardhat verify --network bscTestnet CONTRACT_ADDRESS"
echo "2. 启动前端: cd frontend && npm run dev"
echo "3. 测试合约: npx hardhat test"