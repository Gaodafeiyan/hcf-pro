import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// 合约ABI片段
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

const HCF_TOKEN_ABI = [
  ...ERC20_ABI,
  'function buyTaxRate() view returns (uint256)',
  'function sellTaxRate() view returns (uint256)',
  'function transferTaxRate() view returns (uint256)',
  'function totalBurned() view returns (uint256)',
  'function circulatingSupply() view returns (uint256)',
];

const BSDT_TOKEN_ABI = [
  ...ERC20_ABI,
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function totalUSDTLocked() view returns (uint256)',
];

const STAKING_ABI = [
  'function getUserInfo(address user) view returns (uint256 amount, uint256 level, uint256 pending, uint256 totalClaimed, bool isLP, uint256 compoundCount, bool isEquityLP, uint256 lpHCFAmount, uint256 lpBSDTAmount)',
  'function stake(uint256 amount, bool isLP, bool isEquity)',
  'function withdraw(uint256 amount)',
  'function claim()',
  'function compound()',
  'function getTotalStaked() view returns (uint256)',
  'function levels(uint256) view returns (uint256 minAmount, uint256 baseRate, uint256 lpRate, uint256 maxPositions, uint256 compoundUnit)',
];

const NODE_NFT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function getNodeInfo(uint256 tokenId) view returns (address owner, bool isActive, uint256 activationTime, uint256 lpHCFAmount, uint256 onlineRate, uint256 level, uint256 lastUpdateTime, uint256 totalDividends)',
  'function buyNode() payable',
  'function activateNode(uint256 tokenId)',
  'function claimDividends()',
];

const REFERRAL_ABI = [
  'function getUserData(address user) view returns (address referrer, uint256 directCount, uint256 teamLevel, uint256 personalVolume, uint256 teamVolume, uint256 totalReferralReward, uint256 totalTeamReward, bool isActive, uint256 joinTime, uint256 lastRewardTime)',
  'function claimReferralReward()',
  'function claimTeamReward()',
];

const EXCHANGE_ABI = [
  'function swapHCFToUSDT(uint256 hcfAmount) returns (uint256)',
  'function swapUSDTToHCF(uint256 usdtAmount) returns (uint256)',
  'function getReserves() view returns (uint256 hcfReserve, uint256 bsdtReserve)',
  'function sellFeeRate() view returns (uint256)',
  'function minSlippage() view returns (uint256)',
  'function maxSlippage() view returns (uint256)',
  'function addLiquidity(uint256 hcfAmount, uint256 bsdtAmount, bool isEquityLP) returns (uint256)',
];

// 获取合约实例
export const getContract = (address: string, abi: any[], signer?: ethers.Signer) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(address, abi, signer || provider);
};

// HCF代币合约
export const getHCFTokenContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.HCFToken, HCF_TOKEN_ABI, signer);
};

// BSDT代币合约 (实际上用作USDT)
export const getBSDTTokenContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.BSDT, BSDT_TOKEN_ABI, signer);
};

// USDT代币合约 (使用BSDT地址，因为合约中BSDT就是稳定币)
export const getUSDTTokenContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.BSDT, BSDT_TOKEN_ABI, signer);
};

// 质押合约
export const getStakingContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.HCFStaking, STAKING_ABI, signer);
};

// 节点NFT合约
export const getNodeNFTContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.HCFNode, NODE_NFT_ABI, signer);
};

// 推荐合约
export const getReferralContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.HCFReferral, REFERRAL_ABI, signer);
};

// 交易所合约
export const getExchangeContract = (signer?: ethers.Signer) => {
  return getContract(CONTRACT_ADDRESSES.HCFBSDTExchange, EXCHANGE_ABI, signer);
};

// 格式化数字
export const formatNumber = (value: bigint, decimals: number = 18) => {
  return Number(ethers.formatUnits(value, decimals)).toFixed(2);
};

// 解析数字
export const parseNumber = (value: string, decimals: number = 18) => {
  return ethers.parseUnits(value, decimals);
};

// 错误处理
export const handleContractError = (error: any) => {
  console.error('Contract error:', error);
  
  if (error.code === 4001) {
    return '用户拒绝了交易';
  }
  
  if (error.code === -32603) {
    return '网络错误，请检查网络连接';
  }
  
  if (error.message.includes('insufficient funds')) {
    return '余额不足';
  }
  
  if (error.message.includes('execution reverted')) {
    return '交易执行失败，请检查参数';
  }
  
  return '未知错误，请稍后重试';
};

// 等待交易确认
export const waitForTransaction = async (tx: ethers.ContractTransactionResponse) => {
  try {
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    throw handleContractError(error);
  }
};

// 检查网络
export const checkNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('请安装MetaMask钱包');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  
  if (network.chainId !== 97n) {
    throw new Error('请切换到BSC测试网');
  }
  
  return provider;
};

// 连接钱包
export const connectWallet = async () => {
  try {
    await checkNetwork();
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    return provider.getSigner();
  } catch (error) {
    throw handleContractError(error);
  }
};
