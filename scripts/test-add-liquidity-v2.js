/**
 * 使用新的BSDTTokenV2测试添加流动性
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
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
];

const ROUTER_ABI = [
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
    }
];

async function testAddLiquidityV2() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('💧 测试添加流动性（使用BSDTTokenV2）\n');
        console.log('账户地址:', account.address);
        
        // 合约地址
        const hcfAddress = process.env.HCF_TOKEN;
        const bsdtAddress = process.env.BSDT_TOKEN_V2 || process.env.BSDT_TOKEN;
        const routerAddress = process.env.PANCAKE_ROUTER;
        
        console.log('HCF地址:', hcfAddress);
        console.log('BSDT V2地址:', bsdtAddress);
        console.log('Router地址:', routerAddress);
        console.log('');
        
        // 合约实例
        const hcfContract = new web3.eth.Contract(ERC20_ABI, hcfAddress);
        const bsdtContract = new web3.eth.Contract(ERC20_ABI, bsdtAddress);
        const routerContract = new web3.eth.Contract(ROUTER_ABI, routerAddress);
        
        // 检查余额
        const hcfBalance = await hcfContract.methods.balanceOf(account.address).call();
        const bsdtBalance = await bsdtContract.methods.balanceOf(account.address).call();
        
        console.log('📊 当前余额:');
        console.log('HCF:', Web3.utils.fromWei(hcfBalance, 'ether'));
        console.log('BSDT:', Web3.utils.fromWei(bsdtBalance, 'ether'));
        console.log('');
        
        // 设置添加流动性的数量（增加数量确保成功）
        const hcfAmount = Web3.utils.toWei('10000', 'ether');
        const bsdtAmount = Web3.utils.toWei('1000', 'ether');
        
        console.log('📝 准备添加流动性:');
        console.log('HCF数量:', Web3.utils.fromWei(hcfAmount, 'ether'));
        console.log('BSDT数量:', Web3.utils.fromWei(bsdtAmount, 'ether'));
        console.log('');
        
        // 获取nonce
        const nonceRaw = await web3.eth.getTransactionCount(account.address, 'latest');
        let nonce = Number(nonceRaw);
        
        // 1. 授权HCF
        console.log('🔓 授权代币...');
        try {
            const hcfApproveTx = await hcfContract.methods
                .approve(routerAddress, hcfAmount)
                .send({ 
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000',
                    nonce: nonce++
                });
            console.log('✅ HCF授权成功:', hcfApproveTx.transactionHash);
        } catch (e) {
            console.log('⚠️ HCF授权失败:', e.message);
        }
        
        // 2. 授权BSDT
        try {
            const bsdtApproveTx = await bsdtContract.methods
                .approve(routerAddress, bsdtAmount)
                .send({ 
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000',
                    nonce: nonce++
                });
            console.log('✅ BSDT授权成功:', bsdtApproveTx.transactionHash);
        } catch (e) {
            console.log('⚠️ BSDT授权失败:', e.message);
        }
        
        // 3. 添加流动性
        console.log('\n💧 添加流动性到PancakeSwap...');
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5分钟deadline
        
        try {
            const addLiquidityTx = await routerContract.methods
                .addLiquidity(
                    hcfAddress,
                    bsdtAddress,
                    hcfAmount,
                    bsdtAmount,
                    '0', // 最小HCF数量（0表示接受任何数量）
                    '0', // 最小BSDT数量
                    account.address, // LP Token接收地址
                    deadline
                )
                .send({ 
                    from: account.address,
                    gas: 3000000, // 增加gas限制
                    gasPrice: '10000000000',
                    nonce: nonce++
                });
            
            console.log('✅ 流动性添加成功！');
            console.log('交易哈希:', addLiquidityTx.transactionHash);
            console.log('查看交易: https://testnet.bscscan.com/tx/' + addLiquidityTx.transactionHash);
            console.log('区块:', addLiquidityTx.blockNumber);
            
            // 解析事件获取实际添加的数量
            if (addLiquidityTx.events) {
                console.log('\n📊 添加详情:');
                console.log('事件:', Object.keys(addLiquidityTx.events));
            }
            
        } catch (error) {
            console.log('❌ 添加流动性失败:', error.message);
            if (error.data) {
                console.log('错误数据:', error.data);
            }
        }
        
        console.log('\n✨ 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testAddLiquidityV2();