/**
 * 部署BSDTTokenV2合约
 * 移除了过度的DEX限制，允许添加流动性
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

async function deployBSDTV2() {
    try {
        // 导入账户
        const privateKey = process.env.KEEPER_PRIVATE_KEY.startsWith('0x') 
            ? process.env.KEEPER_PRIVATE_KEY 
            : '0x' + process.env.KEEPER_PRIVATE_KEY;
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('🚀 部署BSDTTokenV2合约');
        console.log('部署账户:', account.address);
        
        // 检查余额
        const balance = await web3.eth.getBalance(account.address);
        console.log('BNB余额:', Web3.utils.fromWei(balance, 'ether'));
        
        // 合约参数
        const usdtToken = '0x0000000000000000000000000000000000000000'; // 测试网暂时用0地址
        const usdtOracle = '0x0000000000000000000000000000000000000000'; // 暂时不用Oracle
        const keeperAddress = account.address;
        const lpPool = account.address; // 初始流动性接收地址
        
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
        const contractData = loadContract('BSDTTokenV2');
        if (!contractData) {
            throw new Error('无法加载BSDTTokenV2合约');
        }
        
        // 创建合约实例
        const contract = new web3.eth.Contract(contractData.abi);
        
        // 部署合约
        console.log('\n部署BSDTTokenV2合约...');
        const deployTx = contract.deploy({
            data: contractData.bytecode,
            arguments: [usdtToken, usdtOracle, keeperAddress, lpPool]
        });
        
        const gas = await deployTx.estimateGas({ from: account.address });
        console.log('预估Gas:', gas);
        
        const deployedContract = await deployTx.send({
            from: account.address,
            gas: Math.floor(Number(gas) * 1.2), // 增加20% gas
            gasPrice: '10000000000' // 10 gwei
        });
        
        console.log('\n✅ BSDTTokenV2部署成功！');
        console.log('合约地址:', deployedContract.options.address);
        console.log('查看合约: https://testnet.bscscan.com/address/' + deployedContract.options.address);
        
        // 更新.env.liquidity
        const envPath = path.join(__dirname, '..', '.env.liquidity');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // 替换或添加BSDT_TOKEN_V2
        if (envContent.includes('BSDT_TOKEN_V2=')) {
            envContent = envContent.replace(/BSDT_TOKEN_V2=.*/, `BSDT_TOKEN_V2=${deployedContract.options.address}`);
        } else {
            envContent += `\n# BSDTTokenV2合约（修复DEX限制）\nBSDT_TOKEN_V2=${deployedContract.options.address}\n`;
        }
        
        // 更新BSDT_TOKEN为新地址
        envContent = envContent.replace(/BSDT_TOKEN=.*/, `BSDT_TOKEN=${deployedContract.options.address}`);
        
        fs.writeFileSync(envPath, envContent);
        console.log('\n地址已更新到.env.liquidity');
        
        // 授权当前账户和PancakeRouter
        console.log('\n授权地址...');
        const authorizedAddresses = [
            account.address,                                    // 当前账户
            '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',      // PancakeRouter
            process.env.LIQUIDITY_HELPER                        // LiquidityHelper
        ].filter(Boolean);
        
        for (const addr of authorizedAddresses) {
            console.log(`授权 ${addr}...`);
            try {
                await deployedContract.methods.updateWhitelist(addr, true).send({
                    from: account.address,
                    gas: 100000,
                    gasPrice: '10000000000'
                });
                console.log('  ✅ 已添加到白名单');
            } catch (e) {
                console.log('  ⚠️ 授权失败:', e.message);
            }
        }
        
        console.log('\n📝 下一步:');
        console.log('1. 测试新BSDT的approve和transfer功能');
        console.log('2. 使用新BSDT测试添加流动性');
        console.log('3. 更新所有脚本使用新的BSDT地址');
        
        return deployedContract.options.address;
        
    } catch (error) {
        console.error('❌ 部署失败:', error.message);
    }
}

// 如果直接运行
if (require.main === module) {
    deployBSDTV2();
}

module.exports = { deployBSDTV2 };