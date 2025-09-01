import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'HCF DeFi Platform',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // 需要从 WalletConnect 获取
  chains: [bscTestnet],
  ssr: false,
});