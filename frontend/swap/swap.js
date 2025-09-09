// Web3实例和合约
let web3;
let accounts = [];
let contracts = {};

// 初始化
window.addEventListener('load', async () => {
    initEventListeners();
    
    // 检查是否已连接钱包
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        
        // 检查之前是否已连接
        const savedAddress = localStorage.getItem('connectedAddress');
        if (savedAddress) {
            await connectWallet();
        }
    } else {
        showToast('请安装MetaMask钱包', 'error');
    }
});

// 事件监听
function initEventListeners() {
    // 连接钱包
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
    
    // 输入监听
    document.getElementById('usdtAmount').addEventListener('input', updateConversion);
    
    // 兑换按钮
    document.getElementById('approveBtn').addEventListener('click', approveUSDT);
    document.getElementById('swapBtn').addEventListener('click', executeSwap);
}

// 连接钱包
async function connectWallet() {
    try {
        // 请求连接
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 检查网络
        const chainId = await web3.eth.getChainId();
        if (chainId !== CONFIG.chainId) {
            await switchNetwork();
        }
        
        // 初始化合约
        initContracts();
        
        // 更新UI
        updateWalletUI(accounts[0]);
        
        // 保存地址
        localStorage.setItem('connectedAddress', accounts[0]);
        
        // 加载余额
        await loadBalances();
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
        
        showToast('钱包连接成功', 'success');
    } catch (error) {
        console.error('连接钱包失败:', error);
        showToast('连接钱包失败: ' + error.message, 'error');
    }
}

// 切换网络
async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }] // BSC主网
        });
    } catch (error) {
        if (error.code === 4902) {
            // 添加网络
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x38',
                    chainName: 'BSC Mainnet',
                    nativeCurrency: {
                        name: 'BNB',
                        symbol: 'BNB',
                        decimals: 18
                    },
                    rpcUrls: ['https://bsc-dataseed1.binance.org'],
                    blockExplorerUrls: ['https://bscscan.com']
                }]
            });
        }
    }
}

// 初始化合约
function initContracts() {
    contracts.USDT = new web3.eth.Contract(CONFIG.abis.ERC20, CONFIG.contracts.USDT);
    contracts.BSDT = new web3.eth.Contract(CONFIG.abis.ERC20, CONFIG.contracts.BSDT);
    contracts.HCF = new web3.eth.Contract(CONFIG.abis.ERC20, CONFIG.contracts.HCF);
    contracts.Gateway = new web3.eth.Contract(CONFIG.abis.Gateway, CONFIG.contracts.Gateway);
    contracts.Router = new web3.eth.Contract(CONFIG.abis.Router, CONFIG.contracts.Router);
    contracts.Factory = new web3.eth.Contract(CONFIG.abis.Factory, CONFIG.contracts.Factory);
}

// 断开钱包
function disconnectWallet() {
    accounts = [];
    localStorage.removeItem('connectedAddress');
    updateWalletUI(null);
    showToast('钱包已断开', 'info');
}

// 更新钱包UI
function updateWalletUI(address) {
    const connectBtn = document.getElementById('connectWallet');
    const walletInfo = document.getElementById('walletInfo');
    const walletAddress = document.getElementById('walletAddress');
    const swapBtn = document.getElementById('swapBtn');
    
    if (address) {
        connectBtn.style.display = 'none';
        walletInfo.style.display = 'flex';
        walletAddress.textContent = address.slice(0, 6) + '...' + address.slice(-4);
        swapBtn.textContent = '兑换';
        swapBtn.disabled = false;
    } else {
        connectBtn.style.display = 'block';
        walletInfo.style.display = 'none';
        swapBtn.textContent = '连接钱包开始兑换';
        swapBtn.disabled = true;
    }
}

// 账户变化处理
function handleAccountsChanged(newAccounts) {
    if (newAccounts.length === 0) {
        disconnectWallet();
    } else {
        accounts = newAccounts;
        updateWalletUI(accounts[0]);
        loadBalances();
    }
}

