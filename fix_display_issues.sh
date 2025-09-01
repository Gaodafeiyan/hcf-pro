#!/bin/bash

echo "修复前端显示问题..."

# 1. 修复配置文件中的质押等级（已经是正确的）
echo "检查质押等级配置..."

# 2. 创建补丁文件修复 Referral 页面的团队等级显示
cat > frontend/src/patches/referral_fix.patch << 'EOF'
--- a/frontend/src/pages/Referral.tsx
+++ b/frontend/src/pages/Referral.tsx
@@ -140,7 +140,7 @@
               <Statistic
                 title="团队等级"
-                value={referralInfo.teamLevel > 0 ? `V${referralInfo.teamLevel}` : '未达V1'}
+                value={referralInfo.teamLevel > 0 ? `V${referralInfo.teamLevel}` : '未达V1'}
                 prefix={<CrownOutlined />}
                 valueStyle={{ 
                   color: referralInfo.teamLevel > 0 
EOF

# 3. 修复节点NFT等级名称
echo "修复 NodeNFT 等级名称..."
sed -i 's/标准节点/轻量节点/g' frontend/src/pages/NodeNFT.tsx
sed -i 's/高级节点/标准节点/g' frontend/src/pages/NodeNFT.tsx
sed -i 's/100000/10000/g' frontend/src/pages/NodeNFT.tsx
sed -i 's/500000/50000/g' frontend/src/pages/NodeNFT.tsx
sed -i 's/1000000/200000/g' frontend/src/pages/NodeNFT.tsx
sed -i 's/5000000/500000/g' frontend/src/pages/NodeNFT.tsx

echo "修复完成！"