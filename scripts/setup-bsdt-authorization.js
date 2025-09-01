const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 设置BSDT合约授权...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);
  
  // 连接到已部署的合约
  const BSDTToken = await ethers.getContractFactory("BSDTToken");
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  
  // 使用最新的合约地址
  const bsdtToken = BSDTToken.attach("0x593616ea37A273479F1a52fA56C6a701969E7058");
  const multiSigWallet = MultiSigWallet.attach("0x0917647a7672726917407c1F710e473D0b59665c");
  
  console.log("BSDT合约地址:", bsdtToken.address);
  console.log("多签钱包地址:", multiSigWallet.address);
  
  // 检查当前授权状态
  const isAuthorized = await bsdtToken.authorizedExchanges(deployer.address);
  console.log("部署账户是否已授权:", isAuthorized);
  
  if (!isAuthorized) {
    console.log("🔐 通过多签钱包授权部署账户...");
    
    // 准备授权交易数据
    const authorizeData = bsdtToken.interface.encodeFunctionData(
      "authorizeExchange",
      [deployer.address, true]
    );
    
    // 通过多签钱包提交交易
    const tx = await multiSigWallet.submitTransaction(
      bsdtToken.address,
      0, // 不需要发送ETH
      authorizeData
    );
    
    console.log("✅ 授权交易已提交，交易哈希:", tx.hash);
    await tx.wait();
    console.log("✅ 授权交易已确认");
    
    // 验证授权状态
    const newAuthStatus = await bsdtToken.authorizedExchanges(deployer.address);
    console.log("新的授权状态:", newAuthStatus);
  } else {
    console.log("✅ 部署账户已经授权");
  }
  
  // 现在尝试铸造BSDT
  console.log("\n🪙 尝试铸造BSDT...");
  const mintAmount = ethers.utils.parseEther("10000"); // 10,000 BSDT
  
  try {
    const mintTx = await bsdtToken.mint(deployer.address, mintAmount);
    console.log("✅ BSDT铸造交易已发送:", mintTx.hash);
    await mintTx.wait();
    console.log("✅ BSDT铸造成功！");
    
    // 检查余额
    const balance = await bsdtToken.balanceOf(deployer.address);
    console.log("BSDT余额:", ethers.utils.formatEther(balance));
    
  } catch (error) {
    console.log("❌ BSDT铸造失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
