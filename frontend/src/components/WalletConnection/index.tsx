import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { Button, Card, Space, Typography, Alert, Divider } from 'antd';
import { WalletOutlined, SwapOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { NETWORK_CONFIG } from '../../config/contracts';

const { Text, Title } = Typography;

interface WalletConnectionProps {
  showNetworkInfo?: boolean;
  showBalance?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ 
  showNetworkInfo = true, 
  showBalance = true,
  size = 'middle'
}) => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();

  // 检查是否连接到正确的网络
  const isCorrectNetwork = chain?.id === NETWORK_CONFIG.chainId;

  // 切换到BSC主网
  const handleSwitchToBSC = () => {
    if (switchNetwork) {
      switchNetwork(NETWORK_CONFIG.chainId);
    }
  };

  // 格式化地址显示
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-connection">
      {/* 主连接按钮 */}
      <div className="connect-button-wrapper">
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === 'authenticated');

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button
                        type="primary"
                        size={size}
                        icon={<WalletOutlined />}
                        onClick={openConnectModal}
                        className="connect-wallet-btn"
                      >
                        连接钱包
                      </Button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <Button
                        type="default"
                        danger
                        size={size}
                        icon={<ExclamationCircleOutlined />}
                        onClick={openChainModal}
                      >
                        网络错误
                      </Button>
                    );
                  }

                  return (
                    <Space>
                      <Button
                        type="default"
                        size={size}
                        onClick={openChainModal}
                        icon={chain.hasIcon ? (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        ) : <SwapOutlined />}
                      >
                        {chain.name}
                      </Button>

                      <Button
                        type="primary"
                        size={size}
                        onClick={openAccountModal}
                        icon={<WalletOutlined />}
                      >
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ''}
                      </Button>
                    </Space>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {/* 网络状态提示 */}
      {isConnected && showNetworkInfo && (
        <div className="network-status" style={{ marginTop: 16 }}>
          {!isCorrectNetwork ? (
            <Alert
              message="网络错误"
              description={
                <div>
                  <Text>请切换到 BSC 主网以使用 HCF DeFi 功能</Text>
                  <br />
                  <Button
                    type="link"
                    size="small"
                    loading={isSwitching}
                    onClick={handleSwitchToBSC}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    点击切换到 BSC 主网
                  </Button>
                </div>
              }
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          ) : (
            <Alert
              message="网络连接正常"
              description={`已连接到 ${NETWORK_CONFIG.chainName}`}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          )}
        </div>
      )}

      {/* 连接状态信息 */}
      {isConnected && showBalance && (
        <Card 
          size="small" 
          style={{ marginTop: 16 }}
          title={
            <Space>
              <WalletOutlined />
              <Text>钱包信息</Text>
            </Space>
          }
        >
          <div className="wallet-info">
            <div className="info-row">
              <Text type="secondary">地址：</Text>
              <Text code copyable={{ text: address }}>
                {formatAddress(address || '')}
              </Text>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="info-row">
              <Text type="secondary">网络：</Text>
              <Text strong style={{ 
                color: isCorrectNetwork ? '#52c41a' : '#ff4d4f' 
              }}>
                {chain?.name || '未知网络'}
              </Text>
            </div>

            <div className="info-row" style={{ marginTop: 8 }}>
              <Text type="secondary">链ID：</Text>
              <Text>{chain?.id || 'N/A'}</Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WalletConnection;