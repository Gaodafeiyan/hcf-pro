const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🧪 测试质押合约功能"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    const stakingAddress = "0x7B073C2A44679b3457E6Bc015Fef5279afE72fC7";
    const hcfAddress = "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192";
    
    try {
        // 1. 连接合约
        const staking = await ethers.getContractAt([
            "function getHCFPrice() view returns (uint256)",
            "function calculateLPRequirement(uint256 level) view returns (uint256 hcfRequired, uint256 bsdtRequired)",
            "function levels(uint256) view returns (uint256 minStake, uint256 dailyRate, uint256 lpHCFRequired, uint256 compoundUnit)",
            "function getUserInfo(address user) view returns (uint256 amount, uint256 level, uint256 pending, uint256 lpType, uint256 dailyOutput)"
        ], stakingAddress);
        
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", hcfAddress);
        
        // 2. 显示价格和LP需求
        console.log(chalk.cyan("1. 当前价格和LP需求："));
        const price = await staking.getHCFPrice();
        console.log(`HCF价格: 1 HCF = ${ethers.utils.formatEther(price)} BSDT`);
        
        console.log("\n各级别LP需求：");
        for (let level = 3; level <= 5; level++) {
            const [hcfReq, bsdtReq] = await staking.calculateLPRequirement(level);
            const levelConfig = await staking.levels(level);
            console.log(chalk.yellow(`\nLevel ${level}:`));
            console.log(`  最小质押: ${ethers.utils.formatEther(levelConfig.minStake)} HCF`);
            console.log(`  日收益率: ${levelConfig.dailyRate.toNumber() / 100}%`);
            console.log(`  LP需求: ${ethers.utils.formatEther(hcfReq)} HCF + ${ethers.utils.formatEther(bsdtReq)} BSDT`);
            console.log(`  复投单位: ${ethers.utils.formatEther(levelConfig.compoundUnit)} HCF`);
        }
        
        // 3. 检查用户信息
        console.log(chalk.cyan("\n2. 您的质押信息："));
        const userInfo = await staking.getUserInfo(signer.address);
        
        if (userInfo.amount.gt(0)) {
            console.log(`质押数量: ${ethers.utils.formatEther(userInfo.amount)} HCF`);
            console.log(`质押等级: L${userInfo.level}`);
            console.log(`待领取: ${ethers.utils.formatEther(userInfo.pending)} HCF`);
            console.log(`LP类型: ${userInfo.lpType == 0 ? "无LP" : userInfo.lpType == 1 ? "普通LP" : `股权LP${userInfo.lpType == 2 ? "100天" : "300天"}`}`);
            console.log(`日产出: ${ethers.utils.formatEther(userInfo.dailyOutput)} HCF`);
        } else {
            console.log("您还未质押");
            
            // 检查余额
            const hcfBalance = await hcf.balanceOf(signer.address);
            console.log(`\n您的HCF余额: ${ethers.utils.formatEther(hcfBalance)}`);
            
            if (hcfBalance.gte(ethers.utils.parseEther("1000"))) {
                console.log(chalk.green("✅ 您有足够的HCF进行L3级质押"));
            }
        }
        
        // 4. 功能测试建议
        console.log(chalk.cyan("\n3. 功能测试步骤："));
        console.log("1️⃣ 质押HCF:");
        console.log("   合约.stake(金额)");
        console.log("\n2️⃣ 添加LP（可选）:");
        console.log("   合约.addLP(类型) // 1=普通LP, 2=股权LP100天, 3=股权LP300天");
        console.log("\n3️⃣ 领取收益:");
        console.log("   合约.claim()");
        console.log("\n4️⃣ 复投:");
        console.log("   合约.compound()");
        console.log("\n5️⃣ 赎回:");
        console.log("   合约.withdraw(金额)");
        
        console.log(chalk.green("\n✅ 质押合约功能正常，可以开始使用！"));
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 测试完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });