import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'HCF DeFi Platform',
  projectId: '2c8e9d8b7a3f5e1d4b6c9a2f8e7d3c1b', // 临时测试用ID - 生产环境请替换
  chains: [bscTestnet],
  ssr: false,
});