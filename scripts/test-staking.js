const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🏦 测试质押功能...\n");
  
  const [deployer] = await ethers.getSigners();
  
  // 获取合约实例
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  const HCFStaking = await ethers.getContractAt("HCFStaking", process.env.HCF_STAKING_ADDRESS);
  
  console.log("部署者地址:", deployer.address);
  
  // 检查余额
  const balance = await HCFToken.balanceOf(deployer.address);
  console.log("HCF余额:", ethers.utils.formatEther(balance), "HCF\n");
  
  // 授权质押合约
  console.log("1. 授权质押合约使用1000 HCF...");
  const stakeAmount = ethers.utils.parseEther("1000");
  let tx = await HCFToken.approve(HCFStaking.address, stakeAmount);
  await tx.wait();
  console.log("✅ 授权成功");
  
  // 质押代币
  console.log("\n2. 质押1000 HCF...");
  tx = await HCFStaking.stake(stakeAmount, false, false); // false = 不是LP, false = 不是股权LP
  await tx.wait();
  console.log("✅ 质押成功");
  
  // 查看质押信息
  console.log("\n3. 查看质押信息...");
  const userInfo = await HCFStaking.userInfo(deployer.address);
  console.log("质押数量:", ethers.utils.formatEther(userInfo.amount), "HCF");
  console.log("质押等级:", userInfo.level.toString());
  console.log("待领取收益:", ethers.utils.formatEther(userInfo.pending), "HCF");
  console.log("是否LP:", userInfo.isLP);
  
  // 查看全局质押信息
  const totalStaked = await HCFStaking.totalStaked();
  console.log("\n全局质押总量:", ethers.utils.formatEther(totalStaked), "HCF");
  
  // 测试等级配置
  console.log("\n4. 查看等级配置...");
  for (let i = 0; i < 5; i++) {
    const level = await HCFStaking.levels(i);
    console.log(`等级${i + 1}: 最小质押=${ethers.utils.formatEther(level.minStake)} HCF, 基础日化=${level.baseRate.toNumber() / 100}%`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });