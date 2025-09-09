const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔓 授权PancakeRouter交易BSDT"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };

    try {
        // 获取BSDT合约（使用BSDTToken ABI）
        const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
        
        // 检查当前授权状态
        console.log(chalk.yellow.bold("1. 检查PancakeRouter授权状态..."));
        const isAuthorized = await bsdt.authorizedExchanges(contracts.PancakeRouter);
        
        if (isAuthorized) {
            console.log(chalk.green("✅ PancakeRouter已被授权为交易所"));
        } else {
            console.log(chalk.red("❌ PancakeRouter未被授权"));
            
            // 检查是否是owner
            const owner = await bsdt.owner();
            console.log(chalk.white("合约Owner:"), owner);
            console.log(chalk.white("当前账户:"), signer.address);
            
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log(chalk.cyan("\n2. 授权PancakeRouter为交易所..."));
                const tx = await bsdt.authorizeExchange(contracts.PancakeRouter, true);
                console.log(chalk.gray("交易哈希:"), tx.hash);
                await tx.wait();
                console.log(chalk.green("✅ PancakeRouter已成功授权"));
            } else {
                console.log(chalk.red("\n❌ 当前账户不是合约Owner，无法授权"));
                console.log(chalk.yellow("需要使用Owner账户执行此操作"));
            }
        }
        
        // 检查PancakeFactory
        console.log(chalk.yellow.bold("\n3. 检查PancakeFactory授权状态..."));
        const isFactoryAuthorized = await bsdt.authorizedExchanges(contracts.PancakeFactory);
        
        if (isFactoryAuthorized) {
            console.log(chalk.green("✅ PancakeFactory已被授权"));
        } else {
            console.log(chalk.red("❌ PancakeFactory未被授权"));
            
            const owner = await bsdt.owner();
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log(chalk.cyan("\n授权PancakeFactory..."));
                const tx = await bsdt.authorizeExchange(contracts.PancakeFactory, true);
                await tx.wait();
                console.log(chalk.green("✅ PancakeFactory已成功授权"));
            }
        }
        
        // 现在尝试approve
        console.log(chalk.yellow.bold("\n4. 尝试approve BSDT给PancakeRouter..."));
        const allowance = await bsdt.allowance(signer.address, contracts.PancakeRouter);
        
        if (allowance.eq(ethers.constants.MaxUint256)) {
            console.log(chalk.green("✅ BSDT已有无限授权"));
        } else {
            console.log(chalk.cyan("执行approve..."));
            try {
                const approveTx = await bsdt.approve(contracts.PancakeRouter, ethers.constants.MaxUint256);
                await approveTx.wait();
                console.log(chalk.green("✅ BSDT approve成功"));
            } catch (error) {
                console.log(chalk.red("❌ Approve失败:"), error.message);
                console.log(chalk.yellow("\n可能的原因："));
                console.log(chalk.white("1. BSDT有交易限制，只允许授权的交易所"));
                console.log(chalk.white("2. 需要先将PancakeRouter和Factory加入白名单"));
            }
        }
        
        // 授权池子地址（预计算）
        console.log(chalk.yellow.bold("\n5. 预计算并授权池子地址..."));
        const factory = await ethers.getContractAt("IPancakeFactory", contracts.PancakeFactory);
        
        // 计算BSDT/USDT池子地址
        const USDT = "0x55d398326f99059fF775485246999027B3197955";
        let bsdtUsdtPair = await factory.getPair(contracts.BSDT, USDT);
        
        if (bsdtUsdtPair === ethers.constants.AddressZero) {
            console.log(chalk.yellow("BSDT/USDT池子未创建"));
            // 预计算池子地址
            const salt = ethers.utils.solidityKeccak256(
                ["address", "address"],
                [contracts.BSDT < USDT ? contracts.BSDT : USDT, 
                 contracts.BSDT < USDT ? USDT : contracts.BSDT]
            );
            const initCodeHash = "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5"; // PancakeSwap V2
            
            bsdtUsdtPair = ethers.utils.getCreate2Address(
                contracts.PancakeFactory,
                salt,
                initCodeHash
            );
            console.log(chalk.white("预计算BSDT/USDT池子地址:"), bsdtUsdtPair);
            
            // 授权预计算的池子地址
            const owner = await bsdt.owner();
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                try {
                    const tx = await bsdt.authorizeExchange(bsdtUsdtPair, true);
                    await tx.wait();
                    console.log(chalk.green("✅ 预授权BSDT/USDT池子地址"));
                } catch (error) {
                    console.log(chalk.yellow("预授权失败:", error.message));
                }
            }
        } else {
            console.log(chalk.green("BSDT/USDT池子已存在:"), bsdtUsdtPair);
        }
        
        console.log(chalk.green.bold("\n✅ 授权流程完成！"));
        console.log(chalk.cyan("\n下一步："));
        console.log(chalk.white("1. 访问 https://pancakeswap.finance/add"));
        console.log(chalk.white("2. 创建BSDT/USDT池子 (1:1)"));
        console.log(chalk.white("3. 创建HCF/BSDT池子"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });