@echo off
echo 🔧 修复前端问题...

REM 进入前端目录
cd frontend

REM 清理缓存
echo 清理缓存...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist dist rmdir /s /q dist

REM 重新安装依赖
echo 重新安装依赖...
npm install

REM 安装缺失的类型定义
echo 安装缺失的类型定义...
npm install --save-dev @types/minimatch

REM 构建项目
echo 构建项目...
npm run build

REM 检查构建结果
if %ERRORLEVEL% EQU 0 (
    echo ✅ 构建成功！
    echo 启动开发服务器...
    npm run dev
) else (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
