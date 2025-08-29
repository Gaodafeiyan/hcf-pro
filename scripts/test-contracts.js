const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🧪 开始测试HCF项目合约功能...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");

  // ============ 1. 测试代币基础信息 ============
  console.log("📊 1. 测试代币基础信息");
  console.log("=" .repeat(50));
  
  // HCF代币
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  const hcfTotalSupply = await HCFToken.totalSupply();
  const hcfName = await HCFToken.name();
  const hcfSymbol = await HCFToken.symbol();
  const hcfDecimals = await HCFToken.decimals();
  
  console.log("HCF代币:");
  console.log("  名称:", hcfName);
  console.log("  符号:", hcfSymbol);
  console.log("  精度:", hcfDecimals);
  console.log("  总供应量:", ethers.utils.formatEther(hcfTotalSupply), "HCF");
  console.log("  预期: 2,100,000 HCF", hcfTotalSupply.eq(ethers.utils.parseEther("2100000")) ? "✅" : "❌");
  
  // BSDT代币
  const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const bsdtTotalSupply = await BSDTToken.totalSupply();
  const bsdtName = await BSDTToken.name();
  const bsdtSymbol = await BSDTToken.symbol();
  
  console.log("\nBSDT代币:");
  console.log("  名称:", bsdtName);
  console.log("  符号:", bsdtSymbol);
  console.log("  总供应量:", ethers.utils.formatEther(bsdtTotalSupply), "BSDT");
  console.log("  初始LP池铸造(100,000):", bsdtTotalSupply.gte(ethers.utils.parseEther("100000")) ? "✅" : "❌");

  // ============ 2. 测试HCF税率配置 ============
  console.log("\n📊 2. 测试HCF税率配置");
  console.log("=" .repeat(50));
  
  const buyTaxRate = await HCFToken.buyTaxRate();
  const sellTaxRate = await HCFToken.sellTaxRate();
  const transferTaxRate = await HCFToken.transferTaxRate();
  
  console.log("总税率:");
  console.log("  买入税:", buyTaxRate.toString(), "/10000 =", (buyTaxRate * 100 / 10000).toFixed(1) + "%", buyTaxRate.eq(200) ? "✅" : "❌");
  console.log("  卖出税:", sellTaxRate.toString(), "/10000 =", (sellTaxRate * 100 / 10000).toFixed(1) + "%", sellTaxRate.eq(500) ? "✅" : "❌");
  console.log("  转账税:", transferTaxRate.toString(), "/10000 =", (transferTaxRate * 100 / 10000).toFixed(1) + "%", transferTaxRate.eq(100) ? "✅" : "❌");
  
  const buyBurnRate = await HCFToken.buyBurnRate();
  const buyMarketingRate = await HCFToken.buyMarketingRate();
  const buyLPRate = await HCFToken.buyLPRate();
  const buyNodeRate = await HCFToken.buyNodeRate();
  
  console.log("\n买入税分配(2%总税):");
  console.log("  销毁:", buyBurnRate.toString(), "/10000 =", (buyBurnRate * 100 / 10000).toFixed(1) + "%", buyBurnRate.eq(2500) ? "✅" : "❌");
  console.log("  营销:", buyMarketingRate.toString(), "/10000 =", (buyMarketingRate * 100 / 10000).toFixed(1) + "%", buyMarketingRate.eq(2500) ? "✅" : "❌");
  console.log("  LP:", buyLPRate.toString(), "/10000 =", (buyLPRate * 100 / 10000).toFixed(1) + "%", buyLPRate.eq(2500) ? "✅" : "❌");
  console.log("  节点:", buyNodeRate.toString(), "/10000 =", (buyNodeRate * 100 / 10000).toFixed(1) + "%", buyNodeRate.eq(2500) ? "✅" : "❌");

  // ============ 3. 测试多签钱包 ============
  console.log("\n📊 3. 测试多签钱包");
  console.log("=" .repeat(50));
  
  const MultiSigWallet = await ethers.getContractAt("MultiSigWallet", process.env.MULTISIG_ADDRESS);
  const requiredConfirmations = await MultiSigWallet.requiredConfirmations();
  const TIMELOCK_DURATION = await MultiSigWallet.TIMELOCK_DURATION();
  
  console.log("多签配置:");
  console.log("  需要确认数:", requiredConfirmations.toString(), "/5", requiredConfirmations.eq(3) ? "✅" : "❌");
  console.log("  执行延迟:", TIMELOCK_DURATION.toString(), "秒 =", (TIMELOCK_DURATION / 3600).toFixed(0), "小时", TIMELOCK_DURATION.eq(172800) ? "✅" : "❌");
  
  // 检查签名者
  let signerCount = 0;
  for (let i = 0; i < 5; i++) {
    try {
      const signer = await MultiSigWallet.signers(i);
      if (signer !== ethers.constants.AddressZero) {
        signerCount++;
        console.log(`  签名者${i + 1}:`, signer);
      }
    } catch (e) {
      break;
    }
  }
  console.log("  总签名者数:", signerCount, signerCount === 5 ? "✅" : "❌");

  // ============ 4. 测试合约关联 ============
  console.log("\n📊 4. 测试合约关联");
  console.log("=" .repeat(50));
  
  // 测试质押合约的关联
  const HCFStaking = await ethers.getContractAt("HCFStaking", process.env.HCF_STAKING_ADDRESS);
  const referralContract = await HCFStaking.referralContract();
  const burnMechanism = await HCFStaking.burnMechanism();
  const nodeContract = await HCFStaking.nodeContract();
  
  console.log("质押合约关联:");
  console.log("  推荐合约:", referralContract === process.env.HCF_REFERRAL_ADDRESS ? "✅" : "❌");
  console.log("  销毁合约:", burnMechanism === process.env.HCF_BURN_MECHANISM_ADDRESS ? "✅" : "❌");
  console.log("  节点合约:", nodeContract === process.env.HCF_NODE_NFT_ADDRESS ? "✅" : "❌");

  // ============ 5. 测试Oracle ============
  console.log("\n📊 5. 测试Oracle");
  console.log("=" .repeat(50));
  
  const USDTOracle = await ethers.getContractAt("USDTOracle", process.env.USDT_ORACLE_ADDRESS);
  const currentSupply = await USDTOracle.totalSupply();
  const lastUpdateTime = await USDTOracle.lastUpdateTime();
  const minUpdateInterval = await USDTOracle.minUpdateInterval();
  
  console.log("USDT Oracle:");
  console.log("  当前供应量:", ethers.utils.formatEther(currentSupply));
  console.log("  最小更新间隔:", minUpdateInterval.toString(), "秒 =", (minUpdateInterval / 3600).toFixed(0), "小时");
  console.log("  初始供应量正确:", currentSupply.eq(ethers.utils.parseEther("1000000")) ? "✅" : "❌");

  // ============ 6. 测试节点NFT配置 ============
  console.log("\n📊 6. 测试节点NFT配置");
  console.log("=" .repeat(50));
  
  const HCFNodeNFT = await ethers.getContractAt("HCFNodeNFT", process.env.HCF_NODE_NFT_ADDRESS);
  const baseFee = await HCFNodeNFT.baseFee();
  const activationFeeHCF = await HCFNodeNFT.activationFeeHCF();
  const activationFeeBSDT = await HCFNodeNFT.activationFeeBSDT();
  const currentId = await HCFNodeNFT.currentId();
  
  console.log("节点NFT:");
  console.log("  基础费用:", ethers.utils.formatEther(baseFee), "BSDT", baseFee.eq(ethers.utils.parseEther("5000")) ? "✅" : "❌");
  console.log("  激活费HCF:", ethers.utils.formatEther(activationFeeHCF), "HCF", activationFeeHCF.eq(ethers.utils.parseEther("1000")) ? "✅" : "❌");
  console.log("  激活费BSDT:", ethers.utils.formatEther(activationFeeBSDT), "BSDT", activationFeeBSDT.eq(ethers.utils.parseEther("1000")) ? "✅" : "❌");
  console.log("  当前节点数:", currentId.toString());

  // ============ 7. 测试无常损失保护 ============
  console.log("\n📊 7. 测试无常损失保护");
  console.log("=" .repeat(50));
  
  const ImpermanentLoss = await ethers.getContractAt("HCFImpermanentLossProtection", process.env.HCF_IMPERMANENT_LOSS_PROTECTION_ADDRESS);
  const minCompensation = await ImpermanentLoss.MIN_COMPENSATION();
  const cooldownPeriod = await ImpermanentLoss.COOLDOWN_PERIOD();
  const nodeBonus = await ImpermanentLoss.NODE_BONUS_RATE();
  
  console.log("无常损失保护:");
  console.log("  最小补偿:", ethers.utils.formatEther(minCompensation), "HCF", minCompensation.eq(ethers.utils.parseEther("500")) ? "✅" : "❌");
  console.log("  冷却期:", cooldownPeriod.toString(), "秒 =", (cooldownPeriod / 3600).toFixed(0), "小时", cooldownPeriod.eq(86400) ? "✅" : "❌");
  console.log("  节点额外奖励:", nodeBonus.toString(), "/10000 =", (nodeBonus * 100 / 10000).toFixed(0) + "%", nodeBonus.eq(2000) ? "✅" : "❌");

  // ============ 总结 ============
  console.log("\n" + "=" .repeat(50));
  console.log("🎯 测试总结:");
  console.log("=" .repeat(50));
  console.log("✅ 所有标记为✅的项目表示配置正确");
  console.log("❌ 标记为❌的项目需要检查");
  console.log("\n下一步操作:");
  console.log("1. 如果有❌项，检查合约配置");
  console.log("2. 可以开始测试交易功能");
  console.log("3. 准备前端集成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
  });