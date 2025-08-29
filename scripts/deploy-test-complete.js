const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 部署完整的测试环境\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");

  console.log("====================================");
  console.log("步骤1: 部署BSDT代币");
  console.log("====================================");
  
  const BSDTToken = await ethers.getContractFactory("BSDTToken");
  
  // 先使用部署者地址作为临时LP池
  const bsdt = await BSDTToken.deploy(
    "0x0000000000000000000000000000000000000000", // USDT地址
    process.env.USDT_ORACLE_ADDRESS,               // 使用现有Oracle
    deployer.address,                               // Keeper地址
    deployer.address                                // 临时LP池（后面会更新）
  );
  await bsdt.deployed();
  console.log("✅ BSDT已部署:", bsdt.address);
  
  // 验证BSDT
  const bsdtSymbol = await bsdt.symbol();
  const bsdtSupply = await bsdt.totalSupply();
  console.log("  - Symbol:", bsdtSymbol);
  console.log("  - Total Supply:", ethers.utils.formatEther(bsdtSupply));
  
  console.log("\n====================================");
  console.log("步骤2: 部署HCF-BSDT交易所");
  console.log("====================================");
  
  const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
  const exchange = await HCFBSDTExchange.deploy(
    process.env.HCF_TOKEN_ADDRESS,     // 使用现有HCF
    bsdt.address,                       // 新BSDT
    "0x0000000000000000000000000000000000000000", // USDT
    process.env.MULTISIG_ADDRESS,      // 使用现有多签
    "0x0000000000000000000000000000000000000000", // Pancake Router
    deployer.address                   // 桥地址
  );
  await exchange.deployed();
  console.log("✅ 交易所已部署:", exchange.address);
  
  console.log("\n====================================");
  console.log("步骤3: 授权交易所");
  console.log("====================================");
  
  // 尝试授权交易所
  console.log("尝试授权交易所...");
  try {
    // authorizeExchange需要多签权限
    const tx = await bsdt.authorizeExchange(exchange.address, true);
    await tx.wait();
    console.log("✅ 授权成功");
  } catch (e) {
    console.log("❌ 需要多签权限授权");
    console.log("  提示：部署时BSDT已将部署者地址作为授权LP池");
  }
  
  // 验证授权状态
  const isAuthorized = await bsdt.authorizedExchanges(exchange.address);
  console.log("交易所授权状态:", isAuthorized ? "✅" : "❌");
  
  // 检查部署者是否被授权（作为LP池）
  const isDeployerAuthorized = await bsdt.authorizedExchanges(deployer.address);
  console.log("部署者授权状态:", isDeployerAuthorized ? "✅" : "❌");
  
  console.log("\n====================================");
  console.log("步骤4: 测试基本功能");
  console.log("====================================");
  
  // 测试BSDT转账
  console.log("测试BSDT转账...");
  const testAmount = ethers.utils.parseEther("100");
  try {
    const tx = await bsdt.transfer("0x0000000000000000000000000000000000000001", testAmount);
    await tx.wait();
    console.log("✅ BSDT转账成功");
  } catch (error) {
    console.log("❌ BSDT转账失败:", error.message);
  }
  
  // 测试BSDT授权给部署者（应该成功，因为部署者是授权地址）
  console.log("\n测试BSDT授权给部署者...");
  try {
    const tx = await bsdt.approve(deployer.address, testAmount);
    await tx.wait();
    console.log("✅ 授权部署者成功");
  } catch (error) {
    console.log("❌ 授权失败:", error.message);
  }
  
  // 测试BSDT授权给交易所
  console.log("\n测试BSDT授权给交易所...");
  try {
    const tx = await bsdt.approve(exchange.address, testAmount);
    await tx.wait();
    console.log("✅ 授权交易所成功");
  } catch (error) {
    console.log("❌ 授权交易所失败（需要先添加为授权地址）");
  }
  
  console.log("\n====================================");
  console.log("📝 部署总结");
  console.log("====================================");
  console.log("新BSDT代币:", bsdt.address);
  console.log("新交易所:", exchange.address);
  console.log("\n状态:");
  console.log("- BSDT总供应量:", ethers.utils.formatEther(bsdtSupply));
  console.log("- 部署者BSDT余额:", ethers.utils.formatEther(await bsdt.balanceOf(deployer.address)));
  console.log("- 交易所授权:", isAuthorized ? "✅" : "❌ 需要多签");
  console.log("- 部署者授权:", isDeployerAuthorized ? "✅" : "❌");
  
  console.log("\n更新.env使用新地址:");
  console.log(`BSDT_TOKEN_ADDRESS=${bsdt.address}`);
  console.log(`HCF_BSDT_EXCHANGE_ADDRESS=${exchange.address}`);
  
  console.log("\n提示:");
  console.log("1. 如果交易所未授权，可以用部署者地址作为临时交易所进行测试");
  console.log("2. 或通过多签钱包执行authorizeExchange");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });