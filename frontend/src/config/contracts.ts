// 合约地址配置（BSC测试网 - 2025-09-02 最新部署）
export const CONTRACT_ADDRESSES = {
  HCFToken: '0x78B7D17C3f98BB47955A155F661f9042F1717288',  // 新部署
  BSDT: '0x52E9C19DFF5C8636A6725bd78A9c85ee5045ac15',      // 新部署
  USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',      // BSC Testnet USDT
  HCFStaking: '0x5eA9EDb9446C3FdbAc8ac3BcAf6bF8D8C137D5cD', // 新部署
  HCFNode: '0x6fDB1B1F09665Ac00C26701F5E1F92F4652D6F85',   // 新部署
  HCFReferral: '0x18A468b3dfC71C3bA9F5A801734B219d253C7F27', // 新部署
  HCFRanking: '0x9A27E7f4139aD7a12591ce25e40c863f8A34e956',  // 新部署
  HCFBurnMechanism: '0x693Ac6472a98BFDedfEE8B9892CAb1A00dc7FD24', // 新部署
  HCFMarketControl: '0x532e69A732Ac9152CA2c1212eC55cD7d5c470730', // 新部署
  HCFImpermanentLossProtection: '0x32De00900bD63e8899930778118365ef4556DB0D', // 新部署
  USDTOracle: '0x74F6cFFa06f346b4DF40BF4121f4B27Ab4b22140',  // 新部署
  HCFBSDTExchange: '0x6729c0977325772cF6750eD65f9e3E07f331E104', // 新部署
  MultiSigWallet: '0x534C2c0DF7F06aB6e66E704D4aE809DDa6883737',  // 新部署
} as const;

// 网络配置
export const NETWORK_CONFIG = {
  chainId: 97, // BSC Testnet
  chainName: 'BSC Testnet',
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

// 质押等级配置
export const STAKING_LEVELS = [
  { 
    level: 1, 
    minAmount: 100, 
    dailyRate: 0.4, // 基础日化 0.4%
    lpRate: 0.8,    // LP日化 0.8%
    compoundMultiple: 10, // 复投倍数 10倍
    color: '#52c41a' 
  },
  { 
    level: 2, 
    minAmount: 1000, 
    dailyRate: 0.5, // 基础日化 0.5%
    lpRate: 1.0,    // LP日化 1.0%
    compoundMultiple: 20, // 复投倍数 20倍
    color: '#1890ff' 
  },
  { 
    level: 3, 
    minAmount: 5000, 
    dailyRate: 0.6, // 基础日化 0.6%
    lpRate: 1.2,    // LP日化 1.2%
    compoundMultiple: 200, // 复投倍数 200倍
    color: '#722ed1' 
  },
  { 
    level: 4, 
    minAmount: 10000, 
    dailyRate: 0.7, // 基础日化 0.7%
    lpRate: 1.4,    // LP日化 1.4%
    compoundMultiple: 2000, // 复投倍数 2000倍
    color: '#fa8c16' 
  },
  { 
    level: 5, 
    minAmount: 50000, 
    dailyRate: 0.8, // 基础日化 0.8%
    lpRate: 1.6,    // LP日化 1.6%
    compoundMultiple: 20000, // 复投倍数 20000倍
    color: '#f5222d' 
  },
];

// 团队等级配置
export const TEAM_LEVELS = [
  { level: 'V1', requirement: '直推5人', color: '#52c41a' },
  { level: 'V2', requirement: '直推10人 + 3个V1', color: '#1890ff' },
  { level: 'V3', requirement: '直推15人 + 3个V2', color: '#722ed1' },
  { level: 'V4', requirement: '直推20人 + 3个V3', color: '#fa8c16' },
  { level: 'V5', requirement: '团队业绩100万 + 3个V4', color: '#f5222d' },
  { level: 'V6', requirement: '团队业绩500万 + 3个V5', color: '#eb2f96' },
];