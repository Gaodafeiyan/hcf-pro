const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查链上合约状态\n");
  
  const [deployer] = await ethers.getSigners();
  
  // 可能的地址（根据部署输出）
  const addresses = [
    { name: "可能的BSDT", address: "0x4e1ae59bd40eb96dc16b2b36f7f86eb83dcec0d5" },
    { name: "新Exchange", address: "0xB63B69A9599f74b39C2Dc9244a80F69B64750a6b" },
    { name: "原BSDT", address: process.env.BSDT_TOKEN_ADDRESS },
    { name: "原Exchange", address: process.env.HCF_BSDT_EXCHANGE_ADDRESS }
  ];
  
  console.log("检查合约代码是否存在：");
  for (const item of addresses) {
    try {
      const code = await ethers.provider.getCode(item.address);
      const hasCode = code !== "0x";
      console.log(`${item.name} (${item.address}): ${hasCode ? "✅ 有代码" : "❌ 无代码"}`);
      
      if (hasCode && item.name.includes("BSDT")) {
        // 尝试调用BSDT的基本函数
        try {
          const contract = await ethers.getContractAt("BSDTToken", item.address);
          const symbol = await contract.symbol();
          const totalSupply = await contract.totalSupply();
          console.log(`  - Symbol: ${symbol}`);
          console.log(`  - Total Supply: ${ethers.utils.formatEther(totalSupply)}`);
        } catch (e) {
          console.log(`  - 不是BSDT合约或调用失败`);
        }
      }
    } catch (error) {
      console.log(`${item.name}: ❌ 错误 - ${error.message}`);
    }
  }
  
  // 查看最近的交易来找到实际部署的地址
  console.log("\n查看部署者最近的交易：");
  const latestBlock = await ethers.provider.getBlockNumber();
  console.log("最新区块:", latestBlock);
  
  // 如果有新的部署，应该能看到合约创建交易
  console.log("\n提示：");
  console.log("1. 检查部署输出日志，找到正确的BSDT地址");
  console.log("2. 或者重新运行 quick-deploy-test.js 并记录输出");
  console.log("3. 使用BSCScan查看部署者地址的交易历史");
  console.log(`   https://testnet.bscscan.com/address/${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });