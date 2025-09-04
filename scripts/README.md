# HCF 流动性自动添加监控脚本

## 功能说明

此脚本用于自动监控股权LP的归集地址，当HCF和BSDT达到设定阈值后，自动添加流动性到PancakeSwap。

## 工作流程

```
用户股权LP质押 → 归集地址 → 监控脚本检测 → 自动添加流动性 → LP Token管理
```

## 安装

```bash
cd scripts
npm install
```

## 配置

1. 复制环境变量文件：
```bash
cp ../.env.liquidity.example ../.env.liquidity
```

2. 编辑 `.env.liquidity` 设置：
   - `KEEPER_PRIVATE_KEY`: 执行操作的私钥（需要有BNB作为Gas）
   - `MIN_HCF_THRESHOLD`: 最小HCF数量（默认1000）
   - `MIN_BSDT_THRESHOLD`: 最小BSDT数量（默认100）
   - `CHECK_INTERVAL_MINUTES`: 检查间隔（默认10分钟）

## 运行模式

### 1. 测试模式（只检查余额）
```bash
npm run test
```

### 2. 单次执行
```bash
npm run once
```

### 3. 持续监控（开发环境）
```bash
npm start
```

### 4. 生产环境（使用PM2）
```bash
# 启动
npm run pm2:start

# 查看状态
npm run pm2:status

# 查看日志
npm run pm2:logs

# 停止
npm run pm2:stop

# 重启
npm run pm2:restart
```

## 日志

日志文件保存在 `logs/` 目录：
- `liquidity-YYYY-MM-DD.json`: 每日交易记录
- `pm2-out.log`: PM2输出日志
- `pm2-error.log`: PM2错误日志

## 安全注意事项

1. **私钥安全**：
   - 生产环境使用专用的Keeper账户
   - 私钥不要提交到Git
   - 建议使用硬件钱包或多签

2. **权限控制**：
   - Keeper账户只需要操作归集地址资金的权限
   - 建议使用多签钱包控制归集地址

3. **监控告警**：
   - 设置余额告警（BNB不足）
   - 设置失败重试机制
   - 记录所有操作日志

## 故障排除

### 1. Gas费不足
- 检查Keeper账户BNB余额
- 调整 `MAX_GAS_PRICE` 设置

### 2. 授权失败
- 确认代币合约地址正确
- 检查网络连接

### 3. 流动性添加失败
- 检查PancakeRouter地址
- 确认滑点设置合理
- 查看错误日志

## 监控指标

脚本会输出以下信息：
- 归集地址余额
- 添加流动性交易哈希
- LP Token数量
- 错误和异常

## 技术架构

```
监控脚本
├── 余额检查模块
├── 比例计算模块
├── 流动性添加模块
├── 日志记录模块
└── 错误处理模块
```

## 联系支持

如有问题请联系技术团队。