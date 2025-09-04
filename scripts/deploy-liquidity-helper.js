/**
 * 部署LiquidityHelper合约
 */

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.liquidity' });

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

// 读取编译后的合约
function loadContract(contractName) {
    try {
        const contractPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        return {
            abi: contractJson.abi,
            bytecode: contractJson.bytecode
        };
    } catch (error) {
        console.error(`无法加载合约 ${contractName}:`, error.message);
        return null;
    }
}

async function deployLiquidityHelper() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('部署账户:', account.address);
        
        // 检查余额
        const balance = await web3.eth.getBalance(account.address);
        console.log('BNB余额:', Web3.utils.fromWei(balance, 'ether'));
        
        // 合约地址
        const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
        const hcfAddress = '0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc';
        const bsdtAddress = '0x622e568976f6cC2eaE4cfd3836d92F111000E787';
        const collectionAddress = account.address; // 使用当前账户作为归集地址
        
        // 先编译合约
        console.log('\n编译合约...');
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
            exec('npx hardhat compile', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
                if (error) {
                    console.error('编译失败:', stderr);
                    reject(error);
                } else {
                    console.log('编译成功');
                    resolve();
                }
            });
        });
        
        // 加载合约
        const contractData = loadContract('LiquidityHelper');
        if (!contractData) {
            throw new Error('无法加载LiquidityHelper合约');
        }
        
        // 创建合约实例
        const contract = new web3.eth.Contract(contractData.abi);
        
        // 部署合约
        console.log('\n部署LiquidityHelper合约...');
        const deployTx = contract.deploy({
            data: contractData.bytecode,
            arguments: [routerAddress, hcfAddress, bsdtAddress, collectionAddress]
        });
        
        const gas = await deployTx.estimateGas({ from: account.address });
        console.log('预估Gas:', gas);
        
        const deployedContract = await deployTx.send({
            from: account.address,
            gas: Math.floor(Number(gas) * 1.2), // 增加20% gas
            gasPrice: '10000000000' // 10 gwei
        });
        
        console.log('\n✅ 合约部署成功！');
        console.log('合约地址:', deployedContract.options.address);
        console.log('查看合约: https://testnet.bscscan.com/address/' + deployedContract.options.address);
        
        // 保存地址到.env
        const envPath = path.join(__dirname, '..', '.env.liquidity');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent += `\n# LiquidityHelper合约\nLIQUIDITY_HELPER=${deployedContract.options.address}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log('\n地址已保存到.env.liquidity');
        
        // 下一步提示
        console.log('\n📝 下一步:');
        console.log('1. 将LiquidityHelper合约添加到BSDT授权列表');
        console.log('2. 使用LiquidityHelper来添加流动性');
        
        return deployedContract.options.address;
        
    } catch (error) {
        console.error('❌ 部署失败:', error.message);
    }
}

// 如果直接运行
if (require.main === module) {
    deployLiquidityHelper();
}

module.exports = { deployLiquidityHelper };