/**
 * 快速检查账户余额和质押状态
 */

const { Web3 } = require('web3');
const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

// 正确的合约地址
const CONTRACTS = {
    HCFToken: '0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc',
    BSDTToken: '0x91152b436A5b3535E01902Cf09a3c59Ab4c433BD',
    HCFStaking: '0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74'
};

// 测试账户地址（可以通过参数传入）
let TEST_ACCOUNT = '0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9';

// ERC20 ABI
const ERC20_ABI = [
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Staking ABI
const STAKING_ABI = [
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getUserStakes",
        "outputs": [
            {
                "components": [
                    {"name": "amount", "type": "uint256"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "lockDays", "type": "uint256"},
                    {"name": "isActive", "type": "bool"},
                    {"name": "level", "type": "uint256"},
                    {"name": "lastClaimTime", "type": "uint256"},
                    {"name": "totalClaimed", "type": "uint256"},
                    {"name": "isLP", "type": "bool"},
                    {"name": "lpBSDTAmount", "type": "uint256"},
                    {"name": "compoundCount", "type": "uint256"}
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getUserLevel",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkBalance() {
    try {
        console.log('='.repeat(60));
        console.log('🔍 HCF-PRO 余额检查');
        console.log('='.repeat(60));
        console.log('测试账户:', TEST_ACCOUNT);
        console.log('');
        
        // 检查HCF余额
        const hcfContract = new web3.eth.Contract(ERC20_ABI, CONTRACTS.HCFToken);
        const hcfBalance = await hcfContract.methods.balanceOf(TEST_ACCOUNT).call();
        console.log('💰 HCF余额:', Web3.utils.fromWei(hcfBalance, 'ether'), 'HCF');
        
        // 检查BSDT余额
        const bsdtContract = new web3.eth.Contract(ERC20_ABI, CONTRACTS.BSDTToken);
        const bsdtBalance = await bsdtContract.methods.balanceOf(TEST_ACCOUNT).call();
        console.log('💰 BSDT余额:', Web3.utils.fromWei(bsdtBalance, 'ether'), 'BSDT');
        
        // 检查质押信息
        const stakingContract = new web3.eth.Contract(STAKING_ABI, CONTRACTS.HCFStaking);
        const userLevel = await stakingContract.methods.getUserLevel(TEST_ACCOUNT).call();
        console.log('⭐ 用户等级: Level', userLevel.toString());
        
        const stakes = await stakingContract.methods.getUserStakes(TEST_ACCOUNT).call();
        console.log('📊 质押数量:', stakes.length);
        
        if (stakes.length > 0) {
            console.log('\n质押详情:');
            stakes.forEach((stake, index) => {
                if (stake.isActive) {
                    console.log(`  质押 #${index}:`);
                    console.log(`    - 金额: ${Web3.utils.fromWei(stake.amount, 'ether')} HCF`);
                    console.log(`    - 等级: Level ${stake.level}`);
                    console.log(`    - 类型: ${stake.isLP ? 'LP质押' : '普通质押'}`);
                    if (stake.isLP) {
                        console.log(`    - BSDT: ${Web3.utils.fromWei(stake.lpBSDTAmount, 'ether')} BSDT`);
                    }
                }
            });
        }
        
        console.log('\n✅ 检查完成!');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
    }
}

// 如果提供了地址参数，使用该地址
if (process.argv[2]) {
    const address = process.argv[2];
    if (web3.utils.isAddress(address)) {
        TEST_ACCOUNT = address;
    }
}

checkBalance();
