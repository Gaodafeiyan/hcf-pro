const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 部署防暴跌机制和节点系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    // 使用已部署的合约地址
    const addresses = {
        HCF: "0xc5c3f24A212838968759045d1654d3643016D585",      // 新HCF
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",     // BSDT
        HCF_BSDT_PAIR: "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048", // 新池子
        STAKING: "0x209D3D4f8Ab55CD678D736957AbC139F157753fE"    // 质押合约
    };
    
    console.log(chalk.yellow("使用的合约地址:"));
    console.log("HCF:", addresses.HCF);
    console.log("BSDT:", addresses.BSDT);
    console.log("HCF/BSDT池子:", addresses.HCF_BSDT_PAIR);
    console.log("质押合约:", addresses.STAKING);
    console.log();
    
    const deployedContracts = {};
    
    try {
        // 1. 部署防暴跌机制合约
        console.log(chalk.cyan("1. 部署HCFAntiDump防暴跌机制合约..."));
        
        const HCFAntiDump = await ethers.getContractFactory("HCFAntiDump");
        const antiDumpContract = await HCFAntiDump.deploy(
            addresses.HCF,
            addresses.BSDT,
            addresses.HCF_BSDT_PAIR
        );
        
        console.log("防暴跌合约部署交易:", antiDumpContract.deployTransaction.hash);
        console.log("等待确认...");
        await antiDumpContract.deployed();
        
        deployedContracts.antiDump = antiDumpContract.address;
        console.log(chalk.green("✅ 防暴跌机制合约部署成功!"));
        console.log("合约地址:", antiDumpContract.address);
        
        // 2. 部署节点NFT系统
        console.log(chalk.cyan("\n2. 部署HCFNode节点NFT系统..."));
        
        const HCFNode = await ethers.getContractFactory("HCFNode");
        const nodeContract = await HCFNode.deploy(
            addresses.BSDT,
            addresses.HCF
        );
        
        console.log("节点合约部署交易:", nodeContract.deployTransaction.hash);
        console.log("等待确认...");
        await nodeContract.deployed();
        
        deployedContracts.node = nodeContract.address;
        console.log(chalk.green("✅ 节点NFT系统部署成功!"));
        console.log("合约地址:", nodeContract.address);
        
        // 3. 设置合约关联
        console.log(chalk.cyan("\n3. 设置合约关联..."));
        
        // 3.1 防暴跌合约设置节点和质押合约
        console.log("- 设置防暴跌合约的关联...");
        const setAntiDumpContractsTx = await antiDumpContract.setContracts(
            nodeContract.address,
            addresses.STAKING,
            addresses.HCF_BSDT_PAIR
        );
        await setAntiDumpContractsTx.wait();
        console.log(chalk.green("  ✅ 防暴跌合约关联设置成功"));
        
        // 3.2 节点合约设置质押和防暴跌合约
        console.log("- 设置节点合约的关联...");
        const setNodeContractsTx = await nodeContract.setContracts(
            addresses.STAKING,
            antiDumpContract.address
        );
        await setNodeContractsTx.wait();
        console.log(chalk.green("  ✅ 节点合约关联设置成功"));
        
        // 4. 验证防暴跌机制
        console.log(chalk.cyan("\n4. 验证防暴跌机制..."));
        
        // 4.1 获取当前价格
        const currentPrice = await antiDumpContract.getHCFPrice();
        console.log(`当前HCF价格: ${ethers.utils.formatEther(currentPrice)} BSDT`);
        
        // 4.2 获取当前状态
        const status = await antiDumpContract.getCurrentStatus();
        console.log("\n防暴跌机制状态:");
        console.log(`- 当前价格: ${ethers.utils.formatEther(status.currentPriceValue)} BSDT`);
        console.log(`- 开盘价格: ${ethers.utils.formatEther(status.dailyOpenPriceValue)} BSDT`);
        console.log(`- 跌幅: ${status.dropPercent.toString() / 100}%`);
        console.log(`- 当前滑点: ${status.slippage.toString() / 100}%`);
        console.log(`- 销毁率: ${status.burnRate.toString() / 100}%`);
        console.log(`- 节点分红: ${status.nodeReward.toString() / 100}%`);
        console.log(`- 减产率: ${status.productionCut.toString() / 100}%`);
        
        // 5. 验证节点系统
        console.log(chalk.cyan("\n5. 验证节点系统..."));
        
        const maxNodes = await nodeContract.MAX_NODES();
        const applicationFee = await nodeContract.APPLICATION_FEE();
        const activationHCF = await nodeContract.ACTIVATION_HCF();
        const currentNodeId = await nodeContract.currentNodeId();
        
        console.log("节点系统配置:");
        console.log(`- 最大节点数: ${maxNodes}`);
        console.log(`- 申请费用: ${ethers.utils.formatEther(applicationFee)} BSDT`);
        console.log(`- 激活需要: ${ethers.utils.formatEther(activationHCF)} HCF`);
        console.log(`- 当前已申请节点: ${currentNodeId}/99`);
        
        // 6. 保存部署信息
        const deploymentInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            contracts: {
                HCFAntiDump: antiDumpContract.address,
                HCFNode: nodeContract.address,
                HCF: addresses.HCF,
                BSDT: addresses.BSDT,
                HCF_BSDT_PAIR: addresses.HCF_BSDT_PAIR,
                HCFStaking: addresses.STAKING
            },
            antiDumpConfig: {
                levels: [
                    {
                        threshold: "10%下跌",
                        slippage: "5%",
                        burn: "3%",
                        nodeReward: "2%",
                        productionCut: "5%"
                    },
                    {
                        threshold: "30%下跌",
                        slippage: "15%",
                        burn: "10%",
                        nodeReward: "5%",
                        productionCut: "15%"
                    },
                    {
                        threshold: "50%下跌",
                        slippage: "30%",
                        burn: "20%",
                        nodeReward: "10%",
                        productionCut: "30%"
                    }
                ]
            },
            nodeConfig: {
                maxNodes: 99,
                applicationFee: "5000 BSDT",
                activationRequirement: "1000 HCF + 等值LP",
                revenueStreams: [
                    "滑点分红20%",
                    "提现手续费2%",
                    "全网入单2%",
                    "防暴跌分红"
                ]
            }
        };
        
        fs.writeFileSync(
            'antidump-node-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(chalk.green("\n✅ 部署信息已保存到 antidump-node-deployment.json"));
        
        // 7. 输出重要信息
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 部署完成"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green.bold("部署的合约:"));
        console.log("防暴跌机制:", antiDumpContract.address);
        console.log("节点系统:", nodeContract.address);
        
        console.log(chalk.yellow("\n系统功能:"));
        console.log("✅ 防暴跌机制已激活");
        console.log("  - 自动监控价格变化");
        console.log("  - 动态调整滑点和销毁");
        console.log("  - 智能减产保护");
        
        console.log("\n✅ 节点系统已就绪");
        console.log("  - 限量99个节点");
        console.log("  - 多重收益来源");
        console.log("  - NFT形式可转让");
        
        console.log(chalk.cyan("\n下一步操作:"));
        console.log("1. 将防暴跌合约集成到交易路由");
        console.log("2. 将节点合约设置为操作员（用于分红）");
        console.log("3. 开放节点申请");
        console.log("4. 监控价格和触发机制");
        
    } catch (error) {
        console.error(chalk.red("\n❌ 部署失败:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
        }
        
        // 如果部分部署成功，输出已部署的合约
        if (Object.keys(deployedContracts).length > 0) {
            console.log(chalk.yellow("\n已部署的合约:"));
            for (const [name, address] of Object.entries(deployedContracts)) {
                console.log(`${name}: ${address}`);
            }
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