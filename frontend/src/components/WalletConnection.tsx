

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import '../styles/theme.css';

interface WalletConnectionProps {
  className?: string;
  size?: 'large' | 'middle' | 'small';
  showNetworkInfo?: boolean;
  showBalance?: boolean;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ 
  className = ''
}) => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isLoading, setIsLoading] = useState(false);

  const BSC_MAINNET_ID = 56;
  const isCorrectNetwork = chainId === BSC_MAINNET_ID;

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error('连接钱包失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: BSC_MAINNET_ID });
      } catch (error) {
        console.error('切换网络失败:', error);
      }
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className={`wallet-connection ${className}`}>
        <button
          className="neon-button"
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              连接中...
            </div>
          ) : (
            <>
              <span className="wallet-icon">👛</span>
              连接钱包
            </>
          )}
        </button>
        
      </div>
    );
  }

  return (
    <div className={`wallet-connection connected ${className}`}>
      {!isCorrectNetwork ? (
        <div className="network-warning glass-card">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <span>请切换到 BSC 主网</span>
            <button
              className="neon-button warning"
              onClick={handleSwitchNetwork}
            >
              切换网络
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-info glass-card">
          <div className="address-display">
            <span className="address-label">钱包地址</span>
            <span className="address-value">{formatAddress(address!)}</span>
          </div>
          
          <div className="network-display">
            <span className="network-indicator"></span>
            <span>BSC 主网</span>
          </div>
          
          <button
            className="disconnect-btn"
            onClick={() => disconnect()}
            title="断开连接"
          >
            🔌
          </button>
        </div>
      )}
      
    </div>
  );
};

export default WalletConnection;
