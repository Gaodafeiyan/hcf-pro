const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💱 调整HCF价格到0.1 BSDT"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    const addresses = {
        HCF: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        Pool: "0x3f601C36e0BeB95592CD2A84981f1DC6DC2B45f1",
        Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    console.log(chalk.yellow("当前问题："));
    console.log("- 池子中：1000 HCF + 10000 BSDT");
    console.log("- 当前价格：1 HCF = 10 BSDT ❌");
    console.log("- 目标价格：1 HCF = 0.1 BSDT ✅");
    
    console.log(chalk.cyan("\n解决方案："));
    console.log("方案1：通过交易调整价格（推荐）");
    console.log("- 买入大量HCF，将价格压低到0.1");
    console.log("- 需要约9000 HCF的买单");
    
    console.log("\n方案2：移除流动性后重新添加");
    console.log("- 先移除现有流动性");
    console.log("- 重新添加：10000 HCF + 1000 BSDT");
    
    try {
        // 检查当前池子状态
        console.log(chalk.cyan("\n当前池子状态："));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
            "function token0() view returns (address)",
            "function balanceOf(address) view returns (uint256)",
            "function totalSupply() view returns (uint256)"
        ], addresses.Pool);
        
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        
        let hcfReserve, bsdtReserve;
        if (token0.toLowerCase() === addresses.BSDT.toLowerCase()) {
            bsdtReserve = reserves[0];
            hcfReserve = reserves[1];
        } else {
            hcfReserve = reserves[0];
            bsdtReserve = reserves[1];
        }
        
        console.log(`HCF储备: ${ethers.utils.formatEther(hcfReserve)}`);
        console.log(`BSDT储备: ${ethers.utils.formatEther(bsdtReserve)}`);
        console.log(`您的LP: ${ethers.utils.formatEther(lpBalance)} / ${ethers.utils.formatEther(totalSupply)}`);
        
        const currentPrice = bsdtReserve.mul(ethers.utils.parseEther("1")).div(hcfReserve);
        console.log(`当前价格: 1 HCF = ${ethers.utils.formatEther(currentPrice)} BSDT`);
        
        // 计算需要买入多少HCF来调整价格
        console.log(chalk.cyan("\n方案1计算（通过Swap调整）："));
        
        // 目标：让价格变成0.1
        // 需要的HCF储备 = BSDT储备 / 0.1 = BSDT储备 * 10
        const targetHcfReserve = bsdtReserve.mul(10);
        const hcfNeeded = targetHcfReserve.sub(hcfReserve);
        
        console.log(`需要增加HCF储备: ${ethers.utils.formatEther(hcfNeeded)} HCF`);
        
        // 使用x*y=k公式计算需要卖出的BSDT
        const k = hcfReserve.mul(bsdtReserve);
        const newBsdtReserve = k.div(targetHcfReserve);
        const bsdtToSell = bsdtReserve.sub(newBsdtReserve);
        
        console.log(`需要卖出BSDT: ${ethers.utils.formatEther(bsdtToSell)} BSDT`);
        console.log(`预计买入HCF: ${ethers.utils.formatEther(hcfNeeded)} HCF`);
        
        // 方案2：移除并重新添加
        console.log(chalk.cyan("\n方案2步骤（移除并重新添加）："));
        console.log("1. 移除所有流动性");
        console.log("   - 需要您的LP代币");
        console.log("2. 重新添加正确比例");
        console.log("   - 10000 HCF + 1000 BSDT");
        
        // 检查用户余额
        const hcfToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
        const bsdtToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        
        const hcfBalance = await hcfToken.balanceOf(signer.address);
        const bsdtBalance = await bsdtToken.balanceOf(signer.address);
        
        console.log(chalk.yellow("\n您的余额："));
        console.log(`HCF: ${ethers.utils.formatEther(hcfBalance)}`);
        console.log(`BSDT: ${ethers.utils.formatEther(bsdtBalance)}`);
        
        if (lpBalance.gt(0)) {
            console.log(chalk.green("\n✅ 您有LP代币，可以选择方案2"));
            console.log("运行: npx hardhat run scripts/remove-and-readd-liquidity.js --network bsc");
        }
        
        if (bsdtBalance.gte(bsdtToSell)) {
            console.log(chalk.green("\n✅ 您有足够BSDT，可以选择方案1"));
            console.log("运行: npx hardhat run scripts/swap-to-fix-price.js --network bsc");
        }
        
    } catch (error) {
        console.error(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 分析完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });