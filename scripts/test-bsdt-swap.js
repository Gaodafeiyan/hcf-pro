const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("💱 测试BSDT兑换功能...\n");
  
  const [deployer] = await ethers.getSigners();
  
  // 获取合约实例
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const HCFBSDTExchange = await ethers.getContractAt("HCFBSDTExchange", process.env.HCF_BSDT_EXCHANGE_ADDRESS);
  
  console.log("部署者地址:", deployer.address);
  
  // 检查余额
  const hcfBalance = await HCFToken.balanceOf(deployer.address);
  const bsdtBalance = await BSDTToken.balanceOf(deployer.address);
  
  console.log("初始余额:");
  console.log("- HCF:", ethers.utils.formatEther(hcfBalance), "HCF");
  console.log("- BSDT:", ethers.utils.formatEther(bsdtBalance), "BSDT");
  
  // 检查交易所池子余额
  console.log("\n交易所池子余额:");
  const exchangeHCF = await HCFToken.balanceOf(HCFBSDTExchange.address);
  const exchangeBSDT = await BSDTToken.balanceOf(HCFBSDTExchange.address);
  console.log("- HCF:", ethers.utils.formatEther(exchangeHCF), "HCF");
  console.log("- BSDT:", ethers.utils.formatEther(exchangeBSDT), "BSDT");
  
  // 如果交易所没有流动性，先添加一些
  if (exchangeHCF.eq(0) || exchangeBSDT.eq(0)) {
    console.log("\n添加初始流动性到交易所...");
    
    // 授权交易所使用代币
    const liquidityHCF = ethers.utils.parseEther("10000");
    const liquidityBSDT = ethers.utils.parseEther("10000");
    
    console.log("授权HCF...");
    let tx = await HCFToken.approve(HCFBSDTExchange.address, liquidityHCF);
    await tx.wait();
    
    console.log("授权BSDT...");
    tx = await BSDTToken.approve(HCFBSDTExchange.address, liquidityBSDT);
    await tx.wait();
    
    // 添加流动性（需要通过多签或owner权限）
    try {
      console.log("尝试添加流动性...");
      tx = await HCFBSDTExchange.addLiquidity(liquidityHCF, liquidityBSDT);
      await tx.wait();
      console.log("✅ 流动性添加成功");
    } catch (error) {
      console.log("⚠️ 添加流动性需要多签权限，跳过此步骤");
    }
  }
  
  // 测试HCF到BSDT的兑换
  if (exchangeBSDT.gt(0)) {
    console.log("\n测试 HCF → BSDT 兑换...");
    const swapAmount = ethers.utils.parseEther("100");
    
    console.log("授权100 HCF给交易所...");
    let tx = await HCFToken.approve(HCFBSDTExchange.address, swapAmount);
    await tx.wait();
    
    try {
      console.log("兑换100 HCF...");
      tx = await HCFBSDTExchange.swapHCFToBSDT(swapAmount);
      await tx.wait();
      
      const newBSDTBalance = await BSDTToken.balanceOf(deployer.address);
      const received = newBSDTBalance.sub(bsdtBalance);
      console.log("✅ 兑换成功，收到:", ethers.utils.formatEther(received), "BSDT");
    } catch (error) {
      console.log("❌ 兑换失败:", error.message);
    }
  }
  
  // 显示最终余额
  console.log("\n最终余额:");
  const finalHCF = await HCFToken.balanceOf(deployer.address);
  const finalBSDT = await BSDTToken.balanceOf(deployer.address);
  console.log("- HCF:", ethers.utils.formatEther(finalHCF), "HCF");
  console.log("- BSDT:", ethers.utils.formatEther(finalBSDT), "BSDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });