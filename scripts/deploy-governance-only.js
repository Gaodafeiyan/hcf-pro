const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🏛️ 部署治理系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    try {
        console.log(chalk.cyan("部署HCFGovernance治理系统..."));
        const HCFGovernance = await ethers.getContractFactory("HCFGovernance");
        const governance = await HCFGovernance.deploy(); // 不需要参数
        
        console.log("交易:", governance.deployTransaction.hash);
        console.log("等待确认...");
        await governance.deployed();
        
        console.log(chalk.green("✅ 治理系统部署成功!"));
        console.log("合约地址:", governance.address);
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("   📋 完整系统地址"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log("HCF: 0xc5c3f24A212838968759045d1654d3643016D585");
        console.log("BSDT: 0x3932968a904Bf6773E8a13F1D2358331B9a1a530");
        console.log("质押: 0x209D3D4f8Ab55CD678D736957AbC139F157753fE");
        console.log("防暴跌: 0xff9d8C2f579CB2b6e663B05f2F0d1E19DCB3EB5A");
        console.log("节点: 0x10B4284EAfdc92F448d29dB58F1CCc784E8230AD");
        console.log("推荐: 0xcd247EA730F2B08366AA23360E8a60F0de3C4e8f");
        console.log("排名: 0x61de1CB0fc76F9AC7E120465190Fc08FA2f412DA");
        console.log(chalk.green("治理: " + governance.address));
        
        console.log(chalk.yellow("\n治理系统功能:"));
        console.log("  - 统一管理所有系统参数");
        console.log("  - 调整质押收益率");
        console.log("  - 设置税费比例");
        console.log("  - 控制防暴跌参数");
        console.log("  - 管理推荐奖励");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });