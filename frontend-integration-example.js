// 前端集成示例代码 - Web3.js / Ethers.js
// 此文件展示如何在前端DApp中与HCF智能合约交互

// === 配置部分 ===
const CONTRACT_ADDRESSES = {
  HCF_TOKEN: "0x307C9E9aC72Ae586a487e121396D04902C9d9f23",
  BSDT_TOKEN: "0x68cC44200F281957C2a2255FB3109e385E230Adb",
  HCF_BSDT_EXCHANGE: "0x94bd9DFeCe66Fe0025B0A2d475Bdf503D8cf1A6E",
  HCF_STAKING: "0x648697cb586097011Bb33001c1B33e18863A07b0",
  HCF_NODE_NFT: "0xaDc67Ca37E2F33e0F614d0E8D939DCcd0AB47dBC",
  MULTISIG_WALLET: "0xA2b3ABFeDC4D5de93ec959c8BD36CD0aa982C3C9",
  HCF_ROUTER: "0x0e3EEe3d2B37ce43c85B4A616251A7bF7BA6aD23"
};

const BSC_TESTNET_CONFIG = {
  chainId: "0x61", // 97 in hex
  chainName: "BSC Testnet",
  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18
  },
  blockExplorerUrls: ["https://testnet.bscscan.com/"]
};

// === 1. 连接钱包 ===
async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // 请求连接钱包
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // 切换到BSC测试网
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_TESTNET_CONFIG.chainId }],
        });
      } catch (switchError) {
        // 如果网络不存在，添加网络
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET_CONFIG],
          });
        }
      }
      
      return accounts[0];
    } catch (error) {
      console.error("连接钱包失败:", error);
    }
  } else {
    alert("请安装MetaMask钱包!");
  }
}

// === 2. 查询余额 ===
async function getBalances(userAddress) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  // HCF余额
  const hcfContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_TOKEN,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const hcfBalance = await hcfContract.balanceOf(userAddress);
  
  // BSDT余额
  const bsdtContract = new ethers.Contract(
    CONTRACT_ADDRESSES.BSDT_TOKEN,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const bsdtBalance = await bsdtContract.balanceOf(userAddress);
  
  return {
    hcf: ethers.utils.formatEther(hcfBalance),
    bsdt: ethers.utils.formatEther(bsdtBalance)
  };
}

// === 3. HCF转账（含税费计算） ===
async function transferHCF(toAddress, amount) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const hcfContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_TOKEN,
    [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function transferTaxRate() view returns (uint256)"
    ],
    signer
  );
  
  // 获取转账税率
  const taxRate = await hcfContract.transferTaxRate();
  const taxAmount = (amount * taxRate) / 10000; // 税率基于10000
  const actualReceived = amount - taxAmount;
  
  // 显示税费信息给用户
  const confirmed = confirm(`
    转账详情:
    发送数量: ${amount} HCF
    税费 (${taxRate/100}%): ${taxAmount} HCF
    对方实际收到: ${actualReceived} HCF
    
    确认转账?
  `);
  
  if (confirmed) {
    const tx = await hcfContract.transfer(
      toAddress, 
      ethers.utils.parseEther(amount.toString())
    );
    await tx.wait();
    return tx.hash;
  }
}

// === 4. 质押HCF ===
async function stakeHCF(amount, isLP = false, isEquity = false) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  // 先授权
  const hcfContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_TOKEN,
    ["function approve(address spender, uint256 amount) returns (bool)"],
    signer
  );
  
  const amountWei = ethers.utils.parseEther(amount.toString());
  
  // 授权质押合约
  const approveTx = await hcfContract.approve(
    CONTRACT_ADDRESSES.HCF_STAKING,
    amountWei
  );
  await approveTx.wait();
  
  // 执行质押
  const stakingContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_STAKING,
    ["function stake(uint256 amount, bool isLP, bool isEquity) returns (bool)"],
    signer
  );
  
  const stakeTx = await stakingContract.stake(amountWei, isLP, isEquity);
  await stakeTx.wait();
  
  return stakeTx.hash;
}

