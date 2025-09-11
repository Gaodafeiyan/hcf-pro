import React from 'react';
import { Layout, Menu, Space, Typography, Badge, Drawer, Button, Dropdown } from 'antd';
import { Link, useLocation } from 'react-router-dom';
// import { ConnectButton } from '@rainbow-me/rainbowkit'; // 已被WalletConnection替代
import { useState } from 'react';
import {
  DashboardOutlined,
  BankOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  TrophyOutlined,
  SwapOutlined,
  SettingOutlined,
  FireOutlined,
  MenuOutlined,
  BulbOutlined,
  BulbFilled,
  GlobalOutlined,
} from '@ant-design/icons';
import WalletConnection from '../WalletConnection';
import { useAccount, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../../config/contracts';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const LayoutComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { isDark, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/staking', icon: <BankOutlined />, label: t('menu.staking') },
    { key: '/node', icon: <NodeIndexOutlined />, label: t('menu.node') },
    { key: '/referral', icon: <TeamOutlined />, label: t('menu.referral') },
    { key: '/ranking', icon: <TrophyOutlined />, label: t('menu.ranking') },
    { key: '/exchange', icon: <SwapOutlined />, label: t('menu.exchange') },
    { key: '/governance', icon: <SettingOutlined />, label: t('menu.governance') },
    { key: '/test', icon: <BulbOutlined />, label: '测试页面' },
  ];
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };
  
  const languageMenuItems = [
    {
      key: 'zh',
      label: '中文',
      onClick: () => changeLanguage('zh'),
    },
    {
      key: 'en',
      label: 'English',
      onClick: () => changeLanguage('en'),
    },
  ];
  
  // 监听窗口大小变化
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { data: hcfBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.HCFToken as `0x${string}`,
  });
  
  const { data: bsdtBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.BSDT as `0x${string}`,
  });

  const MenuContent = () => (
    <Menu
      theme={isDark ? "dark" : "light"}
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems.map(item => ({
        key: item.key,
        icon: item.icon,
        label: <Link to={item.key} onClick={() => setDrawerVisible(false)}>{item.label}</Link>,
      }))}
      style={{ background: 'transparent' }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      <Sider 
        width={220} 
        className="desktop-sider"
        style={{ 
          background: isDark ? '#001529' : '#f0f2f5',
          display: !isMobile ? 'block' : 'none'
        }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Space>
            <FireOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>HCF DeFi</Title>
          </Space>
        </div>
        <MenuContent />
        <div style={{ 
          position: 'absolute', 
          bottom: 20, 
          left: 20, 
          right: 20,
          color: 'rgba(255,255,255,0.45)',
          fontSize: 12,
          textAlign: 'center'
        }}>
          <Text type="secondary">BSC Mainnet</Text>
          <br />
          <Text type="secondary">v1.0.0</Text>
        </div>
      </Sider>

      {/* 移动端抽屉 */}
      <Drawer
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        bodyStyle={{ padding: 0, background: '#001529' }}
        width={220}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Space>
            <FireOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>HCF DeFi</Title>
          </Space>
        </div>
        <MenuContent />
      </Drawer>

      <Layout>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 24px',
          background: isDark ? '#001529' : '#fff',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Space>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: '#fff', fontSize: 20 }} />}
                onClick={() => setDrawerVisible(true)}
              />
            )}
            {!isMobile && (
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                {menuItems.find(item => item.key === location.pathname)?.label || '仪表盘'}
              </Title>
            )}
          </Space>
          
          <Space size="middle">
            {isConnected && !isMobile && (
              <Space>
                <Badge 
                  count={hcfBalance ? `${Number(hcfBalance.formatted).toFixed(2)} HCF` : '0 HCF'} 
                  style={{ backgroundColor: '#52c41a' }} 
                />
                <Badge 
                  count={bsdtBalance ? `${Number(bsdtBalance.formatted).toFixed(2)} BSDT` : '0 BSDT'} 
                  style={{ backgroundColor: '#1890ff' }} 
                />
              </Space>
            )}
            <Dropdown
              menu={{ items: languageMenuItems }}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<GlobalOutlined style={{ color: '#fff', fontSize: 18 }} />}
                title={i18n.language === 'zh' ? 'Switch Language' : '切换语言'}
              >
                {i18n.language === 'zh' ? '中' : 'EN'}
              </Button>
            </Dropdown>
            <Button
              type="text"
              icon={isDark ? <BulbFilled style={{ color: '#fadb14', fontSize: 18 }} /> : <BulbOutlined style={{ color: '#fff', fontSize: 18 }} />}
              onClick={toggleTheme}
              title={isDark ? t('common.switchToLight') : t('common.switchToDark')}
            />
            <WalletConnection size="small" showNetworkInfo={false} showBalance={false} />
          </Space>
        </Header>

        <Content style={{ 
          margin: '24px',
          padding: 24,
          background: isDark ? '#141414' : '#ffffff',
          borderRadius: 8,
          minHeight: 280,
          overflow: 'auto',
          boxShadow: isDark ? 'none' : '0 1px 2px 0 rgba(0,0,0,0.03)'
        }}>
          {/* 测试页面不需要钱包连接 */}
          {location.pathname === '/test' ? (
            children
          ) : isConnected ? (
            children
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '60vh',
              textAlign: 'center'
            }}>
              <FireOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
              <Title level={2}>Welcome to HCF DeFi Platform</Title>
              <Text type="secondary" style={{ marginBottom: 32 }}>
                {t('common.pleaseConnectWallet')}
              </Text>
              <WalletConnection size="large" showNetworkInfo={true} showBalance={false} />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutComponent;