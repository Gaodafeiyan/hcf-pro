const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🧪 测试HCF税费系统...\n");
  
  const [deployer] = await ethers.getSigners();
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  
  // 检查部署者是否免税
  const isDeployerExcluded = await HCFToken.isExcludedFromTax(deployer.address);
  console.log("部署者是否免税:", isDeployerExcluded);
  
  // 创建测试地址
  const testWallet1 = ethers.Wallet.createRandom().connect(ethers.provider);
  const testWallet2 = ethers.Wallet.createRandom().connect(ethers.provider);
  
  console.log("\n测试钱包地址:");
  console.log("钱包1:", testWallet1.address);
  console.log("钱包2:", testWallet2.address);
  
  // 发送一些BNB给测试钱包用于gas
  console.log("\n发送BNB给测试钱包...");
  await deployer.sendTransaction({
    to: testWallet1.address,
    value: ethers.utils.parseEther("0.1")
  });
  
  // 发送HCF给测试钱包1（从免税地址发送，不扣税）
  console.log("\n1. 从部署者（免税）转100 HCF给测试钱包1...");
  const amount = ethers.utils.parseEther("100");
  let tx = await HCFToken.transfer(testWallet1.address, amount);
  await tx.wait();
  
  let balance1 = await HCFToken.balanceOf(testWallet1.address);
  console.log("钱包1收到:", ethers.utils.formatEther(balance1), "HCF（应为100，因为发送方免税）");
  
  // 测试钱包1转账给钱包2（应该扣1%税）
  console.log("\n2. 从测试钱包1转50 HCF给测试钱包2（应扣1%税）...");
  const hcfWithSigner = HCFToken.connect(testWallet1);
  tx = await hcfWithSigner.transfer(testWallet2.address, ethers.utils.parseEther("50"));
  await tx.wait();
  
  const balance2 = await HCFToken.balanceOf(testWallet2.address);
  const balance1After = await HCFToken.balanceOf(testWallet1.address);
  
  console.log("钱包1剩余:", ethers.utils.formatEther(balance1After), "HCF（应为50）");
  console.log("钱包2收到:", ethers.utils.formatEther(balance2), "HCF（应为49.5，扣除1%税）");
  
  // 检查税费是否被销毁
  const totalBurned = await HCFToken.totalBurned();
  console.log("\n总销毁量:", ethers.utils.formatEther(totalBurned), "HCF");
  
  // 测试最小余额限制
  console.log("\n3. 测试最小余额限制（账户必须保留0.0001 HCF）...");
  try {
    // 尝试转出全部余额
    const allBalance = await HCFToken.balanceOf(testWallet1.address);
    tx = await hcfWithSigner.transfer(testWallet2.address, allBalance);
    await tx.wait();
    console.log("❌ 不应该成功！");
  } catch (error) {
    if (error.message.includes("Must keep minimum balance")) {
      console.log("✅ 正确：阻止了转出全部余额，必须保留最小余额");
    } else {
      console.log("❌ 错误原因:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });