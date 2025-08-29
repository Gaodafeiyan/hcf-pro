const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("⚙️ 设置合约初始配置...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("执行账户:", deployer.address);
  
  // 获取合约实例
  const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const HCFBSDTExchange = await ethers.getContractAt("HCFBSDTExchange", process.env.HCF_BSDT_EXCHANGE_ADDRESS);
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  
  console.log("=====================================");
  console.log("1. 添加交易所为BSDT授权地址");
  console.log("=====================================");
  
  try {
    // 检查交易所是否已被授权
    const isAuthorized = await BSDTToken.authorizedExchanges(HCFBSDTExchange.address);
    
    if (isAuthorized) {
      console.log("✅ 交易所已经是授权地址");
    } else {
      console.log("添加交易所为授权地址...");
      const tx = await BSDTToken.addAuthorizedExchange(HCFBSDTExchange.address);
      await tx.wait();
      console.log("✅ 交易所添加成功");
    }
  } catch (error) {
    console.log("❌ 添加失败:", error.message);
    console.log("提示: 可能需要owner权限或多签批准");
  }
  
  console.log("\n=====================================");
  console.log("2. 设置DEX交易对地址（用于税费识别）");
  console.log("=====================================");
  
  try {
    // 设置交易所地址为DEX对（用于识别买卖税）
    const isDEX = await HCFToken.isDEXPair(HCFBSDTExchange.address);
    
    if (isDEX) {
      console.log("✅ 交易所已设置为DEX对");
    } else {
      console.log("设置交易所为DEX对...");
      const tx = await HCFToken.setDEXPair(HCFBSDTExchange.address, true);
      await tx.wait();
      console.log("✅ DEX对设置成功");
    }
  } catch (error) {
    console.log("❌ 设置失败:", error.message);
  }
  
  console.log("\n=====================================");
  console.log("3. 初始化交易所流动性");
  console.log("=====================================");
  
  try {
    // 检查交易所当前流动性
    const exchangeHCF = await HCFToken.balanceOf(HCFBSDTExchange.address);
    const exchangeBSDT = await BSDTToken.balanceOf(HCFBSDTExchange.address);
    
    console.log("当前流动性:");
    console.log("- HCF:", ethers.utils.formatEther(exchangeHCF));
    console.log("- BSDT:", ethers.utils.formatEther(exchangeBSDT));
    
    if (exchangeHCF.eq(0) && exchangeBSDT.eq(0)) {
      console.log("\n添加初始流动性（10,000 HCF + 10,000 BSDT）...");
      
      const liquidityAmount = ethers.utils.parseEther("10000");
      
      // 授权HCF
      console.log("授权HCF...");
      let tx = await HCFToken.approve(HCFBSDTExchange.address, liquidityAmount);
      await tx.wait();
      
      // 授权BSDT（需要先确保交易所是授权地址）
      const isAuthorized = await BSDTToken.authorizedExchanges(HCFBSDTExchange.address);
      if (isAuthorized) {
        console.log("授权BSDT...");
        tx = await BSDTToken.approve(HCFBSDTExchange.address, liquidityAmount);
        await tx.wait();
        
        // 添加流动性
        console.log("添加流动性...");
        tx = await HCFBSDTExchange.addLiquidity(liquidityAmount, liquidityAmount);
        await tx.wait();
        console.log("✅ 流动性添加成功");
      } else {
        console.log("⚠️ 需要先添加交易所为BSDT授权地址");
      }
    } else {
      console.log("✅ 流动性池已有资金");
    }
  } catch (error) {
    console.log("❌ 流动性添加失败:", error.message);
  }
  
  console.log("\n=====================================");
  console.log("4. 验证最终状态");
  console.log("=====================================");
  
  // 验证BSDT授权
  const isExchangeAuthorized = await BSDTToken.authorizedExchanges(HCFBSDTExchange.address);
  console.log("交易所BSDT授权状态:", isExchangeAuthorized ? "✅" : "❌");
  
  // 验证DEX对设置
  const isDEXPair = await HCFToken.isDEXPair(HCFBSDTExchange.address);
  console.log("交易所DEX对状态:", isDEXPair ? "✅" : "❌");
  
  // 验证流动性
  const finalHCF = await HCFToken.balanceOf(HCFBSDTExchange.address);
  const finalBSDT = await BSDTToken.balanceOf(HCFBSDTExchange.address);
  console.log("\n最终流动性:");
  console.log("- HCF:", ethers.utils.formatEther(finalHCF));
  console.log("- BSDT:", ethers.utils.formatEther(finalBSDT));
  
  if (isExchangeAuthorized && isDEXPair && finalHCF.gt(0) && finalBSDT.gt(0)) {
    console.log("\n🎉 所有配置完成！系统可以正常运行");
  } else {
    console.log("\n⚠️ 部分配置未完成，请检查上述错误");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });