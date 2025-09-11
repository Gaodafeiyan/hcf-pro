import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { injected } from 'wagmi/connectors';
import '../styles/theme.css';

interface WalletConnectionProps {
  className?: string;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ className = '' }) => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [isLoading, setIsLoading] = useState(false);

  const BSC_MAINNET_ID = 56;
  const isCorrectNetwork = chain?.id === BSC_MAINNET_ID;

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
    if (switchNetwork) {
      try {
        await switchNetwork(BSC_MAINNET_ID);
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
        
        <style jsx>{`
          .wallet-connection {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .loading-spinner {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid var(--neon-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .wallet-icon {
            margin-right: 8px;
            font-size: 18px;
          }
        `}</style>
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
      
      <style jsx>{`
        .wallet-connection.connected {
          min-width: 200px;
        }
        
        .network-warning {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--neon-orange);
        }
        
        .warning-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        
        .warning-icon {
          font-size: 16px;
          animation: pulse 2s infinite;
        }
        
        .wallet-info {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 250px;
        }
        
        .address-display {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .address-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .address-value {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          color: var(--neon-blue);
          font-weight: 600;
        }
        
        .network-display {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .network-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--neon-green);
          box-shadow: 0 0 10px var(--neon-green);
          animation: glow 2s ease-in-out infinite;
        }
        
        .disconnect-btn {
          background: transparent;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .disconnect-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }
        
        @media (max-width: 768px) {
          .wallet-info {
            min-width: 200px;
            padding: 10px 12px;
          }
          
          .address-value {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default WalletConnection;
