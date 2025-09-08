const { ethers } = require("hardhat");
const chalk = require("chalk");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 已部署的合约地址
const CONTRACTS = {
    hcfToken: "",
    staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
    referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
    nodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
    exchange: "0x9D96e20056135ba76F23b64eCA42EB7eE16035B9"
};

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   HCF-RWA 合约参数调整工具"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.gray(`操作账户: ${signer.address}\n`));

    // 获取HCF Token地址
    await getHCFTokenAddress();

    while (true) {
        console.log(chalk.cyan("\n请选择要调整的合约:"));
        console.log(chalk.white("  1. HCF Token - 调整税率"));
        console.log(chalk.white("  2. 质押合约 - 调整收益率"));
        console.log(chalk.white("  3. 推荐合约 - 调整奖励"));
        console.log(chalk.white("  4. 节点NFT - 调整费用"));
        console.log(chalk.white("  5. 兑换合约 - 调整参数"));
        console.log(chalk.white("  6. 查看所有当前配置"));
        console.log(chalk.white("  0. 退出"));
        
        const choice = await question(chalk.yellow("\n选择 (0-6): "));
        
        switch(choice) {
            case '1':
                await adjustTokenParams();
                break;
            case '2':
                await adjustStakingParams();
                break;
            case '3':
                await adjustReferralParams();
                break;
            case '4':
                await adjustNodeParams();
                break;
            case '5':
                await adjustExchangeParams();
                break;
            case '6':
                await viewAllConfigs();
                break;
            case '0':
                console.log(chalk.green("\n感谢使用！"));
                rl.close();
                return;
            default:
                console.log(chalk.red("无效选择"));
        }
    }
}

async function getHCFTokenAddress() {
    if (!CONTRACTS.hcfToken) {
        const stakingABI = ["function hcfToken() view returns (address)"];
        const staking = new ethers.Contract(CONTRACTS.staking, stakingABI, ethers.provider);
        try {
            CONTRACTS.hcfToken = await staking.hcfToken();
            console.log(chalk.green(`✅ 获取HCF Token: ${CONTRACTS.hcfToken}`));
        } catch (e) {
            console.log(chalk.red("❌ 无法获取HCF Token地址"));
        }
    }
}

async function adjustTokenParams() {
    console.log(chalk.cyan("\n=== 调整HCF Token税率 ==="));
    
    const tokenABI = [
        "function buyTaxRate() view returns (uint256)",
        "function sellTaxRate() view returns (uint256)",
        "function transferTaxRate() view returns (uint256)",
        "function setTaxRates(uint256,uint256,uint256)",
        "function owner() view returns (address)",
        "function multiSigWallet() view returns (address)"
    ];
    
    const [signer] = await ethers.getSigners();
    const token = new ethers.Contract(CONTRACTS.hcfToken, tokenABI, signer);
    
    try {
        // 显示当前税率
        const buyTax = await token.buyTaxRate();
        const sellTax = await token.sellTaxRate();
        const transferTax = await token.transferTaxRate();
        
        console.log(chalk.white("\n当前税率:"));
        console.log(chalk.white(`  买入税: ${buyTax / 100}%`));
        console.log(chalk.white(`  卖出税: ${sellTax / 100}%`));
        console.log(chalk.white(`  转账税: ${transferTax / 100}%`));
        
        // 检查权限
        const owner = await token.owner();
        const multiSig = await token.multiSigWallet();
        
        if (signer.address.toLowerCase() !== owner.toLowerCase() && 
            signer.address.toLowerCase() !== multiSig.toLowerCase()) {
            console.log(chalk.red("\n❌ 您没有权限修改税率"));
            console.log(chalk.yellow(`  需要Owner: ${owner}`));
            console.log(chalk.yellow(`  或MultiSig: ${multiSig}`));
            return;
        }
        
        const adjust = await question(chalk.yellow("\n是否要调整税率? (y/n): "));
        if (adjust.toLowerCase() !== 'y') return;
        
        const newBuyTax = await question(chalk.cyan("新的买入税 (%, 输入2表示2%): "));
        const newSellTax = await question(chalk.cyan("新的卖出税 (%, 输入5表示5%): "));
        const newTransferTax = await question(chalk.cyan("新的转账税 (%, 输入1表示1%): "));
        
        // 转换为基点
        const buyBP = parseInt(newBuyTax * 100);
        const sellBP = parseInt(newSellTax * 100);
        const transferBP = parseInt(newTransferTax * 100);
        
        console.log(chalk.yellow("\n准备设置:"));
        console.log(chalk.white(`  买入税: ${buyBP / 100}%`));
        console.log(chalk.white(`  卖出税: ${sellBP / 100}%`));
        console.log(chalk.white(`  转账税: ${transferBP / 100}%`));
        
        const confirm = await question(chalk.red("\n确认执行? (yes/no): "));
        if (confirm !== 'yes') {
            console.log(chalk.yellow("已取消"));
            return;
        }
        
        console.log(chalk.yellow("\n发送交易..."));
        const tx = await token.setTaxRates(buyBP, sellBP, transferBP);
        console.log(chalk.gray(`交易哈希: ${tx.hash}`));
        
        await tx.wait();
        console.log(chalk.green("✅ 税率已更新!"));
        
    } catch (error) {
        console.log(chalk.red(`❌ 操作失败: ${error.message}`));
    }
}

