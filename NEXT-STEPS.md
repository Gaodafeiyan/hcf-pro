# HCF-PRO 主网部署 - 下一步操作指南

## 📊 当前状态

### ✅ 已完成
1. **5个核心合约已部署到BSC主网:**
   - HCF Token: `0xcAA4532032fd78173B3E15d0201d34B78b41CDDf`
   - BSDT Token: `0x6f5DaF12BAe217aE1420310D589719eccC0Cf908`
   - HCF Referral: `0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0`
   - HCF Staking: `0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252`
   - HCF Node NFT: `0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523`

2. **税率已正确配置:**
   - 买入税: 2%
   - 卖出税: 5%
   - 转账税: 1%

3. **Owner权限:**
   - 所有合约的Owner是: `0x4509f773f2Cb6543837Eabbd27538139feE59496`

## 🎯 立即需要执行的任务

### 1️⃣ 部署剩余2个合约
```bash
# 使用你的主钱包 0x4509f773f2Cb6543837Eabbd27538139feE59496
# 确保有至少 0.02 BNB
npx hardhat run scripts/deploy-remaining-contracts.js --network bsc
```

### 2️⃣ 验证所有合约
```bash
# 在BSCScan上验证合约代码
chmod +x scripts/verify-all-contracts.sh
./scripts/verify-all-contracts.sh
```

### 3️⃣ 配置质押参数
需要调整质押合约以匹配HCF-RWA需求:
- Level 1: 1000 HCF, 0.6%日化
- Level 2: 10000 HCF, 0.7%日化
- Level 3: 100000 HCF, 0.8%日化

### 4️⃣ 设置推荐奖励
配置20层推荐体系:
- 1代: 5%入金 + 20%静态
- 2代: 3%入金 + 10%静态
- 3-8代: 5%静态
- 9-15代: 3%静态
- 16-20代: 2%静态

## 📝 检查清单

- [ ] 部署HCF-BSDT兑换合约
- [ ] 部署燃烧机制合约
- [ ] 在BSCScan验证所有7个合约
- [ ] 配置质押等级参数
- [ ] 设置推荐奖励率
- [ ] 添加初始流动性到PancakeSwap
- [ ] 设置节点NFT铸造价格
- [ ] 更新前端配置使用主网地址
- [ ] 测试所有功能
- [ ] 公告主网上线

## 🔧 常用命令

### 检查合约状态
```bash
npx hardhat run check-mainnet-status.js --network bsc
```

### 查看合约余额
```bash
npx hardhat run scripts/check-balances.js --network bsc
```

### 紧急暂停（如需要）
```bash
npx hardhat run scripts/emergency-pause.js --network bsc
```

## ⚠️ 重要提醒

1. **多签钱包**: 考虑将关键操作转移到多签钱包
2. **流动性锁定**: 添加流动性后考虑锁定LP代币
3. **审计**: 考虑进行专业的智能合约审计
4. **监控**: 设置链上监控和警报系统

## 📞 支持

如遇到问题:
1. 检查交易hash在BSCScan上的错误信息
2. 确保钱包有足够的BNB作为gas费
3. 验证合约地址是否正确

## 🚀 快速启动

运行完整部署流程:
```bash
./complete-mainnet-deployment.sh
# 选择 4 执行全部任务
```

---
**最后更新**: 2025-09-08
**状态**: 5/7 合约已部署，等待完成剩余部署和配置