// === 5. 查询质押信息 ===
async function getStakingInfo(userAddress) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  const stakingContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_STAKING,
    [
      "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt, uint256 level, uint256 lastStakeTime, uint256 lockEndTime)",
      "function pendingRewards(address) view returns (uint256)",
      "function totalStaked() view returns (uint256)"
    ],
    provider
  );
  
  const userInfo = await stakingContract.userInfo(userAddress);
  const pendingRewards = await stakingContract.pendingRewards(userAddress);
  const totalStaked = await stakingContract.totalStaked();
  
  // 计算APY（基于等级）
  const levelAPY = {
    0: 0,
    1: 1460, // 4% * 365
    2: 1825, // 5% * 365
    3: 2190, // 6% * 365
    4: 2555, // 7% * 365
    5: 2920  // 8% * 365
  };
  
  return {
    stakedAmount: ethers.utils.formatEther(userInfo.amount),
    level: userInfo.level.toString(),
    apy: levelAPY[userInfo.level] || 0,
    pendingRewards: ethers.utils.formatEther(pendingRewards),
    totalStaked: ethers.utils.formatEther(totalStaked),
    lockEndTime: new Date(userInfo.lockEndTime * 1000)
  };
}

// === 6. 领取质押奖励 ===
async function claimRewards() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const stakingContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_STAKING,
    ["function claimReward() returns (bool)"],
    signer
  );
  
  const tx = await stakingContract.claimReward();
  await tx.wait();
  
  return tx.hash;
}

// === 7. 申请节点NFT ===
async function applyForNode() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const nodeContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_NODE_NFT,
    [
      "function baseFee() view returns (uint256)",
      "function applyForNode() returns (uint256)"
    ],
    signer
  );
  
  // 获取申请费用
  const baseFee = await nodeContract.baseFee();
  
  // 授权BSDT
  const bsdtContract = new ethers.Contract(
    CONTRACT_ADDRESSES.BSDT_TOKEN,
    ["function approve(address spender, uint256 amount) returns (bool)"],
    signer
  );
  
  const approveTx = await bsdtContract.approve(
    CONTRACT_ADDRESSES.HCF_NODE_NFT,
    baseFee
  );
  await approveTx.wait();
  
  // 申请节点
  const applyTx = await nodeContract.applyForNode();
  await applyTx.wait();
  
  return applyTx.hash;
}

// === 8. 查询节点信息 ===
async function getNodeInfo(userAddress) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  const nodeContract = new ethers.Contract(
    CONTRACT_ADDRESSES.HCF_NODE_NFT,
    [
      "function balanceOf(address) view returns (uint256)",
      "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
      "function nodeInfo(uint256) view returns (uint256 computingPower, uint256 level, uint256 lastRewardTime)"
    ],
    provider
  );
  
  const balance = await nodeContract.balanceOf(userAddress);
  
  if (balance.gt(0)) {
    const tokenId = await nodeContract.tokenOfOwnerByIndex(userAddress, 0);
    const info = await nodeContract.nodeInfo(tokenId);
    
    return {
      hasNode: true,
      tokenId: tokenId.toString(),
      computingPower: info.computingPower.toString(),
      level: info.level.toString(),
      lastRewardTime: new Date(info.lastRewardTime * 1000)
    };
  }
  
  return { hasNode: false };
}

// === 使用示例 ===
async function initDApp() {
  // 1. 连接钱包
  const userAddress = await connectWallet();
  console.log("已连接钱包:", userAddress);
  
  // 2. 获取余额
  const balances = await getBalances(userAddress);
  console.log("HCF余额:", balances.hcf);
  console.log("BSDT余额:", balances.bsdt);
  
  // 3. 获取质押信息
  const stakingInfo = await getStakingInfo(userAddress);
  console.log("质押信息:", stakingInfo);
  
  // 4. 获取节点信息
  const nodeInfo = await getNodeInfo(userAddress);
  console.log("节点信息:", nodeInfo);
}

// 导出函数供前端使用
export {
  connectWallet,
  getBalances,
  transferHCF,
  stakeHCF,
  getStakingInfo,
  claimRewards,
  applyForNode,
  getNodeInfo,
  CONTRACT_ADDRESSES,
  BSC_TESTNET_CONFIG
};