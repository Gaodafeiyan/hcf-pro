#!/bin/bash

echo "========================================="
echo "配置生产环境"
echo "========================================="

# 1. 拉取最新代码
echo "[1/6] 拉取最新代码..."
git pull origin main

# 2. 构建前端
echo "[2/6] 构建前端..."
cd frontend
npm install
npm run build

# 3. 检查SSL证书
echo "[3/6] 检查SSL证书..."
if [ ! -f /etc/letsencrypt/live/hcf-finance.xyz/fullchain.pem ]; then
    echo "生成SSL证书..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d hcf-finance.xyz -d www.hcf-finance.xyz --non-interactive --agree-tos -m admin@hcf-finance.xyz
fi

# 4. 配置Nginx
echo "[4/6] 配置Nginx..."
cp ../nginx-config.conf /etc/nginx/sites-available/hcf-finance
ln -sf /etc/nginx/sites-available/hcf-finance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 5. 测试并重启Nginx
echo "[5/6] 重启Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx配置成功"
else
    echo "❌ Nginx配置错误，请检查"
    exit 1
fi

# 6. 设置防火墙
echo "[6/6] 配置防火墙..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo "========================================="
echo "✅ 生产环境配置完成！"
echo "========================================="
echo "访问地址: https://hcf-finance.xyz"
echo ""
echo "检查状态:"
echo "  systemctl status nginx"
echo "  tail -f /var/log/nginx/hcf-finance.error.log"
echo "========================================="