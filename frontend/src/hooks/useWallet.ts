import { useAccount, useNetwork, useSwitchNetwork, useBalance } from 'wagmi';
import { useEffect, useState } from 'react';
import { NETWORK_CONFIG } from '../config/contracts';

export interface WalletState {
  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;
  address: string | undefined;
  
  // 网络状态
  chainId: number | undefined;
  isCorrectNetwork: boolean;
  isSwitchingNetwork: boolean;
  
  // 余额信息
  bnbBalance: string;
  isLoadingBalance: boolean;
  
  // 操作方法
  switchToCorrectNetwork: () => void;
}

export const useWallet = (): WalletState => {
  const { address, isConnected, isConnecting } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitchingNetwork } = useSwitchNetwork();
  
  // 获取BNB余额
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address: address,
    watch: true, // 实时监听余额变化
  });

  const [bnbBalance, setBnbBalance] = useState('0');

  // 检查是否连接到正确的网络
  const isCorrectNetwork = chain?.id === NETWORK_CONFIG.chainId;

  // 切换到正确的网络
  const switchToCorrectNetwork = () => {
    if (switchNetwork && !isCorrectNetwork) {
      switchNetwork(NETWORK_CONFIG.chainId);
    }
  };

  // 更新BNB余额显示
  useEffect(() => {
    if (balanceData) {
      const balance = parseFloat(balanceData.formatted);
      setBnbBalance(balance.toFixed(4));
    } else {
      setBnbBalance('0');
    }
  }, [balanceData]);

  // 自动切换网络（可选）
  useEffect(() => {
    if (isConnected && !isCorrectNetwork && switchNetwork) {
      // 可以在这里添加自动切换逻辑，但建议让用户手动选择
      console.log('检测到错误网络，请手动切换到BSC主网');
    }
  }, [isConnected, isCorrectNetwork, switchNetwork]);

  return {
    // 连接状态
    isConnected,
    isConnecting,
    address,
    
    // 网络状态
    chainId: chain?.id,
    isCorrectNetwork,
    isSwitchingNetwork,
    
    // 余额信息
    bnbBalance,
    isLoadingBalance,
    
    // 操作方法
    switchToCorrectNetwork,
  };
};

// 钱包工具函数
export const walletUtils = {
  // 格式化地址显示
  formatAddress: (address: string, start = 6, end = 4): string => {
    if (!address) return '';
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  },

  // 格式化余额显示
  formatBalance: (balance: string | number, decimals = 4): string => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
  },

  // 检查地址有效性
  isValidAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  // 复制地址到剪贴板
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('复制失败:', error);
      return false;
    }
  },

  // 在区块浏览器中查看地址
  openInExplorer: (address: string, type: 'address' | 'tx' = 'address'): void => {
    const baseUrl = NETWORK_CONFIG.blockExplorerUrls[0];
    const url = `${baseUrl}${type}/${address}`;
    window.open(url, '_blank');
  },
};
