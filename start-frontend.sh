#!/bin/bash

echo "🚀 启动HCF前端服务器..."

# 进入前端目录
cd /srv/hcf-pro/frontend

# 检查Node.js版本
echo "检查Node.js版本..."
node --version
npm --version

# 检查端口是否被占用
echo "检查端口4173..."
if lsof -Pi :4173 -sTCP:LISTEN -t >/dev/null ; then
    echo "端口4173被占用，尝试杀死进程..."
    lsof -ti:4173 | xargs kill -9
    sleep 2
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 启动开发服务器
echo "启动开发服务器..."
echo "服务器将在 http://localhost:4173 启动"
echo "外部访问: http://$(hostname -I | awk '{print $1}'):4173"

# 启动服务器
npm run dev