async function adjustStakingParams() {
    console.log(chalk.cyan("\n=== 调整质押合约参数 ==="));
    
    const stakingABI = [
        "function levels(uint256) view returns (uint256 minStake, uint256 baseRate, uint256 lpRate, uint256 compoundUnit)",
        "function setLevelConfig(uint256,uint256,uint256,uint256,uint256)",
        "function owner() view returns (address)",
        "function multiSigWallet() view returns (address)"
    ];
    
    const [signer] = await ethers.getSigners();
    const staking = new ethers.Contract(CONTRACTS.staking, stakingABI, signer);
    
    try {
        console.log(chalk.white("\n当前等级配置:"));
        for (let i = 0; i < 5; i++) {
            const level = await staking.levels(i);
            console.log(chalk.white(`\n等级${i + 1}:`));
            console.log(chalk.white(`  最小质押: ${ethers.utils.formatEther(level.minStake)} HCF`));
            console.log(chalk.white(`  基础日化: ${level.baseRate / 100}%`));
            console.log(chalk.white(`  LP日化: ${level.lpRate / 100}%`));
        }
        
        const levelToAdjust = await question(chalk.yellow("\n要调整哪个等级? (1-5): "));
        const levelIndex = parseInt(levelToAdjust);
        
        if (levelIndex < 1 || levelIndex > 5) {
            console.log(chalk.red("无效的等级"));
            return;
        }
        
        console.log(chalk.cyan(`\n调整等级${levelIndex}:`));
        const minStake = await question(chalk.cyan("最小质押量 (HCF): "));
        const baseRate = await question(chalk.cyan("基础日化 (%, 输入0.6表示0.6%): "));
        const lpRate = await question(chalk.cyan("LP日化 (%, 输入1.2表示1.2%): "));
        const compoundUnit = await question(chalk.cyan("复投单位 (HCF): "));
        
        const minStakeWei = ethers.utils.parseEther(minStake);
        const baseRateBP = parseInt(baseRate * 100);
        const lpRateBP = parseInt(lpRate * 100);
        const compoundUnitWei = ethers.utils.parseEther(compoundUnit);
        
        console.log(chalk.yellow("\n准备设置:"));
        console.log(chalk.white(`  最小质押: ${minStake} HCF`));
        console.log(chalk.white(`  基础日化: ${baseRateBP / 100}%`));
        console.log(chalk.white(`  LP日化: ${lpRateBP / 100}%`));
        console.log(chalk.white(`  复投单位: ${compoundUnit} HCF`));
        
        const confirm = await question(chalk.red("\n确认执行? (yes/no): "));
        if (confirm !== 'yes') {
            console.log(chalk.yellow("已取消"));
            return;
        }
        
        console.log(chalk.yellow("\n发送交易..."));
        const tx = await staking.setLevelConfig(
            levelIndex,
            minStakeWei,
            baseRateBP,
            lpRateBP,
            compoundUnitWei
        );
        console.log(chalk.gray(`交易哈希: ${tx.hash}`));
        
        await tx.wait();
        console.log(chalk.green("✅ 等级配置已更新!"));
        
    } catch (error) {
        console.log(chalk.red(`❌ 操作失败: ${error.message}`));
    }
}

async function adjustReferralParams() {
    console.log(chalk.cyan("\n=== 调整推荐合约参数 ==="));
    
    const referralABI = [
        "function generationRates(uint256) view returns (uint256)",
        "function setGenerationRates(uint256[20])",
        "function owner() view returns (address)"
    ];
    
    const [signer] = await ethers.getSigners();
    const referral = new ethers.Contract(CONTRACTS.referral, referralABI, signer);
    
    try {
        console.log(chalk.white("\n当前代数奖励:"));
        const currentRates = [];
        for (let i = 0; i < 20; i++) {
            const rate = await referral.generationRates(i);
            currentRates.push(rate);
            console.log(chalk.white(`  ${i + 1}代: ${rate}%`));
        }
        
        const adjust = await question(chalk.yellow("\n是否要调整代数奖励? (y/n): "));
        if (adjust.toLowerCase() !== 'y') return;
        
        console.log(chalk.cyan("\n输入新的代数奖励 (按照需求应该是):"));
        console.log(chalk.gray("  1代: 20%, 2代: 10%"));
        console.log(chalk.gray("  3-8代: 5%"));
        console.log(chalk.gray("  9-15代: 3%"));
        console.log(chalk.gray("  16-20代: 2%"));
        
        const useDefault = await question(chalk.yellow("\n使用默认配置? (y/n): "));
        
        let newRates = [];
        if (useDefault.toLowerCase() === 'y') {
            newRates = [20, 10, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2];
        } else {
            for (let i = 0; i < 20; i++) {
                const rate = await question(chalk.cyan(`${i + 1}代奖励 (%): `));
                newRates.push(parseInt(rate));
            }
        }
        
        console.log(chalk.yellow("\n准备设置:"));
        for (let i = 0; i < 20; i++) {
            console.log(chalk.white(`  ${i + 1}代: ${newRates[i]}%`));
        }
        
        const confirm = await question(chalk.red("\n确认执行? (yes/no): "));
        if (confirm !== 'yes') {
            console.log(chalk.yellow("已取消"));
            return;
        }
        
        console.log(chalk.yellow("\n发送交易..."));
        const tx = await referral.setGenerationRates(newRates);
        console.log(chalk.gray(`交易哈希: ${tx.hash}`));
        
        await tx.wait();
        console.log(chalk.green("✅ 代数奖励已更新!"));
        
    } catch (error) {
        console.log(chalk.red(`❌ 操作失败: ${error.message}`));
    }
}

async function adjustNodeParams() {
    console.log(chalk.cyan("\n=== 调整节点NFT参数 ==="));
    
    const nodeABI = [
        "function APPLICATION_FEE_BSDT() view returns (uint256)",
        "function setApplicationFees(uint256,uint256)",
        "function owner() view returns (address)"
    ];
    
    const [signer] = await ethers.getSigners();
    const node = new ethers.Contract(CONTRACTS.nodeNFT, nodeABI, signer);
    
    try {
        const feeBSDT = await node.APPLICATION_FEE_BSDT();
        console.log(chalk.white(`\n当前申请费(BSDT): ${ethers.utils.formatEther(feeBSDT)} BSDT`));
        
        const adjust = await question(chalk.yellow("\n是否要调整申请费? (y/n): "));
        if (adjust.toLowerCase() !== 'y') return;
        
        const newFeeBSDT = await question(chalk.cyan("新的BSDT申请费 (输入5000): "));
        const newFeeHCF = await question(chalk.cyan("新的HCF申请费 (输入5000): "));
        
        const feeBSDTWei = ethers.utils.parseEther(newFeeBSDT);
        const feeHCFWei = ethers.utils.parseEther(newFeeHCF);
        
        console.log(chalk.yellow("\n准备设置:"));
        console.log(chalk.white(`  BSDT申请费: ${newFeeBSDT} BSDT`));
        console.log(chalk.white(`  HCF申请费: ${newFeeHCF} HCF`));
        
        const confirm = await question(chalk.red("\n确认执行? (yes/no): "));
        if (confirm !== 'yes') {
            console.log(chalk.yellow("已取消"));
            return;
        }
        
        console.log(chalk.yellow("\n发送交易..."));
        const tx = await node.setApplicationFees(feeHCFWei, feeBSDTWei);
        console.log(chalk.gray(`交易哈希: ${tx.hash}`));
        
        await tx.wait();
        console.log(chalk.green("✅ 节点申请费已更新!"));
        
    } catch (error) {
        console.log(chalk.red(`❌ 操作失败: ${error.message}`));
    }
}

