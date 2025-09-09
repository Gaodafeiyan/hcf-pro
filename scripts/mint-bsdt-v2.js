const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🪙 铸造BSDT V2代币"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // BSDT V2地址
    const BSDT_V2 = "0x91d044C229c93c3C21A4bBEa0454867B8E06f46A";
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    
    try {
        const bsdtV2 = await ethers.getContractAt("BSDTTokenV2", BSDT_V2);
        const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDT);
        
        // 检查是否是owner
        const owner = await bsdtV2.owner();
        console.log(chalk.yellow("合约Owner:"), owner);
        
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log(chalk.red("❌ 你不是Owner，无法操作"));
            return;
        }
        
        console.log(chalk.green("✅ 确认是Owner"));
        
        // 检查当前余额
        console.log(chalk.yellow.bold("\n1. 检查当前余额："));
        const bsdtBalance = await bsdtV2.balanceOf(signer.address);
        const usdtBalance = await usdt.balanceOf(signer.address);
        const totalSupply = await bsdtV2.totalSupply();
        
        console.log("BSDT V2余额:", ethers.utils.formatEther(bsdtBalance));
        console.log("USDT余额:", ethers.utils.formatUnits(usdtBalance, 18));
        console.log("BSDT V2总供应量:", ethers.utils.formatEther(totalSupply));
        
        // 方案A：直接mint（如果合约有_mint功能给owner）
        console.log(chalk.yellow.bold("\n2. 方案A：尝试直接铸造..."));
        
        // 检查合约构造函数是否已经铸造了代币
        if (totalSupply.gt(0)) {
            console.log(chalk.green("✅ 合约已有总供应量:", ethers.utils.formatEther(totalSupply)));
            
            // 如果owner余额为0但总供应量不为0，可能代币在合约里
            if (bsdtBalance.eq(0)) {
                console.log(chalk.yellow("⚠️ 你的余额为0，但合约有总供应量"));
                console.log(chalk.cyan("代币可能在合约地址或其他地址"));
                
                // 检查合约自己的余额
                const contractBalance = await bsdtV2.balanceOf(BSDT_V2);
                console.log("合约自身余额:", ethers.utils.formatEther(contractBalance));
                
                // 如果需要，可以从合约提取
                if (contractBalance.gt(0)) {
                    console.log(chalk.cyan("\n尝试从合约提取代币..."));
                    try {
                        // 尝试紧急提取
                        const amount = ethers.utils.parseEther("100000001"); // 1亿零1个BSDT
                        const tx = await bsdtV2.emergencyWithdraw(BSDT_V2, amount);
                        await tx.wait();
                        console.log(chalk.green("✅ 已提取BSDT"));
                    } catch (error) {
                        console.log(chalk.yellow("⚠️ 无法提取:", error.message));
                    }
                }
            }
        } else {
            console.log(chalk.red("❌ 合约总供应量为0，需要通过mint函数铸造"));
        }
        
        // 方案B：通过mint函数（需要USDT）
        console.log(chalk.yellow.bold("\n3. 方案B：通过mint函数铸造..."));
        
        if (usdtBalance.gt(0)) {
            console.log(chalk.cyan("使用USDT铸造BSDT V2（1:1）"));
            
            // 先授权合约为交易所
            try {
                console.log("设置自己为授权交易所...");
                await bsdtV2.authorizeExchange(signer.address, true);
                console.log(chalk.green("✅ 已授权"));
            } catch (error) {
                console.log(chalk.yellow("授权失败:", error.message));
            }
            
            // 授权USDT给合约
            const mintAmount = ethers.utils.parseUnits("1", 18); // 1 USDT
            console.log("授权1 USDT给BSDT合约...");
            await usdt.approve(BSDT_V2, mintAmount);
            
            // 调用mint
            console.log("铸造1 BSDT...");
            try {
                const tx = await bsdtV2.mint(signer.address, mintAmount);
                await tx.wait();
                console.log(chalk.green("✅ 成功铸造1 BSDT"));
            } catch (error) {
                console.log(chalk.red("❌ 铸造失败:", error.message));
            }
        } else {
            console.log(chalk.yellow("⚠️ 没有USDT，无法通过mint铸造"));
        }
        
        // 方案C：简单转账（如果构造函数已经铸造了）
        console.log(chalk.yellow.bold("\n4. 最终检查："));
        
        const finalBalance = await bsdtV2.balanceOf(signer.address);
        const finalSupply = await bsdtV2.totalSupply();
        
        console.log("最终BSDT V2余额:", ethers.utils.formatEther(finalBalance));
        console.log("最终总供应量:", ethers.utils.formatEther(finalSupply));
        
        if (finalBalance.gt(0)) {
            console.log(chalk.green.bold("\n✅ 成功！你现在有BSDT V2了"));
            console.log(chalk.cyan("下一步：运行 npx hardhat run scripts/create-pools-with-bsdt-v2.js --network bsc"));
        } else {
            console.log(chalk.yellow.bold("\n⚠️ 仍然没有BSDT V2"));
            console.log(chalk.cyan("可能的解决方案："));
            console.log("1. 检查构造函数参数");
            console.log("2. 重新部署合约");
            console.log("3. 或者直接在PancakeSwap用现有代币创建池子");
        }
        
    } catch (error) {
        console.log(chalk.red("\n错误:"), error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });