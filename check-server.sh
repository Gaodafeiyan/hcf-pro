#!/bin/bash

echo "========================================="
echo "检查服务器状态"
echo "========================================="

echo "[1] PM2服务状态:"
pm2 status

echo ""
echo "[2] PM2日志 (最后20行):"
pm2 logs hcf-frontend --lines 20 --nostream

echo ""
echo "[3] Nginx状态:"
systemctl status nginx --no-pager

echo ""
echo "[4] Nginx错误日志 (最后20行):"
tail -20 /var/log/nginx/hcf-finance.error.log

echo ""
echo "[5] 检查构建目录:"
ls -la /srv/hcf-pro/frontend/dist/

echo ""
echo "[6] 检查index.html:"
head -10 /srv/hcf-pro/frontend/dist/index.html

echo ""
echo "[7] 端口监听状态:"
netstat -tlnp | grep -E ':(80|443|4173|5173)'

echo "========================================="
echo "常见修复命令:"
echo "1. 重启前端: pm2 restart hcf-frontend"
echo "2. 重启Nginx: systemctl restart nginx"
echo "3. 查看实时日志: pm2 logs hcf-frontend"
echo "========================================="