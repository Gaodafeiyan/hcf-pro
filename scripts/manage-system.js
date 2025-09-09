const { ethers } = require("hardhat");
const chalk = require("chalk");

// 已部署的合约地址
const CONTRACTS = {
    HCF: "0xc5c3f24A212838968759045d1654d3643016D585",
    BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
    HCF_BSDT_PAIR: "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048",
    STAKING: "0x209D3D4f8Ab55CD678D736957AbC139F157753fE",
    ANTI_DUMP: "0xff9d8C2f579CB2b6e663B05f2F0d1E19DCB3EB5A",
    NODE_NFT: "0x10B4284EAfdc92F448d29dB58F1CCc784E8230AD"
};

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 HCF-PRO 系统管理工具"));
    console.log(chalk.blue.bold("========================================\n"));

    const [operator] = await ethers.getSigners();
    console.log("操作账户:", operator.address);
    console.log();

    // 获取命令行参数
    const command = process.argv[2];
    
    switch(command) {
        case "status":
            await checkSystemStatus();
            break;
        case "price":
            await checkPrice();
            break;
        case "nodes":
            await checkNodes();
            break;
        case "antidump":
            await checkAntiDump();
            break;
        case "update-price":
            await updatePrice();
            break;
        case "apply-node":
            await applyForNode();
            break;
        default:
            showHelp();
    }
}

async function checkSystemStatus() {
    console.log(chalk.cyan("📊 系统状态检查...\n"));
    
    // 检查HCF价格
    const antiDump = await ethers.getContractAt("HCFAntiDump", CONTRACTS.ANTI_DUMP);
    const price = await antiDump.getHCFPrice();
    console.log(chalk.green(`HCF价格: ${ethers.utils.formatEther(price)} BSDT`));
    
    // 检查节点状态
    const nodeNFT = await ethers.getContractAt("HCFNode", CONTRACTS.NODE_NFT);
    const currentNodeId = await nodeNFT.currentNodeId();
    const totalActiveNodes = await nodeNFT.totalActiveNodes();
    console.log(chalk.green(`节点状态: ${currentNodeId}/99 (活跃: ${totalActiveNodes})`));
    
    // 检查防暴跌状态
    const status = await antiDump.getCurrentStatus();
    console.log(chalk.green(`防暴跌状态:`));
    console.log(`  - 当前滑点: ${status.slippage.toString() / 100}%`);
    console.log(`  - 销毁率: ${status.burnRate.toString() / 100}%`);
    console.log(`  - 减产率: ${status.productionCut.toString() / 100}%`);
}

async function checkPrice() {
    console.log(chalk.cyan("💰 价格信息...\n"));
    
    const antiDump = await ethers.getContractAt("HCFAntiDump", CONTRACTS.ANTI_DUMP);
    const currentPrice = await antiDump.getHCFPrice();
    const status = await antiDump.getCurrentStatus();
    
    console.log(`当前价格: ${ethers.utils.formatEther(currentPrice)} BSDT`);
    console.log(`开盘价格: ${ethers.utils.formatEther(status.dailyOpenPriceValue)} BSDT`);
    
    const dropPercent = await antiDump.getDropPercentage();
    if (dropPercent < 0) {
        console.log(chalk.red(`日内跌幅: ${Math.abs(dropPercent.toNumber()) / 100}%`));
    } else if (dropPercent > 0) {
        console.log(chalk.green(`日内涨幅: ${dropPercent.toNumber() / 100}%`));
    } else {
        console.log(`日内变化: 0%`);
    }
}

async function checkNodes() {
    console.log(chalk.cyan("🎯 节点系统信息...\n"));
    
    const nodeNFT = await ethers.getContractAt("HCFNode", CONTRACTS.NODE_NFT);
    
    const maxNodes = await nodeNFT.MAX_NODES();
    const currentNodeId = await nodeNFT.currentNodeId();
    const totalActiveNodes = await nodeNFT.totalActiveNodes();
    const applicationFee = await nodeNFT.APPLICATION_FEE();
    const activationHCF = await nodeNFT.ACTIVATION_HCF();
    
    console.log(`节点限额: ${maxNodes}`);
    console.log(`已申请: ${currentNodeId}`);
    console.log(`已激活: ${totalActiveNodes}`);
    console.log(`申请费用: ${ethers.utils.formatEther(applicationFee)} BSDT`);
    console.log(`激活需要: ${ethers.utils.formatEther(activationHCF)} HCF + 等值LP`);
    
    // 获取活跃节点列表
    if (totalActiveNodes > 0) {
        const activeNodes = await nodeNFT.getActiveNodes();
        console.log(`\n活跃节点ID: ${activeNodes.join(", ")}`);
    }
}

async function checkAntiDump() {
    console.log(chalk.cyan("🛡️ 防暴跌机制状态...\n"));
    
    const antiDump = await ethers.getContractAt("HCFAntiDump", CONTRACTS.ANTI_DUMP);
    const status = await antiDump.getCurrentStatus();
    
    console.log(`当前价格: ${ethers.utils.formatEther(status.currentPriceValue)} BSDT`);
    console.log(`开盘价格: ${ethers.utils.formatEther(status.dailyOpenPriceValue)} BSDT`);
    console.log(`跌幅: ${status.dropPercent.toString() / 100}%`);
    console.log();
    
    if (status.slippage > 0) {
        console.log(chalk.yellow("⚠️ 防暴跌机制已触发!"));
        console.log(`滑点: ${status.slippage.toString() / 100}%`);
        console.log(`销毁: ${status.burnRate.toString() / 100}%`);
        console.log(`节点分红: ${status.nodeReward.toString() / 100}%`);
        console.log(`减产: ${status.productionCut.toString() / 100}%`);
    } else {
        console.log(chalk.green("✅ 价格稳定，防暴跌机制未触发"));
    }
    
    // 显示触发条件
    console.log("\n触发条件:");
    console.log("- 10%跌幅: 5%滑点 + 5%减产");
    console.log("- 30%跌幅: 15%滑点 + 15%减产");
    console.log("- 50%跌幅: 30%滑点 + 30%减产");
}

async function updatePrice() {
    console.log(chalk.cyan("🔄 更新价格...\n"));
    
    const antiDump = await ethers.getContractAt("HCFAntiDump", CONTRACTS.ANTI_DUMP);
    
    console.log("更新前:");
    await checkPrice();
    
    console.log("\n执行更新...");
    const tx = await antiDump.updateAndCheck();
    await tx.wait();
    
    console.log("\n更新后:");
    await checkPrice();
}

async function applyForNode() {
    console.log(chalk.cyan("📝 申请节点...\n"));
    
    const [signer] = await ethers.getSigners();
    const nodeNFT = await ethers.getContractAt("HCFNode", CONTRACTS.NODE_NFT);
    const bsdt = await ethers.getContractAt("IERC20", CONTRACTS.BSDT);
    
    // 检查BSDT余额
    const balance = await bsdt.balanceOf(signer.address);
    const applicationFee = await nodeNFT.APPLICATION_FEE();
    
    if (balance.lt(applicationFee)) {
        console.log(chalk.red(`❌ BSDT余额不足!`));
        console.log(`需要: ${ethers.utils.formatEther(applicationFee)} BSDT`);
        console.log(`当前: ${ethers.utils.formatEther(balance)} BSDT`);
        return;
    }
    
    // 授权BSDT
    console.log("授权BSDT...");
    const approveTx = await bsdt.approve(nodeNFT.address, applicationFee);
    await approveTx.wait();
    
    // 申请节点
    console.log("申请节点...");
    const applyTx = await nodeNFT.applyForNode();
    await applyTx.wait();
    
    console.log(chalk.green("✅ 节点申请成功!"));
    
    // 获取节点ID
    const nodeId = await nodeNFT.getUserNode(signer.address);
    console.log(`您的节点ID: ${nodeId}`);
}

function showHelp() {
    console.log(chalk.yellow("使用方法:"));
    console.log("  npx hardhat run scripts/manage-system.js --network bsc [command]");
    console.log();
    console.log("可用命令:");
    console.log("  status      - 查看系统状态");
    console.log("  price       - 查看价格信息");
    console.log("  nodes       - 查看节点信息");
    console.log("  antidump    - 查看防暴跌状态");
    console.log("  update-price - 更新价格(触发检查)");
    console.log("  apply-node  - 申请节点");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });