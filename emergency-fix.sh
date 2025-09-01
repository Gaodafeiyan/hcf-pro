#!/bin/bash

echo "========================================="
echo "紧急修复并构建"
echo "========================================="

cd /srv/hcf-pro

# 1. 拉取修复
echo "[1] 拉取最新修复..."
git pull origin main

# 2. 进入前端目录
cd frontend

# 3. 清理旧构建
echo "[2] 清理旧构建..."
rm -rf dist

# 4. 构建
echo "[3] 构建前端..."
npm run build

# 5. 检查构建结果
echo "[4] 检查构建结果..."
if [ -f "dist/index.html" ]; then
    echo "✅ 构建成功！"
    ls -la dist/
    
    # 6. 设置权限
    echo "[5] 设置权限..."
    chown -R www-data:www-data dist
    chmod -R 755 dist
    
    # 7. 重启Nginx
    echo "[6] 重启Nginx..."
    systemctl restart nginx
    
    echo "========================================="
    echo "✅ 修复完成！"
    echo "访问: https://hcf-finance.xyz"
    echo "========================================="
else
    echo "❌ 构建失败"
    exit 1
fi