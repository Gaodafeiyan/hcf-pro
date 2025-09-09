const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔄 移除BSDT/USDT池子流动性"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 合约地址
    const PAIR_ADDRESS = "0x0B7a96A7be86769444eD4d83362883fE4CF47044";
    const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const SimpleBSDT_ADDRESS = "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6";
    const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    
    try {
        // 获取LP代币合约
        const pair = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function totalSupply() view returns (uint256)",
            "function approve(address, uint256) returns (bool)",
            "function getReserves() view returns (uint112, uint112, uint32)",
            "function token0() view returns (address)",
            "function token1() view returns (address)"
        ], PAIR_ADDRESS);
        
        // 检查LP余额
        console.log(chalk.yellow.bold("1. 检查LP代币余额："));
        const lpBalance = await pair.balanceOf(signer.address);
        const totalSupply = await pair.totalSupply();
        
        console.log("您的LP余额:", ethers.utils.formatEther(lpBalance));
        console.log("LP总供应量:", ethers.utils.formatEther(totalSupply));
        console.log("您的份额:", (lpBalance.mul(10000).div(totalSupply).toNumber() / 100), "%");
        
        if (lpBalance.eq(0)) {
            console.log(chalk.red("❌ 您没有LP代币"));
            return;
        }
        
        // 获取储备量
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        let bsdtReserve, usdtReserve;
        
        if (token0.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            usdtReserve = reserves[0];
            bsdtReserve = reserves[1];
        } else {
            bsdtReserve = reserves[0];
            usdtReserve = reserves[1];
        }
        
        console.log(chalk.yellow.bold("\n2. 池子当前状态："));
        console.log("BSDT储备:", ethers.utils.formatEther(bsdtReserve));
        console.log("USDT储备:", ethers.utils.formatUnits(usdtReserve, 18));
        
        // 计算将获得的代币
        const bsdtAmount = bsdtReserve.mul(lpBalance).div(totalSupply);
        const usdtAmount = usdtReserve.mul(lpBalance).div(totalSupply);
        
        console.log(chalk.yellow.bold("\n3. 移除流动性将获得："));
        console.log("BSDT:", ethers.utils.formatEther(bsdtAmount));
        console.log("USDT:", ethers.utils.formatUnits(usdtAmount, 18));
        
        // 授权LP代币给Router
        console.log(chalk.yellow.bold("\n4. 授权LP代币..."));
        const approveTx = await pair.approve(ROUTER_ADDRESS, lpBalance);
        await approveTx.wait();
        console.log(chalk.green("✅ LP代币已授权"));
        
        // 获取Router合约
        const router = await ethers.getContractAt([
            "function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)"
        ], ROUTER_ADDRESS);
        
        // 移除流动性
        console.log(chalk.yellow.bold("\n5. 移除流动性..."));
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        
        const tx = await router.removeLiquidity(
            SimpleBSDT_ADDRESS,
            USDT_ADDRESS,
            lpBalance,
            0, // 最小BSDT数量
            0, // 最小USDT数量
            signer.address,
            deadline
        );
        
        console.log(chalk.cyan("交易哈希:"), tx.hash);
        console.log(chalk.cyan("等待确认..."));
        await tx.wait();
        
        // 检查新余额
        const bsdt = await ethers.getContractAt("SimpleBSDT", SimpleBSDT_ADDRESS);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT_ADDRESS);
        
        const newBsdtBal = await bsdt.balanceOf(signer.address);
        const newUsdtBal = await usdt.balanceOf(signer.address);
        
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         ✅ 流动性移除成功"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("获得的代币："));
        console.log("BSDT:", ethers.utils.formatEther(bsdtAmount));
        console.log("USDT:", ethers.utils.formatUnits(usdtAmount, 18));
        
        console.log(chalk.green("\n当前余额："));
        console.log("BSDT:", ethers.utils.formatEther(newBsdtBal));
        console.log("USDT:", ethers.utils.formatUnits(newUsdtBal, 18));
        
        console.log(chalk.yellow.bold("\n下一步："));
        console.log("1. 部署BSDT Gateway合约（USDT→BSDT单向兑换）");
        console.log("2. 用户只能通过Gateway用USDT兑换BSDT（1:1固定）");
        console.log("3. 创建HCF/BSDT交易池");
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });