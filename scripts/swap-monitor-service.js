const { ethers } = require("hardhat");
const chalk = require("chalk");

// 监控服务配置
const CONFIG = {
    // 合约地址
    contracts: {
        bsdtToken: "0x6f5DaF12BAe217aE1420310D589719eccC0Cf908",
        hcfToken: "0x24cA14001674fD9250c9E343e30Bc788bC3a64cC",
        usdt: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
        pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        pancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
    },
    
    // 项目方钱包地址（接收BSDT和发送USDT的地址）
    projectWallet: "", // 需要设置
    
    // 监控间隔（毫秒）
    monitorInterval: 3000, // 3秒检查一次
    
    // 手续费设置
    swapFee: 300, // 3% = 300/10000
    
    // 最小兑换金额
    minSwapAmount: ethers.utils.parseEther("10") // 最小10 USDT/BSDT
};

class SwapMonitorService {
    constructor() {
        this.provider = ethers.provider;
        this.signer = null;
        this.contracts = {};
        this.isRunning = false;
        this.processedTxs = new Set(); // 已处理的交易
    }

    async initialize() {
        console.log(chalk.blue.bold("\n========================================"));
        console.log(chalk.blue.bold("   初始化SWAP监控服务"));
        console.log(chalk.blue.bold("========================================\n"));

        // 获取签名者
        [this.signer] = await ethers.getSigners();
        console.log(chalk.gray(`监控账户: ${this.signer.address}`));

        // 初始化合约
        await this.initContracts();
        
        // 检查余额
        await this.checkBalances();
        
        console.log(chalk.green("\n✅ 监控服务初始化完成"));
    }

    async initContracts() {
        // BSDT合约
        const bsdtABI = [
            "event Transfer(address indexed from, address indexed to, uint256 value)",
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)"
        ];
        this.contracts.bsdt = new ethers.Contract(
            CONFIG.contracts.bsdtToken,
            bsdtABI,
            this.signer
        );

