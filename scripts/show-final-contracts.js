const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📋 最终部署的所有合约地址"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    console.log(chalk.cyan("当前账户:"), signer.address);
    
    // 所有最终合约
    const contracts = {
        // BSDT系统
        ProtectedBSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        SimpleBSDT: "0x9AAE1C39CBe3f99c3ff96aAC7Bb33B6d42F1f4E6", 
        BSDTGateway: "0x6b5462814DC6ffB2a66D5E45Ab5b5d11Dcc1a033",
        
        // HCF系统
        HCF_NEW: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192", // 10亿总量
        HCF_OLD: "0x2877E99F01c739C38c0d0E204761518Ed6ff11c3", // 1900万总量
        
        // 池子
        ProtectedBSDT_USDT_Pool: "0xe0e4ca5DD8FB4559a467636ca8e482123b810Db8",
        
        // 外部合约
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        PancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    };
    
    console.log(chalk.green.bold("=== 最终使用的合约 ===\n"));
    
    console.log(chalk.yellow("ProtectedBSDT (带交易限制):"));
    console.log("地址:", contracts.ProtectedBSDT);
    console.log("功能: 1000亿供应量，限制DEX交易，保护1:1价格");
    
    console.log(chalk.yellow("\nHCF (新版10亿):"));
    console.log("地址:", contracts.HCF_NEW);
    console.log("功能: 10亿总供应量，完整税费机制");
    
    console.log(chalk.yellow("\nProtectedBSDT/USDT池子:"));
    console.log("地址:", contracts.ProtectedBSDT_USDT_Pool);
    console.log("比例: 1:1锚定");
    console.log("状态: 交易限制已开启，只有白名单可交易");
    
    // 检查池子
    try {
        const factory = await ethers.getContractAt(
            ["function getPair(address,address) view returns (address)"],
            contracts.PancakeFactory
        );
        
        const verifyPair = await factory.getPair(contracts.ProtectedBSDT, contracts.USDT);
        console.log(chalk.green("\n✅ 池子验证:"), verifyPair);
        
        if (verifyPair.toLowerCase() === contracts.ProtectedBSDT_USDT_Pool.toLowerCase()) {
            console.log(chalk.green("池子地址正确！"));
        }
        
        // 获取池子信息
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112,uint112,uint32)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function totalSupply() view returns (uint256)"
        ], contracts.ProtectedBSDT_USDT_Pool);
        
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const totalSupply = await pair.totalSupply();
        
        let bsdtReserve, usdtReserve;
        if (token0.toLowerCase() === contracts.USDT.toLowerCase()) {
            usdtReserve = reserves[0];
            bsdtReserve = reserves[1];
        } else {
            bsdtReserve = reserves[0];
            usdtReserve = reserves[1];
        }
        
        console.log(chalk.cyan("\n池子储备量:"));
        console.log("ProtectedBSDT:", ethers.utils.formatEther(bsdtReserve));
        console.log("USDT:", ethers.utils.formatUnits(usdtReserve, 18));
        console.log("LP总量:", ethers.utils.formatEther(totalSupply));
        
    } catch (e) {
        console.log(chalk.red("获取池子信息失败:", e.message));
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         📊 BSCScan链接"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.cyan("查看合约:"));
    console.log("ProtectedBSDT: https://bscscan.com/address/" + contracts.ProtectedBSDT);
    console.log("HCF: https://bscscan.com/address/" + contracts.HCF_NEW);
    console.log("池子: https://bscscan.com/address/" + contracts.ProtectedBSDT_USDT_Pool);
    
    console.log(chalk.yellow("\n查看池子交易对:"));
    console.log("https://bscscan.com/address/" + contracts.ProtectedBSDT_USDT_Pool + "#readContract");
    console.log("点击 token0 和 token1 查看交易对");
    
    console.log(chalk.green.bold("\n下一步:"));
    console.log("1. HCF/ProtectedBSDT池子让股东自己创建");
    console.log("2. 设置后端监控USDT转账");
    console.log("3. 用户通过后端获取BSDT (1:1)");
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