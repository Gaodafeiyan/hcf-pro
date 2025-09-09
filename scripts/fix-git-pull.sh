#!/bin/bash

echo "清理冲突文件并同步最新代码..."

# 移除冲突文件
rm -f BSDT_flattened.sol
rm -f verify-bsdt.sh
rm -f verify-hcf.sh
rm -f ALL-CONTRACTS-FINAL.json

# 拉取最新代码
git pull

echo "✅ 代码同步完成"

# 运行诊断脚本
echo "运行代币状态检查..."
npx hardhat run scripts/check-token-status.js --network bsc