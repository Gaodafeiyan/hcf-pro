#!/bin/bash

# HCF-PRO 主网部署完成脚本
# 完成剩余任务并验证系统

echo "========================================="
echo "HCF-PRO 主网部署完成脚本"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 显示当前状态
echo -e "${GREEN}✅ 已部署的主网合约:${NC}"
echo "1. HCF Token: 0xcAA4532032fd78173B3E15d0201d34B78b41CDDf"
echo "2. BSDT Token: 0x6f5DaF12BAe217aE1420310D589719eccC0Cf908"
echo "3. HCF Referral: 0xdd9f2c102802F2C7e9854270e56a8Ac4d204aDE0"
echo "4. HCF Staking: 0x2b74B7e6Af8b7D58c2cbc9AC9aFa8520EB6c9252"
echo "5. HCF Node NFT: 0x229a54ed425b7F6Aa32f7391DB2Cb93f164F9523"
echo ""

echo -e "${YELLOW}📋 待完成任务:${NC}"
echo "1. 部署HCF-BSDT兑换合约"
echo "2. 部署HCF燃烧机制合约"
echo "3. 验证所有合约"
echo "4. 配置合约参数"
echo ""

read -p "选择操作 [1=部署剩余合约, 2=验证合约, 3=配置参数, 4=全部执行]: " choice

case $choice in
    1)
        echo -e "${YELLOW}部署剩余合约...${NC}"
        npx hardhat run scripts/deploy-remaining-contracts.js --network bsc
        ;;
    2)
        echo -e "${YELLOW}验证合约...${NC}"
        ./scripts/verify-all-contracts.sh
        ;;
    3)
        echo -e "${YELLOW}配置参数...${NC}"
        npx hardhat run scripts/configure-mainnet-params.js --network bsc
        ;;
    4)
        echo -e "${YELLOW}执行全部任务...${NC}"
        npx hardhat run scripts/deploy-remaining-contracts.js --network bsc
        ./scripts/verify-all-contracts.sh
        npx hardhat run scripts/configure-mainnet-params.js --network bsc
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ 操作完成!${NC}"
echo -e "${GREEN}=========================================${NC}"