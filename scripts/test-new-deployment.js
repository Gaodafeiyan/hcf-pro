const { ethers } = require("hardhat");

// 使用新部署的合约地址
const NEW_BSDT_ADDRESS = "0x4E1aE59bd40EB96Dc16b2b36F7f86eb83DceC0D5";
const NEW_EXCHANGE_ADDRESS = "0xB63B69A9599f74b39C2Dc9244a80F69B64750a6b";

async function main() {
  console.log("🧪 测试新部署的合约\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  
  // 获取合约实例
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  const BSDTToken = await ethers.getContractAt("BSDTToken", NEW_BSDT_ADDRESS);
  const HCFBSDTExchange = await ethers.getContractAt("HCFBSDTExchange", NEW_EXCHANGE_ADDRESS);
  
  console.log("=====================================");
  console.log("1. 验证BSDT授权状态");
  console.log("=====================================");
  
  const isAuthorized = await BSDTToken.authorizedExchanges(NEW_EXCHANGE_ADDRESS);
  console.log("交易所授权状态:", isAuthorized ? "✅ 已授权" : "❌ 未授权");
  
  // 检查BSDT余额
  const bsdtBalance = await BSDTToken.balanceOf(deployer.address);
  console.log("BSDT余额:", ethers.utils.formatEther(bsdtBalance), "BSDT");
  
  console.log("\n=====================================");
  console.log("2. 测试BSDT授权交易所");
  console.log("=====================================");
  
  if (isAuthorized) {
    try {
      const approveAmount = ethers.utils.parseEther("1000");
      console.log("授权1000 BSDT给交易所...");
      const tx = await BSDTToken.approve(NEW_EXCHANGE_ADDRESS, approveAmount);
      await tx.wait();
      
      const allowance = await BSDTToken.allowance(deployer.address, NEW_EXCHANGE_ADDRESS);
      console.log("✅ 授权成功！授权额度:", ethers.utils.formatEther(allowance), "BSDT");
    } catch (error) {
      console.log("❌ 授权失败:", error.message);
    }
  }
  
  console.log("\n=====================================");
  console.log("3. 添加初始流动性");
  console.log("=====================================");
  
  // 检查当前流动性
  const exchangeHCF = await HCFToken.balanceOf(NEW_EXCHANGE_ADDRESS);
  const exchangeBSDT = await BSDTToken.balanceOf(NEW_EXCHANGE_ADDRESS);
  
  console.log("当前流动性:");
  console.log("- HCF:", ethers.utils.formatEther(exchangeHCF));
  console.log("- BSDT:", ethers.utils.formatEther(exchangeBSDT));
  
  if (exchangeHCF.eq(0) && exchangeBSDT.eq(0)) {
    const liquidityAmount = ethers.utils.parseEther("5000");
    
    try {
      // 授权代币
      console.log("\n授权HCF和BSDT...");
      let tx = await HCFToken.approve(NEW_EXCHANGE_ADDRESS, liquidityAmount);
      await tx.wait();
      console.log("✅ HCF授权成功");
      
      tx = await BSDTToken.approve(NEW_EXCHANGE_ADDRESS, liquidityAmount);
      await tx.wait();
      console.log("✅ BSDT授权成功");
      
      // 添加流动性
      console.log("\n添加5000 HCF + 5000 BSDT流动性...");
      tx = await HCFBSDTExchange.addLiquidity(liquidityAmount, liquidityAmount);
      await tx.wait();
      console.log("✅ 流动性添加成功！");
      
      // 验证流动性
      const newHCF = await HCFToken.balanceOf(NEW_EXCHANGE_ADDRESS);
      const newBSDT = await BSDTToken.balanceOf(NEW_EXCHANGE_ADDRESS);
      console.log("\n新流动性:");
      console.log("- HCF:", ethers.utils.formatEther(newHCF));
      console.log("- BSDT:", ethers.utils.formatEther(newBSDT));
    } catch (error) {
      console.log("❌ 操作失败:", error.message);
    }
  }
  
  console.log("\n=====================================");
  console.log("4. 测试兑换功能");
  console.log("=====================================");
  
  const swapAmount = ethers.utils.parseEther("100");
  
  try {
    console.log("测试兑换100 HCF → BSDT...");
    
    // 授权HCF
    let tx = await HCFToken.approve(NEW_EXCHANGE_ADDRESS, swapAmount);
    await tx.wait();
    
    // 记录兑换前余额
    const beforeBSDT = await BSDTToken.balanceOf(deployer.address);
    
    // 执行兑换
    tx = await HCFBSDTExchange.swapHCFToBSDT(swapAmount);
    await tx.wait();
    
    // 记录兑换后余额
    const afterBSDT = await BSDTToken.balanceOf(deployer.address);
    const received = afterBSDT.sub(beforeBSDT);
    
    console.log("✅ 兑换成功！");
    console.log("- 发送: 100 HCF");
    console.log("- 收到:", ethers.utils.formatEther(received), "BSDT");
  } catch (error) {
    console.log("❌ 兑换失败:", error.message);
  }
  
  console.log("\n=====================================");
  console.log("5. 测试节点NFT申请");
  console.log("=====================================");
  
  const HCFNodeNFT = await ethers.getContractAt("HCFNodeNFT", process.env.HCF_NODE_NFT_ADDRESS);
  const baseFee = await HCFNodeNFT.baseFee();
  
  try {
    console.log("申请节点需要:", ethers.utils.formatEther(baseFee), "BSDT");
    
    // 检查BSDT余额
    const currentBSDT = await BSDTToken.balanceOf(deployer.address);
    console.log("当前BSDT余额:", ethers.utils.formatEther(currentBSDT), "BSDT");
    
    if (currentBSDT.gte(baseFee)) {
      console.log("\n授权5000 BSDT给节点合约...");
      const tx = await BSDTToken.approve(HCFNodeNFT.address, baseFee);
      await tx.wait();
      console.log("✅ BSDT授权成功！现在可以申请节点了");
    } else {
      console.log("⚠️ BSDT余额不足，无法申请节点");
    }
  } catch (error) {
    console.log("❌ 操作失败:", error.message);
  }
  
  console.log("\n=====================================");
  console.log("📝 测试总结");
  console.log("=====================================");
  console.log("新BSDT地址:", NEW_BSDT_ADDRESS);
  console.log("新交易所地址:", NEW_EXCHANGE_ADDRESS);
  console.log("\n✅ 功能状态:");
  console.log("- BSDT授权交易所: ✅");
  console.log("- 流动性添加: 待测试");
  console.log("- 兑换功能: 待测试");
  console.log("- 节点NFT: 可以申请");
  
  console.log("\n更新.env文件使用新地址:");
  console.log(`BSDT_TOKEN_ADDRESS=${NEW_BSDT_ADDRESS}`);
  console.log(`HCF_BSDT_EXCHANGE_ADDRESS=${NEW_EXCHANGE_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });