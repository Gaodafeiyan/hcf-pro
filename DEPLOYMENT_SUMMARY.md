# HCF-PRO V2 部署总结

## 📅 部署信息
- **日期**: 2025-09-02
- **网络**: BSC Testnet (Chain ID: 97)
- **部署账户**: 0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9
- **Gas消耗**: 约2.5 BNB

## 📋 合约地址

### 核心合约
| 合约名称 | 地址 | BSCScan链接 |
|---------|------|------------|
| **多签钱包** | 0x534C2c0DF7F06aB6e66E704D4aE809DDa6883737 | [查看](https://testnet.bscscan.com/address/0x534C2c0DF7F06aB6e66E704D4aE809DDa6883737) |
| **HCF代币** | 0x78B7D17C3f98BB47955A155F661f9042F1717288 | [查看](https://testnet.bscscan.com/address/0x78B7D17C3f98BB47955A155F661f9042F1717288) |
| **BSDT稳定币** | 0x52E9C19DFF5C8636A6725bd78A9c85ee5045ac15 | [查看](https://testnet.bscscan.com/address/0x52E9C19DFF5C8636A6725bd78A9c85ee5045ac15) |
| **质押合约** | 0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD | [查看](https://testnet.bscscan.com/address/0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD) |
| **推荐合约** | 0x18A468b3dfC71C3bA9F5A801734B219d253C7F27 | [查看](https://testnet.bscscan.com/address/0x18A468b3dfC71C3bA9F5A801734B219d253C7F27) |
| **节点NFT** | 0x6fDB1B1F09665Ac00C26701F5E1F92F4652D6F85 | [查看](https://testnet.bscscan.com/address/0x6fDB1B1F09665Ac00C26701F5E1F92F4652D6F85) |
| **交易所** | 0x6729c0977325772cF6750eD65f9e3E07f331E104 | [查看](https://testnet.bscscan.com/address/0x6729c0977325772cF6750eD65f9e3E07f331E104) |
| **销毁机制** | 0x693Ac6472a98BFDedfEE8B9892CAb1A00dc7FD24 | [查看](https://testnet.bscscan.com/address/0x693Ac6472a98BFDedfEE8B9892CAb1A00dc7FD24) |
| **无常损失保护** | 0x32De00900bD63e8899930778118365ef4556DB0D | [查看](https://testnet.bscscan.com/address/0x32De00900bD63e8899930778118365ef4556DB0D) |
| **市场控制** | 0x532e69A732Ac9152CA2c1212eC55cD7d5c470730 | [查看](https://testnet.bscscan.com/address/0x532e69A732Ac9152CA2c1212eC55cD7d5c470730) |
| **排名奖励** | 0x9A27E7f4139aD7a12591ce25e40c863f8A34e956 | [查看](https://testnet.bscscan.com/address/0x9A27E7f4139aD7a12591ce25e40c863f8A34e956) |

### 辅助合约
| 合约名称 | 地址 | BSCScan链接 |
|---------|------|------------|
| **USDT Oracle** | 0x74F6cFFa06f346b4DF40BF4121f4B27Ab4b22140 | [查看](https://testnet.bscscan.com/address/0x74F6cFFa06f346b4DF40BF4121f4B27Ab4b22140) |

## 🚀 主要功能实现

### ✅ 已实现功能
1. **HCF代币系统** (100%完成)
   - 100亿总量，1000万初始流通
   - 900万储备池
   - 销毁至99万机制
   - 最小持有0.0001 HCF

2. **质押系统** (100%完成)
   - 5级质押：1万-10万HCF
   - 日化收益：0.4%-0.8%
   - 前期限制：最低1000 HCF，仅开放L3级别
   - LP双倍收益
   - 动态收益50%-100%

3. **节点NFT系统** (100%完成)
   - 99个节点限量
   - 申请费/激活费机制
   - 动态算力 = LP/1000
   - 4种分红池
   - 治理投票权重

4. **推荐系统** (100%完成)
   - 20级推荐体系
   - 质押收益：20%/10%/5%
   - 团队V1-V6等级
   - 直推解锁机制
   - Top 2000排名奖励

5. **交易系统** (100%完成)
   - 0%买入费/3%卖出费
   - Pancake集成
   - 大额限制机制
   - 无常损失补偿

6. **市场控制** (100%完成)
   - 5级防暴跌机制
   - 产出衰减（每亿减0.1%）
   - 多种加成机制
   - 恢复机制

## 🔧 服务器部署命令

```bash
# 1. 在服务器上拉取最新代码
cd /srv/hcf-pro
git pull

# 2. 安装依赖
npm install

# 3. 创建.env文件（复制上面的配置）
nano .env

# 4. 编译合约
npx hardhat compile

# 5. 验证合约（可选）
npx hardhat verify --network bscTestnet CONTRACT_ADDRESS

# 6. 启动前端
cd frontend
npm install
npm run build
npm run preview
```

## 📊 测试步骤

1. **获取测试币**
   - 从[BSC测试网水龙头](https://testnet.binance.org/faucet-smart)获取BNB
   - 部署者账户需要至少5 BNB用于测试

2. **测试质押**
   ```javascript
   // 连接质押合约
   const staking = await ethers.getContractAt("HCFStakingV2", "0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD");
   
   // 质押1000 HCF到L3级别
   await hcfToken.approve(staking.address, ethers.utils.parseEther("1000"));
   await staking.stake(3, ethers.utils.parseEther("1000"));
   ```

3. **测试节点NFT**
   ```javascript
   // 申请节点
   await nodeNFT.applyForNode(true); // 使用HCF支付
   ```

## 🔐 安全注意事项

1. **私钥安全**
   - 不要在生产环境使用测试私钥
   - 使用硬件钱包或安全的密钥管理服务

2. **多签钱包**
   - 所有重要操作需要3/5多签
   - 定期更换签名者

3. **合约审计**
   - 主网部署前进行专业审计
   - 设置适当的时间锁

## 📝 后续工作

- [ ] 在BSCScan上验证所有合约
- [ ] 配置前端连接新合约地址
- [ ] 完整功能测试
- [ ] 准备主网部署
- [ ] 社区公告和文档更新

## 📞 联系方式

如有问题，请联系开发团队。

---

*最后更新: 2025-09-02*