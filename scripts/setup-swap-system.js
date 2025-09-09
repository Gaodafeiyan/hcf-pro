const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   设置SWAP系统"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.gray(`操作账户: ${deployer.address}\n`));

    // 合约地址
    const contracts = {
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        // PancakeSwap BSC主网地址
        pancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        usdt: "0x55d398326f99059fF775485246999027B3197955" // BSC USDT
    };

    console.log(chalk.cyan("【系统设计说明】\n"));
    console.log(chalk.white("1. BSDT/USDT锚定池（仅价格参考）"));
    console.log(chalk.gray("   • 1 BSDT + 1 USDT"));
    console.log(chalk.gray("   • 只有Owner可操作"));
    console.log(chalk.gray("   • 锁定不可交易\n"));
    
    console.log(chalk.white("2. HCF/BSDT交易池（真实交易）"));
    console.log(chalk.gray("   • 100万 HCF + 10万 BSDT"));
    console.log(chalk.gray("   • 正常交易池"));
    console.log(chalk.gray("   • 提供HCF价格\n"));
    
    console.log(chalk.white("3. 自动转账SWAP"));
    console.log(chalk.gray("   • 监控BSDT转账"));
    console.log(chalk.gray("   • 自动USDT兑换"));
    console.log(chalk.gray("   • 前端显示直接兑换\n"));

    // 步骤1: 创建BSDT/USDT锚定池（仅价格参考）
    console.log(chalk.yellow.bold("【步骤1】创建BSDT/USDT锚定池（价格参考）"));
    console.log(chalk.white("  需要:"));
    console.log(chalk.gray("  • 1 BSDT"));
    console.log(chalk.gray("  • 1 USDT"));
    console.log(chalk.gray("  • 创建后立即锁定\n"));
    
    console.log(chalk.cyan("  执行步骤:"));
    console.log(chalk.white("  1. 授权1 BSDT和1 USDT给Router"));
    console.log(chalk.white("  2. 调用addLiquidity创建池子"));
    console.log(chalk.white("  3. 将LP代币发送到黑洞地址锁定"));
    console.log(chalk.gray("     黑洞地址: 0x000000000000000000000000000000000000dEaD\n"));

    // 步骤2: 创建HCF/BSDT真实交易池
    console.log(chalk.yellow.bold("【步骤2】创建HCF/BSDT交易池"));
    console.log(chalk.white("  需要:"));
    console.log(chalk.gray("  • 1,000,000 HCF"));
    console.log(chalk.gray("  • 100,000 BSDT"));
    console.log(chalk.gray("  • 正常添加流动性\n"));

    // 步骤3: 部署监控合约
    console.log(chalk.yellow.bold("【步骤3】部署自动转账监控系统"));
    console.log(chalk.white("  监控合约功能:"));
    console.log(chalk.gray("  • 监听BSDT Transfer事件"));
    console.log(chalk.gray("  • 识别用户转账到项目方地址"));
    console.log(chalk.gray("  • 自动执行USDT转账"));
    console.log(chalk.gray("  • 记录所有兑换\n"));

    // 创建监控合约代码
    console.log(chalk.cyan("监控合约示例:\n"));
    console.log(chalk.gray(`
contract AutoSwapMonitor {
    address public bsdtToken;
    address public usdtToken;
    address public treasury; // 项目方钱包
    
    event SwapBSDTtoUSDT(address user, uint256 bsdtAmount, uint256 usdtAmount);
    event SwapUSDTtoBSDT(address user, uint256 usdtAmount, uint256 bsdtAmount);
    
    // 监听BSDT转入
    function onBSDTReceived(address from, uint256 amount) internal {
        uint256 usdtAmount = amount * 97 / 100; // 3%手续费
        IERC20(usdtToken).transfer(from, usdtAmount);
        emit SwapBSDTtoUSDT(from, amount, usdtAmount);
    }
    
    // 监听USDT转入
    function onUSDTReceived(address from, uint256 amount) internal {
        IERC20(bsdtToken).transfer(from, amount); // 1:1兑换
        emit SwapUSDTtoBSDT(from, amount, amount);
    }
}
    `));

    // 步骤4: 前端集成
    console.log(chalk.yellow.bold("【步骤4】前端SWAP界面"));
    console.log(chalk.white("  显示:"));
    console.log(chalk.gray("  • USDT ⇄ HCF 直接兑换"));
    console.log(chalk.gray("  • 隐藏BSDT中间过程"));
    console.log(chalk.gray("  • 实时价格 = HCF/BSDT * BSDT/USDT"));
    console.log(chalk.gray("  • 滑点设置\n"));

    // 检查当前余额
    console.log(chalk.yellow.bold("【当前状态检查】"));
    try {
        const bsdtABI = ["function balanceOf(address) view returns (uint256)"];
        const hcfABI = ["function balanceOf(address) view returns (uint256)"];
        
        const bsdt = new ethers.Contract(contracts.bsdtToken, bsdtABI, ethers.provider);
        const hcf = new ethers.Contract(contracts.hcfToken, hcfABI, ethers.provider);
        
        const bsdtBalance = await bsdt.balanceOf(deployer.address);
        const hcfBalance = await hcf.balanceOf(deployer.address);
        
        console.log(chalk.white(`  BSDT余额: ${ethers.utils.formatEther(bsdtBalance)}`));
        console.log(chalk.white(`  HCF余额: ${ethers.utils.formatEther(hcfBalance)}`));
        
        // 检查是否足够创建池子
        const requiredBSDT = ethers.utils.parseEther("100001"); // 100000 + 1
        const requiredHCF = ethers.utils.parseEther("1000000");
        
        if (bsdtBalance.gte(requiredBSDT)) {
            console.log(chalk.green("  ✅ BSDT余额充足"));
        } else {
            const needed = ethers.utils.formatEther(requiredBSDT.sub(bsdtBalance));
            console.log(chalk.yellow(`  ⚠️ 还需要 ${needed} BSDT`));
        }
        
        if (hcfBalance.gte(requiredHCF)) {
            console.log(chalk.green("  ✅ HCF余额充足"));
        } else {
            const needed = ethers.utils.formatEther(requiredHCF.sub(hcfBalance));
            console.log(chalk.yellow(`  ⚠️ 还需要 ${needed} HCF`));
        }
        
    } catch (e) {
        console.log(chalk.red(`  ❌ 检查失败: ${e.message}`));
    }

    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         实施计划"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("立即执行:"));
    console.log(chalk.white("  1. 创建BSDT/USDT锚定池（1:1）"));
    console.log(chalk.white("  2. 创建HCF/BSDT交易池（100万:10万）"));
    console.log(chalk.white("  3. 部署监控服务"));
    console.log(chalk.white("  4. 测试SWAP功能\n"));
    
    console.log(chalk.cyan("优势:"));
    console.log(chalk.green("  ✓ 用户体验好（直接USDT⇄HCF）"));
    console.log(chalk.green("  ✓ BSDT价格稳定（锚定USDT）"));
    console.log(chalk.green("  ✓ 避免USDT直接交易限制"));
    console.log(chalk.green("  ✓ 可在自己的SWAP和PancakeSwap同时运行"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });