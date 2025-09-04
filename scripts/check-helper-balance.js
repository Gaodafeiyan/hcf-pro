/**
 * 检查LiquidityHelper合约的代币余额
 */

const { Web3 } = require('web3');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
];

async function checkHelperBalance() {
    const helperAddress = process.env.LIQUIDITY_HELPER;
    const hcfAddress = '0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc';
    const bsdtAddress = '0x622e568976f6cC2eaE4cfd3836d92F111000E787';
    
    console.log('🔍 检查LiquidityHelper余额\n');
    console.log('LiquidityHelper地址:', helperAddress);
    
    const hcfContract = new web3.eth.Contract(ERC20_ABI, hcfAddress);
    const bsdtContract = new web3.eth.Contract(ERC20_ABI, bsdtAddress);
    
    const hcfBalance = await hcfContract.methods.balanceOf(helperAddress).call();
    const bsdtBalance = await bsdtContract.methods.balanceOf(helperAddress).call();
    
    console.log('\n余额:');
    console.log('HCF:', Web3.utils.fromWei(hcfBalance, 'ether'));
    console.log('BSDT:', Web3.utils.fromWei(bsdtBalance, 'ether'));
}

checkHelperBalance().catch(console.error);