const { ethers } = require("hardhat");
const chalk = require("chalk");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   🔍 验证所有合约机制是否符合需求"));
    console.log(chalk.blue.bold("========================================\n"));

    const [signer] = await ethers.getSigners();
    
    // 早上部署的合约地址
    const contracts = {
        HCF_OLD: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        BSDT_OLD: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        Staking: "0x42C343c61a630d0107B752001caCd50EfbDD13f6",
        Referral: "0x78b07724647657f9CB8FD2f9b11a47b32E0eEc1D",
        NodeNFT: "0x99D7ded9645Abf6869614C4D7dcF34b0CBE03b55",
        BSDTGateway: "0xb4c9C3E8CA4365c04d47dD6113831449213731ca",
        HCFRouter: "0x266b661f952dF7f5FBC97b28E9828775d9F0e75d",
        BurnManager: "0x2C1E651183ea61f044A76CFb64c2A3b9b1e98735",
        MarketControl: "0xCB42212723DDbd78Ca795428360E4B93bA87ebA2",
        RankingRewards: "0xB83742944eE696318d9087076DC2D1bFF946E6Be",
        
        // 今天新部署的
        HCF_NEW: "0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192",
        ProtectedBSDT: "0x3932968a904Bf6773E8a13F1D2358331B9a1a530"
    };
    
    console.log(chalk.yellow.bold("=== 1. 检查HCF代币机制 ===\n"));
    console.log("需求：10亿总量，买2%卖5%转1%税费");
    
    // 检查新HCF（应该用这个）
    try {
        const hcf = await ethers.getContractAt([
            "function totalSupply() view returns (uint256)",
            "function buyTaxRate() view returns (uint256)",
            "function sellTaxRate() view returns (uint256)",
            "function transferTaxRate() view returns (uint256)",
            "function BURN_STOP_SUPPLY() view returns (uint256)",
            "function MIN_BALANCE() view returns (uint256)"
        ], contracts.HCF_NEW);
        
        const totalSupply = await hcf.totalSupply();
        const buyTax = await hcf.buyTaxRate();
        const sellTax = await hcf.sellTaxRate();
        const transferTax = await hcf.transferTaxRate();
        
        console.log("新HCF地址:", contracts.HCF_NEW);
        console.log("总供应量:", ethers.utils.formatEther(totalSupply), totalSupply.eq(ethers.utils.parseEther("1000000000")) ? "✅" : "❌");
        console.log("买入税:", buyTax.toNumber() / 100 + "%", buyTax.eq(200) ? "✅" : "❌");
        console.log("卖出税:", sellTax.toNumber() / 100 + "%", sellTax.eq(500) ? "✅" : "❌");
        console.log("转账税:", transferTax.toNumber() / 100 + "%", transferTax.eq(100) ? "✅" : "❌");
        
        try {
            const burnStop = await hcf.BURN_STOP_SUPPLY();
            const minBalance = await hcf.MIN_BALANCE();
            console.log("销毁停止:", ethers.utils.formatEther(burnStop), burnStop.eq(ethers.utils.parseEther("990000")) ? "✅" : "❌");
            console.log("最小余额:", ethers.utils.formatEther(minBalance), minBalance.eq(ethers.utils.parseEther("0.0001")) ? "✅" : "❌");
        } catch(e) {}
        
    } catch (e) {
        console.log(chalk.red("新HCF检查失败:", e.message));
    }
    
    console.log(chalk.yellow.bold("\n=== 2. 检查质押系统 ===\n"));
    console.log("需求：1000HCF方案(日产0.6%)，10000HCF方案(日产0.7%)");
    
    try {
        const staking = await ethers.getContractAt([
            "function stakingPlans(uint256) view returns (uint256,uint256,uint256,bool)",
            "function totalStaked() view returns (uint256)",
            "function stakingEnabled() view returns (bool)"
        ], contracts.Staking);
        
        console.log("质押合约:", contracts.Staking);
        
        try {
            const plan1 = await staking.stakingPlans(0);
            console.log("方案1:", plan1[0] ? "存在" : "不存在");
            
            const totalStaked = await staking.totalStaked();
            console.log("总质押量:", ethers.utils.formatEther(totalStaked));
            
            const enabled = await staking.stakingEnabled();
            console.log("质押状态:", enabled ? "✅ 已开启" : "❌ 未开启");
        } catch(e) {
            console.log("获取质押信息失败");
        }
        
    } catch (e) {
        console.log(chalk.red("质押合约检查失败"));
    }
    
    console.log(chalk.yellow.bold("\n=== 3. 检查推荐系统 ===\n"));
    console.log("需求：一代5%，二代3%");
    
    try {
        const referral = await ethers.getContractAt([
            "function referralRewardRate1() view returns (uint256)",
            "function referralRewardRate2() view returns (uint256)",
            "function referralEnabled() view returns (bool)"
        ], contracts.Referral);
        
        console.log("推荐合约:", contracts.Referral);
        
        try {
            const rate1 = await referral.referralRewardRate1();
            const rate2 = await referral.referralRewardRate2();
            console.log("一代奖励:", rate1.toNumber() / 100 + "%", rate1.eq(500) ? "✅" : "❌");
            console.log("二代奖励:", rate2.toNumber() / 100 + "%", rate2.eq(300) ? "✅" : "❌");
        } catch(e) {
            console.log("获取推荐费率失败");
        }
        
    } catch (e) {
        console.log(chalk.red("推荐合约检查失败"));
    }
    
    console.log(chalk.yellow.bold("\n=== 4. 检查节点NFT ===\n"));
    console.log("需求：99个节点，申请费5000BSDT");
    
    try {
        const nodeNFT = await ethers.getContractAt([
            "function MAX_NODES() view returns (uint256)",
            "function nodeFee() view returns (uint256)",
            "function totalNodes() view returns (uint256)"
        ], contracts.NodeNFT);
        
        console.log("节点NFT合约:", contracts.NodeNFT);
        
        try {
            const maxNodes = await nodeNFT.MAX_NODES();
            console.log("最大节点数:", maxNodes.toString(), maxNodes.eq(99) ? "✅" : "❌");
            
            const fee = await nodeNFT.nodeFee();
            console.log("申请费用:", ethers.utils.formatEther(fee), "BSDT", fee.eq(ethers.utils.parseEther("5000")) ? "✅" : "❌");
            
            const total = await nodeNFT.totalNodes();
            console.log("当前节点数:", total.toString());
        } catch(e) {
            console.log("获取节点信息失败");
        }
        
    } catch (e) {
        console.log(chalk.red("节点NFT检查失败"));
    }
    
    console.log(chalk.yellow.bold("\n=== 5. 检查Gateway兑换 ===\n"));
    console.log("需求：USDT→BSDT单向1:1");
    
    try {
        const gateway = await ethers.getContractAt([
            "function EXCHANGE_RATE() view returns (uint256)",
            "function totalExchanged() view returns (uint256)"
        ], contracts.BSDTGateway);
        
        console.log("Gateway合约:", contracts.BSDTGateway);
        
        try {
            const rate = await gateway.EXCHANGE_RATE();
            console.log("兑换比率:", ethers.utils.formatEther(rate), rate.eq(ethers.utils.parseEther("1")) ? "✅ 1:1" : "❌");
            
            const total = await gateway.totalExchanged();
            console.log("总兑换量:", ethers.utils.formatEther(total));
        } catch(e) {
            console.log("获取兑换信息失败");
        }
        
    } catch (e) {
        console.log(chalk.red("Gateway检查失败"));
    }
    
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("         📊 机制对比总结"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log(chalk.green("应该使用的合约："));
    console.log("• HCF:", contracts.HCF_NEW, "(新，10亿)");
    console.log("• BSDT:", contracts.ProtectedBSDT, "(新，带限制)");
    console.log("• 质押:", contracts.Staking);
    console.log("• 推荐:", contracts.Referral);
    console.log("• 节点:", contracts.NodeNFT);
    console.log("• Gateway:", contracts.BSDTGateway);
    
    console.log(chalk.yellow("\n注意："));
    console.log("• 需要检查这些合约是否互相连接");
    console.log("• 需要设置正确的合约地址引用");
    console.log("• 需要开发Swap前端界面");
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