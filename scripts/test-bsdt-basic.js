const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 检查BSDT代币状态...\n");
  
  const [deployer] = await ethers.getSigners();
  const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const HCFBSDTExchange = await ethers.getContractAt("HCFBSDTExchange", process.env.HCF_BSDT_EXCHANGE_ADDRESS);
  
  // 检查BSDT基本信息
  const name = await BSDTToken.name();
  const symbol = await BSDTToken.symbol();
  const totalSupply = await BSDTToken.totalSupply();
  const decimals = await BSDTToken.decimals();
  
  console.log("BSDT代币信息:");
  console.log("- 名称:", name);
  console.log("- 符号:", symbol);
  console.log("- 精度:", decimals);
  console.log("- 总供应量:", ethers.utils.formatEther(totalSupply), "BSDT");
  
  // 检查部署者余额
  const balance = await BSDTToken.balanceOf(deployer.address);
  console.log("\n部署者BSDT余额:", ethers.utils.formatEther(balance), "BSDT");
  
  // 检查交易所是否被授权
  const isExchangeAuthorized = await BSDTToken.authorizedExchanges(HCFBSDTExchange.address);
  console.log("\n交易所是否被授权:", isExchangeAuthorized);
  
  // 测试简单转账（BSDT之间）
  console.log("\n测试BSDT转账...");
  const testAddress = "0x0000000000000000000000000000000000000001";
  const transferAmount = ethers.utils.parseEther("10");
  
  try {
    console.log("转账10 BSDT到测试地址...");
    const tx = await BSDTToken.transfer(testAddress, transferAmount);
    await tx.wait();
    
    const testBalance = await BSDTToken.balanceOf(testAddress);
    console.log("✅ 转账成功，测试地址余额:", ethers.utils.formatEther(testBalance), "BSDT");
  } catch (error) {
    console.log("❌ 转账失败:", error.message);
  }
  
  // 测试授权（给一个普通地址）
  console.log("\n测试授权机制...");
  try {
    const approveAmount = ethers.utils.parseEther("100");
    console.log("授权100 BSDT给测试地址...");
    const tx = await BSDTToken.approve(testAddress, approveAmount);
    await tx.wait();
    
    const allowance = await BSDTToken.allowance(deployer.address, testAddress);
    console.log("✅ 授权成功，授权额度:", ethers.utils.formatEther(allowance), "BSDT");
  } catch (error) {
    console.log("❌ 授权失败:", error.message);
  }
  
  // 检查是否可以授权给交易所
  console.log("\n测试授权给交易所...");
  try {
    const approveAmount = ethers.utils.parseEther("100");
    console.log("授权100 BSDT给交易所...");
    const tx = await BSDTToken.approve(HCFBSDTExchange.address, approveAmount);
    await tx.wait();
    
    const allowance = await BSDTToken.allowance(deployer.address, HCFBSDTExchange.address);
    console.log("✅ 授权成功，授权额度:", ethers.utils.formatEther(allowance), "BSDT");
  } catch (error) {
    console.log("❌ 授权失败，可能需要先授权交易所合约");
    console.log("错误信息:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });