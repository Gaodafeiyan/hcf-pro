#!/bin/bash

# BSCScan合约验证脚本

echo "========================================="
echo "BSCScan 合约验证"
echo "========================================="

# 合约地址
HCF_TOKEN="0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
BSDT_TOKEN="0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
HCF_REFERRAL="0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
HCF_STAKING="0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
HCF_NODE_NFT="0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"

# 验证HCF Token
echo "验证 HCF Token..."
npx hardhat verify --network bsc $HCF_TOKEN \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496"

# 验证BSDT Token
echo "验证 BSDT Token..."
npx hardhat verify --network bsc $BSDT_TOKEN \
    "0x55d398326f99059fF775485246999027B3197955" \
    "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496"

# 验证推荐合约
echo "验证 HCF Referral..."
npx hardhat verify --network bsc $HCF_REFERRAL \
    $HCF_TOKEN \
    $BSDT_TOKEN

# 验证质押合约
echo "验证 HCF Staking..."
npx hardhat verify --network bsc $HCF_STAKING \
    $HCF_TOKEN \
    $BSDT_TOKEN \
    $HCF_REFERRAL

# 验证节点NFT
echo "验证 HCF Node NFT..."
npx hardhat verify --network bsc $HCF_NODE_NFT \
    $HCF_TOKEN \
    $BSDT_TOKEN \
    "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496" \
    "0x4509f773f2Cb6543837Eabbd27538139feE59496"

echo "✅ 验证脚本执行完成"
echo "请检查BSCScan上的验证状态"