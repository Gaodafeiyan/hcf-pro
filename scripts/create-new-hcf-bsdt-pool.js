const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🚀 创建新HCF/BSDT池子（价格0.1）"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log("执行账户:", signer.address);
    
    // 合约地址
    const addresses = {
        HCF: "0xc5c3f24A212838968759045d1654d3643016D585",  // 新HCF合约
        BSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530", // BSDT合约
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    };
    
    // 正确的初始流动性：10000 HCF + 1000 BSDT = 价格0.1
    const INITIAL_HCF = ethers.utils.parseEther("10000");
    const INITIAL_BSDT = ethers.utils.parseEther("1000");
    
    console.log(chalk.yellow("初始流动性配置:"));
    console.log(`HCF: ${ethers.utils.formatEther(INITIAL_HCF)} HCF`);
    console.log(`BSDT: ${ethers.utils.formatEther(INITIAL_BSDT)} BSDT`);
    console.log(chalk.green(`价格: 1 HCF = 0.1 BSDT ✅\n`));
    
    try {
        // 1. 连接合约
        console.log(chalk.cyan("1. 连接合约..."));
        const hcfToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.HCF);
        const bsdtToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", addresses.BSDT);
        
        const factory = await ethers.getContractAt([
            "function getPair(address tokenA, address tokenB) view returns (address pair)",
            "function createPair(address tokenA, address tokenB) returns (address pair)"
        ], addresses.PancakeFactory);
        
        const router = await ethers.getContractAt([
            "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)"
        ], addresses.PancakeRouter);
        
        // 2. 检查余额
        console.log(chalk.cyan("\n2. 检查代币余额..."));
        const hcfBalance = await hcfToken.balanceOf(signer.address);
        const bsdtBalance = await bsdtToken.balanceOf(signer.address);
        
        console.log(`HCF余额: ${ethers.utils.formatEther(hcfBalance)} HCF`);
        console.log(`BSDT余额: ${ethers.utils.formatEther(bsdtBalance)} BSDT`);
        
        if (hcfBalance.lt(INITIAL_HCF)) {
            console.log(chalk.red(`❌ HCF余额不足，需要 ${ethers.utils.formatEther(INITIAL_HCF)}`));
            return;
        }
        
        if (bsdtBalance.lt(INITIAL_BSDT)) {
            console.log(chalk.red(`❌ BSDT余额不足，需要 ${ethers.utils.formatEther(INITIAL_BSDT)}`));
            return;
        }
        
        // 3. 检查/创建池子
        console.log(chalk.cyan("\n3. 检查池子是否存在..."));
        let pairAddress = await factory.getPair(addresses.HCF, addresses.BSDT);
        
        if (pairAddress === "0x0000000000000000000000000000000000000000") {
            console.log(chalk.yellow("池子不存在，创建新池子..."));
            const createTx = await factory.createPair(addresses.HCF, addresses.BSDT);
            console.log("创建交易:", createTx.hash);
            await createTx.wait();
            
            pairAddress = await factory.getPair(addresses.HCF, addresses.BSDT);
            console.log(chalk.green("✅ 池子创建成功:", pairAddress));
        } else {
            console.log(chalk.green("池子已存在:", pairAddress));
        }
        
        // 4. 授权Router
        console.log(chalk.cyan("\n4. 授权代币给Router..."));
        
        const hcfAllowance = await hcfToken.allowance(signer.address, addresses.PancakeRouter);
        if (hcfAllowance.lt(INITIAL_HCF)) {
            console.log("授权HCF...");
            const approveTx1 = await hcfToken.approve(addresses.PancakeRouter, ethers.constants.MaxUint256);
            await approveTx1.wait();
            console.log(chalk.green("✅ HCF授权成功"));
        }
        
        const bsdtAllowance = await bsdtToken.allowance(signer.address, addresses.PancakeRouter);
        if (bsdtAllowance.lt(INITIAL_BSDT)) {
            console.log("授权BSDT...");
            const approveTx2 = await bsdtToken.approve(addresses.PancakeRouter, ethers.constants.MaxUint256);
            await approveTx2.wait();
            console.log(chalk.green("✅ BSDT授权成功"));
        }
        
        // 5. 添加流动性
        console.log(chalk.cyan("\n5. 添加流动性..."));
        const deadline = Math.floor(Date.now() / 1000) + 600;
        
        console.log("执行添加流动性交易...");
        const addLiquidityTx = await router.addLiquidity(
            addresses.HCF,
            addresses.BSDT,
            INITIAL_HCF,
            INITIAL_BSDT,
            0,
            0,
            signer.address,
            deadline
        );
        
        console.log("交易哈希:", addLiquidityTx.hash);
        const receipt = await addLiquidityTx.wait();
        
        console.log(chalk.green("\n✅ 流动性添加成功！"));
        console.log("Gas使用:", receipt.gasUsed.toString());
        
        // 6. 验证池子信息
        console.log(chalk.cyan("\n6. 验证池子信息..."));
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() view returns (address)",
            "function balanceOf(address) view returns (uint256)"
        ], pairAddress);
        
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const lpBalance = await pair.balanceOf(signer.address);
        
        let hcfReserve, bsdtReserve;
        if (token0.toLowerCase() === addresses.HCF.toLowerCase()) {
            hcfReserve = reserves[0];
            bsdtReserve = reserves[1];
        } else {
            bsdtReserve = reserves[0];
            hcfReserve = reserves[1];
        }
        
        const price = parseFloat(ethers.utils.formatEther(bsdtReserve)) / parseFloat(ethers.utils.formatEther(hcfReserve));
        
        console.log("\n池子信息:");
        console.log(`储备量: ${ethers.utils.formatEther(hcfReserve)} HCF / ${ethers.utils.formatEther(bsdtReserve)} BSDT`);
        console.log(chalk.green.bold(`价格: 1 HCF = ${price.toFixed(4)} BSDT`));
        console.log(`您的LP代币: ${ethers.utils.formatEther(lpBalance)} LP`);
        
        // 7. 保存池子信息
        const poolInfo = {
            network: "BSC Mainnet",
            timestamp: new Date().toISOString(),
            pool: {
                pairAddress: pairAddress,
                HCF: addresses.HCF,
                BSDT: addresses.BSDT,
                initialHCF: ethers.utils.formatEther(INITIAL_HCF),
                initialBSDT: ethers.utils.formatEther(INITIAL_BSDT),
                price: price.toFixed(4) + " BSDT per HCF"
            }
        };
        
        fs.writeFileSync('new-hcf-bsdt-pool.json', JSON.stringify(poolInfo, null, 2));
        console.log(chalk.green("\n池子信息已保存到 new-hcf-bsdt-pool.json"));
        
        // 8. 输出重要信息
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("         📋 重要信息"));
        console.log(chalk.blue.bold("========================================\n"));
        
        console.log(chalk.green("新HCF/BSDT池子地址:"), pairAddress);
        console.log(chalk.green("新HCF合约:"), addresses.HCF);
        console.log(chalk.green("价格: 1 HCF = 0.1 BSDT ✅"));
        
        console.log(chalk.yellow("\n下一步:"));
        console.log("更新质押合约使用新的HCF和池子地址:");
        console.log(`npx hardhat run scripts/update-staking-new-pool.js --network bsc`);
        
    } catch (error) {
        console.error(chalk.red("\n❌ 错误:"), error.message);
        if (error.reason) {
            console.error(chalk.red("原因:"), error.reason);
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