#!/bin/bash

echo "========================================="
echo "完整修复404错误"
echo "========================================="

cd /srv/hcf-pro

# 1. 拉取最新代码
echo "[1/8] 拉取最新代码..."
git pull origin main

# 2. 构建前端
echo "[2/8] 构建前端..."
cd frontend
npm install
npm run build

# 3. 检查构建结果
echo "[3/8] 检查构建结果..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ 构建失败，dist/index.html不存在"
    exit 1
fi

echo "✅ 构建成功，文件列表："
ls -la dist/

# 4. 创建正确的Nginx配置
echo "[4/8] 创建Nginx配置..."
cat > /etc/nginx/sites-available/hcf-finance << 'EOF'
server {
    listen 80;
    server_name hcf-finance.xyz www.hcf-finance.xyz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hcf-finance.xyz www.hcf-finance.xyz;

    ssl_certificate /etc/letsencrypt/live/hcf-finance.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hcf-finance.xyz/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /srv/hcf-pro/frontend/dist;
    index index.html;

    # 所有路由都返回index.html (React SPA)
    location / {
        try_files $uri /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public";
    }

    access_log /var/log/nginx/hcf-finance.access.log;
    error_log /var/log/nginx/hcf-finance.error.log;
}
EOF

# 5. 设置权限
echo "[5/8] 设置权限..."
chown -R www-data:www-data /srv/hcf-pro/frontend/dist
chmod -R 755 /srv/hcf-pro/frontend/dist

# 6. 测试Nginx配置
echo "[6/8] 测试Nginx配置..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx配置错误"
    exit 1
fi

# 7. 重启Nginx
echo "[7/8] 重启Nginx..."
systemctl restart nginx

# 8. 验证
echo "[8/8] 验证部署..."
echo ""
echo "检查文件："
ls -la /srv/hcf-pro/frontend/dist/index.html
echo ""
echo "检查Nginx："
systemctl status nginx --no-pager | head -10
echo ""
echo "检查端口："
netstat -tlnp | grep -E ':(80|443)'

echo ""
echo "========================================="
echo "✅ 修复完成！"
echo "========================================="
echo "访问测试："
echo "1. https://hcf-finance.xyz"
echo "2. https://hcf-finance.xyz/staking"
echo "3. https://hcf-finance.xyz/dashboard"
echo ""
echo "如果还有问题，查看："
echo "  tail -f /var/log/nginx/hcf-finance.error.log"
echo "========================================="