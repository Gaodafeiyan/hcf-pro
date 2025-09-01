# 生产环境上线检查清单

## ✅ 已完成的前端页面
1. **Dashboard** - 显示链上数据 ✅
2. **Staking** - 质押/领取/复投 ✅
3. **Exchange** - HCF/USDT兑换 ✅
4. **Referral** - 推荐系统 ✅
5. **NodeNFT** - 节点购买/分红 ✅
6. **Ranking** - 排行榜（需要后端支持）✅

## ⚠️ 需要处理的问题

### 1. WalletConnect Project ID
- **问题**: 使用临时测试ID导致403错误
- **解决**: 
  1. 访问 https://cloud.walletconnect.com
  2. 创建项目并添加域名白名单
  3. 更新 `frontend/src/config/wagmi.ts` 中的 projectId

### 2. 获取测试币
用户需要BSC Testnet的测试币才能使用：
- **BNB**: https://testnet.bnbchain.org/faucet-smart
- **USDT**: BSC Testnet USDT Faucet

### 3. 合约授权问题
- BSDT代币有特殊授权机制，需要Exchange合约被授权
- 确保MultiSig钱包已授权Exchange合约

### 4. 排行榜数据
当前使用模拟数据，完整功能需要：
- 部署后端服务
- 使用TheGraph或其他链上索引器
- 实时追踪所有用户数据

## 📋 部署步骤

### 前端部署
```bash
cd frontend
npm install
npm run build
# 上传dist目录到服务器
```

### Nginx配置
```nginx
server {
    listen 80;
    server_name hcf-finance.xyz;
    
    root /var/www/hcf-pro/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL配置（生产环境必须）
```bash
certbot --nginx -d hcf-finance.xyz
```

## 🔐 安全检查

### 前端安全
- [ ] 移除所有console.log
- [ ] 验证所有用户输入
- [ ] 使用环境变量管理敏感信息
- [ ] 启用HTTPS

### 合约安全
- [ ] 多签钱包配置正确
- [ ] 紧急暂停功能测试
- [ ] 权限管理验证
- [ ] 审计报告（如有）

## 📊 监控和维护

### 监控项目
- 合约余额和交易量
- 用户活跃度
- 错误日志
- 性能指标

### 维护任务
- 定期备份数据
- 更新依赖包
- 监控安全公告
- 响应用户反馈

## 🚀 主网迁移清单

当准备迁移到主网时：

1. **更新合约地址**
   - 部署所有合约到BSC主网
   - 更新 `frontend/src/config/contracts.ts`

2. **更新网络配置**
   - 修改chainId从97到56
   - 更新RPC URLs

3. **更新代币地址**
   - 使用主网USDT: 0x55d398326f99059fF775485246999027B3197955
   - 更新其他代币地址

4. **安全审计**
   - 合约审计
   - 前端安全审查
   - 渗透测试

5. **流动性准备**
   - 初始流动性注入
   - 做市策略

## 📝 注意事项

1. **测试网环境**
   - 当前运行在BSC Testnet
   - 所有代币都是测试代币
   - 交易不涉及真实资金

2. **已知限制**
   - WalletConnect需要真实Project ID
   - 排行榜需要后端支持
   - 某些高级功能需要链上索引器

3. **用户教育**
   - 提供使用教程
   - 常见问题解答
   - 社区支持渠道