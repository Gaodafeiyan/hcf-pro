import { useState } from 'react';
import { Button, Card, Typography, Space, message } from 'antd';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';

const { Title, Text } = Typography;

const Test = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(false);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [network, setNetwork] = useState<string>('');

  const testConnection = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        message.error('MetaMask未安装');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      setNetwork(`Chain ID: ${network.chainId}`);
      setBlockNumber(block);
      
      message.success('连接测试成功！');
    } catch (error: any) {
      console.error('测试失败:', error);
      message.error(`测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testButtonClick = () => {
    message.info('按钮点击正常工作！');
    console.log('Button clicked at:', new Date().toISOString());
  };

  return (
    <Card title="前端功能测试页面" style={{ maxWidth: 600, margin: '50px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        <div>
          <Title level={4}>1. 基础按钮测试</Title>
          <Button type="primary" onClick={testButtonClick}>
            点击测试
          </Button>
        </div>

        <div>
          <Title level={4}>2. 钱包连接状态</Title>
          <Text>状态: {isConnected ? '已连接' : '未连接'}</Text>
          <br />
          <Text>地址: {address || '无'}</Text>
          <br />
          <Space style={{ marginTop: 8 }}>
            {!isConnected ? (
              connectors.map((connector) => (
                <Button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                >
                  连接 {connector.name}
                </Button>
              ))
            ) : (
              <Button onClick={() => disconnect()}>
                断开连接
              </Button>
            )}
          </Space>
        </div>

        <div>
          <Title level={4}>3. 区块链连接测试</Title>
          <Button 
            type="primary" 
            loading={loading} 
            onClick={testConnection}
          >
            测试区块链连接
          </Button>
          {blockNumber > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text>网络: {network}</Text>
              <br />
              <Text>最新区块: {blockNumber}</Text>
            </div>
          )}
        </div>

        <div>
          <Title level={4}>4. 环境信息</Title>
          <Text>window.ethereum: {window.ethereum ? '✅ 存在' : '❌ 不存在'}</Text>
          <br />
          <Text>User Agent: {navigator.userAgent.substring(0, 50)}...</Text>
        </div>

      </Space>
    </Card>
  );
};

export default Test;