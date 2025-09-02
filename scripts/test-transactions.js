const { ethers } = require("hardhat");
require("dotenv").config();
async function main() {
console.log("🔄 测试基本交易功能...\n");
const [deployer] = await ethers.getSigners();
const HCFToken = await ethers.getContractAt("HCFToken", process.env.HCF_TOKEN_ADDRESS);
const balance = await HCFToken.balanceOf(deployer.address);
console.log("部署者HCF余额:", ethers.utils.formatEther(balance));
const recipient = "0x0000000000000000000000000000000000000001";
const amount = ethers.utils.parseEther("100");
console.log("\n测试转账100 HCF...");
const tx = await HCFToken.transfer(recipient, amount);
await tx.wait();
const recipientBalance = await HCFToken.balanceOf(recipient);
console.log("接收者收到:", ethers.utils.formatEther(recipientBalance), "HCF (扣除1%税后应为99)");
}
main()
.then(() => process.exit(0))
.catch((error) => {
console.error(error);
process.exit(1);
});
