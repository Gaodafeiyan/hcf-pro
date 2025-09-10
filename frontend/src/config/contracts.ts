// 合约地址配置（BSC主网 - 2025-09-10 最新部署）
export const CONTRACT_ADDRESSES = {
  HCFToken: '0xc5c3f24a212838968759045d1654d3643016d585',
  BSDT: '0x6f5DaF12BAe217aE14210D589719eccC0Cf908', 
  USDT: '0x55d398326f99059fF775485246999027B3197955', // BSC主网USDT
  HCFStaking: '0x42C343c61a630d0107B752001caCd50EfbDD13f6',
  HCFNode: '0x10b4284eafdc92f448d29db58f1ccc784e8230ad',
  HCFReferral: '0x7fBc3bB1e4943f44CF158703B045a1198c99C405',
  HCFTeamRewards: '0x5E165C46B47eCA24c7B251910c95bD8f49A2F0c6',
  HCFMultiLevelRewards: '0xA8eF43F26eda5736159efDBb8ccA26D4F6b473C6',
  HCFRankingRewards: '0x212Ec53B84bb091E663dDf68306b00cbCE30c13C',
  HCFAutoSwap: '0x83714243313D69AE9d21B09d2f336e9A2713B8A5',
  HCFAntiDump: '0xff9d8c2f579cb2b6e663b05f2f0d1e19dcb3eb5a',
  LiquidityPool: '0x53df45a3260af4b7590a53ce11e7a1f8df5a8048',
} as const;

// 网络配置
export const NETWORK_CONFIG = {
  chainId: 56, // BSC主网
  chainName: 'BSC Mainnet',
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  blockExplorerUrls: ['https://bscscan.com/'],
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