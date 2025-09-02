#!/bin/bash

echo "🚀 部署前端到服务器..."

# 1. 拉取最新代码
cd /srv/hcf-pro
git pull

# 2. 进入前端目录
cd /srv/hcf-pro/frontend

# 3. 安装依赖
echo "📦 安装依赖..."
npm install

# 4. 构建生产版本
echo "🔨 构建生产版本..."
npm run build

# 5. 复制到网站目录
echo "📋 部署到网站目录..."
sudo rm -rf /var/www/hcf-finance.xyz/*
sudo cp -r dist/* /var/www/hcf-finance.xyz/

# 6. 设置权限
sudo chown -R www-data:www-data /var/www/hcf-finance.xyz
sudo chmod -R 755 /var/www/hcf-finance.xyz

# 7. 重启nginx
echo "🔄 重启Nginx..."
sudo systemctl reload nginx

echo "✅ 部署完成！"
echo "🌐 访问 https://hcf-finance.xyz 查看"