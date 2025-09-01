#!/bin/bash

echo "========================================="
echo "调试前端问题"
echo "========================================="

# 1. 检查构建状态
echo "[1] 检查前端构建..."
cd /srv/hcf-pro
git pull origin main

cd frontend

# 2. 清理并重新安装依赖
echo "[2] 清理并重新安装依赖..."
rm -rf node_modules package-lock.json
npm install

# 3. 重新构建
echo "[3] 构建前端..."
npm run build

# 4. 检查构建输出
echo "[4] 检查构建输出..."
if [ -d "dist" ]; then
    echo "✅ dist目录存在"
    ls -la dist/
    echo ""
    echo "检查index.html..."
    head -20 dist/index.html
else
    echo "❌ dist目录不存在，构建失败"
    exit 1
fi

# 5. 启动开发服务器用于调试
echo "[5] 启动开发服务器..."
pm2 stop hcf-dev 2>/dev/null || true
pm2 delete hcf-dev 2>/dev/null || true

# 使用开发模式启动，可以看到详细错误
pm2 start npm --name "hcf-dev" -- run dev -- --host 0.0.0.0 --port 5173

echo "========================================="
echo "调试信息:"
echo "========================================="
echo "1. 开发服务器: http://118.107.4.216:5173"
echo "2. 查看日志: pm2 logs hcf-dev"
echo "3. 查看浏览器控制台错误"
echo ""
echo "如果开发模式正常，则重新构建生产版本:"
echo "  npm run build"
echo "  pm2 restart hcf-frontend"
echo "========================================="