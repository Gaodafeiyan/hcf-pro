import { Row, Col, Card, Statistic, Typography, Progress, Space, Table, Tag } from 'antd';
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
import { useState } from 'react';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { } = useAccount();
  const [stats] = useState({
    totalSupply: 21000000,
    circulatingSupply: 1000000,
    burned: 10000,
    price: 0.1,
    marketCap: 100000,
    holders: 1250,
    totalStaked: 500000,
    totalNodes: 45,
  });

  // 模拟数据 - 实际应从合约读取
  const userStats = {
    balance: 10000,
    staked: 5000,
    dailyReward: 35,
    referralReward: 120,
    teamLevel: 'V2',
    ranking: 156,
  };

  const recentTransactions = [
    { key: '1', type: '质押', amount: 1000, time: '2分钟前', status: 'success' },
    { key: '2', type: '领取奖励', amount: 35, time: '1小时前', status: 'success' },
    { key: '3', type: '推荐奖励', amount: 50, time: '3小时前', status: 'success' },
    { key: '4', type: '节点分红', amount: 200, time: '1天前', status: 'success' },
  ];

  return (
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
            <Progress percent={1} strokeColor="#ff4d4f" showInfo={false} />
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
  );
};

export default Dashboard;