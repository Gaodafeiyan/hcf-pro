#!/bin/bash

echo "========================================="
echo "HCF-Pro 服务器部署脚本"
echo "========================================="

# 更新代码
echo "[1/5] 拉取最新代码..."
git pull origin main

# 进入前端目录
cd frontend

# 安装PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "[2/5] 安装PM2..."
    npm install -g pm2
else
    echo "[2/5] PM2已安装"
fi

# 安装依赖
echo "[3/5] 安装依赖..."
npm install

# 构建前端
echo "[4/5] 构建前端..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    
    # 停止旧服务
    pm2 stop hcf-frontend 2>/dev/null || true
    pm2 delete hcf-frontend 2>/dev/null || true
    
    # 启动服务
    echo "[5/5] 启动服务..."
    pm2 start npm --name "hcf-frontend" -- run preview
    
    # 保存PM2配置
    pm2 save
    pm2 startup systemd -u root --hp /root
    
    echo "========================================="
    echo "✅ 部署完成！"
    echo "========================================="
    echo "访问地址: http://$(hostname -I | awk '{print $1}'):4173"
    echo ""
    echo "查看日志: pm2 logs hcf-frontend"
    echo "查看状态: pm2 status"
    echo "重启服务: pm2 restart hcf-frontend"
else
    echo "❌ 构建失败，请检查错误"
    exit 1
fi