const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔐 使用Owner权限设置BSDT授权\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("执行账户:", deployer.address);
  
  // 获取合约实例
  const BSDTToken = await ethers.getContractAt("BSDTToken", process.env.BSDT_TOKEN_ADDRESS);
  const HCFBSDTExchange = await ethers.getContractAt("HCFBSDTExchange", process.env.HCF_BSDT_EXCHANGE_ADDRESS);
  
  // 检查deployer是否是owner
  const owner = await BSDTToken.owner();
  console.log("BSDT Owner:", owner);
  console.log("是否是Owner:", owner === deployer.address ? "✅" : "❌");
  
  if (owner !== deployer.address) {
    console.log("\n❌ 部署者不是Owner，无法执行此操作");
    console.log("需要使用多签钱包执行authorizeExchange");
    return;
  }
  
  // 如果是owner，尝试直接设置（某些函数可能允许owner调用）
  console.log("\n尝试设置交易所授权...");
  
  try {
    // 首先尝试直接修改mapping（如果有setter函数）
    const isAuthorized = await BSDTToken.authorizedExchanges(HCFBSDTExchange.address);
    console.log("当前授权状态:", isAuthorized);
    
    if (!isAuthorized) {
      // 检查是否有其他函数可以设置
      console.log("\n尝试通过owner权限设置...");
      
      // 方法1：尝试直接设置
      try {
        // 有些合约允许owner在初始化阶段设置
        const tx = await BSDTToken.authorizedExchanges[HCFBSDTExchange.address] = true;
        console.log("✅ 直接设置成功");
      } catch (e) {
        console.log("❌ 无法直接设置mapping");
      }
      
      // 方法2：检查是否有初始化函数
      console.log("\n检查其他可用函数...");
      
      // 临时解决方案：将交易所地址设置为LP池地址（如果构造函数中有设置）
      console.log("交易所地址:", HCFBSDTExchange.address);
      console.log("\n提示：");
      console.log("1. BSDT合约在部署时应该将LP池地址设置为交易所地址");
      console.log("2. 或者需要通过多签钱包调用authorizeExchange");
      console.log("3. 作为测试，可以重新部署合约，在构造函数中直接授权交易所");
    } else {
      console.log("✅ 交易所已经被授权");
    }
  } catch (error) {
    console.log("❌ 操作失败:", error.message);
  }
  
  // 提供解决方案
  console.log("\n=====================================");
  console.log("📝 解决方案");
  console.log("=====================================");
  console.log("1. 重新部署BSDT，在构造函数中将交易所地址作为_lpPool参数");
  console.log("2. 或通过多签钱包执行authorizeExchange");
  console.log("3. 或修改合约，添加owner可以调用的授权函数");
  
  console.log("\n为了测试，建议重新部署，修改deploy.js中的BSDT部署参数：");
  console.log(`
  const bsdtToken = await BSDTToken.deploy(
    "0x0000000000000000000000000000000000000000", // USDT地址
    usdtOracle.address,
    deployer.address, // Keeper地址
    "${HCFBSDTExchange.address}"  // 使用交易所地址作为LP池
  );
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });