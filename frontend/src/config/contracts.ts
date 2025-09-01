// 合约地址配置（BSC测试网）
export const CONTRACT_ADDRESSES = {
  HCFToken: '0x09F320b75e6A74994713a0e4Be54eF8f09fbaEcc',
  BSDT: '0x622e568976f6cC2eaE4cfd3836d92F111000E787',
  HCFStaking: '0x6E4e682Cc90124Ef66a8cfC8Fc875CF5Ee8E8a74',
  HCFNode: '0xac851E1494a87dEb81D777AD34c02C6cA04e66Ea',
  HCFReferral: '0x40C12569C35464CA7E3D9e5Fd30B949972694b8b',
  HCFRanking: '0x56E8F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7',
  HCFBurnMechanism: '0x67F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8',
  HCFMarketControl: '0x78A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9',
  HCFBSDTExchange: '0x5BEb9574EDaD01F182A3A573F8f251F6DaE80D00',
  MultiSigWallet: '0x3df246f746e9Ec8FF7d72056DAec0bC0FbdFe4eC',
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
  { level: 1, minAmount: 100, dailyRate: 0.4, color: '#52c41a' },
  { level: 2, minAmount: 1000, dailyRate: 0.5, color: '#1890ff' },
  { level: 3, minAmount: 5000, dailyRate: 0.6, color: '#722ed1' },
  { level: 4, minAmount: 10000, dailyRate: 0.7, color: '#fa8c16' },
  { level: 5, minAmount: 50000, dailyRate: 0.8, color: '#f5222d' },
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