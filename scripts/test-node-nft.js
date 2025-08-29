const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🎨 测试节点NFT功能...\n");
  
  const [deployer] = await ethers.getSigners();
  
  // 获取合约实例
  const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
  const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const HCFNodeNFT = await ethers.getContractAt("HCFNodeNFT", process.env.HCF_NODE_NFT_ADDRESS);
  
  console.log("部署者地址:", deployer.address);
  
  // 检查节点状态
  const currentId = await HCFNodeNFT.currentId();
  console.log("当前节点数量:", currentId.toString());
  
  // 检查费用配置
  const baseFee = await HCFNodeNFT.baseFee();
  const activationFeeHCF = await HCFNodeNFT.activationFeeHCF();
  const activationFeeBSDT = await HCFNodeNFT.activationFeeBSDT();
  
  console.log("\n节点费用配置:");
  console.log("- 申请费用:", ethers.utils.formatEther(baseFee), "BSDT");
  console.log("- 激活费HCF:", ethers.utils.formatEther(activationFeeHCF), "HCF");
  console.log("- 激活费BSDT:", ethers.utils.formatEther(activationFeeBSDT), "BSDT");
  
  // 检查用户是否已有节点
  const hasNode = await HCFNodeNFT.hasNode(deployer.address);
  console.log("\n部署者是否拥有节点:", hasNode);
  
  if (!hasNode) {
    console.log("\n申请节点NFT...");
    
    // 检查BSDT余额
    const bsdtBalance = await BSDTToken.balanceOf(deployer.address);
    console.log("BSDT余额:", ethers.utils.formatEther(bsdtBalance), "BSDT");
    
    if (bsdtBalance.lt(baseFee)) {
      console.log("❌ BSDT余额不足，需要至少", ethers.utils.formatEther(baseFee), "BSDT");
      console.log("提示：您需要先通过USDT兑换BSDT，或从初始100,000 BSDT池中获取");
      return;
    }
    
    // 授权节点合约使用BSDT
    console.log("授权5000 BSDT给节点合约...");
    let tx = await BSDTToken.approve(HCFNodeNFT.address, baseFee);
    await tx.wait();
    
    // 申请节点
    try {
      console.log("申请节点...");
      tx = await HCFNodeNFT.applyForNode();
      await tx.wait();
      console.log("✅ 节点申请成功！");
      
      // 获取节点ID
      const nodeId = await HCFNodeNFT.ownerToNodeId(deployer.address);
      console.log("您的节点ID:", nodeId.toString());
      
      // 查看节点信息
      const nodeData = await HCFNodeNFT.nodes(nodeId);
      console.log("\n节点信息:");
      console.log("- 所有者:", nodeData.owner);
      console.log("- 是否激活:", nodeData.isActive);
      console.log("- 在线率:", nodeData.onlineRate.toString(), "/10000");
      
      // 测试激活节点
      if (!nodeData.isActive) {
        console.log("\n准备激活节点...");
        
        // 检查HCF余额
        const hcfBalance = await HCFToken.balanceOf(deployer.address);
        if (hcfBalance.lt(activationFeeHCF)) {
          console.log("❌ HCF余额不足，需要", ethers.utils.formatEther(activationFeeHCF), "HCF");
          return;
        }
        
        // 授权激活费用
        console.log("授权1000 HCF和1000 BSDT...");
        tx = await HCFToken.approve(HCFNodeNFT.address, activationFeeHCF);
        await tx.wait();
        tx = await BSDTToken.approve(HCFNodeNFT.address, activationFeeBSDT);
        await tx.wait();
        
        // 激活节点
        console.log("激活节点...");
        tx = await HCFNodeNFT.activateNode(nodeId);
        await tx.wait();
        console.log("✅ 节点激活成功！");
      }
    } catch (error) {
      console.log("❌ 操作失败:", error.message);
    }
  } else {
    // 如果已有节点，显示节点信息
    const nodeId = await HCFNodeNFT.ownerToNodeId(deployer.address);
    const nodeData = await HCFNodeNFT.nodes(nodeId);
    
    console.log("\n您的节点信息:");
    console.log("- 节点ID:", nodeId.toString());
    console.log("- 是否激活:", nodeData.isActive);
    console.log("- 在线率:", nodeData.onlineRate.toString(), "/10000");
    console.log("- LP中HCF数量:", ethers.utils.formatEther(nodeData.lpHCFAmount), "HCF");
    console.log("- 等级:", nodeData.level.toString());
    console.log("- 总分红:", ethers.utils.formatEther(nodeData.totalDividends), "HCF");
  }
  
  // 显示节点等级信息
  console.log("\n节点等级配置:");
  for (let i = 0; i < 5; i++) {
    try {
      const level = await HCFNodeNFT.nodeLevels(i);
      console.log(`等级${i}: ${level.name}, 最小持有=${ethers.utils.formatEther(level.minHolding)} HCF`);
    } catch (error) {
      break;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });