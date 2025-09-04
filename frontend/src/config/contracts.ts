// 合约地址配置（BSC测试网 - 2025-09-04 最新部署）
export const CONTRACT_ADDRESSES = {
  HCFToken: '0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc',  // 正确地址
  BSDT: '0x91152b436A5b3535E01902Cf09a3c59Ab4c433BD',      // BSDT V2 (无DEX限制)
  USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',      // BSC Testnet USDT
  HCFStaking: '0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74', // 正确地址
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

// 质押等级配置（自动等级，起步1000 HCF）
export const STAKING_LEVELS = [
  { 
    level: 1, 
    minAmount: 10, 
    maxAmount: 99,
    dailyRate: 0.4, // 基础日化 0.4%
    lpRate: 0.8,    // LP日化 0.8%
    totalRate: 0.8, // LP总收益 0.8%
    color: '#52c41a'
  },
  { 
    level: 2, 
    minAmount: 100, 
    maxAmount: 999,
    dailyRate: 0.5, // 基础日化 0.5%
    lpRate: 1.0,    // LP日化 1.0%
    totalRate: 1.0, // LP总收益 1.0%
    color: '#1890ff'
  },
  { 
    level: 3, 
    minAmount: 1000, 
    maxAmount: 9999,
    dailyRate: 0.6, // 基础日化 0.6%
    lpRate: 1.2,    // LP日化 1.2%
    totalRate: 1.2, // LP总收益 1.2%
    color: '#722ed1'
  },
  { 
    level: 4, 
    minAmount: 10000, 
    maxAmount: 99999,
    dailyRate: 0.7, // 基础日化 0.7%
    lpRate: 1.4,    // LP日化 1.4%
    totalRate: 1.4, // LP总收益 1.4%
    color: '#fa8c16'
  },
  { 
    level: 5, 
    minAmount: 100000, 
    maxAmount: Infinity,
    dailyRate: 0.8, // 基础日化 0.8%
    lpRate: 1.6,    // LP日化 1.6%
    totalRate: 1.6, // LP总收益 1.6%
    color: '#f5222d'
  },
];

// 复投固定金额选项
export const COMPOUND_AMOUNTS = [10, 20, 200, 2000, 20000];

// 质押配置
export const STAKING_CONFIG = {
  minStakeAmount: 1000, // 起步1000 HCF
  multipleRequired: 10, // 必须10倍数
  dailyLimit: 500,      // 每日限购500 HCF
};

// 前期限制配置
export const EARLY_PHASE_CONFIG = {
  minStakeAmount: 1000,  // 前期最低1000 HCF
  enabledLevels: [3, 4, 5],  // 只开放L3、L4、L5
  dailyLimit: 500,  // 每日限购500 HCF
};

// 节点NFT配置
export const NODE_NFT_CONFIG = {
  maxNodes: 99,
  applicationFee: 5000, // 5000 BSDT/HCF
  priceThreshold: 1.3, // 1.3U价格阈值
  activationFeeHCF: 1000, // 激活费1000 HCF
  activationFeeBSDT: 1000, // 激活费1000 BSDT
  powerFormula: 'LP/1000*100%', // 算力公式
};

// 团队等级配置（20级推荐体系）
export const TEAM_LEVELS = [
  { level: 'V1', requirement: '小区业绩2000 HCF', rewardRate: 6, color: '#52c41a' },
  { level: 'V2', requirement: '小区业绩2万 + 2个V1', rewardRate: 12, color: '#1890ff' },
  { level: 'V3', requirement: '小区业绩10万 + 2个V2', rewardRate: 18, color: '#722ed1' },
  { level: 'V4', requirement: '小区业绩50万 + 2个V3', rewardRate: 24, color: '#fa8c16' },
  { level: 'V5', requirement: '小区业绩300万 + 1个V4', rewardRate: 30, color: '#f5222d' },
  { level: 'V6', requirement: '小区业绩2000万 + 2个V4', rewardRate: 36, color: '#eb2f96' },
];

// 推荐奖励配置
export const REFERRAL_CONFIG = {
  depositRewards: [5, 3], // 入金奖励：一代5%，二代3%
  staticRewards: [20, 10, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2], // 20级静态奖励
  burnRates: {
    referral: 10, // 推荐烧伤10%
    team: 5,      // 团队烧伤5%
  },
};