const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   💰 铸造剩余HCF到10亿总量"));
    console.log(chalk.blue.bold("========================================\n"));

    const [deployer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), deployer.address);
    
    const HCF_ADDRESS = "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3";
    
    try {
        // 获取HCF合约ABI（包含mint函数）
        const hcf = await ethers.getContractAt([
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function owner() view returns (address)",
            "function mint(address to, uint256 amount) external",
            "function TOTAL_SUPPLY() view returns (uint256)",
            "function mintRemaining() external",
            "function mintToAddress(address to, uint256 amount) external"
        ], HCF_ADDRESS);
        
        // 检查当前总供应量
        const currentSupply = await hcf.totalSupply();
        console.log(chalk.yellow("当前总供应量:"), ethers.utils.formatEther(currentSupply), "HCF");
        
        // 目标总量：10亿
        const targetSupply = ethers.utils.parseEther("1000000000"); // 10亿
        console.log(chalk.yellow("目标总供应量:"), ethers.utils.formatEther(targetSupply), "HCF");
        
        // 检查是否是owner
        const owner = await hcf.owner();
        console.log(chalk.cyan("合约Owner:"), owner);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log(chalk.red("❌ 错误：当前账户不是Owner"));
            console.log(chalk.yellow("需要使用Owner账户:"), owner);
            return;
        }
        
        console.log(chalk.green("✅ 当前账户是Owner"));
        
        // 计算需要铸造的数量
        if (currentSupply.gte(targetSupply)) {
            console.log(chalk.green("✅ HCF已达到10亿总量"));
            return;
        }
        
        const amountToMint = targetSupply.sub(currentSupply);
        console.log(chalk.yellow.bold("\n需要铸造:"), ethers.utils.formatEther(amountToMint), "HCF");
        
        // 尝试不同的mint方法
        console.log(chalk.cyan.bold("\n尝试铸造剩余HCF..."));
        
        try {
            // 方法1：尝试mintRemaining
            console.log(chalk.cyan("尝试调用mintRemaining()..."));
            const tx1 = await hcf.mintRemaining();
            console.log("交易哈希:", tx1.hash);
            await tx1.wait();
            console.log(chalk.green("✅ 铸造成功！"));
        } catch (e1) {
            console.log(chalk.yellow("mintRemaining()不可用:", e1.reason || e1.message));
            
            try {
                // 方法2：尝试mint
                console.log(chalk.cyan("\n尝试调用mint()..."));
                const tx2 = await hcf.mint(deployer.address, amountToMint);
                console.log("交易哈希:", tx2.hash);
                await tx2.wait();
                console.log(chalk.green("✅ 铸造成功！"));
            } catch (e2) {
                console.log(chalk.yellow("mint()不可用:", e2.reason || e2.message));
                
                try {
                    // 方法3：尝试mintToAddress
                    console.log(chalk.cyan("\n尝试调用mintToAddress()..."));
                    const tx3 = await hcf.mintToAddress(deployer.address, amountToMint);
                    console.log("交易哈希:", tx3.hash);
                    await tx3.wait();
                    console.log(chalk.green("✅ 铸造成功！"));
                } catch (e3) {
                    console.log(chalk.red("mintToAddress()也不可用:", e3.reason || e3.message));
                    console.log(chalk.red("\n❌ 所有铸造方法都失败了"));
                    console.log(chalk.yellow("可能原因："));
                    console.log("1. HCF合约可能没有mint函数");
                    console.log("2. 可能已经达到最大供应量限制");
                    console.log("3. 可能需要多签批准");
                    return;
                }
            }
        }
        
        // 验证新的总供应量
        const newSupply = await hcf.totalSupply();
        console.log(chalk.green.bold("\n铸造后总供应量:"), ethers.utils.formatEther(newSupply), "HCF");
        
        const newBalance = await hcf.balanceOf(deployer.address);
        console.log(chalk.green("您的新余额:"), ethers.utils.formatEther(newBalance), "HCF");
        
        if (newSupply.gte(targetSupply)) {
            console.log(chalk.green.bold("\n✅ 成功！HCF总量已达到10亿"));
            
            console.log(chalk.cyan.bold("\n现在可以创建HCF/BSDT池子："));
            console.log("- 100万 HCF + 10万 BSDT");
            console.log("- 初始价格: 1 HCF = 0.1 BSDT");
        }
        
    } catch (error) {
        console.log(chalk.red("\n❌ 错误:"), error.message);
        
        if (error.message.includes("mint")) {
            console.log(chalk.yellow("\nHCF合约可能没有mint功能"));
            console.log(chalk.yellow("可能需要重新部署HCF合约来达到10亿总量"));
        }
    }
}

main()
    .then(() => {
        console.log(chalk.green.bold("\n✅ 脚本执行完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });