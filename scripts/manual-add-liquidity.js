/**
 * 手动添加流动性 - 使用原生Router调用
 * 由于BSDT限制，需要特殊处理
 */

const { Web3 } = require('web3');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

// 简单的通过直接调用合约数据的方式
async function manualAddLiquidity() {
    try {
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('账户地址:', account.address);
        
        // 由于BSDT限制太严格，我们需要另一种方案
        console.log('\n⚠️  BSDT合约限制分析:');
        console.log('1. BSDT禁止approve给DEX Router');
        console.log('2. _isDEXContract会检测Router的factory()函数');
        console.log('3. 即使授权了Router也无法approve');
        
        console.log('\n💡 解决方案:');
        console.log('1. 方案A: 修改BSDT合约，移除DEX检测（需要重新部署）');
        console.log('2. 方案B: 创建专门的流动性池合约，不被识别为DEX');
        console.log('3. 方案C: 使用其他稳定币代替BSDT');
        console.log('4. 方案D: 直接在PancakeSwap界面手动添加（绕过合约限制）');
        
        console.log('\n📊 当前状态:');
        console.log('- HCF可以正常approve和添加流动性');
        console.log('- BSDT无法approve给PancakeRouter');
        console.log('- LiquidityHelper已收到代币但无法执行');
        
        console.log('\n🎯 建议:');
        console.log('最简单的解决方案是重新部署一个没有DEX限制的BSDT合约');
        console.log('或者创建一个自定义的AMM池子合约');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    }
}

manualAddLiquidity();