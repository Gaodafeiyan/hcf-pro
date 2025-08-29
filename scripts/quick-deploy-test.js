const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 快速部署测试环境（BSDT已授权交易所）\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");

  // 先部署交易所，获取地址
  console.log("1. 部署HCF-BSDT交易所...");
  const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
  
  // 临时使用部署者地址作为占位符
  const exchange = await HCFBSDTExchange.deploy(
    process.env.HCF_TOKEN_ADDRESS,     // HCF代币（使用现有的）
    "0x0000000000000000000000000000000000000001", // BSDT临时地址
    "0x0000000000000000000000000000000000000000", // USDT地址
    process.env.MULTISIG_ADDRESS,      // 多签钱包（使用现有的）
    "0x0000000000000000000000000000000000000000", // Pancake Router
    deployer.address                   // 桥地址
  );
  await exchange.deployed();
  console.log("✅ 新交易所已部署:", exchange.address);

  // 部署新的BSDT，直接授权交易所
  console.log("\n2. 部署新BSDT（已授权交易所）...");
  const BSDTToken = await ethers.getContractFactory("BSDTToken");
  const bsdt = await BSDTToken.deploy(
    "0x0000000000000000000000000000000000000000", // USDT地址
    process.env.USDT_ORACLE_ADDRESS,   // Oracle（使用现有的）
    deployer.address,                   // Keeper地址
    exchange.address                    // 使用交易所地址作为LP池（自动授权）
  );
  await bsdt.deployed();
  console.log("✅ 新BSDT已部署:", bsdt.address);

  // 更新交易所的BSDT地址
  console.log("\n3. 更新交易所配置...");
  await exchange.setBSDTToken(bsdt.address);
  console.log("✅ 交易所BSDT地址已更新");

  // 验证授权状态
  const isAuthorized = await bsdt.authorizedExchanges(exchange.address);
  console.log("\n交易所授权状态:", isAuthorized ? "✅ 已授权" : "❌ 未授权");

  // 添加初始流动性
  if (isAuthorized) {
    console.log("\n4. 添加初始流动性...");
    const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
    
    const liquidityAmount = ethers.utils.parseEther("5000");
    
    // 授权
    console.log("授权HCF和BSDT...");
    await HCFToken.approve(exchange.address, liquidityAmount);
    await bsdt.approve(exchange.address, liquidityAmount);
    
    // 添加流动性
    try {
      await exchange.addLiquidity(liquidityAmount, liquidityAmount);
      console.log("✅ 流动性添加成功");
    } catch (error) {
      console.log("⚠️ 流动性添加需要额外配置");
    }
  }

  console.log("\n=====================================");
  console.log("📝 新合约地址（用于测试）");
  console.log("=====================================");
  console.log("新BSDT代币:", bsdt.address);
  console.log("新交易所:", exchange.address);
  console.log("\n将这些地址更新到.env文件中进行测试：");
  console.log(`BSDT_TOKEN_ADDRESS=${bsdt.address}`);
  console.log(`HCF_BSDT_EXCHANGE_ADDRESS=${exchange.address}`);
  
  // 测试简单兑换
  console.log("\n5. 测试BSDT转账...");
  const testAmount = ethers.utils.parseEther("100");
  await bsdt.transfer("0x0000000000000000000000000000000000000001", testAmount);
  console.log("✅ BSDT转账成功");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });