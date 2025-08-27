const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 开始部署HCF项目合约...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);
  console.log("💰 账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB");

  // ============ 第一步：部署基础合约 ============
  console.log("\n🔧 第一步：部署基础合约...");

  // 1. 部署多签钱包
  console.log("📋 部署多签钱包...");
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy([
    deployer.address, // 临时添加部署者作为签名者
    "0x0000000000000000000000000000000000000001", // 占位地址1
    "0x0000000000000000000000000000000000000002", // 占位地址2
    "0x0000000000000000000000000000000000000003", // 占位地址3
    "0x0000000000000000000000000000000000000004"  // 占位地址4
  ]);
  await multiSigWallet.deployed();
  console.log("✅ 多签钱包已部署:", multiSigWallet.address);

  // 2. 部署USDT Oracle
  console.log("📊 部署USDT Oracle...");
  const USDTOracle = await ethers.getContractFactory("USDTOracle");
  const usdtOracle = await USDTOracle.deploy(ethers.utils.parseEther("1000000")); // 100万初始供应
  await usdtOracle.deployed();
  console.log("✅ USDT Oracle已部署:", usdtOracle.address);

  // 3. 部署BSDT稳定币
  console.log("💎 部署BSDT稳定币...");
  const BSDTToken = await ethers.getContractFactory("BSDTToken");
  const bsdtToken = await BSDTToken.deploy(
    "0x0000000000000000000000000000000000000000", // USDT地址（测试网）
    usdtOracle.address,
    deployer.address // Keeper地址
  );
  await bsdtToken.deployed();
  console.log("✅ BSDT稳定币已部署:", bsdtToken.address);

  // ============ 第二步：部署核心合约 ============
  console.log("\n🏗️ 第二步：部署核心合约...");

  // 4. 部署HCF代币
  console.log("🪙 部署HCF代币...");
  const HCFToken = await ethers.getContractFactory("HCFToken");
  const hcfToken = await HCFToken.deploy(
    deployer.address, // 营销钱包
    deployer.address, // 节点池
    deployer.address, // LP池
    deployer.address  // 桥地址
  );
  await hcfToken.deployed();
  console.log("✅ HCF代币已部署:", hcfToken.address);

  // 5. 部署HCF质押合约
  console.log("🔒 部署HCF质押合约...");
  const HCFStaking = await ethers.getContractFactory("HCFStaking");
  const hcfStaking = await HCFStaking.deploy(
    hcfToken.address,
    bsdtToken.address,
    multiSigWallet.address, // 多签钱包
    deployer.address, // 集合地址
    deployer.address  // 桥地址
  );
  await hcfStaking.deployed();
  console.log("✅ HCF质押合约已部署:", hcfStaking.address);

  // 6. 部署HCF推荐合约
  console.log("👥 部署HCF推荐合约...");
  const HCFReferral = await ethers.getContractFactory("HCFReferral");
  const hcfReferral = await HCFReferral.deploy(
    hcfToken.address,
    deployer.address // 多签钱包
  );
  await hcfReferral.deployed();
  console.log("✅ HCF推荐合约已部署:", hcfReferral.address);

  // 7. 部署HCF节点NFT
  console.log("🎨 部署HCF节点NFT...");
  const HCFNodeNFT = await ethers.getContractFactory("HCFNodeNFT");
  const hcfNodeNFT = await HCFNodeNFT.deploy(
    hcfToken.address,
    bsdtToken.address,
    usdtOracle.address, // 价格Oracle
    multiSigWallet.address, // 多签钱包
    deployer.address  // LP集合地址
  );
  await hcfNodeNFT.deployed();
  console.log("✅ HCF节点NFT已部署:", hcfNodeNFT.address);

  // ============ 第三步：部署功能合约 ============
  console.log("\n⚙️ 第三步：部署功能合约...");

  // 8. 部署HCF-BSDT交易所
  console.log("💱 部署HCF-BSDT交易所...");
  const HCFBSDTExchange = await ethers.getContractFactory("HCFBSDTExchange");
  const hcfBsdtExchange = await HCFBSDTExchange.deploy(
    hcfToken.address,
    bsdtToken.address,
    "0x0000000000000000000000000000000000000000", // Pancake Router（测试网）
    deployer.address // 桥地址
  );
  await hcfBsdtExchange.deployed();
  console.log("✅ HCF-BSDT交易所已部署:", hcfBsdtExchange.address);

  // 9. 部署HCF销毁机制
  console.log("🔥 部署HCF销毁机制...");
  const HCFBurnMechanism = await ethers.getContractFactory("HCFBurnMechanism");
  const hcfBurnMechanism = await HCFBurnMechanism.deploy(
    hcfToken.address,
    deployer.address // 多签钱包
  );
  await hcfBurnMechanism.deployed();
  console.log("✅ HCF销毁机制已部署:", hcfBurnMechanism.address);

  // 10. 部署HCF无常损失保护
  console.log("🛡️ 部署HCF无常损失保护...");
  const HCFImpermanentLossProtection = await ethers.getContractFactory("HCFImpermanentLossProtection");
  const hcfImpermanentLossProtection = await HCFImpermanentLossProtection.deploy(
    hcfToken.address,
    deployer.address // 多签钱包
  );
  await hcfImpermanentLossProtection.deployed();
  console.log("✅ HCF无常损失保护已部署:", hcfImpermanentLossProtection.address);

  // 11. 部署HCF市场控制
  console.log("📈 部署HCF市场控制...");
  const HCFMarketControl = await ethers.getContractFactory("HCFMarketControl");
  const hcfMarketControl = await HCFMarketControl.deploy(
    deployer.address // 多签钱包
  );
  await hcfMarketControl.deployed();
  console.log("✅ HCF市场控制已部署:", hcfMarketControl.address);

  // 12. 部署HCF排名奖励
  console.log("🏆 部署HCF排名奖励...");
  const HCFRanking = await ethers.getContractFactory("HCFRanking");
  const hcfRanking = await HCFRanking.deploy(
    hcfToken.address,
    deployer.address // 多签钱包
  );
  await hcfRanking.deployed();
  console.log("✅ HCF排名奖励已部署:", hcfRanking.address);

  // ============ 第四步：配置合约关系 ============
  console.log("\n🔗 第四步：配置合约关系...");

  // 设置HCF代币的多签钱包
  console.log("🔧 配置HCF代币多签钱包...");
  await hcfToken.setMultiSigWallet(multiSigWallet.address);
  console.log("✅ HCF代币多签钱包已设置");

  // 设置HCF代币的质押合约
  console.log("🔧 配置HCF代币质押合约...");
  await hcfToken.setStakingContract(hcfStaking.address);
  console.log("✅ HCF代币质押合约已设置");

  // 设置HCF代币的推荐合约
  console.log("🔧 配置HCF代币推荐合约...");
  await hcfToken.setReferralContract(hcfReferral.address);
  console.log("✅ HCF代币推荐合约已设置");

  // 设置HCF代币的节点合约
  console.log("🔧 配置HCF代币节点合约...");
  await hcfToken.setNodeContract(hcfNodeNFT.address);
  console.log("✅ HCF代币节点合约已设置");

  // 设置HCF代币的销毁机制
  console.log("🔧 配置HCF代币销毁机制...");
  await hcfToken.setBurnMechanism(hcfBurnMechanism.address);
  console.log("✅ HCF代币销毁机制已设置");

  // 设置HCF代币的市场控制
  console.log("🔧 配置HCF代币市场控制...");
  await hcfToken.setMarketControl(hcfMarketControl.address);
  console.log("✅ HCF代币市场控制已设置");

  // 设置HCF代币的排名奖励
  console.log("🔧 配置HCF代币排名奖励...");
  await hcfToken.setRankingContract(hcfRanking.address);
  console.log("✅ HCF代币排名奖励已设置");

  // ============ 部署完成 ============
  console.log("\n🎉 部署完成！");
  console.log("\n📋 合约地址汇总：");
  console.log("多签钱包:", multiSigWallet.address);
  console.log("USDT Oracle:", usdtOracle.address);
  console.log("BSDT稳定币:", bsdtToken.address);
  console.log("HCF代币:", hcfToken.address);
  console.log("HCF质押:", hcfStaking.address);
  console.log("HCF推荐:", hcfReferral.address);
  console.log("HCF节点NFT:", hcfNodeNFT.address);
  console.log("HCF-BSDT交易所:", hcfBsdtExchange.address);
  console.log("HCF销毁机制:", hcfBurnMechanism.address);
  console.log("HCF无常损失保护:", hcfImpermanentLossProtection.address);
  console.log("HCF市场控制:", hcfMarketControl.address);
  console.log("HCF排名奖励:", hcfRanking.address);

  console.log("\n💡 下一步：");
  console.log("1. 保存这些地址到.env文件");
  console.log("2. 在BSCScan上验证合约");
  console.log("3. 测试合约功能");
  console.log("4. 启动后端API");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
