/**
 * 授权LiquidityHelper到BSDT
 */

const { Web3 } = require('web3');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const BSDT_ABI = [
    {
        "inputs": [
            {"name": "exchange", "type": "address"},
            {"name": "authorized", "type": "bool"}
        ],
        "name": "authorizeExchange",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "", "type": "address"}],
        "name": "authorizedExchanges",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function authorizeLiquidityHelper() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('当前账户:', account.address);
        
        // 合约地址
        const bsdtAddress = '0x622e568976f6cC2eaE4cfd3836d92F111000E787';
        const liquidityHelper = process.env.LIQUIDITY_HELPER;
        
        if (!liquidityHelper) {
            throw new Error('LIQUIDITY_HELPER地址未设置');
        }
        
        const bsdtContract = new web3.eth.Contract(BSDT_ABI, bsdtAddress);
        
        console.log('\nLiquidityHelper地址:', liquidityHelper);
        
        // 检查授权状态
        const isAuthorized = await bsdtContract.methods.authorizedExchanges(liquidityHelper).call();
        console.log('当前授权状态:', isAuthorized);
        
        if (!isAuthorized) {
            console.log('\n授权LiquidityHelper...');
            const tx = await bsdtContract.methods
                .authorizeExchange(liquidityHelper, true)
                .send({
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000'
                });
            
            console.log('✅ 授权成功!');
            console.log('交易: https://testnet.bscscan.com/tx/' + tx.transactionHash);
            
            // 验证
            const newStatus = await bsdtContract.methods.authorizedExchanges(liquidityHelper).call();
            console.log('最新授权状态:', newStatus);
        } else {
            console.log('✅ LiquidityHelper已被授权');
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    }
}

authorizeLiquidityHelper();