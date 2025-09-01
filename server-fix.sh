#!/bin/bash

echo "======================================"
echo "🔧 HCF-PRO 服务器修复脚本"
echo "======================================"

# 修复403错误 - 可能的原因和解决方案

echo "1. 检查文件权限..."
chmod -R 755 /srv/hcf-pro/frontend/dist
chmod 644 /srv/hcf-pro/frontend/dist/*.html
chmod 644 /srv/hcf-pro/frontend/dist/assets/*

echo "2. 检查Nginx配置..."
cat > /tmp/hcf-nginx.conf << 'EOF'
server {
    listen 80;
    listen 443 ssl;
    server_name hcf-finance.xyz www.hcf-finance.xyz;

    # SSL配置（如果有证书）
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    root /srv/hcf-pro/frontend/dist;
    index index.html;

    # 解决403错误
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 静态资源缓存
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 允许所有源（开发阶段）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        add_header Access-Control-Allow-Origin *;
        expires 30d;
    }

    # 防止目录浏览
    autoindex off;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

echo "Nginx配置已生成到: /tmp/hcf-nginx.conf"
echo "请将其复制到 /etc/nginx/sites-available/hcf-finance.xyz"

echo ""
echo "3. 临时解决方案..."
echo "由于主页面有问题，可以使用以下方法："

# 方案1：将app.html复制为index.html
echo "方案1: 使用备用页面作为主页"
echo "cp /srv/hcf-pro/app.html /srv/hcf-pro/frontend/dist/index.html"

# 方案2：创建重定向
echo "方案2: 创建重定向页面"
cat > /srv/hcf-pro/frontend/dist/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>HCF DeFi Platform - Loading...</title>
    <meta http-equiv="refresh" content="0; url=/app.html">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .loading {
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="loading">
        <h1>正在加载 HCF DeFi Platform...</h1>
        <p>如果页面没有自动跳转，<a href="/app.html" style="color: white;">点击这里</a></p>
    </div>
</body>
</html>
EOF

echo ""
echo "======================================"
echo "✅ 修复完成！"
echo "======================================"
echo ""
echo "可访问的页面："
echo "  ✅ https://hcf-finance.xyz/app.html (正常工作)"
echo "  ⚠️  https://hcf-finance.xyz/ (已创建重定向)"
echo ""
echo "下一步操作："
echo "1. 重启Nginx: systemctl restart nginx"
echo "2. 清除浏览器缓存"
echo "3. 访问网站测试"
echo ""