// 加载余额
async function loadBalances() {
    if (accounts.length === 0) return;
    
    try {
        const address = accounts[0];
        
        // 获取余额
        const usdtBalance = await contracts.USDT.methods.balanceOf(address).call();
        const bsdtBalance = await contracts.BSDT.methods.balanceOf(address).call();
        const hcfBalance = await contracts.HCF.methods.balanceOf(address).call();
        
        // 更新显示
        const formatBalance = (balance) => (Number(balance) / 1e18).toFixed(4);
        
        document.getElementById('usdtBalance').textContent = formatBalance(usdtBalance);
        document.getElementById('displayUsdtBalance').textContent = formatBalance(usdtBalance);
        document.getElementById('displayBsdtBalance').textContent = formatBalance(bsdtBalance);
        document.getElementById('displayHcfBalance').textContent = formatBalance(hcfBalance);
        
        // 检查授权
        await checkAllowance();
    } catch (error) {
        console.error('加载余额失败:', error);
    }
}

// 检查授权
async function checkAllowance() {
    if (accounts.length === 0) return;
    
    const address = accounts[0];
    const allowance = await contracts.USDT.methods.allowance(address, CONFIG.contracts.Gateway).call();
    
    const approveBtn = document.getElementById('approveBtn');
    const swapBtn = document.getElementById('swapBtn');
    
    if (Number(allowance) === 0) {
        approveBtn.style.display = 'block';
        swapBtn.style.display = 'none';
    } else {
        approveBtn.style.display = 'none';
        swapBtn.style.display = 'block';
    }
}

// 更新转换显示
async function updateConversion() {
    const usdtAmount = document.getElementById('usdtAmount').value;
    
    if (!usdtAmount || Number(usdtAmount) <= 0) {
        document.getElementById('bsdtReceive').textContent = '0.0';
        document.getElementById('hcfReceive').textContent = '0.0';
        return;
    }
    
    // USDT → BSDT (1:1)
    document.getElementById('bsdtReceive').textContent = usdtAmount;
    
    // BSDT → HCF (需要查询池子价格)
    try {
        if (contracts.Router) {
            const amountIn = web3.utils.toWei(usdtAmount);
            const path = [CONFIG.contracts.BSDT, CONFIG.contracts.HCF];
            
            // 获取HCF/BSDT池子
            const pairAddress = await contracts.Factory.methods.getPair(CONFIG.contracts.BSDT, CONFIG.contracts.HCF).call();
            
            if (pairAddress !== '0x0000000000000000000000000000000000000000') {
                // 池子存在，获取预估输出
                const amounts = await contracts.Router.methods.getAmountsOut(amountIn, path).call();
                const hcfAmount = Number(amounts[1]) / 1e18;
                const hcfAfterTax = hcfAmount * 0.98; // 扣除2%买入税
                
                document.getElementById('hcfReceive').textContent = hcfAfterTax.toFixed(4);
                
                const price = Number(usdtAmount) / hcfAfterTax;
                document.getElementById('hcfPrice').textContent = `(1 HCF ≈ ${price.toFixed(6)} BSDT)`;
            } else {
                document.getElementById('hcfReceive').textContent = '池子未创建';
                document.getElementById('hcfPrice').textContent = '(等待添加流动性)';
            }
        }
    } catch (error) {
        console.error('获取价格失败:', error);
        document.getElementById('hcfPrice').textContent = '(价格获取失败)';
    }
}

// 授权USDT
async function approveUSDT() {
    if (accounts.length === 0) return;
    
    try {
        showToast('正在授权...', 'info');
        
        const tx = await contracts.USDT.methods
            .approve(CONFIG.contracts.Gateway, CONFIG.settings.maxApprove)
            .send({ from: accounts[0] });
        
        showToast('授权成功!', 'success');
        await checkAllowance();
        
        // 添加交易记录
        addTransaction('授权 USDT', 'Unlimited', tx.transactionHash);
    } catch (error) {
        console.error('授权失败:', error);
        showToast('授权失败: ' + error.message, 'error');
    }
}

// 执行兑换
async function executeSwap() {
    if (accounts.length === 0) return;
    
    const usdtAmount = document.getElementById('usdtAmount').value;
    if (!usdtAmount || Number(usdtAmount) <= 0) {
        showToast('请输入有效的USDT数量', 'error');
        return;
    }
    
    try {
        const amount = web3.utils.toWei(usdtAmount);
        const address = accounts[0];
        
        // 检查余额
        const balance = await contracts.USDT.methods.balanceOf(address).call();
        if (Number(balance) < Number(amount)) {
            showToast('USDT余额不足', 'error');
            return;
        }
        
        showToast('正在执行兑换...', 'info');
        
        // Step 1: USDT → BSDT (通过Gateway)
        const tx1 = await contracts.Gateway.methods
            .exchangeUSDTtoBSDT(amount)
            .send({ 
                from: address,
                gas: CONFIG.settings.gasLimit
            });
        
        showToast('USDT → BSDT 兑换成功!', 'success');
        addTransaction('USDT → BSDT', usdtAmount, tx1.transactionHash);
        
        // Step 2: 检查是否有HCF/BSDT池子
        const pairAddress = await contracts.Factory.methods.getPair(CONFIG.contracts.BSDT, CONFIG.contracts.HCF).call();
        
        if (pairAddress !== '0x0000000000000000000000000000000000000000') {
            // 池子存在，可以兑换HCF
            showToast('正在兑换HCF...', 'info');
            
            // 授权BSDT给Router
            const bsdtAllowance = await contracts.BSDT.methods.allowance(address, CONFIG.contracts.Router).call();
            if (Number(bsdtAllowance) < Number(amount)) {
                await contracts.BSDT.methods
                    .approve(CONFIG.contracts.Router, CONFIG.settings.maxApprove)
                    .send({ from: address });
            }
            
            // 执行swap
            const deadline = Math.floor(Date.now() / 1000) + CONFIG.settings.deadline;
            const path = [CONFIG.contracts.BSDT, CONFIG.contracts.HCF];
            const amountOutMin = 0; // 接受任何数量（实际应该计算滑点）
            
            const tx2 = await contracts.Router.methods
                .swapExactTokensForTokens(
                    amount,
                    amountOutMin,
                    path,
                    address,
                    deadline
                )
                .send({ 
                    from: address,
                    gas: CONFIG.settings.gasLimit
                });
            
            showToast('BSDT → HCF 兑换成功!', 'success');
            addTransaction('BSDT → HCF', usdtAmount, tx2.transactionHash);
        } else {
            showToast('HCF池子未创建，已获得BSDT', 'info');
        }
        
        // 刷新余额
        await loadBalances();
        
        // 清空输入
        document.getElementById('usdtAmount').value = '';
        updateConversion();
        
    } catch (error) {
        console.error('兑换失败:', error);
        showToast('兑换失败: ' + error.message, 'error');
    }
}

// 添加交易记录
function addTransaction(type, amount, hash) {
    const txHistory = document.getElementById('txHistory');
    
    // 移除空状态提示
    const emptyState = txHistory.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // 创建交易项
    const txItem = document.createElement('div');
    txItem.className = 'tx-item';
    txItem.innerHTML = `
        <div class="tx-type">${type}</div>
        <div class="tx-amount">${amount} ${type.includes('USDT') ? 'USDT' : ''}</div>
        <div class="tx-hash">
            <a href="${CONFIG.explorer}/tx/${hash}" target="_blank">
                ${hash.slice(0, 10)}...${hash.slice(-8)}
            </a>
        </div>
    `;
    
    // 添加到顶部
    txHistory.insertBefore(txItem, txHistory.firstChild);
    
    // 限制显示数量
    const items = txHistory.querySelectorAll('.tx-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
}

// 显示提示
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}