#!/bin/bash

echo "🚀 HCF流动性监控脚本启动器"
echo "================================"

# 加载环境变量
if [ -f "../.env.liquidity" ]; then
    export $(cat ../.env.liquidity | xargs)
    echo "✅ 环境变量已加载"
else
    echo "❌ 未找到.env.liquidity文件"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装Node.js"
    exit 1
fi

echo "📦 安装依赖..."
npm install

# 选择运行模式
echo ""
echo "请选择运行模式:"
echo "1. 测试模式（只检查余额）"
echo "2. 单次执行"
echo "3. 持续监控（开发）"
echo "4. PM2生产环境"

read -p "选择 (1-4): " choice

case $choice in
    1)
        echo "🧪 运行测试模式..."
        npm run test
        ;;
    2)
        echo "🔄 执行单次检查..."
        npm run once
        ;;
    3)
        echo "👁️ 启动持续监控..."
        npm start
        ;;
    4)
        echo "🏭 启动PM2生产环境..."
        npm run pm2:start
        echo "查看日志: npm run pm2:logs"
        echo "查看状态: npm run pm2:status"
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac