/**
 * 测试BSDTTokenV2的approve和transfer功能
 */

const { Web3 } = require('web3');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const ERC20_ABI = [
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
        "constant": true,
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
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
            {"name": "recipient", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
];

async function testBSDTV2() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('📍 测试BSDTTokenV2功能\n');
        console.log('账户地址:', account.address);
        
        // 使用新的BSDT V2地址
        const bsdtAddress = process.env.BSDT_TOKEN_V2 || process.env.BSDT_TOKEN;
        const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
        
        console.log('BSDT V2地址:', bsdtAddress);
        console.log('Router地址:', routerAddress);
        console.log('');
        
        const bsdtContract = new web3.eth.Contract(ERC20_ABI, bsdtAddress);
        
        // 1. 检查余额
        const balance = await bsdtContract.methods.balanceOf(account.address).call();
        console.log('📊 BSDT余额:', Web3.utils.fromWei(balance, 'ether'));
        
        // 2. 测试approve到Router
        console.log('\n🔓 测试Approve功能...');
        const amountToApprove = Web3.utils.toWei('1000', 'ether');
        
        try {
            const approveTx = await bsdtContract.methods
                .approve(routerAddress, amountToApprove)
                .send({ 
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000'
                });
            
            console.log('✅ Approve成功！');
            console.log('交易哈希:', approveTx.transactionHash);
            console.log('查看交易: https://testnet.bscscan.com/tx/' + approveTx.transactionHash);
        } catch (error) {
            console.log('❌ Approve失败:', error.message);
        }
        
        // 3. 检查授权额度
        const allowance = await bsdtContract.methods.allowance(account.address, routerAddress).call();
        console.log('\n📊 Router授权额度:', Web3.utils.fromWei(allowance, 'ether'), 'BSDT');
        
        // 4. 测试转账
        console.log('\n💸 测试Transfer功能...');
        if (Number(balance) > 0) {
            const transferAmount = Web3.utils.toWei('1', 'ether');
            try {
                const transferTx = await bsdtContract.methods
                    .transfer(account.address, transferAmount) // 转给自己测试
                    .send({ 
                        from: account.address,
                        gas: 100000,
                        gasPrice: '10000000000'
                    });
                
                console.log('✅ Transfer成功！');
                console.log('交易哈希:', transferTx.transactionHash);
            } catch (error) {
                console.log('❌ Transfer失败:', error.message);
            }
        } else {
            console.log('⚠️ 余额为0，跳过转账测试');
        }
        
        console.log('\n✨ 测试完成！BSDTTokenV2功能正常');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testBSDTV2();