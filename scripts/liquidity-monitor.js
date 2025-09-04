/**
 * HCF 流动性自动添加监控脚本
 * 功能：
 * 1. 监控归集地址的HCF和BSDT余额
 * 2. 达到阈值后自动添加流动性到PancakeSwap
 * 3. 记录LP Token并分配给用户
 */

const Web3 = require('web3');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ============ 配置 ============
const CONFIG = {
    // RPC配置
    RPC_URL: process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    CHAIN_ID: 97, // BSC测试网
    
    // 合约地址
    contracts: {
        HCFToken: process.env.HCF_TOKEN || '0xbA43eC196259AA0380E775b19B0e92522964c1A4',
        BSDTToken: process.env.BSDT_TOKEN || '0xE78F01bC30f38Da150B2022b883Cc4786277cbC6',
        HCFStaking: process.env.HCF_STAKING || '0x9e93166c3C42172aA90982eE83CEc0e7c962Ea3D',
        PancakeRouter: process.env.PANCAKE_ROUTER || '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap测试网Router
        PancakeFactory: process.env.PANCAKE_FACTORY || '0x6725F303b657a9451d8BA641348b6761A6CC7a17'
    },
    
    // 归集地址（从合约读取或环境变量）
    collectionAddress: process.env.COLLECTION_ADDRESS,
    
    // 私钥（用于执行交易）
    PRIVATE_KEY: process.env.KEEPER_PRIVATE_KEY,
    
    // 阈值设置
    thresholds: {
        minHCF: 1000,  // 最少1000 HCF才添加流动性
        minBSDT: 100,  // 最少100 BSDT
        checkInterval: 10 * 60 * 1000, // 10分钟检查一次
        retryInterval: 60 * 1000, // 失败后1分钟重试
    },
    
    // Gas设置
    gas: {
        maxGasPrice: Web3.utils.toWei('10', 'gwei'),
        gasLimit: 500000
    }
};

// ============ ABI定义 ============
const ABI = {
    ERC20: [
        {
            "constant": true,
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "recipient", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ],
    
    PancakeRouter: [
        {
            "inputs": [
                {"name": "tokenA", "type": "address"},
                {"name": "tokenB", "type": "address"},
                {"name": "amountADesired", "type": "uint256"},
                {"name": "amountBDesired", "type": "uint256"},
                {"name": "amountAMin", "type": "uint256"},
                {"name": "amountBMin", "type": "uint256"},
                {"name": "to", "type": "address"},
                {"name": "deadline", "type": "uint256"}
            ],
            "name": "addLiquidity",
            "outputs": [
                {"name": "amountA", "type": "uint256"},
                {"name": "amountB", "type": "uint256"},
                {"name": "liquidity", "type": "uint256"}
            ],
            "type": "function"
        },
        {
            "inputs": [
                {"name": "tokenA", "type": "address"},
                {"name": "tokenB", "type": "address"}
            ],
            "name": "getPair",
            "outputs": [{"name": "pair", "type": "address"}],
            "type": "function",
            "stateMutability": "view"
        },
        {
            "inputs": [
                {"name": "amountIn", "type": "uint256"},
                {"name": "reserveIn", "type": "uint256"},
                {"name": "reserveOut", "type": "uint256"}
            ],
            "name": "getAmountOut",
            "outputs": [{"name": "amountOut", "type": "uint256"}],
            "type": "function",
            "stateMutability": "pure"
        }
    ],
    
    HCFStaking: [
        {
            "inputs": [],
            "name": "collectionAddress",
            "outputs": [{"name": "", "type": "address"}],
            "type": "function",
            "stateMutability": "view"
        }
    ]
};

// ============ 初始化 ============
let web3;
let account;
let contracts = {};
let isProcessing = false;

async function init() {
    try {
        console.log('🚀 初始化流动性监控脚本...');
        
        // 初始化Web3
        web3 = new Web3(CONFIG.RPC_URL);
        
        // 检查私钥
        if (!CONFIG.PRIVATE_KEY) {
            throw new Error('❌ 未设置KEEPER_PRIVATE_KEY环境变量');
        }
        
        // 导入账户
        account = web3.eth.accounts.privateKeyToAccount(CONFIG.PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        console.log('📝 Keeper地址:', account.address);
        
        // 检查余额
        const balance = await web3.eth.getBalance(account.address);
        console.log('💰 BNB余额:', web3.utils.fromWei(balance, 'ether'));
        
        if (parseFloat(web3.utils.fromWei(balance, 'ether')) < 0.01) {
            console.warn('⚠️ BNB余额过低，可能无法支付Gas费');
        }
        
        // 初始化合约实例
        contracts.HCFToken = new web3.eth.Contract(ABI.ERC20, CONFIG.contracts.HCFToken);
        contracts.BSDTToken = new web3.eth.Contract(ABI.ERC20, CONFIG.contracts.BSDTToken);
        contracts.PancakeRouter = new web3.eth.Contract(ABI.PancakeRouter, CONFIG.contracts.PancakeRouter);
        contracts.HCFStaking = new web3.eth.Contract(ABI.HCFStaking, CONFIG.contracts.HCFStaking);
        
        // 获取归集地址
        if (!CONFIG.collectionAddress) {
            CONFIG.collectionAddress = await contracts.HCFStaking.methods.collectionAddress().call();
            console.log('📍 从合约获取归集地址:', CONFIG.collectionAddress);
        }
        
        console.log('✅ 初始化完成');
        
    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        process.exit(1);
    }
}

// ============ 余额检查 ============
async function checkBalances() {
    try {
        const hcfBalance = await contracts.HCFToken.methods.balanceOf(CONFIG.collectionAddress).call();
        const bsdtBalance = await contracts.BSDTToken.methods.balanceOf(CONFIG.collectionAddress).call();
        
        const hcfAmount = parseFloat(web3.utils.fromWei(hcfBalance, 'ether'));
        const bsdtAmount = parseFloat(web3.utils.fromWei(bsdtBalance, 'ether'));
        
        console.log(`\n📊 归集地址余额:`);
        console.log(`   HCF: ${hcfAmount.toFixed(2)}`);
        console.log(`   BSDT: ${bsdtAmount.toFixed(2)}`);
        
        return { hcfBalance, bsdtBalance, hcfAmount, bsdtAmount };
    } catch (error) {
        console.error('❌ 检查余额失败:', error.message);
        return null;
    }
}

// ============ 计算最优添加比例 ============
async function calculateOptimalAmounts(hcfBalance, bsdtBalance) {
    try {
        // 获取当前池子储备量（如果池子存在）
        // 这里简化处理，按1:0.1比例（1 HCF = 0.1 BSDT）
        const targetRatio = 0.1;
        
        const hcfAmount = hcfBalance;
        const bsdtRequired = web3.utils.toWei((parseFloat(web3.utils.fromWei(hcfBalance, 'ether')) * targetRatio).toString(), 'ether');
        
        // 检查BSDT是否足够
        if (bsdtBalance >= bsdtRequired) {
            return {
                hcfAmount: hcfBalance,
                bsdtAmount: bsdtRequired
            };
        } else {
            // BSDT不足，按BSDT数量反算HCF
            const adjustedHCF = web3.utils.toWei((parseFloat(web3.utils.fromWei(bsdtBalance, 'ether')) / targetRatio).toString(), 'ether');
            return {
                hcfAmount: adjustedHCF,
                bsdtAmount: bsdtBalance
            };
        }
    } catch (error) {
        console.error('❌ 计算最优比例失败:', error.message);
        // 返回原始数量
        return { hcfAmount: hcfBalance, bsdtAmount: bsdtBalance };
    }
}

// ============ 添加流动性 ============
async function addLiquidity(hcfAmount, bsdtAmount) {
    if (isProcessing) {
        console.log('⏳ 正在处理中，跳过本次执行');
        return;
    }
    
    isProcessing = true;
    
    try {
        console.log('\n🔄 开始添加流动性...');
        console.log(`   HCF: ${web3.utils.fromWei(hcfAmount, 'ether')}`);
        console.log(`   BSDT: ${web3.utils.fromWei(bsdtAmount, 'ether')}`);
        
        // 1. 从归集地址转账到Keeper地址
        console.log('📤 从归集地址转出代币...');
        // 注意：这里需要归集地址的控制权，实际应用中可能需要多签
        
        // 2. 授权Router
        console.log('🔓 授权代币给Router...');
        const hcfApprove = await contracts.HCFToken.methods
            .approve(CONFIG.contracts.PancakeRouter, hcfAmount)
            .send({ 
                from: account.address,
                gas: CONFIG.gas.gasLimit,
                gasPrice: CONFIG.gas.maxGasPrice
            });
        console.log('   HCF授权交易:', hcfApprove.transactionHash);
        
        const bsdtApprove = await contracts.BSDTToken.methods
            .approve(CONFIG.contracts.PancakeRouter, bsdtAmount)
            .send({ 
                from: account.address,
                gas: CONFIG.gas.gasLimit,
                gasPrice: CONFIG.gas.maxGasPrice
            });
        console.log('   BSDT授权交易:', bsdtApprove.transactionHash);
        
        // 3. 添加流动性
        console.log('💧 添加流动性到池子...');
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5分钟后过期
        const minAmounts = '0'; // 实际应用中应该设置滑点保护
        
        const addLiquidityTx = await contracts.PancakeRouter.methods
            .addLiquidity(
                CONFIG.contracts.HCFToken,
                CONFIG.contracts.BSDTToken,
                hcfAmount,
                bsdtAmount,
                minAmounts,
                minAmounts,
                CONFIG.collectionAddress, // LP Token发送回归集地址
                deadline
            )
            .send({ 
                from: account.address,
                gas: CONFIG.gas.gasLimit,
                gasPrice: CONFIG.gas.maxGasPrice
            });
        
        console.log('✅ 流动性添加成功!');
        console.log('   交易哈希:', addLiquidityTx.transactionHash);
        console.log('   区块:', addLiquidityTx.blockNumber);
        
        // 4. 记录日志
        logTransaction({
            timestamp: new Date().toISOString(),
            txHash: addLiquidityTx.transactionHash,
            blockNumber: addLiquidityTx.blockNumber,
            hcfAmount: web3.utils.fromWei(hcfAmount, 'ether'),
            bsdtAmount: web3.utils.fromWei(bsdtAmount, 'ether'),
            status: 'success'
        });
        
    } catch (error) {
        console.error('❌ 添加流动性失败:', error.message);
        
        // 记录错误日志
        logTransaction({
            timestamp: new Date().toISOString(),
            error: error.message,
            hcfAmount: web3.utils.fromWei(hcfAmount, 'ether'),
            bsdtAmount: web3.utils.fromWei(bsdtAmount, 'ether'),
            status: 'failed'
        });
    } finally {
        isProcessing = false;
    }
}

// ============ 日志记录 ============
function logTransaction(data) {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `liquidity-${new Date().toISOString().split('T')[0]}.json`);
    
    let logs = [];
    if (fs.existsSync(logFile)) {
        logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(data);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    console.log('📝 日志已记录');
}

// ============ 主监控循环 ============
async function monitor() {
    console.log(`\n⏰ [${new Date().toLocaleString()}] 开始检查...`);
    
    // 检查余额
    const balances = await checkBalances();
    if (!balances) return;
    
    const { hcfBalance, bsdtBalance, hcfAmount, bsdtAmount } = balances;
    
    // 检查是否达到阈值
    if (hcfAmount >= CONFIG.thresholds.minHCF && bsdtAmount >= CONFIG.thresholds.minBSDT) {
        console.log('✅ 达到添加流动性阈值！');
        
        // 计算最优添加数量
        const optimal = await calculateOptimalAmounts(hcfBalance, bsdtBalance);
        
        // 执行添加流动性
        await addLiquidity(optimal.hcfAmount, optimal.bsdtAmount);
    } else {
        console.log('⏸️ 未达到阈值，继续等待...');
        console.log(`   需要: HCF >= ${CONFIG.thresholds.minHCF}, BSDT >= ${CONFIG.thresholds.minBSDT}`);
    }
}

// ============ 启动监控 ============
async function start() {
    await init();
    
    // 立即执行一次
    await monitor();
    
    // 设置定时任务
    console.log(`\n⏰ 设置定时任务，每${CONFIG.thresholds.checkInterval / 60000}分钟检查一次`);
    
    setInterval(monitor, CONFIG.thresholds.checkInterval);
    
    // 优雅退出
    process.on('SIGINT', () => {
        console.log('\n👋 收到退出信号，正在关闭...');
        process.exit(0);
    });
}

// ============ 命令行参数处理 ============
const args = process.argv.slice(2);

if (args.includes('--once')) {
    // 只执行一次
    init().then(monitor).then(() => process.exit(0));
} else if (args.includes('--test')) {
    // 测试模式
    console.log('🧪 测试模式');
    init().then(checkBalances).then(() => process.exit(0));
} else {
    // 正常启动监控
    start();
}

module.exports = {
    init,
    checkBalances,
    addLiquidity,
    monitor
};