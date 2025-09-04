/**
 * HCF-PRO 综合功能测试脚本
 * 测试所有核心功能是否正常工作
 */

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

// 合约地址（最新版本）
const CONTRACTS = {
    HCFToken: '0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc',
    BSDTToken: '0x91152b436A5b3535E01902Cf09a3c59Ab4c433BD',
    HCFStaking: '0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74',
    HCFReferral: '0x18A468b3dfC71C3bA9F5A801734B219d253C7F27',
    PancakeRouter: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    PancakeFactory: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
    LPPool: '0x67D7211815a7Cbb0e816e494F444d7bbfC1a35fD'
};

// 测试结果
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// ERC20 ABI
const ERC20_ABI = [
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
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

// Staking ABI
const STAKING_ABI = [
    {
        "inputs": [],
        "name": "totalStaked",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "collectionAddress",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "DAILY_LIMIT",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// LP Pair ABI
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
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// 测试函数
async function testContract(name, address, tests) {
    console.log(`\n📋 测试 ${name}...`);
    
    try {
        const code = await web3.eth.getCode(address);
        if (code === '0x' || code === '0x0') {
            testResults.failed.push(`${name}: 合约不存在`);
            console.log(`   ❌ 合约不存在于地址 ${address}`);
            return false;
        }
        
        console.log(`   ✅ 合约已部署: ${address}`);
        testResults.passed.push(`${name}: 已部署`);
        
        // 运行特定测试
        if (tests) {
            await tests(address);
        }
        
        return true;
    } catch (error) {
        testResults.failed.push(`${name}: ${error.message}`);
        console.log(`   ❌ 错误: ${error.message}`);
        return false;
    }
}

// 测试HCF Token
async function testHCFToken() {
    await testContract('HCF Token', CONTRACTS.HCFToken, async (address) => {
        const contract = new web3.eth.Contract(ERC20_ABI, address);
        
        const totalSupply = await contract.methods.totalSupply().call();
        const totalSupplyInHCF = Web3.utils.fromWei(totalSupply, 'ether');
        
        console.log(`   📊 总供应量: ${Number(totalSupplyInHCF).toLocaleString()} HCF`);
        
        if (Number(totalSupplyInHCF) > 0) {
            testResults.passed.push('HCF Token: 总供应量正常');
        } else {
            testResults.warnings.push('HCF Token: 总供应量为0');
        }
    });
}

// 测试BSDT Token V2
async function testBSDTToken() {
    await testContract('BSDT Token V2', CONTRACTS.BSDTToken, async (address) => {
        const contract = new web3.eth.Contract(ERC20_ABI, address);
        
        const totalSupply = await contract.methods.totalSupply().call();
        const totalSupplyInBSDT = Web3.utils.fromWei(totalSupply, 'ether');
        
        console.log(`   📊 总供应量: ${Number(totalSupplyInBSDT).toLocaleString()} BSDT`);
        
        // 测试approve功能（验证DEX限制已移除）
        const testAddress = '0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9';
        const routerAddress = CONTRACTS.PancakeRouter;
        
        const allowance = await contract.methods.allowance(testAddress, routerAddress).call();
        console.log(`   🔓 Router授权额度: ${Web3.utils.fromWei(allowance, 'ether')} BSDT`);
        
        if (Number(allowance) > 0) {
            testResults.passed.push('BSDT V2: Router授权正常（DEX限制已移除）');
        } else {
            testResults.warnings.push('BSDT V2: Router未授权');
        }
    });
}

// 测试Staking合约
async function testStaking() {
    await testContract('HCF Staking', CONTRACTS.HCFStaking, async (address) => {
        const contract = new web3.eth.Contract(STAKING_ABI, address);
        
        const totalStaked = await contract.methods.totalStaked().call();
        const totalStakedInHCF = Web3.utils.fromWei(totalStaked, 'ether');
        
        const collectionAddress = await contract.methods.collectionAddress().call();
        const dailyLimit = await contract.methods.DAILY_LIMIT().call();
        const dailyLimitInHCF = Web3.utils.fromWei(dailyLimit, 'ether');
        
        console.log(`   💰 总质押量: ${Number(totalStakedInHCF).toLocaleString()} HCF`);
        console.log(`   📍 归集地址: ${collectionAddress}`);
        console.log(`   🚫 每日限额: ${dailyLimitInHCF} HCF`);
        
        if (collectionAddress !== '0x0000000000000000000000000000000000000000') {
            testResults.passed.push('Staking: 归集地址已设置');
        } else {
            testResults.failed.push('Staking: 归集地址未设置');
        }
        
        if (Number(dailyLimitInHCF) === 500) {
            testResults.passed.push('Staking: 每日限额正确（500 HCF）');
        } else {
            testResults.warnings.push(`Staking: 每日限额为 ${dailyLimitInHCF} HCF`);
        }
    });
}

// 测试流动性池
async function testLiquidityPool() {
    await testContract('HCF-BSDT LP Pool', CONTRACTS.LPPool, async (address) => {
        const contract = new web3.eth.Contract(PAIR_ABI, address);
        
        const reserves = await contract.methods.getReserves().call();
        const totalSupply = await contract.methods.totalSupply().call();
        
        const reserve0 = Web3.utils.fromWei(reserves._reserve0.toString(), 'ether');
        const reserve1 = Web3.utils.fromWei(reserves._reserve1.toString(), 'ether');
        const lpSupply = Web3.utils.fromWei(totalSupply, 'ether');
        
        console.log(`   💧 储备量0: ${Number(reserve0).toLocaleString()}`);
        console.log(`   💧 储备量1: ${Number(reserve1).toLocaleString()}`);
        console.log(`   🎯 LP Token总量: ${Number(lpSupply).toLocaleString()}`);
        
        if (Number(reserve0) > 0 && Number(reserve1) > 0) {
            testResults.passed.push('LP Pool: 流动性池已创建并有储备');
            
            // 计算价格
            const price = Number(reserve1) / Number(reserve0);
            console.log(`   💹 价格比例: 1 Token = ${price.toFixed(4)} Token`);
        } else {
            testResults.failed.push('LP Pool: 流动性池为空');
        }
    });
}

// 测试推荐合约
async function testReferral() {
    await testContract('HCF Referral', CONTRACTS.HCFReferral, async (address) => {
        console.log(`   ℹ️ 推荐合约已部署，需要通过前端界面测试功能`);
        testResults.passed.push('Referral: 合约已部署');
    });
}

// 生成测试报告
function generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告');
    console.log('='.repeat(60));
    
    console.log(`\n✅ 通过测试 (${testResults.passed.length}):`);
    testResults.passed.forEach(test => console.log(`   ✓ ${test}`));
    
    if (testResults.warnings.length > 0) {
        console.log(`\n⚠️ 警告 (${testResults.warnings.length}):`);
        testResults.warnings.forEach(test => console.log(`   ⚡ ${test}`));
    }
    
    if (testResults.failed.length > 0) {
        console.log(`\n❌ 失败测试 (${testResults.failed.length}):`);
        testResults.failed.forEach(test => console.log(`   ✗ ${test}`));
    }
    
    // 计算通过率
    const total = testResults.passed.length + testResults.failed.length;
    const passRate = total > 0 ? ((testResults.passed.length / total) * 100).toFixed(1) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📈 测试通过率: ${passRate}%`);
    console.log('='.repeat(60));
    
    // 功能就绪状态
    console.log('\n🚀 功能就绪状态:');
    if (testResults.failed.length === 0) {
        console.log('   ✅ 所有核心功能已就绪，可以开始测试！');
    } else {
        console.log('   ⚠️ 部分功能存在问题，需要修复后才能完整测试');
    }
    
    // 保存报告
    const report = {
        timestamp: new Date().toISOString(),
        results: testResults,
        passRate: passRate,
        ready: testResults.failed.length === 0
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'test-report.json'),
        JSON.stringify(report, null, 2)
    );
    
    console.log('\n📁 测试报告已保存到 test-report.json');
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始HCF-PRO综合功能测试...');
    console.log('测试时间:', new Date().toLocaleString());
    console.log('网络: BSC Testnet (Chain ID: 97)');
    console.log('='.repeat(60));
    
    // 运行所有测试
    await testHCFToken();
    await testBSDTToken();
    await testStaking();
    await testLiquidityPool();
    await testReferral();
    
    // 生成报告
    generateReport();
    
    // 下一步建议
    console.log('\n📝 下一步建议:');
    if (testResults.failed.length === 0) {
        console.log('1. 打开 staking-fixed.html 测试质押功能');
        console.log('2. 打开 referral-system.html 测试推荐功能');
        console.log('3. 运行 liquidity-monitor.js 测试自动流动性添加');
        console.log('4. 测试完整的用户流程：质押 → LP升级 → 股权LP → 推荐');
    } else {
        console.log('1. 修复失败的测试项');
        console.log('2. 重新运行测试脚本');
        console.log('3. 确保所有核心功能正常');
    }
}

// 运行测试
runTests().catch(console.error);