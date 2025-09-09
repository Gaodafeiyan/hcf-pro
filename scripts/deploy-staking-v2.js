const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 部署 HCFStakingV2 合约"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 检查余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "BNB\n");
    
    // 合约地址
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",      // HCF Token
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",     // BSDT Token
        HCF_BSDT_PAIR: "0x8288dd6507f5aDa98602DE3138A79CC3712F5685", // HCF/BSDT池子
        FEE_RECEIVER: deployer.address  // 费用接收地址（可以修改）
    };
    
    console.log(chalk.yellow("使用的合约地址:"));
    console.log("HCF:", addresses.HCF);
    console.log("BSDT:", addresses.BSDT);
    console.log("HCF/BSDT池子:", addresses.HCF_BSDT_PAIR);
    console.log("费用接收:", addresses.FEE_RECEIVER);
    console.log();
    
    try {
        // 1. 部署质押合约
        console.log(chalk.cyan("1. 部署HCFStakingV2合约..."));
        
        const HCFStakingV2 = await ethers.getContractFactory("HCFStakingV2");
        const stakingContract = await HCFStakingV2.deploy(
            addresses.HCF,
            addresses.BSDT,
            addresses.FEE_RECEIVER
        );
        
        console.log("合约部署交易:", stakingContract.deployTransaction.hash);
        console.log("等待确认...");
        await stakingContract.deployed();
        
        console.log(chalk.green("✅ 质押合约部署成功!"));
        console.log("合约地址:", stakingContract.address);
        
        // 2. 设置HCF/BSDT池子地址
        console.log(chalk.cyan("\n2. 设置HCF/BSDT池子地址..."));
        const setPairTx = await stakingContract.setHCFBSDTPair(addresses.HCF_BSDT_PAIR);
        await setPairTx.wait();
        console.log(chalk.green("✅ 池子地址设置成功!"));
        
        // 3. 验证池子价格
        console.log(chalk.cyan("\n3. 验证价格获取..."));
        const price = await stakingContract.getHCFPrice();
        console.log("当前HCF价格:", ethers.utils.formatEther(price), "BSDT");
        
        // 4. 验证LP计算
        console.log(chalk.cyan("\n4. 验证LP需求计算..."));
        for (let level = 3; level <= 5; level++) {
            const [hcfRequired, bsdtRequired] = await stakingContract.calculateLPRequirement(level);
            console.log(`Level ${level}: ${ethers.utils.formatEther(hcfRequired)} HCF + ${ethers.utils.formatEther(bsdtRequired)} BSDT`);
        }
        
        // 5. 保存部署信息
        const deploymentInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: {
                HCFStakingV2: stakingContract.address,
                HCF: addresses.HCF,
                BSDT: addresses.BSDT,
                HCF_BSDT_PAIR: addresses.HCF_BSDT_PAIR
            },
            configuration: {
                collectionWallet: "0x4bBaa8Ce8ddf4dd38A5799cedF0019eb5bCe82DC",
                feeReceiver: addresses.FEE_RECEIVER,
                levels: {
                    L3: { minStake: "1000 HCF", dailyRate: "0.6%", lpRequired: "200 HCF" },
                    L4: { minStake: "10000 HCF", dailyRate: "0.7%", lpRequired: "2000 HCF" },
                    L5: { minStake: "100000 HCF", dailyRate: "0.8%", lpRequired: "20000 HCF" }
                }
            }
        };
        
        fs.writeFileSync(
            'staking-v2-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green("\n✅ 部署信息已保存到 staking-v2-deployment.json"));
        
        // 6. 输出重要信息
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 部署完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("质押合约地址:"), stakingContract.address);
        console.log(chalk.yellow("\n后续操作:"));
        console.log("1. 验证合约源码（可选）");
        console.log("2. 设置操作员地址（用于参数调整）");
        console.log("3. 用户可以开始质押");
        
        console.log(chalk.cyan("\n管理命令示例:"));
        console.log(`// 设置操作员`);
        console.log(`stakingContract.setOperator("操作员地址", true)`);
        console.log(`\n// 调整日封顶（1000 = 10%）`);
        console.log(`stakingContract.setDailyCap(1000)`);
        console.log(`\n// 调整限购期（天数）`);
        console.log(`stakingContract.setLimitPeriod(7)`);
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
        }
        if (error.error) {
            console.error(chalk.red("详细错误:"), error.error);
        }
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 脚本执行完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("脚本执行失败:"), error);
        process.exit(1);
    });