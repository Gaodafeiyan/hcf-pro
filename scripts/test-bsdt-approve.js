/**
 * 测试BSDT授权
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
    }
];

async function testApprove() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('账户地址:', account.address);
        
        // BSDT合约
        const bsdtAddress = '0x622e568976f6cC2eaE4cfd3836d92F111000E787';
        const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
        const bsdtContract = new web3.eth.Contract(ERC20_ABI, bsdtAddress);
        
        // 检查当前授权
        const currentAllowance = await bsdtContract.methods.allowance(account.address, routerAddress).call();
        console.log('当前授权:', Web3.utils.fromWei(currentAllowance, 'ether'), 'BSDT');
        
        // 尝试授权100 BSDT
        const amountToApprove = Web3.utils.toWei('100', 'ether');
        console.log('\n准备授权100 BSDT给Router...');
        
        // 估算gas
        try {
            const gasEstimate = await bsdtContract.methods
                .approve(routerAddress, amountToApprove)
                .estimateGas({ from: account.address });
            console.log('预估Gas:', gasEstimate);
        } catch (gasError) {
            console.error('Gas估算失败:', gasError.message);
            console.log('继续使用默认gas limit...');
        }
        
        // 执行授权
        console.log('执行授权交易...');
        const tx = await bsdtContract.methods
            .approve(routerAddress, amountToApprove)
            .send({ 
                from: account.address,
                gas: 100000,
                gasPrice: '10000000000' // 10 gwei
            });
        
        console.log('✅ 授权成功！');
        console.log('交易哈希:', tx.transactionHash);
        console.log('查看交易: https://testnet.bscscan.com/tx/' + tx.transactionHash);
        
        // 验证授权
        const newAllowance = await bsdtContract.methods.allowance(account.address, routerAddress).call();
        console.log('新授权额度:', Web3.utils.fromWei(newAllowance, 'ether'), 'BSDT');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        if (error.cause) {
            console.error('错误原因:', error.cause);
        }
        if (error.data) {
            console.error('错误数据:', error.data);
        }
    }
}

testApprove();