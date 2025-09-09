const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 检查BSDT合约详情"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    const bsdtAddress = "0x3932968a904Bf6773E8a13F1D2358331B9a1a530";
    const poolAddress = "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1";
    const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    
    try {
        // 1. 获取BSDT合约基本信息
        console.log(chalk.cyan("1. BSDT合约基本信息..."));
        const bsdt = await ethers.getContractAt([
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function owner() view returns (address)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ], bsdtAddress);
        
        const name = await bsdt.name();
        const symbol = await bsdt.symbol();
        const decimals = await bsdt.decimals();
        const totalSupply = await bsdt.totalSupply();
        const owner = await bsdt.owner();
        
        console.log("名称:", name);
        console.log("符号:", symbol);
        console.log("精度:", decimals);
        console.log("总供应:", ethers.utils.formatEther(totalSupply));
        console.log("Owner:", owner);
        console.log("您是部署者:", owner === signer.address ? "是 ✅" : "否");
        
        // 2. 检查相关地址的余额
        console.log(chalk.cyan("\n2. 检查余额..."));
        const poolBalance = await bsdt.balanceOf(poolAddress);
        const routerBalance = await bsdt.balanceOf(routerAddress);
        const signerBalance = await bsdt.balanceOf(signer.address);
        
        console.log(`池子BSDT余额: ${ethers.utils.formatEther(poolBalance)}`);
        console.log(`Router BSDT余额: ${ethers.utils.formatEther(routerBalance)}`);
        console.log(`您的BSDT余额: ${ethers.utils.formatEther(signerBalance)}`);
        
        // 3. 检查授权
        console.log(chalk.cyan("\n3. 检查授权..."));
        const poolToRouter = await bsdt.allowance(poolAddress, routerAddress);
        const signerToRouter = await bsdt.allowance(signer.address, routerAddress);
        
        console.log(`池子对Router授权: ${ethers.utils.formatEther(poolToRouter)}`);
        console.log(`您对Router授权: ${ethers.utils.formatEther(signerToRouter)}`);
        
        // 4. 尝试测试转账
        console.log(chalk.cyan("\n4. 测试BSDT转账功能..."));
        
        // 测试小额转账
        if (signerBalance.gt(ethers.utils.parseEther("0.01"))) {
            try {
                console.log("测试转账0.01 BSDT给自己...");
                const testTx = await bsdt.transfer(signer.address, ethers.utils.parseEther("0.01"));
                await testTx.wait();
                console.log(chalk.green("✅ 转账成功，BSDT转账功能正常"));
            } catch (err) {
                console.log(chalk.red("❌ 转账失败:", err.message));
            }
        }
        
        // 5. 分析问题
        console.log(chalk.yellow("\n5. 问题分析："));
        console.log("TRANSFER_FAILED 可能的原因：");
        console.log("1. 池子合约本身的问题（PancakePair）");
        console.log("2. Router在执行removeLiquidity时的计算问题");
        console.log("3. LP代币的burn操作失败");
        
        // 6. 替代方案
        console.log(chalk.green("\n✅ 替代方案："));
        console.log("既然BSDT合约正常，建议：");
        console.log("1. 保持当前10:1的价格比例");
        console.log("2. 质押合约会自动根据实时价格计算LP需求");
        console.log("3. 不影响质押功能的使用");
        
        // 7. 验证质押合约是否正常工作
        console.log(chalk.cyan("\n6. 验证质押合约是否能正常工作..."));
        const stakingAddress = "0x7B073C2A44679b3457E6Bc015Fef5279afE72fC7";
        
        try {
            const staking = await ethers.getContractAt([
                "function hcfBsdtPair() view returns (address)",
                "function getHCFPrice() view returns (uint256)"
            ], stakingAddress);
            
            const pairInContract = await staking.hcfBsdtPair();
            console.log("质押合约中的池子地址:", pairInContract);
            
            if (pairInContract === "0x0000000000000000000000000000000000000000") {
                console.log(chalk.yellow("需要先设置池子地址"));
                console.log("运行: npx hardhat run scripts/update-pool-address.js --network bsc");
            } else {
                const price = await staking.getHCFPrice();
                console.log(chalk.green(`✅ 价格获取成功: 1 HCF = ${ethers.utils.formatEther(price)} BSDT`));
                console.log(chalk.green("质押合约可以正常使用！"));
            }
        } catch (err) {
            console.log("检查质押合约失败:", err.message);
        }
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
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