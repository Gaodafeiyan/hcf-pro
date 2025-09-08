const { ethers } = require("hardhat");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
    console.log("╔══════════════════════════════════════╗");
    console.log("║     HCF-RWA 管理员控制面板          ║");
    console.log("║     方便调整所有参数                ║");
    console.log("╚══════════════════════════════════════╝\n");
    
    const [admin] = await ethers.getSigners();
    console.log("管理员账户:", admin.address);
    
    // 治理合约地址（部署后需要更新）
    const governanceAddress = process.env.HCF_GOVERNANCE || "待部署";
    
    if (governanceAddress === "待部署") {
        console.log("\n⚠️ 请先部署治理合约!");
        console.log("运行: ./deploy-governance.sh");
        process.exit(1);
    }
    
    const governance = await ethers.getContractAt("HCFGovernance", governanceAddress);
    
    while (true) {
        console.log("\n" + "=".repeat(50));
        console.log("📋 选择要调整的参数:");
        console.log("=".repeat(50));
        console.log("1. 调整质押日化收益率");
        console.log("2. 修改税率");
        console.log("3. 设置领取手续费");
        console.log("4. 调整推荐奖励");
        console.log("5. 设置日收益封顶");
        console.log("6. 修改限购参数");
        console.log("7. 调整节点参数");
        console.log("8. 查看当前所有参数");
        console.log("9. 紧急暂停/恢复");
        console.log("0. 退出");
        
        const choice = await question("\n选择操作 (0-9): ");
        
        switch(choice) {
            case '1':
                console.log("\n📊 调整质押日化收益率");
                console.log("当前默认: L1=0.6%, L2=0.7%, L3=0.8%");
                
                const rate1 = await question("L1 日化率 (输入60表示0.6%): ");
                const rate2 = await question("L2 日化率 (输入70表示0.7%): ");
                const rate3 = await question("L3 日化率 (输入80表示0.8%): ");
                
                console.log("\n确认修改:");
                console.log(`L1: ${rate1/100}%`);
                console.log(`L2: ${rate2/100}%`);
                console.log(`L3: ${rate3/100}%`);
                
                const confirm1 = await question("确认? (y/n): ");
                if (confirm1 === 'y') {
                    const tx = await governance.setDailyRates(rate1, rate2, rate3);
                    await tx.wait();
                    console.log("✅ 日化收益率已更新!");
                }
                break;
                
            case '2':
                console.log("\n💰 修改税率");
                console.log("当前默认: 买2%, 卖5%, 转账1%");
                
                const buyTax = await question("买入税 (输入200表示2%): ");
                const sellTax = await question("卖出税 (输入500表示5%): ");
                const transferTax = await question("转账税 (输入100表示1%): ");
                
                console.log("\n确认修改:");
                console.log(`买入税: ${buyTax/100}%`);
                console.log(`卖出税: ${sellTax/100}%`);
                console.log(`转账税: ${transferTax/100}%`);
                
                const confirm2 = await question("确认? (y/n): ");
                if (confirm2 === 'y') {
                    const tx = await governance.setTaxRates(buyTax, sellTax, transferTax);
                    await tx.wait();
                    console.log("✅ 税率已更新!");
                }
                break;
                
            case '3':
                console.log("\n💵 设置领取手续费");
                console.log("当前默认: 5% BNB (节点2%, 营销3%)");
                
                const claimFee = await question("手续费比例 (输入500表示5%): ");
                const toNode = await question("给节点的百分比 (输入40表示2%/5%=40%): ");
                const toMarketing = 100 - parseInt(toNode);
                
                console.log("\n确认修改:");
                console.log(`总手续费: ${claimFee/100}% BNB`);
                console.log(`节点获得: ${toNode}% (${claimFee*toNode/10000}%)`);
                console.log(`营销获得: ${toMarketing}% (${claimFee*toMarketing/10000}%)`);
                
                const confirm3 = await question("确认? (y/n): ");
                if (confirm3 === 'y') {
                    const tx = await governance.setClaimFee(claimFee, toNode, toMarketing);
                    await tx.wait();
                    console.log("✅ 领取手续费已更新!");
                }
                break;
                
            case '4':
                console.log("\n🎁 调整推荐奖励");
                console.log("当前默认: 入金1代5%,2代3%; 静态1代20%,2代10%...");
                
                const deposit1 = await question("1代入金奖励 (输入500表示5%): ");
                const deposit2 = await question("2代入金奖励 (输入300表示3%): ");
                
                console.log("设置20层静态奖励...");
                const staticBonus = [];
                staticBonus.push(await question("1代静态 (输入2000表示20%): "));
                staticBonus.push(await question("2代静态 (输入1000表示10%): "));
                
                // 简化输入，使用默认值
                console.log("使用默认值: 3-8代5%, 9-15代3%, 16-20代2%");
                for(let i = 3; i <= 8; i++) staticBonus.push(500);
                for(let i = 9; i <= 15; i++) staticBonus.push(300);
                for(let i = 16; i <= 20; i++) staticBonus.push(200);
                
                const confirm4 = await question("确认使用这些设置? (y/n): ");
                if (confirm4 === 'y') {
                    const tx = await governance.setReferralBonus([deposit1, deposit2], staticBonus);
                    await tx.wait();
                    console.log("✅ 推荐奖励已更新!");
                }
                break;
                
            case '5':
                console.log("\n🎯 设置日收益封顶");
                console.log("当前默认: 质押量的10%");
                
                const cap = await question("封顶比例 (输入1000表示10%): ");
                
                console.log(`\n确认修改: 日收益封顶为质押量的${cap/100}%`);
                
                const confirm5 = await question("确认? (y/n): ");
                if (confirm5 === 'y') {
                    const tx = await governance.setDailyRewardCap(cap);
                    await tx.wait();
                    console.log("✅ 日收益封顶已更新!");
                }
                break;
                
            case '6':
                console.log("\n🔒 修改限购参数");
                console.log("当前默认: 前7天每天限购1000枚");
                
                const days = await question("限购天数: ");
                const dailyLimit = await question("每日限购量 (HCF): ");
                
                console.log(`\n确认修改: 前${days}天，每天限购${dailyLimit} HCF`);
                
                const confirm6 = await question("确认? (y/n): ");
                if (confirm6 === 'y') {
                    const tx = await governance.setPurchaseLimit(
                        days, 
                        ethers.utils.parseEther(dailyLimit)
                    );
                    await tx.wait();
                    console.log("✅ 限购参数已更新!");
                }
                break;
                
            case '7':
                console.log("\n🎖️ 调整节点参数");
                console.log("当前默认: 99个节点, 5000 BSDT申请费");
                
                const appFee = await question("申请费用 (BSDT): ");
                const actHCF = await question("激活需要HCF数量: ");
                const actLP = await question("激活需要LP数量: ");
                
                console.log("\n确认修改:");
                console.log(`申请费: ${appFee} BSDT`);
                console.log(`激活需要: ${actHCF} HCF + ${actLP} LP`);
                
                const confirm7 = await question("确认? (y/n): ");
                if (confirm7 === 'y') {
                    const tx = await governance.setNodeParams(
                        ethers.utils.parseEther(appFee),
                        ethers.utils.parseEther(actHCF),
                        ethers.utils.parseEther(actLP)
                    );
                    await tx.wait();
                    console.log("✅ 节点参数已更新!");
                }
                break;
                
            case '8':
                console.log("\n📊 当前所有参数:");
                console.log("=".repeat(50));
                
                // 获取质押等级
                const levels = await governance.getAllStakingLevels();
                console.log("\n质押等级:");
                for(let i = 0; i < 3; i++) {
                    console.log(`  L${i+1}: ${ethers.utils.formatEther(levels[i].minAmount)} HCF, ` +
                              `日化${levels[i].dailyRate.toNumber()/100}%`);
                }
                
                // 获取税率
                const buyTaxRate = await governance.buyTaxRate();
                const sellTaxRate = await governance.sellTaxRate();
                const transferTaxRate = await governance.transferTaxRate();
                console.log("\n税率:");
                console.log(`  买入: ${buyTaxRate/100}%`);
                console.log(`  卖出: ${sellTaxRate/100}%`);
                console.log(`  转账: ${transferTaxRate/100}%`);
                
                // 获取手续费
                const claimFeeBNB = await governance.claimFeeBNB();
                console.log("\n领取手续费:");
                console.log(`  ${claimFeeBNB/100}% BNB`);
                
                // 获取其他参数
                const dailyRewardCap = await governance.dailyRewardCap();
                const nodeApplicationFee = await governance.nodeApplicationFee();
                console.log("\n其他参数:");
                console.log(`  日收益封顶: ${dailyRewardCap/100}%`);
                console.log(`  节点申请费: ${ethers.utils.formatEther(nodeApplicationFee)} BSDT`);
                
                await question("\n按Enter继续...");
                break;
                
            case '9':
                const paused = await governance.paused();
                console.log(`\n⚠️ 当前状态: ${paused ? '已暂停' : '运行中'}`);
                
                const action = paused ? '恢复' : '暂停';
                const confirm9 = await question(`确认${action}系统? (y/n): `);
                
                if (confirm9 === 'y') {
                    const tx = await governance.setPaused(!paused);
                    await tx.wait();
                    console.log(`✅ 系统已${action}!`);
                }
                break;
                
            case '0':
                console.log("\n👋 退出管理面板");
                rl.close();
                process.exit(0);
                
            default:
                console.log("❌ 无效选择");
        }
    }
}

main().catch(error => {
    console.error(error);
    rl.close();
    process.exit(1);
});