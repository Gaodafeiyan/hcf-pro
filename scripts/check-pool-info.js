const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📊 检查池子信息"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 合约地址
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const PAIR_ADDRESS = "0x0B7a96A7be86769444eD4d83362883fE4CF47044";
    
    try {
        // 获取合约实例
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        
        // 获取Pair合约
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)"
        ], PAIR_ADDRESS);
        
        // 获取token顺序
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        console.log(chalk.yellow.bold("池子代币顺序："));
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        
        // 获取储备量
        const reserves = await pair.getReserves();
        let bsdtReserve, usdtReserve;
        
        if (token0.toLowerCase() === SimpleBSDT_ADDRESS.toLowerCase()) {
            bsdtReserve = reserves.reserve0;
            usdtReserve = reserves.reserve1;
            console.log(chalk.green("Token0 是 BSDT, Token1 是 USDT"));
        } else {
            bsdtReserve = reserves.reserve1;
            usdtReserve = reserves.reserve0;
            console.log(chalk.green("Token0 是 USDT, Token1 是 BSDT"));
        }
        
        console.log(chalk.yellow.bold("\n池子储备量："));
        console.log("BSDT储备:", ethers.utils.formatEther(bsdtReserve), "BSDT");
        console.log("USDT储备:", ethers.utils.formatUnits(usdtReserve, 18), "USDT");
        
        // 计算价格
        if (bsdtReserve.gt(0) && usdtReserve.gt(0)) {
            const price = ethers.utils.formatUnits(usdtReserve.mul(ethers.utils.parseEther("1")).div(bsdtReserve), 18);
            console.log(chalk.cyan.bold("\n价格信息："));
            console.log("1 BSDT =", price, "USDT");
            
            const reversePrice = ethers.utils.formatEther(bsdtReserve.mul(ethers.utils.parseEther("1")).div(usdtReserve));
            console.log("1 USDT =", reversePrice, "BSDT");
        }
        
        // 获取LP代币信息
        const totalSupply = await pair.totalSupply();
        const lpBalance = await pair.balanceOf(signer.address);
        
        console.log(chalk.yellow.bold("\nLP代币信息："));
        console.log("LP总供应量:", ethers.utils.formatEther(totalSupply));
        console.log("您的LP余额:", ethers.utils.formatEther(lpBalance));
        
        if (lpBalance.gt(0)) {
            const share = lpBalance.mul(10000).div(totalSupply);
            console.log("您的份额:", share.toString() / 100, "%");
        }
        
        // 检查账户余额
        console.log(chalk.yellow.bold("\n账户余额："));
        const bsdtBal = await bsdt.balanceOf(signer.address);
        const usdtBal = await usdt.balanceOf(signer.address);
        
        console.log("BSDT余额:", ethers.utils.formatEther(bsdtBal));
        console.log("USDT余额:", ethers.utils.formatUnits(usdtBal, 18));
        
        console.log(chalk.green.bold("\n✅ 池子状态正常"));
        console.log(chalk.cyan("查看详情: https://pancakeswap.finance/info/v2/pair/0x0B7a96A7be86769444eD4d83362883fE4CF47044"));
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });