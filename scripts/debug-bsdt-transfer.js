const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 调试BSDT转账问题"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    const contracts = {
        HCF: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3",
        BSDT: "0xf460422388C1205724EF699051aBe300215E490b",
        BSDTUSDTPair: "0x9495B0d829bA860eD2486f22d1204391A2607ad4",
        HCFBSDTPair: "0xE936EB1B86f6ab84cB45c3FbD36d39E21734AcA2"
    };

    try {
        const bsdt = await ethers.getContractAt("BSDTToken", contracts.BSDT);
        
        // 1. 检查账户状态
        console.log(chalk.yellow.bold("1. 检查账户状态："));
        const owner = await bsdt.owner();
        const multiSig = await bsdt.multiSigWallet();
        
        console.log("合约Owner:", owner);
        console.log("多签钱包:", multiSig);
        console.log("当前账户是Owner:", owner.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌");
        console.log("当前账户是多签:", multiSig.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌");
        
        // 2. 检查授权状态
        console.log(chalk.yellow.bold("\n2. 检查授权状态："));
        console.log("当前账户被授权:", await bsdt.authorizedExchanges(signer.address) ? "✅" : "❌");
        console.log("BSDT/USDT池子被授权:", await bsdt.authorizedExchanges(contracts.BSDTUSDTPair) ? "✅" : "❌");
        console.log("HCF/BSDT池子被授权:", await bsdt.authorizedExchanges(contracts.HCFBSDTPair) ? "✅" : "❌");
        
        // 3. 读取transfer函数限制
        console.log(chalk.yellow.bold("\n3. BSDT转账限制分析："));
        console.log(chalk.white("根据合约代码，transfer只允许："));
        console.log("- from是授权地址 或");
        console.log("- to是授权地址 或");
        console.log("- from是owner 或");
        console.log("- from是多签钱包");
        
        // 4. 尝试授权当前账户
        if (!await bsdt.authorizedExchanges(signer.address)) {
            console.log(chalk.cyan("\n4. 授权当前账户为可交易地址..."));
            try {
                const tx = await bsdt.authorizeExchange(signer.address, true);
                await tx.wait();
                console.log(chalk.green("✅ 当前账户已授权"));
            } catch (error) {
                console.log(chalk.red("授权失败:", error.message));
            }
        } else {
            console.log(chalk.green("\n4. 当前账户已经被授权"));
        }
        
        // 5. 测试转账
        console.log(chalk.yellow.bold("\n5. 测试BSDT转账："));
        
        // 测试小额转账到池子
        const testAmount = ethers.utils.parseEther("0.001");
        console.log(chalk.cyan("尝试转账0.001 BSDT到BSDT/USDT池子..."));
        
        try {
            const tx = await bsdt.transfer(contracts.BSDTUSDTPair, testAmount);
            await tx.wait();
            console.log(chalk.green("✅ 转账成功！"));
        } catch (error) {
            console.log(chalk.red("❌ 转账失败"));
            console.log(chalk.yellow("错误信息:", error.reason || error.message));
            
            // 分析失败原因
            console.log(chalk.cyan.bold("\n诊断结果："));
            console.log(chalk.white("BSDT合约的transfer限制了普通用户转账"));
            console.log(chalk.white("需要满足以下条件之一："));
            console.log(chalk.white("1. 发送方是授权交易所"));
            console.log(chalk.white("2. 接收方是授权交易所"));
            console.log(chalk.white("3. 发送方是owner"));
            console.log(chalk.white("4. 发送方是多签钱包"));
            
            const isFromAuthorized = await bsdt.authorizedExchanges(signer.address);
            const isToAuthorized = await bsdt.authorizedExchanges(contracts.BSDTUSDTPair);
            
            console.log(chalk.yellow("\n当前状态："));
            console.log(`发送方(${signer.address.slice(0,6)}...)授权:`, isFromAuthorized ? "✅" : "❌");
            console.log(`接收方(池子)授权:`, isToAuthorized ? "✅" : "❌");
            
            if (!isFromAuthorized && !isToAuthorized) {
                console.log(chalk.red("\n问题：都没有授权，无法转账"));
            }
        }
        
        // 6. 显示HCF信息
        console.log(chalk.yellow.bold("\n6. HCF代币信息："));
        const hcf = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", contracts.HCF);
        const hcfBalance = await hcf.balanceOf(signer.address);
        const hcfTotalSupply = await hcf.totalSupply();
        
        console.log("HCF余额:", ethers.utils.formatEther(hcfBalance), "HCF");
        console.log("HCF总供应量:", ethers.utils.formatEther(hcfTotalSupply), "HCF");
        console.log(chalk.white("\n说明："));
        console.log("- 1900万HCF是正确的（部署时mint给了owner）");
        console.log("- 总供应量应该是100亿（有额外的9.9亿在质押合约）");
        
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