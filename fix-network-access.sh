#!/bin/bash

echo "配置网络访问..."

# 停止当前服务
pm2 stop hcf-frontend

# 使用--host参数重新启动，允许外部访问
pm2 delete hcf-frontend
pm2 start npm --name "hcf-frontend" -- run preview -- --host 0.0.0.0

# 保存配置
pm2 save

echo "==========================================="
echo "✅ 配置完成！"
echo "==========================================="
echo "访问地址: http://118.107.4.216:4173"
echo ""
echo "如果无法访问，请检查防火墙："
echo "ufw allow 4173/tcp"
echo "==========================================="

pm2 status