async function adjustExchangeParams() {
    console.log(chalk.cyan("\n=== 调整兑换合约参数 ==="));
    
    const exchangeABI = [
        "function exchangeRate() view returns (uint256)",
        "function setExchangeRate(uint256)",
        "function setPause(bool)",
        "function owner() view returns (address)"
    ];
    
    const [signer] = await ethers.getSigners();
    const exchange = new ethers.Contract(CONTRACTS.exchange, exchangeABI, signer);
    
    try {
        const rate = await exchange.exchangeRate();
        console.log(chalk.white(`\n当前兑换率: 1 USDT = ${rate} BSDT`));
        
        const choice = await question(chalk.yellow("\n选择操作:\n1. 调整兑换率\n2. 暂停/恢复兑换\n选择: "));
        
        if (choice === '1') {
            const newRate = await question(chalk.cyan("新的兑换率 (输入1表示1:1): "));
            
            console.log(chalk.yellow(`\n准备设置兑换率: 1 USDT = ${newRate} BSDT`));
            
            const confirm = await question(chalk.red("\n确认执行? (yes/no): "));
            if (confirm !== 'yes') {
                console.log(chalk.yellow("已取消"));
                return;
            }
            
            console.log(chalk.yellow("\n发送交易..."));
            const tx = await exchange.setExchangeRate(newRate);
            console.log(chalk.gray(`交易哈希: ${tx.hash}`));
            
            await tx.wait();
            console.log(chalk.green("✅ 兑换率已更新!"));
            
        } else if (choice === '2') {
            const pause = await question(chalk.cyan("暂停兑换? (y/n): "));
            const pauseFlag = pause.toLowerCase() === 'y';
            
            console.log(chalk.yellow(`\n准备${pauseFlag ? '暂停' : '恢复'}兑换`));
            
            const confirm = await question(chalk.red("\n确认执行? (yes/no): "));
            if (confirm !== 'yes') {
                console.log(chalk.yellow("已取消"));
                return;
            }
            
            console.log(chalk.yellow("\n发送交易..."));
            const tx = await exchange.setPause(pauseFlag);
            console.log(chalk.gray(`交易哈希: ${tx.hash}`));
            
            await tx.wait();
            console.log(chalk.green(`✅ 兑换已${pauseFlag ? '暂停' : '恢复'}!`));
        }
        
    } catch (error) {
        console.log(chalk.red(`❌ 操作失败: ${error.message}`));
    }
}

async function viewAllConfigs() {
    console.log(chalk.cyan("\n=== 查看所有当前配置 ==="));
    
    // 这里调用验证脚本的功能
    const { exec } = require('child_process');
    exec('npx hardhat run scripts/verify-deployed-contracts.js --network bsc', (error, stdout, stderr) => {
        if (error) {
            console.log(chalk.red(`执行错误: ${error.message}`));
            return;
        }
        if (stderr) {
            console.log(chalk.yellow(`警告: ${stderr}`));
        }
        console.log(stdout);
    });
}

main()
    .then(() => {
        rl.close();
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("\n❌ 脚本执行失败:"), error);
        rl.close();
        process.exit(1);
    });