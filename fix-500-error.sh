#!/bin/bash

echo "========================================="
echo "修复500错误"
echo "========================================="

cd /srv/hcf-pro

# 1. 拉取最新代码
echo "[1/7] 拉取最新代码..."
git pull origin main

# 2. 确保构建目录存在
echo "[2/7] 检查并构建前端..."
cd frontend

if [ ! -d "dist" ]; then
    echo "dist目录不存在，重新构建..."
    npm install
    npm run build
else
    echo "dist目录存在"
fi

# 3. 检查index.html
echo "[3/7] 检查index.html..."
if [ ! -f "dist/index.html" ]; then
    echo "index.html不存在，重新构建..."
    npm run build
fi

# 4. 设置正确的权限
echo "[4/7] 设置权限..."
chmod -R 755 /srv/hcf-pro/frontend/dist
chown -R www-data:www-data /srv/hcf-pro/frontend/dist

# 5. 更新Nginx配置
echo "[5/7] 更新Nginx配置..."
cp /srv/hcf-pro/nginx-spa-fix.conf /etc/nginx/sites-available/hcf-finance
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx配置有效"
    systemctl reload nginx
else
    echo "Nginx配置错误，请检查"
    exit 1
fi

# 6. 重启PM2服务（如果需要开发服务器）
echo "[6/7] 检查PM2服务..."
pm2 status

# 7. 清理浏览器缓存提示
echo "[7/7] 完成！"

echo "========================================="
echo "✅ 修复完成！"
echo "========================================="
echo "请执行以下操作："
echo "1. 清理浏览器缓存 (Ctrl+Shift+R)"
echo "2. 访问 https://hcf-finance.xyz/staking"
echo ""
echo "如果还有问题，查看日志："
echo "  tail -f /var/log/nginx/hcf-finance.error.log"
echo "========================================="