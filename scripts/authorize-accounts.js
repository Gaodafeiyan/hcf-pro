/**
 * 授权账户和Router到BSDT
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

async function authorizeAccounts() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('当前账户:', account.address);
        
        // BSDT合约
        const bsdtAddress = '0x622e568976f6cC2eaE4cfd3836d92F111000E787';
        const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
        const bsdtContract = new web3.eth.Contract(BSDT_ABI, bsdtAddress);
        
        // 需要授权的地址列表
        const addressesToAuthorize = [
            account.address,  // 当前账户（归集地址）
            routerAddress     // PancakeSwap Router
        ];
        
        console.log('\n检查和授权地址...');
        
        for (const addr of addressesToAuthorize) {
            const isAuthorized = await bsdtContract.methods.authorizedExchanges(addr).call();
            console.log(`\n地址: ${addr}`);
            console.log(`当前授权状态: ${isAuthorized}`);
            
            if (!isAuthorized) {
                console.log('授权中...');
                try {
                    const tx = await bsdtContract.methods
                        .authorizeExchange(addr, true)
                        .send({
                            from: account.address,
                            gas: 100000,
                            gasPrice: '10000000000'
                        });
                    console.log('✅ 授权成功!');
                    console.log('交易: https://testnet.bscscan.com/tx/' + tx.transactionHash);
                } catch (error) {
                    console.log('❌ 授权失败:', error.message);
                }
            } else {
                console.log('✅ 已授权');
            }
        }
        
        console.log('\n授权完成！');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    }
}

authorizeAccounts();