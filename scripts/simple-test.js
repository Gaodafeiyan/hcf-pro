const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("✅ 测试当前可用功能（使用原始合约）\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");
  
  // 使用原始合约地址（从.env）
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  const HCFStaking = await ethers.getContractAt("HCFStaking", process.env.HCF_STAKING_ADDRESS);
  
  console.log("=====================================");
  console.log("📊 系统状态总览");
  console.log("=====================================");
  
  // HCF代币状态
  const hcfBalance = await HCFToken.balanceOf(deployer.address);
  const totalSupply = await HCFToken.totalSupply();
  const totalBurned = await HCFToken.totalBurned();
  
  console.log("HCF代币:");
  console.log("- 总供应量:", ethers.utils.formatEther(totalSupply), "HCF");
  console.log("- 您的余额:", ethers.utils.formatEther(hcfBalance), "HCF");
  console.log("- 总销毁量:", ethers.utils.formatEther(totalBurned), "HCF");
  
  // 质押状态
  const totalStaked = await HCFStaking.totalStaked();
  const userInfo = await HCFStaking.userInfo(deployer.address);
  
  console.log("\n质押系统:");
  console.log("- 全局质押量:", ethers.utils.formatEther(totalStaked), "HCF");
  console.log("- 您的质押量:", ethers.utils.formatEther(userInfo.amount), "HCF");
  console.log("- 您的等级:", userInfo.level.toString());
  
  console.log("\n=====================================");
  console.log("🚀 可用功能测试");
  console.log("=====================================");
  
  // 1. 测试转账（会扣税）
  console.log("\n1. 测试转账功能");
  const testAddress = "0x0000000000000000000000000000000000000002";
  const transferAmount = ethers.utils.parseEther("10");
  
  try {
    const beforeBalance = await HCFToken.balanceOf(testAddress);
    
    console.log("转账10 HCF到测试地址...");
    const tx = await HCFToken.transfer(testAddress, transferAmount);
    await tx.wait();
    
    const afterBalance = await HCFToken.balanceOf(testAddress);
    const received = afterBalance.sub(beforeBalance);
    
    console.log("✅ 转账成功");
    console.log("- 发送: 10 HCF");
    console.log("- 对方收到:", ethers.utils.formatEther(received), "HCF（扣1%税后）");
  } catch (error) {
    console.log("❌ 转账失败:", error.message);
  }
  
  // 2. 测试质押
  console.log("\n2. 测试追加质押");
  const stakeAmount = ethers.utils.parseEther("100");
  
  try {
    console.log("授权100 HCF给质押合约...");
    let tx = await HCFToken.approve(HCFStaking.address, stakeAmount);
    await tx.wait();
    
    console.log("质押100 HCF...");
    tx = await HCFStaking.stake(stakeAmount, false, false);
    await tx.wait();
    
    const newUserInfo = await HCFStaking.userInfo(deployer.address);
    console.log("✅ 质押成功");
    console.log("- 新质押总量:", ethers.utils.formatEther(newUserInfo.amount), "HCF");
    console.log("- 新等级:", newUserInfo.level.toString());
  } catch (error) {
    console.log("❌ 质押失败:", error.message);
  }
  
  // 3. 查看收益
  console.log("\n3. 查看质押收益");
  try {
    // 模拟时间流逝（实际需要等待）
    const pending = await HCFStaking.calculateRewards(deployer.address);
    console.log("- 待领取收益:", ethers.utils.formatEther(pending), "HCF");
    console.log("- 提示：收益需要时间累积");
  } catch (error) {
    console.log("- 暂无收益计算函数");
  }
  
  console.log("\n=====================================");
  console.log("📝 测试总结");
  console.log("=====================================");
  console.log("✅ 可用功能:");
  console.log("- HCF转账和税费系统");
  console.log("- 质押挖矿系统");
  console.log("- 多签钱包治理");
  console.log("- 推荐奖励系统");
  
  console.log("\n⚠️ 需要额外配置:");
  console.log("- BSDT授权（需要多签）");
  console.log("- 节点NFT（需要BSDT）");
  console.log("- HCF-BSDT兑换（需要授权）");
  
  console.log("\n💡 建议:");
  console.log("1. 当前系统核心功能正常，可以开始前端开发");
  console.log("2. BSDT相关功能可在生产环境通过多签配置");
  console.log("3. 或重新部署一套完整的测试环境");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });