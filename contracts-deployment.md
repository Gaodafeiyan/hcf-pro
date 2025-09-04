# HCF-PRO 合约部署地址汇总

## 最新有效地址（BSC测试网）

### 核心合约 ✅
- **HCF Token**: `0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc` ✅ 正在使用
- **BSDT Token V2**: `0x91152b436A5b3535E01902Cf09a3c59Ab4c433BD` ✅ 新版本（无DEX限制）
- **HCF Staking**: `0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74` ✅ 正在使用
- **HCF Referral**: `0x18A468b3dfC71C3bA9F5A801734B219d253C7F27` ✅ 已部署

### 辅助合约
- **LiquidityHelper**: `0x4F332FFf7d05De1DCce7EE7465Db558Afe666d82` ⚠️ 不再需要（V2解决）
- **PancakeSwap Router**: `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` ✅ 
- **PancakeSwap Factory**: `0x6725F303b657a9451d8BA641348b6761A6CC7a17` ✅
- **HCF-BSDT LP Pool**: `0x67D7211815a7Cbb0e816e494F444d7bbfC1a35fD` ✅ 已创建

### 旧版本地址（已废弃）
- ~~HCF Token (旧): 0x78B7D17C3f98BB47955A155F661f9042F1717288~~
- ~~BSDT Token V1 (旧): 0x622e568976f6cC2eaE4cfd3836d92F111000E787~~
- ~~HCF Staking (旧): 0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD~~

## 需要更新的地方

1. **staking-fixed.html** - 更新为新BSDT地址
2. **referral-system.html** - 已更新 ✅
3. **所有测试脚本** - 统一使用最新地址

## 流动性池状态
- HCF储备: 10,000 HCF
- BSDT储备: 1,000 BSDT  
- 比例: 1 HCF = 0.1 BSDT