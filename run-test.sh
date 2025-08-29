#!/bin/bash

echo "🚀 运行HCF综合测试脚本"
echo "========================="
echo ""

# 进入项目目录
cd /srv/hcf-pro

# 检查环境变量
if [ ! -f .env ]; then
    echo "❌ 错误：.env文件不存在"
    echo "请先配置环境变量"
    exit 1
fi

echo "✅ 环境变量已配置"
echo ""

# 运行综合测试
echo "运行测试脚本..."
npx hardhat run scripts/comprehensive-test.js --network bscTestnet

echo ""
echo "========================="
echo "测试完成！"
echo ""
echo "如需运行其他测试脚本："
echo "1. 测试最终部署: npx hardhat run scripts/test-final-deployment.js --network bscTestnet"
echo "2. 简单测试: npx hardhat run scripts/simple-test.js --network bscTestnet"
echo "3. 检查部署: npx hardhat run scripts/check-deployment.js --network bscTestnet"