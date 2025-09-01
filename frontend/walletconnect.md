# WalletConnect 配置说明

## 当前配置
- Project ID: `2c8e9d8b7a3f5e1d4b6c9a2f8e7d3c1b` (临时测试ID)
- Domain: `https://hcf-finance.xyz`

## 生产环境配置步骤

1. 访问 https://cloud.walletconnect.com
2. 创建新项目或使用现有项目
3. 在项目设置中添加域名:
   - `https://hcf-finance.xyz`
   - `http://118.107.4.216` (如果需要IP访问)
4. 获取真实的 Project ID
5. 替换 `src/config/wagmi.ts` 中的 projectId

## 域名白名单错误解决
如果出现 "Domain hcf-finance.xyz not on allowlist" 错误:
1. 确保在 WalletConnect Cloud 中已添加域名
2. 检查是否使用了正确的 Project ID
3. 等待几分钟让配置生效

## 临时解决方案
当前使用的是临时测试 Project ID，可能会有限制。建议尽快创建正式项目。