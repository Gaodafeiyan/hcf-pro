#!/bin/bash

echo "========================================="
echo "测试部署状态"
echo "========================================="

echo "[1] 检查构建目录："
if [ -d "/srv/hcf-pro/frontend/dist" ]; then
    echo "✅ dist目录存在"
    echo "文件数量: $(ls -1 /srv/hcf-pro/frontend/dist | wc -l)"
else
    echo "❌ dist目录不存在"
fi

echo ""
echo "[2] 检查index.html："
if [ -f "/srv/hcf-pro/frontend/dist/index.html" ]; then
    echo "✅ index.html存在"
    echo "文件大小: $(ls -lh /srv/hcf-pro/frontend/dist/index.html | awk '{print $5}')"
else
    echo "❌ index.html不存在"
fi

echo ""
echo "[3] 检查Nginx配置："
if [ -f "/etc/nginx/sites-enabled/hcf-finance" ]; then
    echo "✅ Nginx配置已启用"
    echo "Root目录: $(grep -m1 'root' /etc/nginx/sites-enabled/hcf-finance | awk '{print $2}' | tr -d ';')"
else
    echo "❌ Nginx配置未启用"
fi

echo ""
echo "[4] 测试本地访问："
curl -I http://localhost 2>/dev/null | head -1

echo ""
echo "[5] 测试HTTPS访问："
curl -I https://hcf-finance.xyz 2>/dev/null | head -1

echo ""
echo "[6] Nginx错误日志 (最后5行)："
tail -5 /var/log/nginx/hcf-finance.error.log 2>/dev/null || echo "无错误日志"

echo ""
echo "========================================="
echo "快速修复命令："
echo "1. 重新构建: cd /srv/hcf-pro/frontend && npm run build"
echo "2. 重启Nginx: systemctl restart nginx"
echo "3. 查看日志: tail -f /var/log/nginx/hcf-finance.error.log"
echo "========================================="