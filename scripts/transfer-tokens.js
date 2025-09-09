const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 转移代币到当前账户"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 检查BNB余额
    const balance = await signer.getBalance();
    console.log(chalk.cyan("BNB余额:"), ethers.utils.formatEther(balance), "BNB");
    
    // SimpleBSDT地址
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const HCF_ADDRESS = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    
    try {
        // 获取代币合约
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", HCF_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT_ADDRESS);
        
        // 检查余额
        console.log(chalk.yellow.bold("\n检查代币余额："));
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const hcfBal = await hcf.balanceOf(signer.address);
        const usdtBal = await usdt.balanceOf(signer.address);
        
        console.log("SimpleBSDT:", ethers.utils.formatEther(bsdtBal));
        console.log("HCF:", ethers.utils.formatEther(hcfBal));
        console.log("USDT:", ethers.utils.formatUnits(usdtBal, 18));
        
        // 如果有SimpleBSDT，显示信息
        if (bsdtBal.gt(0)) {
            console.log(chalk.green.bold("\n✅ 当前账户有SimpleBSDT代币"));
            console.log(chalk.white("可以继续执行创建池子操作"));
        } else {
            console.log(chalk.red.bold("\n❌ 当前账户没有SimpleBSDT代币"));
            console.log(chalk.yellow("需要从部署账户转移代币"));
            
            // 检查其他已知账户
            const knownAccounts = [
                "0xaC444B9d4915456F330793d384516AcD9A370Eb6",
                "0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9",
                "0xdBd2F5320F337e113890F18733f2d1119D77a7b2"
            ];
            
            console.log(chalk.yellow.bold("\n检查其他账户的SimpleBSDT余额："));
            for (const account of knownAccounts) {
                const bal = await bsdt.balanceOf(account);
                if (bal.gt(0)) {
                    console.log(chalk.green(`${account}: ${ethers.utils.formatEther(bal)} BSDT`));
                } else {
                    console.log(chalk.gray(`${account}: 0 BSDT`));
                }
            }
        }
        
        // 检查总供应量和所有者
        const totalSupply = await bsdt.totalSupply();
        console.log(chalk.cyan.bold("\n代币信息："));
        console.log("总供应量:", ethers.utils.formatEther(totalSupply), "BSDT");
        
        // 获取部署者（owner）
        try {
            const owner = await bsdt.owner();
            console.log("Owner地址:", owner);
            const ownerBal = await bsdt.balanceOf(owner);
            console.log("Owner余额:", ethers.utils.formatEther(ownerBal), "BSDT");
            
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log(chalk.green("✅ 当前账户是Owner"));
            } else {
                console.log(chalk.yellow("⚠️ 当前账户不是Owner"));
                console.log(chalk.white("需要使用Owner账户执行创建池子操作"));
            }
        } catch (e) {
            console.log("无法获取Owner信息");
        }
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });