#!/bin/bash

echo "更新nginx安全配置..."

cat > /tmp/hcf-finance.xyz << 'EOF'
server {
    listen 443 ssl http2;
    server_name hcf-finance.xyz www.hcf-finance.xyz;

    ssl_certificate /etc/letsencrypt/live/hcf-finance.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hcf-finance.xyz/privkey.pem;

    root /var/www/hcf-finance.xyz;
    index index.html;

    # 安全头 - 防止被标记为钓鱼网站
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 移除过严格的CSP，避免误判
    # add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
    
    # 添加合法性标识
    add_header X-Robots-Tag "index, follow" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /.well-known/ {
        allow all;
    }
}

server {
    listen 80;
    server_name hcf-finance.xyz www.hcf-finance.xyz;
    return 301 https://$server_name$request_uri;
}
EOF

sudo cp /tmp/hcf-finance.xyz /etc/nginx/sites-available/hcf-finance.xyz
sudo nginx -t && sudo systemctl reload nginx

echo "配置更新完成！"