#!/bin/bash

echo "修复React版本兼容性问题..."

cd frontend

# 备份 package.json
cp package.json package.json.bak

# 删除node_modules和锁文件
echo "清理旧依赖..."
rm -rf node_modules
rm -f package-lock.json

# 修改package.json中的React版本
echo "更新React版本到18.3.1..."
sed -i 's/"react": ".*"/"react": "^18.3.1"/' package.json
sed -i 's/"react-dom": ".*"/"react-dom": "^18.3.1"/' package.json

# 重新安装依赖
echo "重新安装依赖..."
npm install --legacy-peer-deps

# 重新构建
echo "重新构建项目..."
npm run build

echo "修复完成！"