#!/bin/bash

# HCF-PRO Frontend Deployment Script
# This script uploads the built frontend to your server

SERVER_USER="ubuntu"
SERVER_HOST="your-server-ip"  # 替换为你的服务器IP
SERVER_PATH="/home/ubuntu/hcf-pro/frontend/dist"

echo "🚀 Deploying HCF-PRO frontend to server..."

# 上传构建文件到服务器
echo "📦 Uploading build files..."
scp -r frontend/dist/* ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

if [ $? -eq 0 ]; then
    echo "✅ Files uploaded successfully!"
    
    # 在服务器上重启服务
    echo "🔄 Restarting frontend service..."
    ssh ${SERVER_USER}@${SERVER_HOST} "cd /home/ubuntu/hcf-pro/frontend && pm2 restart hcf-frontend"
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend service restarted!"
        echo "🎉 Deployment complete! Please clear your browser cache and test at https://hcf-finance.xyz/"
    else
        echo "❌ Failed to restart service"
    fi
else
    echo "❌ Failed to upload files"
fi
