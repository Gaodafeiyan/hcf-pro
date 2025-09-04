/**
 * 检查Router是否被识别为DEX
 */

const { Web3 } = require('web3');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const BSDT_ABI = [
    {
        "inputs": [{"name": "", "type": "address"}],
        "name": "blacklistedDEX",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "", "type": "address"}],
        "name": "authorizedExchanges",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "", "type": "uint256"}],
        "name": "knownDEXRouters",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkDEXStatus() {
    try {
        const bsdtAddress = '0x622e568976f6cC2eaE4cfd3836d92F111000E787';
        const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
        const bsdtContract = new web3.eth.Contract(BSDT_ABI, bsdtAddress);
        
        console.log('🔍 检查DEX状态\n');
        console.log('PancakeSwap Router:', routerAddress);
        console.log('BSDT Contract:', bsdtAddress);
        console.log('');
        
        // 检查Router是否在黑名单
        const isBlacklisted = await bsdtContract.methods.blacklistedDEX(routerAddress).call();
        console.log('Router在黑名单中:', isBlacklisted);
        
        // 检查Router是否被授权
        const isAuthorized = await bsdtContract.methods.authorizedExchanges(routerAddress).call();
        console.log('Router被授权:', isAuthorized);
        
        // 检查已知的DEX Routers
        console.log('\n已知的DEX Routers:');
        try {
            for (let i = 0; i < 5; i++) {
                const dexRouter = await bsdtContract.methods.knownDEXRouters(i).call();
                console.log(`  [${i}] ${dexRouter}`);
                if (dexRouter.toLowerCase() === routerAddress.toLowerCase()) {
                    console.log('      ⚠️ 这是PancakeSwap Router!');
                }
            }
        } catch (e) {
            // 数组越界时停止
        }
        
        // 检查合约代码
        const code = await web3.eth.getCode(routerAddress);
        console.log('\nRouter有合约代码:', code !== '0x');
        
        console.log('\n分析:');
        if (isBlacklisted) {
            console.log('❌ Router在黑名单中，需要从黑名单移除');
        } else if (!isAuthorized) {
            console.log('❌ Router未被授权，需要授权');
        } else {
            console.log('✅ Router已授权且不在黑名单中');
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    }
}

checkDEXStatus();