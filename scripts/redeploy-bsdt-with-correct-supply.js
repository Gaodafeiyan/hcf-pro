const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   重新部署BSDT（1000亿供应量）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("部署账户:"), deployer.address);

    // BSC主网地址
    const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
    const PANCAKE_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    
    // 现有合约地址（需要更新）
    const oldBSDT = "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908";
    
    console.log(chalk.yellow.bold("\n步骤1：部署新的BSDT合约"));
    
    // 部署BSDT V2（修复后的1000亿供应量）
    const BSDTToken = await ethers.getContractFactory("BSDTToken");
    console.log(chalk.cyan("正在部署BSDTToken V2..."));
    
    const bsdt = await BSDTToken.deploy(
        USDT_BSC,                    // USDT地址
        ethers.constants.AddressZero, // Oracle（暂时不用）
        deployer.address,            // Keeper
        deployer.address             // LP池（先给部署者）
    );
    await bsdt.deployed();
    
    console.log(chalk.green("✅ BSDT V2 部署成功:"), bsdt.address);
    
    // 验证供应量
    const totalSupply = await bsdt.totalSupply();
    const supplyInBillion = ethers.utils.formatEther(totalSupply).slice(0, -9);
    console.log(chalk.green("总供应量:"), supplyInBillion, "亿 BSDT");
    
    if (supplyInBillion === "100000000000") {
        console.log(chalk.green.bold("✅ 供应量正确：1000亿枚！"));
    } else {
        console.log(chalk.red.bold("❌ 供应量不正确！"));
    }
    
    console.log(chalk.yellow.bold("\n步骤2：更新其他合约中的BSDT地址"));
    
    // 需要更新的合约
    const contractsToUpdate = {
        "BSDTGateway": "0xb4c9C3E8CA4365c04d47dD6113831449213731ca",
        "HCFSwapRouter": "0x266b661f952dF7f5FBC97b28E9828775d9F0e75d",
        "HCFStaking": "0x42C343c61a630d0107B752001caCd50EfbDD13f6"
    };
    
    console.log(chalk.cyan("需要更新以下合约:"));
    for (const [name, address] of Object.entries(contractsToUpdate)) {
        console.log(chalk.white(`  ${name}: ${address}`));
    }
    
    console.log(chalk.yellow("\n注意: 由于其他合约可能硬编码了BSDT地址，可能需要重新部署所有合约"));
    
    // 保存新地址
    const newAddresses = {
        "BSDT_V2": bsdt.address,
        "OLD_BSDT": oldBSDT,
        "timestamp": new Date().toISOString(),
        "supply": supplyInBillion + " billion"
    };
    
    fs.writeFileSync('./new-bsdt-address.json', JSON.stringify(newAddresses, null, 2));
    console.log(chalk.green("\n✅ 新地址已保存到 new-bsdt-address.json"));
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         下一步操作"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.red.bold("重要：需要重新部署所有相关合约！"));
    console.log(chalk.white("\n1. 运行: npm run deploy:all-with-new-bsdt"));
    console.log(chalk.white("2. 这将重新部署:"));
    console.log(chalk.white("   - HCF Token"));
    console.log(chalk.white("   - BSDTGateway"));
    console.log(chalk.white("   - HCFSwapRouter"));
    console.log(chalk.white("   - Staking"));
    console.log(chalk.white("   - ReferralSystem"));
    console.log(chalk.white("   - NodeNFT"));
    console.log(chalk.white("   - 其他所有合约"));
    console.log(chalk.white("\n3. 更新所有脚本中的合约地址"));
    console.log(chalk.white("4. 创建新的流动性池"));
    
    return bsdt.address;
}

main()
    .then((newBSDTAddress) => {
        console.log(chalk.green.bold("\n✅ BSDT V2 部署完成:"), newBSDTAddress);
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });