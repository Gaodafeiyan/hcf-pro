#!/bin/bash

echo "========================================="
echo "清理缓存并重新构建"
echo "========================================="

cd /srv/hcf-pro

# 1. 拉取最新代码
echo "[1/5] 拉取最新代码..."
git pull origin main

cd frontend

# 2. 清理所有缓存
echo "[2/5] 清理缓存..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
npm cache clean --force

# 3. 重新安装依赖
echo "[3/5] 重新安装依赖..."
rm -rf node_modules package-lock.json
npm install

# 4. 重新构建
echo "[4/5] 构建前端..."
npm run build

# 5. 重启服务
echo "[5/5] 重启服务..."
pm2 stop hcf-frontend
pm2 delete hcf-frontend
pm2 start npm --name "hcf-frontend" -- run preview -- --host 0.0.0.0
pm2 save

echo "========================================="
echo "✅ 完成！"
echo "========================================="
echo "请清理浏览器缓存："
echo "1. 打开 https://hcf-finance.xyz"
echo "2. 按 Ctrl+Shift+R (强制刷新)"
echo "3. 或按 F12 -> Network -> Disable cache"
echo "========================================="