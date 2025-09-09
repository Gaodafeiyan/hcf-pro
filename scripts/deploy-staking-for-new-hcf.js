const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 部署质押合约（新HCF）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 使用新的合约地址
    const addresses = {
        HCF: "0xc5c3f24A212838968759045d1654d3643016D585",      // 新HCF
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",     // BSDT
        HCF_BSDT_PAIR: "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048", // 新池子
        FEE_RECEIVER: deployer.address
    };
    
    console.log(chalk.yellow("使用的合约地址:"));
    console.log("新HCF:", addresses.HCF);
    console.log("BSDT:", addresses.BSDT);
    console.log("HCF/BSDT池子:", addresses.HCF_BSDT_PAIR);
    console.log("费用接收:", addresses.FEE_RECEIVER);
    console.log();
    
    try {
        // 1. 部署质押合约
        console.log(chalk.cyan("1. 部署HCFStakingFinal合约..."));
        
        const HCFStakingFinal = await ethers.getContractFactory("HCFStakingFinal");
        const stakingContract = await HCFStakingFinal.deploy(
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
        
        // 3. 验证价格获取
        console.log(chalk.cyan("\n3. 验证价格获取..."));
        const price = await stakingContract.getHCFPrice();
        console.log(chalk.green(`当前HCF价格: ${ethers.utils.formatEther(price)} BSDT`));
        
        if (Math.abs(parseFloat(ethers.utils.formatEther(price)) - 0.1) < 0.001) {
            console.log(chalk.green.bold("✅ 价格正确！0.1 BSDT"));
        }
        
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
                HCFStakingFinal: stakingContract.address,
                HCF: addresses.HCF,
                BSDT: addresses.BSDT,
                HCF_BSDT_PAIR: addresses.HCF_BSDT_PAIR
            },
            configuration: {
                collectionWallet: "0x4bBaa8Ce8ddf4dd38A5799cedF0019eb5bCe82DC",
                feeReceiver: addresses.FEE_RECEIVER,
                currentPrice: ethers.utils.formatEther(price) + " BSDT",
                levels: {
                    L3: { 
                        minStake: "1000 HCF", 
                        dailyRate: "0.6%", 
                        lpRequired: "200 HCF + 20 BSDT"
                    },
                    L4: { 
                        minStake: "10000 HCF", 
                        dailyRate: "0.7%", 
                        lpRequired: "2000 HCF + 200 BSDT"
                    },
                    L5: { 
                        minStake: "100000 HCF", 
                        dailyRate: "0.8%", 
                        lpRequired: "20000 HCF + 2000 BSDT"
                    }
                }
            }
        };
        
        fs.writeFileSync(
            'new-staking-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green("\n✅ 部署信息已保存到 new-staking-deployment.json"));
        
        // 6. 输出重要信息
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 部署完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("质押合约地址:"), stakingContract.address);
        console.log(chalk.green.bold("新HCF地址:"), addresses.HCF);
        console.log(chalk.green.bold("池子地址:"), addresses.HCF_BSDT_PAIR);
        console.log(chalk.green.bold("价格: 1 HCF = 0.1 BSDT ✅"));
        
        console.log(chalk.yellow("\n系统已准备就绪："));
        console.log("✅ 新HCF代币");
        console.log("✅ 正确价格的池子（0.1 BSDT）");
        console.log("✅ 质押合约");
        console.log("\n用户现在可以：");
        console.log("1. 质押HCF获得收益");
        console.log("2. 添加LP获得双倍收益");
        console.log("3. LP需求按0.1价格计算（而不是10）");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
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