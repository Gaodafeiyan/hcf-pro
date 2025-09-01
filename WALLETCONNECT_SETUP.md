# WalletConnect Project ID 设置指南

## 当前状态
- ✅ 已配置临时测试用Project ID
- ⚠️ 生产环境需要替换为真实的Project ID

## 获取真实Project ID步骤

### 1. 注册WalletConnect账户
1. 访问 https://cloud.walletconnect.com/
2. 点击 "Sign Up" 注册账户
3. 验证邮箱地址

### 2. 创建新项目
1. 登录后点击 "New Project"
2. 填写项目信息：
   - Project Name: `HCF DeFi Platform`
   - Project Type: `App`
   - Project Homepage: `https://hcf-finance.xyz`
3. 点击 "Create"

### 3. 获取Project ID
1. 在项目页面找到 "Project ID"
2. 复制32位的Project ID字符串

### 4. 更新配置
1. 编辑文件 `frontend/src/config/wagmi.ts`
2. 替换 `projectId` 的值：
```typescript
projectId: '你的真实Project_ID', // 替换这里
```

### 5. 重新构建前端
```bash
cd /srv/hcf-pro/frontend
npm run build
pm2 restart hcf-frontend
```

## 重要提示
- 免费账户支持100,000次月度请求
- 超出限制需要升级到付费计划
- Project ID是公开的，可以安全地提交到代码库
- 不要泄露API Secret Keys

## 当前临时ID限制
- 仅供测试使用
- 可能会有连接限制
- 建议尽快替换为真实ID