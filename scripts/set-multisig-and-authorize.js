const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔐 设置多签并授权PancakeSwap"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        USDT: "0x55d398326f99059fF775485246999027B3197955"
    };

    try {
        const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
        
        // 检查是否是owner
        const owner = await bsdt.owner();
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log(chalk.red("❌ 当前账户不是Owner"));
            console.log(chalk.white("Owner地址:"), owner);
            return;
        }
        
        console.log(chalk.green("✅ 确认是Owner账户"));
        
        // 检查当前多签钱包
        const currentMultiSig = await bsdt.multiSigWallet();
        console.log(chalk.yellow("当前多签钱包:"), currentMultiSig);
        
        if (currentMultiSig === ethers.constants.AddressZero) {
            console.log(chalk.red("❌ 多签钱包未设置"));
            console.log(chalk.cyan("\n1. 将Owner设置为多签钱包（临时方案）..."));
            
            // 将owner自己设置为多签钱包
            const tx1 = await bsdt.setMultiSigWallet(signer.address);
            console.log(chalk.gray("交易哈希:"), tx1.hash);
            await tx1.wait();
            console.log(chalk.green("✅ 已将Owner设置为多签钱包"));
        }
        
        // 现在作为多签钱包授权
        console.log(chalk.yellow.bold("\n2. 授权PancakeSwap组件..."));
        
        // 授权PancakeRouter
        const isRouterAuthorized = await bsdt.authorizedExchanges(contracts.PancakeRouter);
        if (!isRouterAuthorized) {
            console.log(chalk.cyan("授权PancakeRouter..."));
            const tx2 = await bsdt.authorizeExchange(contracts.PancakeRouter, true);
            console.log(chalk.gray("交易哈希:"), tx2.hash);
            await tx2.wait();
            console.log(chalk.green("✅ PancakeRouter已授权"));
        } else {
            console.log(chalk.green("✅ PancakeRouter已经授权"));
        }
        
        // 授权PancakeFactory
        const isFactoryAuthorized = await bsdt.authorizedExchanges(contracts.PancakeFactory);
        if (!isFactoryAuthorized) {
            console.log(chalk.cyan("授权PancakeFactory..."));
            const tx3 = await bsdt.authorizeExchange(contracts.PancakeFactory, true);
            console.log(chalk.gray("交易哈希:"), tx3.hash);
            await tx3.wait();
            console.log(chalk.green("✅ PancakeFactory已授权"));
        } else {
            console.log(chalk.green("✅ PancakeFactory已经授权"));
        }
        
        // 预计算并授权池子地址
        const token0 = contracts.BSDT.toLowerCase() < contracts.USDT.toLowerCase() ? contracts.BSDT : contracts.USDT;
        const token1 = contracts.BSDT.toLowerCase() < contracts.USDT.toLowerCase() ? contracts.USDT : contracts.BSDT;
        
        const salt = ethers.utils.solidityKeccak256(
            ["address", "address"],
            [token0, token1]
        );
        
        const initCodeHash = "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5";
        const poolAddress = ethers.utils.getCreate2Address(
            contracts.PancakeFactory,
            salt,
            initCodeHash
        );
        
        console.log(chalk.white("BSDT/USDT池子地址:"), poolAddress);
        
        const isPoolAuthorized = await bsdt.authorizedExchanges(poolAddress);
        if (!isPoolAuthorized) {
            console.log(chalk.cyan("授权池子地址..."));
            const tx4 = await bsdt.authorizeExchange(poolAddress, true);
            console.log(chalk.gray("交易哈希:"), tx4.hash);
            await tx4.wait();
            console.log(chalk.green("✅ 池子地址已授权"));
        } else {
            console.log(chalk.green("✅ 池子地址已经授权"));
        }
        
        // 同样计算HCF/BSDT池子
        const HCF = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
        const token0_2 = contracts.BSDT.toLowerCase() < HCF.toLowerCase() ? contracts.BSDT : HCF;
        const token1_2 = contracts.BSDT.toLowerCase() < HCF.toLowerCase() ? HCF : contracts.BSDT;
        
        const salt2 = ethers.utils.solidityKeccak256(
            ["address", "address"],
            [token0_2, token1_2]
        );
        
        const poolAddress2 = ethers.utils.getCreate2Address(
            contracts.PancakeFactory,
            salt2,
            initCodeHash
        );
        
        console.log(chalk.white("HCF/BSDT池子地址:"), poolAddress2);
        
        const isPool2Authorized = await bsdt.authorizedExchanges(poolAddress2);
        if (!isPool2Authorized) {
            console.log(chalk.cyan("授权HCF/BSDT池子地址..."));
            const tx5 = await bsdt.authorizeExchange(poolAddress2, true);
            console.log(chalk.gray("交易哈希:"), tx5.hash);
            await tx5.wait();
            console.log(chalk.green("✅ HCF/BSDT池子地址已授权"));
        } else {
            console.log(chalk.green("✅ HCF/BSDT池子地址已经授权"));
        }
        
        // 验证最终状态
        console.log(chalk.yellow.bold("\n3. 最终授权状态："));
        console.log(chalk.white("多签钱包:"), await bsdt.multiSigWallet());
        console.log(chalk.white("PancakeRouter:"), await bsdt.authorizedExchanges(contracts.PancakeRouter) ? "✅" : "❌");
        console.log(chalk.white("PancakeFactory:"), await bsdt.authorizedExchanges(contracts.PancakeFactory) ? "✅" : "❌");
        console.log(chalk.white("BSDT/USDT池子:"), await bsdt.authorizedExchanges(poolAddress) ? "✅" : "❌");
        console.log(chalk.white("HCF/BSDT池子:"), await bsdt.authorizedExchanges(poolAddress2) ? "✅" : "❌");
        
        console.log(chalk.green.bold("\n✅ 授权完成！"));
        console.log(chalk.cyan("\n下一步："));
        console.log(chalk.white("1. 运行: npx hardhat run scripts/quick-check-approve.js --network bsc"));
        console.log(chalk.white("2. 去PancakeSwap添加流动性"));
        
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