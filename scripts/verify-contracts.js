const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 验证已部署的合约...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("验证账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");

  // 合约地址列表
  const contracts = {
    "多签钱包": process.env.MULTISIG_ADDRESS,
    "USDT Oracle": process.env.USDT_ORACLE_ADDRESS,
    "BSDT代币": process.env.BSDT_TOKEN_ADDRESS,
    "HCF代币": process.env.HCF_TOKEN_ADDRESS,
    "HCF质押": process.env.HCF_STAKING_ADDRESS,
    "HCF推荐": process.env.HCF_REFERRAL_ADDRESS,
    "HCF节点NFT": process.env.HCF_NODE_NFT_ADDRESS,
    "HCF-BSDT交易所": process.env.HCF_BSDT_EXCHANGE_ADDRESS,
    "HCF销毁机制": process.env.HCF_BURN_MECHANISM_ADDRESS,
    "HCF无常损失保护": process.env.HCF_IMPERMANENT_LOSS_PROTECTION_ADDRESS,
    "HCF市场控制": process.env.HCF_MARKET_CONTROL_ADDRESS,
    "HCF排名奖励": process.env.HCF_RANKING_ADDRESS
  };

  console.log("📋 已部署的合约地址:");
  for (const [name, address] of Object.entries(contracts)) {
    if (address) {
      const code = await ethers.provider.getCode(address);
      const isDeployed = code !== "0x";
      console.log(`${name}: ${address} ${isDeployed ? "✅" : "❌"}`);
    } else {
      console.log(`${name}: 未配置 ❌`);
    }
  }

  // 验证BSDTToken的初始池铸造
  console.log("\n🔍 验证BSDT代币特性:");
  try {
    const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
    
    // 检查总供应量
    const totalSupply = await BSDTToken.totalSupply();
    console.log("BSDT总供应量:", ethers.utils.formatEther(totalSupply));
    
    // 检查是否有初始100,000 BSDT
    if (totalSupply.gte(ethers.utils.parseEther("100000"))) {
      console.log("✅ 初始流动性池铸造已完成 (>=100,000 BSDT)");
    } else {
      console.log("⚠️ 初始流动性池铸造可能未完成");
    }
  } catch (error) {
    console.log("❌ 无法验证BSDT代币:", error.message);
  }

  // 验证HCFToken税率
  console.log("\n🔍 验证HCF代币税率:");
  try {
    const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
    
    const buyBurnRate = await HCFToken.buyBurnRate();
    const buyMarketingRate = await HCFToken.buyMarketingRate();
    const buyLPRate = await HCFToken.buyLPRate();
    const buyNodeRate = await HCFToken.buyNodeRate();
    
    console.log("买入税率分配:");
    console.log("- 销毁:", buyBurnRate.toString(), "/10000 =", (buyBurnRate * 100 / 10000).toFixed(1) + "%");
    console.log("- 营销:", buyMarketingRate.toString(), "/10000 =", (buyMarketingRate * 100 / 10000).toFixed(1) + "%");
    console.log("- LP:", buyLPRate.toString(), "/10000 =", (buyLPRate * 100 / 10000).toFixed(1) + "%");
    console.log("- 节点:", buyNodeRate.toString(), "/10000 =", (buyNodeRate * 100 / 10000).toFixed(1) + "%");
    
    if (buyBurnRate.eq(2500) && buyMarketingRate.eq(2500) && buyLPRate.eq(2500) && buyNodeRate.eq(2500)) {
      console.log("✅ 买入税率分配正确 (各25%)");
    } else {
      console.log("⚠️ 买入税率分配需要更新");
    }
  } catch (error) {
    console.log("❌ 无法验证HCF代币:", error.message);
  }

  // 检查合约关联
  console.log("\n🔍 验证合约关联:");
  try {
    const HCFStaking = await ethers.getContractAt("HCFStaking", process.env.HCF_STAKING_ADDRESS);
    
    // 检查推荐合约地址
    const referralContract = await HCFStaking.referralContract();
    if (referralContract.toLowerCase() === process.env.HCF_REFERRAL_ADDRESS.toLowerCase()) {
      console.log("✅ 质押合约已关联推荐合约");
    } else {
      console.log("⚠️ 质押合约未正确关联推荐合约");
    }
  } catch (error) {
    console.log("❌ 无法验证合约关联:", error.message);
  }

  console.log("\n📊 验证结果总结:");
  console.log("如果看到⚠️警告，说明合约可能需要重新部署或更新配置");
  console.log("如果所有检查都是✅，说明合约已正确部署并配置");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("验证失败:", error);
    process.exit(1);
  });