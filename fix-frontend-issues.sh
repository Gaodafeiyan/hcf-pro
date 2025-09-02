#!/bin/bash

echo "🔧 修复前端问题..."

# 进入前端目录
cd frontend

# 清理缓存
echo "清理缓存..."
rm -rf node_modules package-lock.json
rm -rf dist

# 重新安装依赖
echo "重新安装依赖..."
npm install

# 安装缺失的类型定义
echo "安装缺失的类型定义..."
npm install --save-dev @types/minimatch

# 构建项目
echo "构建项目..."
npm run build

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo "启动开发服务器..."
    npm run dev
else
    echo "❌ 构建失败！"
    exit 1
fi
