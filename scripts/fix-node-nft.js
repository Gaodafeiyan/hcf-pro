const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 修复节点NFT申请问题\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);
  
  // 获取合约实例
  const BSDT = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const NodeNFT = await ethers.getContractAt("HCFNodeNFT", process.env.HCF_NODE_NFT_ADDRESS);
  
  console.log("====================================");
  console.log("1. 检查BSDT授权状态");
  console.log("====================================");
  
  // 检查节点合约是否被授权
  const isNodeAuthorized = await BSDT.authorizedExchanges(NodeNFT.address);
  console.log("节点NFT合约授权状态:", isNodeAuthorized ? "✅ 已授权" : "❌ 未授权");
  
  // 检查部署者是否被授权（作为临时解决方案）
  const isDeployerAuthorized = await BSDT.authorizedExchanges(deployer.address);
  console.log("部署者授权状态:", isDeployerAuthorized ? "✅ 已授权" : "❌ 未授权");
  
  if (!isNodeAuthorized) {
    console.log("\n⚠️ 节点NFT合约未被BSDT授权");
    console.log("解决方案：");
    console.log("1. 通过多签钱包添加授权");
    console.log("2. 或重新部署BSDT并预授权节点合约");
    
    if (isDeployerAuthorized) {
      console.log("\n💡 临时方案：部署者已被授权，可以作为中转");
    }
  }
  
  console.log("\n====================================");
  console.log("2. 检查节点NFT配置");
  console.log("====================================");
  
  const baseFee = await NodeNFT.baseFee();
  const totalNodes = await NodeNFT.totalSupply();
  const maxNodes = await NodeNFT.MAX_NODES();
  
  console.log("申请费用:", ethers.utils.formatEther(baseFee), "BSDT");
  console.log("当前节点数:", totalNodes.toString());
  console.log("最大节点数:", maxNodes.toString());
  
  // 检查费用接收地址
  const bsdtAddress = await NodeNFT.bsdtToken();
  console.log("BSDT合约地址配置:", bsdtAddress);
  console.log("是否匹配:", bsdtAddress.toLowerCase() === process.env.BSDT_TOKEN_ADDRESS.toLowerCase() ? "✅" : "❌");
  
  console.log("\n====================================");
  console.log("3. 测试申请流程");
  console.log("====================================");
  
  // 检查余额
  const bsdtBalance = await BSDT.balanceOf(deployer.address);
  console.log("BSDT余额:", ethers.utils.formatEther(bsdtBalance));
  
  if (bsdtBalance.gte(baseFee)) {
    try {
      // 先检查是否已有节点
      const hasNode = await NodeNFT.balanceOf(deployer.address);
      if (hasNode.gt(0)) {
        console.log("⚠️ 已拥有节点，无需重复申请");
        return;
      }
      
      console.log("\n尝试申请节点...");
      
      // 授权BSDT
      console.log("1. 授权", ethers.utils.formatEther(baseFee), "BSDT...");
      const approveTx = await BSDT.approve(NodeNFT.address, baseFee);
      await approveTx.wait();
      console.log("✅ 授权成功");
      
      // 申请节点
      console.log("2. 申请节点...");
      const applyTx = await NodeNFT.applyForNode();
      await applyTx.wait();
      console.log("✅ 节点申请成功！");
      
      // 查询节点信息
      const nodeBalance = await NodeNFT.balanceOf(deployer.address);
      if (nodeBalance.gt(0)) {
        const tokenId = await NodeNFT.tokenOfOwnerByIndex(deployer.address, 0);
        console.log("节点Token ID:", tokenId.toString());
      }
      
    } catch (error) {
      console.log("❌ 申请失败:", error.reason || error.message);
      
      // 详细错误分析
      if (error.message.includes("Not authorized")) {
        console.log("\n问题：BSDT授权限制");
        console.log("解决：需要将节点NFT合约添加到BSDT授权列表");
      } else if (error.message.includes("Insufficient")) {
        console.log("\n问题：余额不足");
      } else if (error.message.includes("Max nodes")) {
        console.log("\n问题：节点数量达到上限");
      }
    }
  } else {
    console.log("⚠️ BSDT余额不足，需要", ethers.utils.formatEther(baseFee.sub(bsdtBalance)), "BSDT");
  }
  
  console.log("\n====================================");
  console.log("📝 总结");
  console.log("====================================");
  console.log("如果节点申请失败，通常是因为：");
  console.log("1. BSDT未授权节点NFT合约进行approve操作");
  console.log("2. 需要通过多签钱包执行授权");
  console.log("3. 或者使用已授权的地址作为中转");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });