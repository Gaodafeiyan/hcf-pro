const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 关闭多签并授权PancakeSwap"));
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
            console.log(chalk.yellow("请使用Owner账户执行此操作"));
            return;
        }
        
        console.log(chalk.green("✅ 确认是Owner账户"));
        
        // 1. 检查并关闭多签要求
        console.log(chalk.yellow.bold("\n1. 检查多签设置..."));
        const requireMultiSig = await bsdt.requireMultiSig();
        
        if (requireMultiSig) {
            console.log(chalk.red("当前需要多签"));
            console.log(chalk.cyan("关闭多签要求..."));
            
            const tx1 = await bsdt.toggleMultiSigRequirement();
            console.log(chalk.gray("交易哈希:"), tx1.hash);
            await tx1.wait();
            console.log(chalk.green("✅ 多签要求已关闭"));
        } else {
            console.log(chalk.green("✅ 多签已关闭"));
        }
        
        // 2. 授权PancakeRouter
        console.log(chalk.yellow.bold("\n2. 授权PancakeRouter..."));
        const isRouterAuthorized = await bsdt.authorizedExchanges(contracts.PancakeRouter);
        
        if (!isRouterAuthorized) {
            const tx2 = await bsdt.authorizeExchange(contracts.PancakeRouter, true);
            console.log(chalk.gray("交易哈希:"), tx2.hash);
            await tx2.wait();
            console.log(chalk.green("✅ PancakeRouter已授权"));
        } else {
            console.log(chalk.green("✅ PancakeRouter已经授权"));
        }
        
        // 3. 授权PancakeFactory
        console.log(chalk.yellow.bold("\n3. 授权PancakeFactory..."));
        const isFactoryAuthorized = await bsdt.authorizedExchanges(contracts.PancakeFactory);
        
        if (!isFactoryAuthorized) {
            const tx3 = await bsdt.authorizeExchange(contracts.PancakeFactory, true);
            console.log(chalk.gray("交易哈希:"), tx3.hash);
            await tx3.wait();
            console.log(chalk.green("✅ PancakeFactory已授权"));
        } else {
            console.log(chalk.green("✅ PancakeFactory已经授权"));
        }
        
        // 4. 预计算并授权池子地址
        console.log(chalk.yellow.bold("\n4. 预计算池子地址..."));
        
        // 使用Create2计算BSDT/USDT池子地址
        const token0 = contracts.BSDT.toLowerCase() < contracts.USDT.toLowerCase() ? contracts.BSDT : contracts.USDT;
        const token1 = contracts.BSDT.toLowerCase() < contracts.USDT.toLowerCase() ? contracts.USDT : contracts.BSDT;
        
        const salt = ethers.utils.solidityKeccak256(
            ["address", "address"],
            [token0, token1]
        );
        
        // PancakeSwap V2 init code hash
        const initCodeHash = "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5";
        
        const poolAddress = ethers.utils.getCreate2Address(
            contracts.PancakeFactory,
            salt,
            initCodeHash
        );
        
        console.log(chalk.white("预计算BSDT/USDT池子地址:"), poolAddress);
        
        // 授权池子地址
        const isPoolAuthorized = await bsdt.authorizedExchanges(poolAddress);
        if (!isPoolAuthorized) {
            const tx4 = await bsdt.authorizeExchange(poolAddress, true);
            console.log(chalk.gray("交易哈希:"), tx4.hash);
            await tx4.wait();
            console.log(chalk.green("✅ BSDT/USDT池子地址已预授权"));
        } else {
            console.log(chalk.green("✅ 池子地址已经授权"));
        }
        
        // 5. 验证所有授权
        console.log(chalk.yellow.bold("\n5. 验证授权状态..."));
        console.log(chalk.white("PancakeRouter:"), await bsdt.authorizedExchanges(contracts.PancakeRouter) ? "✅" : "❌");
        console.log(chalk.white("PancakeFactory:"), await bsdt.authorizedExchanges(contracts.PancakeFactory) ? "✅" : "❌");
        console.log(chalk.white("池子地址:"), await bsdt.authorizedExchanges(poolAddress) ? "✅" : "❌");
        console.log(chalk.white("多签要求:"), await bsdt.requireMultiSig() ? "开启" : "关闭");
        
        console.log(chalk.green.bold("\n✅ 所有授权完成！"));
        console.log(chalk.cyan("\n现在可以："));
        console.log(chalk.white("1. 运行 npx hardhat run scripts/quick-check-approve.js --network bsc"));
        console.log(chalk.white("2. 去PancakeSwap添加流动性"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
        
        if (error.message.includes("Only multi-sig")) {
            console.log(chalk.yellow("\n提示: 需要使用多签钱包账户"));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });