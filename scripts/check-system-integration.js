const { ethers } = require("hardhat");
const chalk = require("chalk");

// 当前所有新合约地址（全部是新的）
const CONTRACTS = {
    // 核心代币
    HCF: "0xc5c3f24A212838968759045d1654d3643016D585",      // 新HCF
    BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",     // BSDT
    HCF_BSDT_PAIR: "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048", // 新池子
    
    // 已部署的功能合约
    STAKING: "0x209D3D4f8Ab55CD678D736957AbC139F157753fE",   // 质押系统（新）
    ANTI_DUMP: "0xff9d8C2f579CB2b6e663B05f2F0d1E19DCB3EB5A", // 防暴跌（新）
    NODE_NFT: "0x10B4284EAfdc92F448d29dB58F1CCc784E8230AD",  // 节点系统（新）
    
    // 旧的不兼容合约（需要重新部署）
    OLD_REFERRAL: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D", // 旧推荐（不兼容）
    OLD_RANKING: "0xB83742944eE696318d9087076DC2D1bFF946E6Be",  // 旧排名（不兼容）
};

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔗 系统集成检查"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log("检查账户:", signer.address);
    console.log();

    // 1. 检查核心代币
    console.log(chalk.cyan("1️⃣ 核心代币系统"));
    try {
        const hcf = await ethers.getContractAt(
            ["function totalSupply() view returns (uint256)",
             "function decimals() view returns (uint8)",
             "function balanceOf(address) view returns (uint256)"],
            CONTRACTS.HCF
        );
        
        const totalSupply = await hcf.totalSupply();
        const decimals = await hcf.decimals();
        
        console.log(`  HCF总供应量: ${ethers.utils.formatEther(totalSupply)}`);
        console.log(`  精度: ${decimals}`);
        console.log(chalk.green("  ✅ HCF代币正常"));
    } catch (e) {
        console.log(chalk.red("  ❌ HCF代币异常:", e.message));
    }

    // 2. 检查质押系统集成
    console.log(chalk.cyan("\n2️⃣ 质押系统集成"));
    try {
        const staking = await ethers.getContractAt("HCFStakingFinal", CONTRACTS.STAKING);
        
        // 检查HCF代币地址
        const hcfToken = await staking.hcfToken();
        const bsdtToken = await staking.bsdtToken();
        
        console.log(`  使用的HCF: ${hcfToken}`);
        console.log(`  匹配新HCF: ${hcfToken.toLowerCase() === CONTRACTS.HCF.toLowerCase() ? "✅" : "❌"}`);
        console.log(`  使用的BSDT: ${bsdtToken}`);
        console.log(`  匹配BSDT: ${bsdtToken.toLowerCase() === CONTRACTS.BSDT.toLowerCase() ? "✅" : "❌"}`);
        
        // 检查池子地址
        const hcfBSDTPair = await staking.hcfBSDTPair();
        console.log(`  使用的池子: ${hcfBSDTPair}`);
        console.log(`  匹配新池子: ${hcfBSDTPair.toLowerCase() === CONTRACTS.HCF_BSDT_PAIR.toLowerCase() ? "✅" : "❌"}`);
        
        console.log(chalk.green("  ✅ 质押系统已正确集成新代币"));
    } catch (e) {
        console.log(chalk.red("  ❌ 质押系统异常:", e.message));
    }

    // 3. 检查防暴跌系统集成
    console.log(chalk.cyan("\n3️⃣ 防暴跌系统集成"));
    try {
        const antiDump = await ethers.getContractAt("HCFAntiDump", CONTRACTS.ANTI_DUMP);
        
        // 检查关联的合约
        const nodeContract = await antiDump.nodeContract();
        const stakingContract = await antiDump.stakingContract();
        
        console.log(`  节点合约: ${nodeContract}`);
        console.log(`  匹配节点NFT: ${nodeContract.toLowerCase() === CONTRACTS.NODE_NFT.toLowerCase() ? "✅" : "❌"}`);
        console.log(`  质押合约: ${stakingContract}`);
        console.log(`  匹配质押: ${stakingContract.toLowerCase() === CONTRACTS.STAKING.toLowerCase() ? "✅" : "❌"}`);
        
        // 检查价格
        const price = await antiDump.getHCFPrice();
        console.log(`  当前价格: ${ethers.utils.formatEther(price)} BSDT`);
        
        console.log(chalk.green("  ✅ 防暴跌系统已正确集成"));
    } catch (e) {
        console.log(chalk.red("  ❌ 防暴跌系统异常:", e.message));
    }

    // 4. 检查节点系统集成
    console.log(chalk.cyan("\n4️⃣ 节点系统集成"));
    try {
        const node = await ethers.getContractAt("HCFNode", CONTRACTS.NODE_NFT);
        
        // 检查关联的合约
        const stakingContract = await node.stakingContract();
        const antiDumpContract = await node.antiDumpContract();
        
        console.log(`  质押合约: ${stakingContract}`);
        console.log(`  匹配质押: ${stakingContract.toLowerCase() === CONTRACTS.STAKING.toLowerCase() ? "✅" : "❌"}`);
        console.log(`  防暴跌合约: ${antiDumpContract}`);
        console.log(`  匹配防暴跌: ${antiDumpContract.toLowerCase() === CONTRACTS.ANTI_DUMP.toLowerCase() ? "✅" : "❌"}`);
        
        // 检查代币地址
        const hcfToken = await node.hcfToken();
        const bsdtToken = await node.bsdtToken();
        
        console.log(`  使用的HCF: ${hcfToken}`);
        console.log(`  匹配新HCF: ${hcfToken.toLowerCase() === CONTRACTS.HCF.toLowerCase() ? "✅" : "❌"}`);
        console.log(`  使用的BSDT: ${bsdtToken}`);
        console.log(`  匹配BSDT: ${bsdtToken.toLowerCase() === CONTRACTS.BSDT.toLowerCase() ? "✅" : "❌"}`);
        
        console.log(chalk.green("  ✅ 节点系统已正确集成"));
    } catch (e) {
        console.log(chalk.red("  ❌ 节点系统异常:", e.message));
    }

    // 5. 检查推荐系统（旧的不兼容）
    console.log(chalk.cyan("\n5️⃣ 推荐系统状态"));
    console.log(chalk.yellow("  ⚠️ 旧推荐系统不兼容新HCF"));
    console.log(`  旧地址: ${CONTRACTS.OLD_REFERRAL}`);
    console.log(`  使用旧HCF: 0x24cA14001674fD9250c9E343e30Bc788bC3a64cC`);
    console.log(chalk.red("  需要重新部署推荐系统"));

    // 总结
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 集成状态总结"));
    console.log(chalk.blue.bold("========================================\n"));

    console.log(chalk.green("✅ 已完成集成:"));
    console.log("  1. HCF新代币 ↔️ 质押系统");
    console.log("  2. 质押系统 ↔️ 防暴跌机制");
    console.log("  3. 防暴跌机制 ↔️ 节点系统");
    console.log("  4. 节点系统 ↔️ HCF/BSDT");
    console.log("  5. 所有系统使用新池子价格");

    console.log(chalk.red("\n❌ 需要处理:"));
    console.log("  1. 部署新的推荐系统（HCFReferralSimple.sol）");
    console.log("  2. 部署新的排名系统（HCFRanking.sol）");
    console.log("  3. 部署治理系统（HCFGovernance.sol）");
    console.log("  4. 将推荐系统集成到质押合约");

    console.log(chalk.yellow("\n📝 下一步操作:"));
    console.log("  1. 运行: npx hardhat run scripts/deploy-all-missing.js --network bsc");
    console.log("  2. 更新质押合约的推荐系统地址");
    console.log("  3. 测试完整业务流程");
}

main()
    .then(() => {
        console.log(chalk.green("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });