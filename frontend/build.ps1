# PowerShell构建脚本
Write-Host "开始构建前端项目..." -ForegroundColor Green

# 安装依赖
Write-Host "安装依赖..." -ForegroundColor Yellow
npm install

# 构建项目
Write-Host "构建项目..." -ForegroundColor Yellow
npm run build

# 检查构建结果
if ($LASTEXITCODE -eq 0) {
    Write-Host "构建成功！" -ForegroundColor Green
    Write-Host "启动预览服务器..." -ForegroundColor Yellow
    npm run preview
} else {
    Write-Host "构建失败！" -ForegroundColor Red
    exit 1
}