        // USDT合约
        const usdtABI = [
            "event Transfer(address indexed from, address indexed to, uint256 value)",
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)"
        ];
        this.contracts.usdt = new ethers.Contract(
            CONFIG.contracts.usdt,
            usdtABI,
            this.signer
        );

        // HCF合约
        const hcfABI = [
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)"
        ];
        this.contracts.hcf = new ethers.Contract(
            CONFIG.contracts.hcfToken,
            hcfABI,
            this.signer
        );

        console.log(chalk.cyan("已加载合约接口"));
    }

    async checkBalances() {
        console.log(chalk.yellow("\n检查账户余额:"));
        
        const bsdtBalance = await this.contracts.bsdt.balanceOf(this.signer.address);
        const usdtBalance = await this.contracts.usdt.balanceOf(this.signer.address);
        const hcfBalance = await this.contracts.hcf.balanceOf(this.signer.address);
        const bnbBalance = await this.signer.getBalance();

        console.log(chalk.white(`  BSDT: ${ethers.utils.formatEther(bsdtBalance)}`));
        console.log(chalk.white(`  USDT: ${ethers.utils.formatEther(usdtBalance)}`));
        console.log(chalk.white(`  HCF: ${ethers.utils.formatEther(hcfBalance)}`));
        console.log(chalk.white(`  BNB: ${ethers.utils.formatEther(bnbBalance)}`));

        // 检查是否有足够的USDT用于兑换
        if (usdtBalance.lt(ethers.utils.parseEther("1000"))) {
            console.log(chalk.yellow("\n⚠️ USDT余额较低，可能影响兑换服务"));
        }
    }

    async start() {
        if (this.isRunning) {
            console.log(chalk.yellow("监控服务已在运行"));
            return;
        }

        console.log(chalk.green("\n🚀 启动SWAP监控服务..."));
        this.isRunning = true;

        // 监听BSDT转入事件
        this.setupBSDTListener();
        
        // 监听USDT转入事件
        this.setupUSDTListener();

        // 定期检查待处理的兑换
        this.startPeriodicCheck();

        console.log(chalk.green("✅ 监控服务已启动"));
        console.log(chalk.gray("按 Ctrl+C 停止服务\n"));
    }

    setupBSDTListener() {
        // 监听转入项目方地址的BSDT
        const filter = this.contracts.bsdt.filters.Transfer(
            null, // from任意地址
            CONFIG.projectWallet || this.signer.address, // to项目方地址
            null
        );

        this.contracts.bsdt.on(filter, async (from, to, amount, event) => {
            const txHash = event.transactionHash;
            
            // 避免重复处理
            if (this.processedTxs.has(txHash)) return;
            this.processedTxs.add(txHash);

            console.log(chalk.cyan(`\n📥 检测到BSDT转入:`));
            console.log(chalk.white(`  从: ${from}`));
            console.log(chalk.white(`  金额: ${ethers.utils.formatEther(amount)} BSDT`));
            console.log(chalk.gray(`  交易: ${txHash}`));

            // 处理BSDT到USDT的兑换
            await this.processBSDTtoUSDT(from, amount);
        });

        console.log(chalk.gray("已设置BSDT转入监听"));
    }

    setupUSDTListener() {
        // 监听转入项目方地址的USDT
        const filter = this.contracts.usdt.filters.Transfer(
            null, // from任意地址
            CONFIG.projectWallet || this.signer.address, // to项目方地址
            null
        );

        this.contracts.usdt.on(filter, async (from, to, amount, event) => {
            const txHash = event.transactionHash;
            
            // 避免重复处理
            if (this.processedTxs.has(txHash)) return;
            this.processedTxs.add(txHash);

            console.log(chalk.cyan(`\n📥 检测到USDT转入:`));
            console.log(chalk.white(`  从: ${from}`));
            console.log(chalk.white(`  金额: ${ethers.utils.formatEther(amount)} USDT`));
            console.log(chalk.gray(`  交易: ${txHash}`));

            // 处理USDT到BSDT的兑换
            await this.processUSDTtoBSDT(from, amount);
        });

        console.log(chalk.gray("已设置USDT转入监听"));
    }

    async processBSDTtoUSDT(userAddress, bsdtAmount) {
        try {
            // 检查金额是否满足最小要求
            if (bsdtAmount.lt(CONFIG.minSwapAmount)) {
                console.log(chalk.yellow(`  ⚠️ 金额低于最小兑换要求`));
                return;
            }

            // 计算扣除手续费后的USDT金额
            const feeAmount = bsdtAmount.mul(CONFIG.swapFee).div(10000);
            const usdtAmount = bsdtAmount.sub(feeAmount);

            console.log(chalk.yellow(`\n💱 执行BSDT→USDT兑换:`));
            console.log(chalk.white(`  兑换金额: ${ethers.utils.formatEther(bsdtAmount)} BSDT`));
            console.log(chalk.white(`  手续费: ${ethers.utils.formatEther(feeAmount)} (3%)`));
            console.log(chalk.white(`  用户获得: ${ethers.utils.formatEther(usdtAmount)} USDT`));

            // 检查USDT余额
            const usdtBalance = await this.contracts.usdt.balanceOf(this.signer.address);
            if (usdtBalance.lt(usdtAmount)) {
                console.log(chalk.red(`  ❌ USDT余额不足`));
                return;
            }

            // 发送USDT给用户
            const tx = await this.contracts.usdt.transfer(userAddress, usdtAmount);
            console.log(chalk.gray(`  发送交易: ${tx.hash}`));
            
            await tx.wait();
            console.log(chalk.green(`  ✅ 兑换成功!`));

            // 记录兑换
            this.logSwap('BSDT', 'USDT', userAddress, bsdtAmount, usdtAmount);

        } catch (error) {
            console.log(chalk.red(`  ❌ 兑换失败: ${error.message}`));
        }
    }

    async processUSDTtoBSDT(userAddress, usdtAmount) {
        try {
            // 检查金额是否满足最小要求
            if (usdtAmount.lt(CONFIG.minSwapAmount)) {
                console.log(chalk.yellow(`  ⚠️ 金额低于最小兑换要求`));
                return;
            }

            // USDT到BSDT是1:1兑换
            const bsdtAmount = usdtAmount;

            console.log(chalk.yellow(`\n💱 执行USDT→BSDT兑换:`));
            console.log(chalk.white(`  兑换金额: ${ethers.utils.formatEther(usdtAmount)} USDT`));
            console.log(chalk.white(`  用户获得: ${ethers.utils.formatEther(bsdtAmount)} BSDT`));

            // 检查BSDT余额
            const bsdtBalance = await this.contracts.bsdt.balanceOf(this.signer.address);
            if (bsdtBalance.lt(bsdtAmount)) {
                console.log(chalk.red(`  ❌ BSDT余额不足`));
                return;
            }

            // 发送BSDT给用户
            const tx = await this.contracts.bsdt.transfer(userAddress, bsdtAmount);
            console.log(chalk.gray(`  发送交易: ${tx.hash}`));
            
            await tx.wait();
            console.log(chalk.green(`  ✅ 兑换成功!`));

            // 记录兑换
            this.logSwap('USDT', 'BSDT', userAddress, usdtAmount, bsdtAmount);

        } catch (error) {
            console.log(chalk.red(`  ❌ 兑换失败: ${error.message}`));
        }
    }

    startPeriodicCheck() {
        setInterval(async () => {
            // 定期检查余额
            const bsdtBalance = await this.contracts.bsdt.balanceOf(this.signer.address);
            const usdtBalance = await this.contracts.usdt.balanceOf(this.signer.address);
            
            // 如果余额过低，发出警告
            if (usdtBalance.lt(ethers.utils.parseEther("100"))) {
                console.log(chalk.red("\n⚠️ 警告: USDT余额低于100，请及时补充!"));
            }
            if (bsdtBalance.lt(ethers.utils.parseEther("100"))) {
                console.log(chalk.red("\n⚠️ 警告: BSDT余额低于100，请及时补充!"));
            }
        }, CONFIG.monitorInterval * 10); // 每30秒检查一次
    }

    logSwap(fromToken, toToken, user, fromAmount, toAmount) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            user,
            fromToken,
            toToken,
            fromAmount: ethers.utils.formatEther(fromAmount),
            toAmount: ethers.utils.formatEther(toAmount),
            txHash: ""
        };

        // 保存到文件
        const fs = require('fs');
        const logFile = './swap-history.json';
        
        let history = [];
        if (fs.existsSync(logFile)) {
            history = JSON.parse(fs.readFileSync(logFile));
        }
        
        history.push(logEntry);
        fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
        
        console.log(chalk.gray(`\n📝 兑换记录已保存`));
    }

    async stop() {
        console.log(chalk.yellow("\n正在停止监控服务..."));
        this.isRunning = false;
        
        // 移除所有监听器
        this.contracts.bsdt.removeAllListeners();
        this.contracts.usdt.removeAllListeners();
        
        console.log(chalk.green("✅ 监控服务已停止"));
    }

    // 获取价格信息
    async getPriceInfo() {
        console.log(chalk.cyan("\n📊 当前价格信息:"));
        
        try {
            // 获取HCF/BSDT池子信息
            const factoryABI = ["function getPair(address,address) view returns (address)"];
            const factory = new ethers.Contract(CONFIG.contracts.pancakeFactory, factoryABI, this.provider);
            
            const hcfBsdtPair = await factory.getPair(CONFIG.contracts.hcfToken, CONFIG.contracts.bsdtToken);
            
            if (hcfBsdtPair !== "0x0000000000000000000000000000000000000000") {
                const pairABI = [
                    "function getReserves() view returns (uint112,uint112,uint32)",
                    "function token0() view returns (address)"
                ];
                const pair = new ethers.Contract(hcfBsdtPair, pairABI, this.provider);
                
                const reserves = await pair.getReserves();
                const token0 = await pair.token0();
                
                let hcfReserve, bsdtReserve;
                if (token0.toLowerCase() === CONFIG.contracts.hcfToken.toLowerCase()) {
                    hcfReserve = reserves[0];
                    bsdtReserve = reserves[1];
                } else {
                    hcfReserve = reserves[1];
                    bsdtReserve = reserves[0];
                }
                
                const hcfPrice = ethers.utils.formatEther(bsdtReserve) / ethers.utils.formatEther(hcfReserve);
                console.log(chalk.white(`  HCF价格: ${hcfPrice.toFixed(4)} BSDT`));
                console.log(chalk.white(`  HCF价格: ${hcfPrice.toFixed(4)} USDT (通过BSDT锚定)`));
                console.log(chalk.gray(`  池子储备: ${ethers.utils.formatEther(hcfReserve)} HCF / ${ethers.utils.formatEther(bsdtReserve)} BSDT`));
            } else {
                console.log(chalk.yellow("  HCF/BSDT池子尚未创建"));
            }
        } catch (error) {
            console.log(chalk.red(`  获取价格失败: ${error.message}`));
        }
    }
}

// 主函数
async function main() {
    const monitor = new SwapMonitorService();
    
    try {
        // 初始化
        await monitor.initialize();
        
        // 显示价格信息
        await monitor.getPriceInfo();
        
        // 启动监控
        await monitor.start();
        
        // 保持进程运行
        process.on('SIGINT', async () => {
            await monitor.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    }
}

// 运行监控服务
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SwapMonitorService;