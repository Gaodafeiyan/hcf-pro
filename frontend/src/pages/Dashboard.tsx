import { Row, Col, Card, Statistic, Typography, Progress, Space, Table, Tag, Spin, message } from 'antd';
import {
  WalletOutlined,
  RiseOutlined,
  FireOutlined,
  TeamOutlined,
  BankOutlined,
  DollarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  getHCFTokenContract, 
  getStakingContract,
  getReferralContract,
  getNodeNFTContract
} from '../utils/contracts';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSupply: 0,
    circulatingSupply: 0,
    burned: 0,
    price: 0,
    marketCap: 0,
    holders: 0,
    totalStaked: 0,
    totalNodes: 0,
  });

  const [userStats, setUserStats] = useState({
    balance: 0,
    staked: 0,
    dailyReward: 0,
    referralReward: 0,
    teamLevel: 'V0',
    ranking: 0,
  });

  // 加载合约数据
  const loadContractData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // 获取合约实例
      const hcfToken = getHCFTokenContract(signer);
      const staking = getStakingContract(signer);
      const referral = getReferralContract(signer);
      const nodeNFT = getNodeNFTContract(signer);
      
      // 获取代币信息
      const [totalSupply, burned, hcfBalance] = await Promise.all([
        hcfToken.totalSupply(),
        hcfToken.totalBurned(),
        hcfToken.balanceOf(address),
      ]);
      
      // 获取质押信息
      const stakingInfo = await staking.getUserInfo(address);
      const totalStaked = await staking.getTotalStaked();
      
      // 获取推荐信息
      const referralInfo = await referral.getUserData(address);
      
      // 获取节点信息（预留后续使用）
      await nodeNFT.balanceOf(address);
      
      // 计算流通量
      const circulatingSupply = totalSupply - burned;
      
      // 设置状态
      setStats({
        totalSupply: Number(ethers.formatUnits(totalSupply, 18)),
        circulatingSupply: Number(ethers.formatUnits(circulatingSupply, 18)),
        burned: Number(ethers.formatUnits(burned, 18)),
        price: 0.1, // 需要从交易所合约获取实际价格
        marketCap: Number(ethers.formatUnits(circulatingSupply, 18)) * 0.1,
        holders: 1250, // 需要从链上事件统计
        totalStaked: Number(ethers.formatUnits(totalStaked, 18)),
        totalNodes: 45, // 需要从NFT合约获取总发行量
      });
      
      setUserStats({
        balance: Number(ethers.formatUnits(hcfBalance, 18)),
        staked: Number(ethers.formatUnits(stakingInfo.amount, 18)),
        dailyReward: Number(ethers.formatUnits(stakingInfo.pending, 18)),
        referralReward: Number(ethers.formatUnits(referralInfo.totalReferralReward, 18)),
        teamLevel: `V${referralInfo.teamLevel}`,
        ranking: 0, // 需要从排名合约获取
      });
      
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };
  
  // 监听账户变化
  useEffect(() => {
    if (isConnected && address) {
      loadContractData();
      
      // 每30秒刷新一次数据
      const interval = setInterval(loadContractData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  const recentTransactions = [
    { key: '1', type: '质押', amount: 1000, time: '2分钟前', status: 'success' },
    { key: '2', type: '领取奖励', amount: 35, time: '1小时前', status: 'success' },
    { key: '3', type: '推荐奖励', amount: 50, time: '3小时前', status: 'success' },
    { key: '4', type: '节点分红', amount: 200, time: '1天前', status: 'success' },
  ];

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>请先连接钱包</Title>
        <Text type="secondary">连接钱包后查看您的资产和收益数据</Text>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={2}>仪表盘</Title>
        <Text type="secondary">实时数据概览</Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="HCF 价格"
                value={stats.price}
                prefix="$"
                suffix="USDT"
                valueStyle={{ color: '#3f8600' }}
                precision={4}
              />
              <Progress percent={75} strokeColor="#52c41a" showInfo={false} />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总市值"
                value={stats.marketCap}
                prefix="$"
                valueStyle={{ color: '#1890ff' }}
              />
              <Space>
                <RiseOutlined style={{ color: '#52c41a' }} />
                <Text type="success">+12.5%</Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已销毁"
                value={stats.burned}
                suffix="HCF"
                valueStyle={{ color: '#ff4d4f' }}
              />
              <Progress 
                percent={Math.min((stats.burned / 990000) * 100, 100)} 
                strokeColor="#ff4d4f" 
                showInfo={false} 
              />
              <Text type="secondary">目标: 990,000</Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="节点数量"
                value={stats.totalNodes}
                suffix="/ 99"
                valueStyle={{ color: '#722ed1' }}
              />
              <Progress percent={45} strokeColor="#722ed1" showInfo={false} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="我的资产" extra={<WalletOutlined />}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="HCF 余额"
                    value={userStats.balance}
                    suffix="HCF"
                    precision={2}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="质押数量"
                    value={userStats.staked}
                    suffix="HCF"
                    precision={2}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="日收益"
                    value={userStats.dailyReward}
                    suffix="HCF"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="推荐收益"
                    value={userStats.referralReward}
                    suffix="HCF"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
              
              <div style={{ marginTop: 24 }}>
                <Space>
                  <Tag color="purple">团队等级: {userStats.teamLevel}</Tag>
                  <Tag color="gold">排名: #{userStats.ranking}</Tag>
                </Space>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="最近交易" extra={<ClockCircleOutlined />}>
              <Table
                dataSource={recentTransactions}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '类型',
                    dataIndex: 'type',
                    key: 'type',
                    render: (text) => <Tag>{text}</Tag>,
                  },
                  {
                    title: '数量',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (val) => <Text strong>+{val} HCF</Text>,
                  },
                  {
                    title: '时间',
                    dataIndex: 'time',
                    key: 'time',
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: () => <Tag color="success">成功</Tag>,
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="系统统计">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="总质押量"
                    value={stats.totalStaked}
                    suffix="HCF"
                    prefix={<BankOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="持币地址"
                    value={stats.holders}
                    prefix={<TeamOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="流通量"
                    value={stats.circulatingSupply}
                    suffix="HCF"
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="总供应量"
                    value={stats.totalSupply}
                    suffix="HCF"
                    prefix={<FireOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;