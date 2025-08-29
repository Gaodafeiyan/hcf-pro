#!/bin/bash

echo "======================================"
echo "   重新构建和部署前端"
echo "======================================"

# 拉取最新代码
echo "[1/4] 拉取最新代码..."
cd /srv/hcf-pro
git pull

# 构建前端
echo "[2/4] 构建前端..."
cd frontend
npm run build

# 检查构建是否成功
if [ -d "dist" ]; then
    echo "✅ 构建成功"
    
    # 部署到Nginx目录
    echo "[3/4] 部署到生产环境..."
    rm -rf /var/www/hcf-finance/*
    cp -r dist/* /var/www/hcf-finance/
    
    # 重载Nginx
    echo "[4/4] 重载Nginx..."
    nginx -s reload
    
    echo "======================================"
    echo "✅ 部署完成！"
    echo ""
    echo "访问地址:"
    echo "  https://hcf-finance.xyz"
    echo "  https://www.hcf-finance.xyz"
    echo "======================================"
else
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi