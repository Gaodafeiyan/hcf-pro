#!/bin/bash

echo "🔄 HCF项目重新部署脚本"
echo "========================="
echo ""
echo "⚠️  注意: 此操作将部署新的合约实例"
echo "⚠️  所有合约地址将改变"
echo ""

read -p "确认继续部署? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ 部署已取消"
    exit 1
fi

echo ""
echo "📦 步骤1: 拉取最新代码"
echo "------------------------"
cd /srv/hcf-pro
git pull origin main

echo ""
echo "📝 步骤2: 备份当前.env文件"
echo "------------------------"
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 备份完成"

echo ""
echo "🏗️ 步骤3: 编译合约"
echo "------------------------"
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ 编译失败，请检查合约代码"
    exit 1
fi

echo ""
echo "🚀 步骤4: 部署到BSC测试网"
echo "------------------------"
npx hardhat run scripts/deploy.js --network bscTestnet | tee deployment-$(date +%Y%m%d_%H%M%S).log

if [ $? -ne 0 ]; then
    echo "❌ 部署失败"
    exit 1
fi

echo ""
echo "✅ 部署成功！"
echo ""
echo "📋 后续步骤:"
echo "1. 更新.env文件中的合约地址"
echo "2. 运行测试脚本验证功能: ./run-test.sh"
echo "3. 更新前端配置中的合约地址"
echo ""
echo "💡 提示: 部署日志已保存到 deployment-*.log"