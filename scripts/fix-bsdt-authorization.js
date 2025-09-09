const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔧 修复BSDT授权问题"));
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
        console.log(chalk.yellow("合约Owner:"), owner);
        
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log(chalk.red("❌ 当前账户不是Owner"));
            console.log(chalk.yellow("请使用Owner账户执行此操作"));
            return;
        }
        
        console.log(chalk.green("✅ 确认是Owner账户"));
        
        // 检查多签钱包
        const multiSigWallet = await bsdt.multiSigWallet();
        console.log(chalk.yellow("多签钱包:"), multiSigWallet);
        
        // 1. 授权PancakeRouter
        console.log(chalk.yellow.bold("\n1. 检查并授权PancakeRouter..."));
        const isRouterAuthorized = await bsdt.authorizedExchanges(contracts.PancakeRouter);
        
        if (!isRouterAuthorized) {
            console.log(chalk.cyan("授权PancakeRouter..."));
            try {
                const tx1 = await bsdt.authorizeExchange(contracts.PancakeRouter, true);
                console.log(chalk.gray("交易哈希:"), tx1.hash);
                await tx1.wait();
                console.log(chalk.green("✅ PancakeRouter已授权"));
            } catch (error) {
                console.log(chalk.red("授权失败:"), error.message);
                
                // 如果失败，尝试直接调用
                if (error.message.includes("Only multi-sig")) {
                    console.log(chalk.yellow("\n需要多签权限，尝试其他方法..."));
                }
            }
        } else {
            console.log(chalk.green("✅ PancakeRouter已经授权"));
        }
        
        // 2. 授权PancakeFactory
        console.log(chalk.yellow.bold("\n2. 检查并授权PancakeFactory..."));
        const isFactoryAuthorized = await bsdt.authorizedExchanges(contracts.PancakeFactory);
        
        if (!isFactoryAuthorized) {
            console.log(chalk.cyan("授权PancakeFactory..."));
            try {
                const tx2 = await bsdt.authorizeExchange(contracts.PancakeFactory, true);
                console.log(chalk.gray("交易哈希:"), tx2.hash);
                await tx2.wait();
                console.log(chalk.green("✅ PancakeFactory已授权"));
            } catch (error) {
                console.log(chalk.red("授权失败:"), error.message);
            }
        } else {
            console.log(chalk.green("✅ PancakeFactory已经授权"));
        }
        
        // 3. 预计算池子地址
        console.log(chalk.yellow.bold("\n3. 预计算并授权池子地址..."));
        
        // BSDT/USDT池子
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
            try {
                const tx3 = await bsdt.authorizeExchange(poolAddress, true);
                console.log(chalk.gray("交易哈希:"), tx3.hash);
                await tx3.wait();
                console.log(chalk.green("✅ 池子地址已授权"));
            } catch (error) {
                console.log(chalk.red("授权失败:"), error.message);
            }
        } else {
            console.log(chalk.green("✅ 池子地址已经授权"));
        }
        
        // 4. 检查最终状态
        console.log(chalk.yellow.bold("\n4. 最终授权状态："));
        console.log(chalk.white("PancakeRouter:"), await bsdt.authorizedExchanges(contracts.PancakeRouter) ? "✅ 已授权" : "❌ 未授权");
        console.log(chalk.white("PancakeFactory:"), await bsdt.authorizedExchanges(contracts.PancakeFactory) ? "✅ 已授权" : "❌ 未授权");
        console.log(chalk.white("池子地址:"), await bsdt.authorizedExchanges(poolAddress) ? "✅ 已授权" : "❌ 未授权");
        
        // 检查其他已授权地址
        console.log(chalk.yellow.bold("\n其他已授权地址："));
        const gateway = "0xcED40bF4AF4dD04F821Bd777f7d953861cfD9cda";
        const router = "0x2e386A8313Cc33a24370A25Fdae5E8d5C548760a";
        console.log(chalk.white("BSDTGateway:"), await bsdt.authorizedExchanges(gateway) ? "✅" : "❌");
        console.log(chalk.white("HCFSwapRouter:"), await bsdt.authorizedExchanges(router) ? "✅" : "❌");
        
        // 如果授权失败，提供解决方案
        const routerAuth = await bsdt.authorizedExchanges(contracts.PancakeRouter);
        if (!routerAuth) {
            console.log(chalk.red.bold("\n⚠️ 授权失败的可能原因："));
            console.log(chalk.yellow("1. 合约可能需要多签钱包权限"));
            console.log(chalk.yellow("2. 函数可能有modifier限制"));
            
            console.log(chalk.cyan.bold("\n替代方案："));
            console.log(chalk.white("1. 检查合约源码中的authorizeExchange函数"));
            console.log(chalk.white("2. 确认是否需要多签钱包"));
            console.log(chalk.white("3. 或者直接在BSCScan上调用函数"));
            
            console.log(chalk.blue("\n在BSCScan上操作："));
            console.log(chalk.white(`1. 访问: https://bscscan.com/address/${contracts.BSDT}#writeContract`));
            console.log(chalk.white("2. 连接你的钱包"));
            console.log(chalk.white("3. 找到 authorizeExchange 函数"));
            console.log(chalk.white(`4. 输入: ${contracts.PancakeRouter}, true`));
            console.log(chalk.white("5. 执行交易"));
        } else {
            console.log(chalk.green.bold("\n✅ 授权成功！"));
            console.log(chalk.cyan("\n下一步："));
            console.log(chalk.white("1. 运行: npx hardhat run scripts/quick-check-approve.js --network bsc"));
            console.log(chalk.white("2. 去PancakeSwap添加流动性"));
        }
        
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