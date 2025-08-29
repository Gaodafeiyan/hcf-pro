#!/bin/bash

# HCF Finance域名配置脚本
# 域名: hcf-finance.xyz
# 服务器: 118.107.4.216

echo "======================================"
echo "   HCF Finance 域名配置脚本"
echo "   域名: hcf-finance.xyz"
echo "   服务器: 118.107.4.216"
echo "======================================"

# 1. 安装Nginx (如果尚未安装)
echo -e "\n[1/5] 检查并安装Nginx..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx certbot python3-certbot-nginx
    echo "✅ Nginx安装完成"
else
    echo "✅ Nginx已安装"
fi

# 2. 创建前端构建目录
echo -e "\n[2/5] 准备前端文件..."
mkdir -p /var/www/hcf-finance

# 3. 构建前端生产版本
echo -e "\n[3/5] 构建前端生产版本..."
cd /srv/hcf-pro/frontend
npm run build
cp -r dist/* /var/www/hcf-finance/
echo "✅ 前端构建完成"

# 4. 配置Nginx
echo -e "\n[4/5] 配置Nginx..."
cat > /etc/nginx/sites-available/hcf-finance <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name hcf-finance.xyz www.hcf-finance.xyz;

    # 网站根目录
    root /var/www/hcf-finance;
    index index.html;

    # 日志
    access_log /var/log/nginx/hcf-finance.access.log;
    error_log /var/log/nginx/hcf-finance.error.log;

    # 单页应用路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理（如果需要）
    location /api/ {
        proxy_pass http://localhost:8545/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
}
EOF

# 5. 启用站点
ln -sf /etc/nginx/sites-available/hcf-finance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 6. 测试Nginx配置
echo -e "\n[5/5] 测试并重载Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "✅ Nginx配置成功"
else
    echo "❌ Nginx配置错误，请检查"
    exit 1
fi

# 7. 配置防火墙
echo -e "\n配置防火墙..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
echo "✅ 防火墙配置完成"

# 8. 安装SSL证书（Let's Encrypt）
echo -e "\n======================================"
echo "是否配置SSL证书？(推荐)"
echo "这将为 hcf-finance.xyz 配置免费的Let's Encrypt SSL证书"
echo "======================================"
read -p "配置SSL? (y/n): " setup_ssl

if [ "$setup_ssl" = "y" ]; then
    certbot --nginx -d hcf-finance.xyz -d www.hcf-finance.xyz --non-interactive --agree-tos --email admin@hcf-finance.xyz
    if [ $? -eq 0 ]; then
        echo "✅ SSL证书配置成功"
        echo "✅ 网站现在可以通过 https://hcf-finance.xyz 访问"
    else
        echo "⚠️  SSL证书配置失败，但HTTP访问仍然可用"
    fi
fi

echo -e "\n======================================"
echo "✅ 配置完成！"
echo ""
echo "网站访问地址:"
if [ "$setup_ssl" = "y" ]; then
    echo "  https://hcf-finance.xyz"
else
    echo "  http://hcf-finance.xyz"
fi
echo ""
echo "Nginx配置文件: /etc/nginx/sites-available/hcf-finance"
echo "网站文件目录: /var/www/hcf-finance"
echo "日志文件: /var/log/nginx/hcf-finance.*.log"
echo "======================================"

# 9. 创建开发模式运行脚本
cat > /srv/hcf-pro/run-dev.sh <<'EOF'
#!/bin/bash
cd /srv/hcf-pro/frontend
npm run dev -- --host 0.0.0.0 --port 5173
EOF
chmod +x /srv/hcf-pro/run-dev.sh

echo -e "\n提示: 如需运行开发模式，执行: /srv/hcf-pro/run-dev.sh"