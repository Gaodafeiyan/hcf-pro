/**
 * 授权PancakeSwap Router到BSDT
 * 需要BSDT合约的owner或multisig权限
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
        "inputs": [],
        "name": "owner",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "multiSigWallet",
        "outputs": [{"name": "", "type": "address"}],
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
        "inputs": [{"name": "_multiSigWallet", "type": "address"}],
        "name": "setMultiSigWallet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function authorizeRouter() {
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
        
        // 检查权限
        const owner = await bsdtContract.methods.owner().call();
        const multiSig = await bsdtContract.methods.multiSigWallet().call();
        
        console.log('\n权限信息:');
        console.log('BSDT Owner:', owner);
        console.log('MultiSig:', multiSig);
        console.log('当前账户是Owner:', account.address.toLowerCase() === owner.toLowerCase());
        console.log('当前账户是MultiSig:', account.address.toLowerCase() === multiSig?.toLowerCase());
        
        // 检查Router当前授权状态
        const isAuthorized = await bsdtContract.methods.authorizedExchanges(routerAddress).call();
        console.log('\nPancakeSwap Router授权状态:', isAuthorized);
        
        if (isAuthorized) {
            console.log('✅ Router已经被授权！');
            return;
        }
        
        // 如果当前账户是owner，先设置multiSigWallet
        if (account.address.toLowerCase() === owner.toLowerCase()) {
            console.log('\n当前账户是Owner，设置MultiSig为当前账户...');
            const setMultiSigTx = await bsdtContract.methods
                .setMultiSigWallet(account.address)
                .send({
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000'
                });
            console.log('设置MultiSig交易:', setMultiSigTx.transactionHash);
            
            // 现在作为MultiSig授权Router
            console.log('\n授权PancakeSwap Router...');
            const authTx = await bsdtContract.methods
                .authorizeExchange(routerAddress, true)
                .send({
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000'
                });
            
            console.log('✅ 授权成功！');
            console.log('交易哈希:', authTx.transactionHash);
            console.log('查看交易: https://testnet.bscscan.com/tx/' + authTx.transactionHash);
        } else {
            console.log('\n❌ 当前账户既不是Owner也不是MultiSig，无法授权Router');
            console.log('请使用BSDT合约的Owner账户执行此操作');
        }
        
        // 再次验证
        const newAuthStatus = await bsdtContract.methods.authorizedExchanges(routerAddress).call();
        console.log('\n最终Router授权状态:', newAuthStatus);
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    }
}

authorizeRouter();