# WalletConnect 配置指南

## 问题
当前使用的是临时测试 Project ID，导致以下错误：
- 403 Forbidden 错误
- "Origin not found on Allowlist" 错误

## 解决步骤

### 1. 创建 WalletConnect Project
1. 访问 https://cloud.walletconnect.com
2. 点击 "Sign Up" 或 "Sign In"
3. 创建新项目：
   - 项目名称: HCF DeFi Platform
   - 项目类型: Web App
   - 项目描述: HCF DeFi Platform - Staking, Referral & Node NFT System

### 2. 配置域名白名单
在项目设置中添加以下域名：
- `https://hcf-finance.xyz`
- `http://hcf-finance.xyz`
- `http://localhost:5173` (开发环境)
- `http://118.107.4.216` (如果需要IP访问)

### 3. 获取 Project ID
从项目详情页复制真实的 Project ID

### 4. 更新代码
编辑 `frontend/src/config/wagmi.ts`：
```typescript
export const wagmiConfig = getDefaultConfig({
  appName: 'HCF DeFi Platform',
  projectId: '你的真实PROJECT_ID', // 替换这里
  chains: [bscTestnet],
  ssr: false,
  appDescription: 'HCF DeFi Platform - Staking, Referral & Node NFT System',
  appUrl: 'https://hcf-finance.xyz',
  appIcon: 'https://hcf-finance.xyz/logo.png',
});
```

### 5. 重新部署
```bash
cd frontend
npm run build
# 部署到服务器
```

## 临时解决方案
如果暂时无法创建WalletConnect项目，可以：
1. 继续使用MetaMask直接连接（不受影响）
2. 禁用WalletConnect模式，只使用injected wallet

## 注意事项
- Project ID 需要等待几分钟才能生效
- 确保域名完全匹配（包括协议 http/https）
- 生产环境强烈建议使用真实的 Project ID