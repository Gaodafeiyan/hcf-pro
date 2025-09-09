const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 检查账户信息"));
    console.log(chalk.blue.bold("========================================\n"));

    // 获取所有配置的签名者
    const signers = await ethers.getSigners();
    
    for (let i = 0; i < Math.min(signers.length, 3); i++) {
        const signer = signers[i];
        const address = signer.address;
        const balance = await signer.getBalance();
        
        console.log(chalk.cyan(`账户 ${i + 1}:`));
        console.log(`  地址: ${address}`);
        console.log(`  BNB余额: ${ethers.utils.formatEther(balance)} BNB`);
        
        // 检查是否是HCF合约的owner
        try {
            const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
            const hcf = await ethers.getContractAt("HCFToken", HCF_ADDRESS);
            const owner = await hcf.owner();
            
            if (address.toLowerCase() === owner.toLowerCase()) {
                console.log(chalk.green(`  ✅ 是HCF合约的Owner`));
            } else {
                console.log(`  ❌ 不是HCF合约的Owner`);
                console.log(`  Owner是: ${owner}`);
            }
        } catch (e) {
            console.log(`  无法检查Owner状态`);
        }
        
        // 检查HCF余额
        try {
            const HCF_ADDRESS = "0xc5c3f24A212838968759045d1654d3643016D585";
            const hcf = await ethers.getContractAt("IERC20", HCF_ADDRESS);
            const hcfBalance = await hcf.balanceOf(address);
            console.log(`  HCF余额: ${ethers.utils.formatEther(hcfBalance)} HCF`);
        } catch (e) {
            console.log(`  无法检查HCF余额`);
        }
        
        console.log();
    }
    
    // 估算gas成本
    const gasPrice = await ethers.provider.getGasPrice();
    console.log(chalk.yellow("Gas信息:"));
    console.log(`  当前Gas价格: ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`);
    console.log(`  激活税费预估成本: ~${ethers.utils.formatEther(gasPrice.mul(100000))} BNB`);
    
    // 建议
    const firstSigner = signers[0];
    const balance = await firstSigner.getBalance();
    
    if (balance.gte(ethers.utils.parseEther("0.001"))) {
        console.log(chalk.green("\n✅ 账户余额充足，可以激活税费系统"));
        console.log("运行: npx hardhat run scripts/activate-tax-system.js --network bsc");
    } else {
        console.log(chalk.red("\n❌ 账户余额不足"));
        console.log(chalk.yellow(`需要向 ${firstSigner.address} 充值至少 0.001 BNB`));
    }
}

main()
    .then(() => {
        console.log(chalk.green("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });