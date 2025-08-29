import { Layout, Menu, Space, Typography, Badge } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  DashboardOutlined,
  BankOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  TrophyOutlined,
  SwapOutlined,
  SettingOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useAccount, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/staking', icon: <BankOutlined />, label: '质押挖矿' },
  { key: '/node', icon: <NodeIndexOutlined />, label: '节点NFT' },
  { key: '/referral', icon: <TeamOutlined />, label: '推荐系统' },
  { key: '/ranking', icon: <TrophyOutlined />, label: '排行榜' },
  { key: '/exchange', icon: <SwapOutlined />, label: 'BSDT兑换' },
  { key: '/governance', icon: <SettingOutlined />, label: '治理' },
];

const LayoutComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { data: hcfBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.HCFToken as `0x${string}`,
  });
  const { data: bsdtBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.BSDT as `0x${string}`,
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#001529',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Space>
          <FireOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0, color: '#fff' }}>
            HCF DeFi Platform
          </Title>
        </Space>
        
        <Space size="large">
          {isConnected && (
            <Space>
              <Badge count={hcfBalance ? `${Number(hcfBalance.formatted).toFixed(2)} HCF` : '0 HCF'} 
                     style={{ backgroundColor: '#52c41a' }} />
              <Badge count={bsdtBalance ? `${Number(bsdtBalance.formatted).toFixed(2)} BSDT` : '0 BSDT'} 
                     style={{ backgroundColor: '#1890ff' }} />
            </Space>
          )}
          <ConnectButton />
        </Space>
      </Header>

      <Layout>
        <Sider width={220} style={{ background: '#001529' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems.map(item => ({
              key: item.key,
              icon: item.icon,
              label: <Link to={item.key}>{item.label}</Link>,
            }))}
          />
          
          <div style={{ 
            position: 'absolute', 
            bottom: 20, 
            left: 20, 
            right: 20,
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12,
            textAlign: 'center'
          }}>
            <Text type="secondary">BSC Testnet</Text>
            <br />
            <Text type="secondary">v1.0.0</Text>
          </div>
        </Sider>

        <Content style={{ 
          margin: '24px',
          padding: 24,
          background: '#141414',
          borderRadius: 8,
          minHeight: 280
        }}>
          {isConnected ? (
            children
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '60vh' 
            }}>
              <FireOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
              <Title level={2}>欢迎来到 HCF DeFi 平台</Title>
              <Text type="secondary" style={{ marginBottom: 32 }}>
                请连接钱包开始使用平台功能
              </Text>
              <ConnectButton />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutComponent;