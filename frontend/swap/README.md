# HCF Swap 前端界面

## 功能说明

这是HCF项目的Swap兑换界面，实现了 USDT → BSDT → HCF 的兑换流程。

## 主要功能

1. **钱包连接**
   - 支持MetaMask连接
   - 自动切换到BSC主网
   - 记住连接状态

2. **兑换流程**
   - USDT → BSDT (1:1 通过Gateway)
   - BSDT → HCF (通过PancakeSwap，如果池子存在)
   - 实时显示兑换比例
   - 自动计算税费

3. **余额显示**
   - 实时显示USDT、BSDT、HCF余额
   - 交易记录追踪

## 使用的合约

- **BSDT**: 0x3932968a904Bf6773E8a13F1D2358331B9a1a530 (ProtectedBSDT)
- **HCF**: 0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192 (10亿供应量)
- **Gateway**: 0x6b5462814DC6ffB2a66D5E45Ab5b5d11Dcc1a033 (USDT→BSDT兑换)

## 部署说明

1. 将整个 `frontend/swap` 文件夹部署到Web服务器
2. 确保用户安装了MetaMask钱包
3. 用户需要有BSC主网的BNB作为Gas费

## 注意事项

- BSDT有交易限制，只能通过Gateway获取
- HCF/BSDT池子需要手动添加流动性后才能兑换HCF
- 买入HCF有2%税费

## 文件结构

```
swap/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── config.js       # 配置文件（合约地址、ABI）
├── swap.js         # 核心逻辑
└── README.md       # 说明文档
```