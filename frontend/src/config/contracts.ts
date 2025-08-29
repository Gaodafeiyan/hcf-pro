// 合约地址配置（BSC测试网）
export const CONTRACT_ADDRESSES = {
  HCFToken: '0x09F3d4c7a8B5E4f2C3D8e1A6B9F2C7D5E3A1B4C2',
  BSDT: '0x12A4B6C8D9E3F1A2B5C7D8E9F0A1B2C3D4E5F6A7',
  HCFStaking: '0x23B5C7D8E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4',
  HCFNode: '0x34C6D8E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5',
  HCFReferral: '0x45D7E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6',
  HCFRanking: '0x56E8F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7',
  HCFBurnMechanism: '0x67F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8',
  HCFMarketControl: '0x78A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9',
  HCFBSDTExchange: '0x89B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9CA',
  MultiSigWallet: '0xABD3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9CADBE',
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