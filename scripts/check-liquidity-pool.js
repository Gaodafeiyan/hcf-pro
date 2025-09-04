/**
 * 检查HCF-BSDT流动性池是否存在
 */

const { Web3 } = require('web3');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const FACTORY_ABI = [
    {
        "inputs": [
            {"name": "", "type": "address"},
            {"name": "", "type": "address"}
        ],
        "name": "getPair",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const PAIR_ABI = [
    {
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            {"name": "_reserve0", "type": "uint112"},
            {"name": "_reserve1", "type": "uint112"},
            {"name": "_blockTimestampLast", "type": "uint32"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token0",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token1",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkLiquidityPool() {
    try {
        console.log('🔍 检查流动性池状态\n');
        
        // 合约地址
        const hcfAddress = process.env.HCF_TOKEN;
        const bsdtV1Address = '0x622e568976f6cC2eaE4cfd3836d92F111000E787'; // 旧BSDT
        const bsdtV2Address = process.env.BSDT_TOKEN_V2; // 新BSDT V2
        const factoryAddress = process.env.PANCAKE_FACTORY;
        
        console.log('HCF Token:', hcfAddress);
        console.log('BSDT V1 (旧):', bsdtV1Address);
        console.log('BSDT V2 (新):', bsdtV2Address);
        console.log('PancakeFactory:', factoryAddress);
        console.log('');
        
        const factoryContract = new web3.eth.Contract(FACTORY_ABI, factoryAddress);
        
        // 检查HCF-BSDT V1池
        console.log('📊 HCF-BSDT V1 流动性池:');
        const pairV1Address = await factoryContract.methods.getPair(hcfAddress, bsdtV1Address).call();
        
        if (pairV1Address !== '0x0000000000000000000000000000000000000000') {
            console.log('池地址:', pairV1Address);
            
            const pairV1Contract = new web3.eth.Contract(PAIR_ABI, pairV1Address);
            const reserves = await pairV1Contract.methods.getReserves().call();
            const token0 = await pairV1Contract.methods.token0().call();
            const token1 = await pairV1Contract.methods.token1().call();
            const totalSupply = await pairV1Contract.methods.totalSupply().call();
            
            console.log('Token0:', token0);
            console.log('Token1:', token1);
            console.log('储备量0:', Web3.utils.fromWei(reserves._reserve0.toString(), 'ether'));
            console.log('储备量1:', Web3.utils.fromWei(reserves._reserve1.toString(), 'ether'));
            console.log('LP Token总供应:', Web3.utils.fromWei(totalSupply, 'ether'));
        } else {
            console.log('❌ 池不存在');
        }
        
        // 检查HCF-BSDT V2池
        console.log('\n📊 HCF-BSDT V2 流动性池:');
        const pairV2Address = await factoryContract.methods.getPair(hcfAddress, bsdtV2Address).call();
        
        if (pairV2Address !== '0x0000000000000000000000000000000000000000') {
            console.log('池地址:', pairV2Address);
            
            const pairV2Contract = new web3.eth.Contract(PAIR_ABI, pairV2Address);
            const reserves = await pairV2Contract.methods.getReserves().call();
            const token0 = await pairV2Contract.methods.token0().call();
            const token1 = await pairV2Contract.methods.token1().call();
            const totalSupply = await pairV2Contract.methods.totalSupply().call();
            
            console.log('Token0:', token0);
            console.log('Token1:', token1);
            console.log('储备量0:', Web3.utils.fromWei(reserves._reserve0.toString(), 'ether'));
            console.log('储备量1:', Web3.utils.fromWei(reserves._reserve1.toString(), 'ether'));
            console.log('LP Token总供应:', Web3.utils.fromWei(totalSupply, 'ether'));
        } else {
            console.log('❌ 池不存在（需要首次创建）');
        }
        
        console.log('\n💡 提示:');
        if (pairV2Address === '0x0000000000000000000000000000000000000000') {
            console.log('- HCF-BSDT V2池还不存在');
            console.log('- 首次添加流动性将创建新池');
            console.log('- 确保有足够的HCF和BSDT余额');
            console.log('- 可能需要更高的Gas限制');
        }
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
    }
}

checkLiquidityPool();