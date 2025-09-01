#!/bin/bash

echo "======================================"
echo "HCF-PRO 最终部署脚本"
echo "======================================"

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull

# 2. 进入前端目录
cd frontend

# 3. 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install --legacy-peer-deps
fi

# 4. 构建项目
echo "🔨 构建前端..."
npm run build

# 5. 复制备用HTML到dist
echo "📄 复制备用页面..."
cp ../app.html dist/

# 6. 创建成功页面
cat > dist/success.html << 'EOF'
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>部署成功</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        .links a {
            display: inline-block;
            margin: 10px;
            padding: 15px 30px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
        }
        .links a:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ HCF-PRO 部署成功!</h1>
        <p>构建时间: $(date)</p>
        <p>React版本: 18.3.1</p>
        <p>网络: BSC Testnet</p>
        <div class="links">
            <a href="/">主应用</a>
            <a href="/app.html">备用界面</a>
            <a href="/diagnose.html">诊断工具</a>
        </div>
    </div>
</body>
</html>
EOF

# 7. 显示构建结果
echo ""
echo "======================================"
echo "✅ 部署完成！"
echo "======================================"
echo ""
echo "📊 构建统计："
ls -lh dist/assets/*.js | head -5
echo ""
echo "🌐 访问地址："
echo "  主应用: http://你的域名/"
echo "  备用界面: http://你的域名/app.html"
echo "  成功页面: http://你的域名/success.html"
echo ""
echo "📝 合约地址："
echo "  HCF Token: 0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc"
echo "  BSDT Token: 0x622e568976f6cC2eaE4cfd3836d92F111000E787"
echo "  Staking: 0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74"
echo ""
echo "======================================"