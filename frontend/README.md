# HCF DeFi 前端应用

## 项目概述

这是HCF DeFi项目的前端应用，基于React + TypeScript + Ant Design构建，集成了Web3功能。

## 技术栈

- **框架**: React 19 + TypeScript
- **UI库**: Ant Design 5.x
- **Web3**: Wagmi + RainbowKit + Ethers.js
- **构建工具**: Vite
- **状态管理**: React Hooks
- **路由**: React Router DOM

## 已修复的问题

### 1. 乱码问题
- **问题**: 部分页面文件出现乱码，无法正常显示中文
- **原因**: 文件编码问题
- **解决方案**: 重新创建了以下页面文件：
  - `src/pages/Referral.tsx` - 推荐系统页面
  - `src/pages/Ranking.tsx` - 排行榜页面
  - `src/pages/Exchange.tsx` - BSDT兑换页面
  - `src/pages/Governance.tsx` - 治理页面

### 2. 合约地址配置
- **问题**: 合约地址配置不正确
- **解决方案**: 更新了`src/config/contracts.ts`中的合约地址为真实的BSC测试网地址

### 3. 合约交互问题
- **问题**: 缺少合约交互工具
- **解决方案**: 创建了`src/utils/contracts.ts`文件，提供完整的合约交互功能

## 项目结构

```
src/
├── components/          # 组件
│   └── Layout/         # 布局组件
├── config/            # 配置文件
│   ├── contracts.ts   # 合约地址配置
│   └── wagmi.ts       # Wagmi配置
├── pages/             # 页面
│   ├── Dashboard.tsx  # 仪表盘
│   ├── Staking.tsx    # 质押页面
│   ├── NodeNFT.tsx    # 节点NFT页面
│   ├── Referral.tsx   # 推荐系统页面
│   ├── Ranking.tsx    # 排行榜页面
│   ├── Exchange.tsx   # BSDT兑换页面
│   └── Governance.tsx # 治理页面
├── utils/             # 工具函数
│   └── contracts.ts   # 合约交互工具
├── App.tsx            # 主应用组件
└── main.tsx          # 入口文件
```

## 功能模块

### 1. 仪表盘 (Dashboard)
- 显示HCF价格、市值、销毁量等关键数据
- 用户资产概览
- 最近交易记录
- 系统统计信息

### 2. 质押挖矿 (Staking)
- 5级质押系统（100-50,000 HCF）
- 日收益率0.4%-0.8%
- LP加成和节点加成
- 质押记录和收益领取

### 3. 节点NFT (NodeNFT)
- 限量99个节点
- 动态算力和等级系统
- 分红池和权益说明
- 节点购买和激活

### 4. 推荐系统 (Referral)
- 20代推荐体系
- V1-V6团队等级
- 入金奖励、静态奖励、团队奖励
- 推荐记录和邀请功能

### 5. 排行榜 (Ranking)
- 质押排行榜
- 推荐排行榜
- 节点排行榜
- 奖励规则和更新机制

### 6. BSDT兑换 (Exchange)
- HCF与BSDT双向兑换
- 实时汇率和滑点保护
- 交易统计和说明
- 余额显示和兑换确认

### 7. 治理 (Governance)
- 提案创建和投票
- 投票权重计算
- 治理流程说明
- 提案历史记录

## 合约集成

### 已集成的合约
- `HCFToken` - HCF主代币
- `BSDTToken` - BSDT稳定币
- `HCFStaking` - 质押合约
- `HCFNodeNFT` - 节点NFT合约
- `HCFReferral` - 推荐合约
- `HCFBSDTExchange` - 交易所合约

### 合约交互工具
`src/utils/contracts.ts`提供了完整的合约交互功能：

```typescript
// 获取合约实例
const hcfContract = getHCFTokenContract(signer);

// 查询余额
const balance = await hcfContract.balanceOf(address);

// 发送交易
const tx = await hcfContract.transfer(to, amount);
await waitForTransaction(tx);
```

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境
- 确保已安装MetaMask钱包
- 切换到BSC测试网
- 获取测试网BNB

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 构建生产版本
```bash
npm run build
```

## 注意事项

### 1. 网络配置
- 项目配置为BSC测试网（ChainID: 97）
- 确保钱包连接到正确的网络

### 2. 合约地址
- 合约地址配置在`src/config/contracts.ts`中
- 如需更新地址，请修改该文件

### 3. WalletConnect配置
- 需要在`src/config/wagmi.ts`中配置正确的projectId
- 从WalletConnect官网获取projectId

### 4. 错误处理
- 所有合约交互都有完整的错误处理
- 用户友好的错误提示

## 开发指南

### 添加新页面
1. 在`src/pages/`目录下创建新页面文件
2. 在`src/App.tsx`中添加路由
3. 在`src/components/Layout/index.tsx`中添加菜单项

### 添加新合约
1. 在`src/utils/contracts.ts`中添加合约ABI
2. 创建合约实例获取函数
3. 在页面中使用合约交互功能

### 样式定制
- 使用Ant Design的主题系统
- 自定义CSS在`src/index.css`中
- 支持暗色主题

## 常见问题

### Q: 页面显示乱码怎么办？
A: 检查文件编码，确保使用UTF-8编码保存文件。

### Q: 合约调用失败怎么办？
A: 检查网络连接、合约地址、用户余额和参数是否正确。

### Q: 钱包连接失败怎么办？
A: 确保安装了MetaMask，并切换到BSC测试网。

### Q: 交易确认慢怎么办？
A: 这是网络问题，可以适当提高gas费用。

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License
