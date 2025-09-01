import { useState } from 'react';
import { Row, Col, Card, Typography, Space, Tag, Table, Statistic, Tabs } from 'antd';
import { TrophyOutlined, CrownOutlined, FireOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Ranking = () => {
  const [activeTab, setActiveTab] = useState('staking');

  // 模拟数据
  const stakingRanking = [
    { key: '1', rank: 1, address: '0x1234...5678', amount: 50000, dailyReward: 400, level: 5 },
    { key: '2', rank: 2, address: '0x2345...6789', amount: 45000, dailyReward: 360, level: 5 },
    { key: '3', rank: 3, address: '0x3456...7890', amount: 40000, dailyReward: 320, level: 4 },
    { key: '4', rank: 4, address: '0x4567...8901', amount: 35000, dailyReward: 280, level: 4 },
    { key: '5', rank: 5, address: '0x5678...9012', amount: 30000, dailyReward: 240, level: 3 },
  ];

  const referralRanking = [
    { key: '1', rank: 1, address: '0x1234...5678', teamLevel: 'V6', teamVolume: 2000000, totalReward: 50000 },
    { key: '2', rank: 2, address: '0x2345...6789', teamLevel: 'V5', teamVolume: 1500000, totalReward: 35000 },
    { key: '3', rank: 3, address: '0x3456...7890', teamLevel: 'V4', teamVolume: 1000000, totalReward: 25000 },
    { key: '4', rank: 4, address: '0x4567...8901', teamLevel: 'V3', teamVolume: 800000, totalReward: 18000 },
    { key: '5', rank: 5, address: '0x5678...9012', teamLevel: 'V2', teamVolume: 500000, totalReward: 12000 },
  ];

  const nodeRanking = [
    { key: '1', rank: 1, address: '0x1234...5678', nodeId: 23, power: 150, totalDividends: 8000 },
    { key: '2', rank: 2, address: '0x2345...6789', nodeId: 45, power: 140, totalDividends: 7500 },
    { key: '3', rank: 3, address: '0x3456...7890', nodeId: 67, power: 130, totalDividends: 7000 },
    { key: '4', rank: 4, address: '0x4567...8901', nodeId: 89, power: 120, totalDividends: 6500 },
    { key: '5', rank: 5, address: '0x5678...9012', nodeId: 12, power: 110, totalDividends: 6000 },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <CrownOutlined style={{ color: '#FFD700', fontSize: 20 }} />;
      case 2: return <CrownOutlined style={{ color: '#C0C0C0', fontSize: 18 }} />;
      case 3: return <CrownOutlined style={{ color: '#CD7F32', fontSize: 16 }} />;
      default: return <Text strong>#{rank}</Text>;
    }
  };

  const stakingColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <Space>
          {getRankIcon(rank)}
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '质押量',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => `${val.toLocaleString()} HCF`,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: number) => (
        <Tag color="blue">等级 {level}</Tag>
      ),
    },
    {
      title: '日收益',
      dataIndex: 'dailyReward',
      key: 'dailyReward',
      render: (val: number) => (
        <Text strong style={{ color: '#52c41a' }}>+{val} HCF</Text>
      ),
    },
  ];

  const referralColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <Space>
          {getRankIcon(rank)}
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '团队等级',
      dataIndex: 'teamLevel',
      key: 'teamLevel',
      render: (level: string) => (
        <Tag color="purple">{level}</Tag>
      ),
    },
    {
      title: '团队业绩',
      dataIndex: 'teamVolume',
      key: 'teamVolume',
      render: (val: number) => `${val.toLocaleString()} HCF`,
    },
    {
      title: '累计奖励',
      dataIndex: 'totalReward',
      key: 'totalReward',
      render: (val: number) => (
        <Text strong style={{ color: '#52c41a' }}>+{val} HCF</Text>
      ),
    },
  ];

  const nodeColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <Space>
          {getRankIcon(rank)}
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '节点编号',
      dataIndex: 'nodeId',
      key: 'nodeId',
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: '算力',
      dataIndex: 'power',
      key: 'power',
      render: (val: number) => (
        <Tag color="green">{val}</Tag>
      ),
    },
    {
      title: '累计分红',
      dataIndex: 'totalDividends',
      key: 'totalDividends',
      render: (val: number) => (
        <Text strong style={{ color: '#52c41a' }}>+{val} HCF</Text>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>排行榜</Title>
      <Text type="secondary">查看各维度排名，争夺奖励</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="质押排行榜"
              value={stakingRanking.length}
              suffix="人"
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="推荐排行榜"
              value={referralRanking.length}
              suffix="人"
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="节点排行榜"
              value={nodeRanking.length}
              suffix="个"
              prefix={<CrownOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="我的排名"
              value={156}
              suffix="名"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'staking',
              label: (
                <Space>
                  <BankOutlined />
                  质押排行
                </Space>
              ),
              children: (
                <Table
                  dataSource={stakingRanking}
                  columns={stakingColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
            {
              key: 'referral',
              label: (
                <Space>
                  <TeamOutlined />
                  推荐排行
                </Space>
              ),
              children: (
                <Table
                  dataSource={referralRanking}
                  columns={referralColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
            {
              key: 'node',
              label: (
                <Space>
                  <CrownOutlined />
                  节点排行
                </Space>
              ),
              children: (
                <Table
                  dataSource={nodeRanking}
                  columns={nodeColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="奖励规则" extra={<TrophyOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>质押排行榜奖励</Text>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  • 第1名：1000 HCF<br />
                  • 第2名：800 HCF<br />
                  • 第3名：600 HCF<br />
                  • 第4-10名：300 HCF<br />
                  • 第11-50名：100 HCF
                </Text>
              </div>
              <div>
                <Text strong>推荐排行榜奖励</Text>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  • 第1名：2000 HCF<br />
                  • 第2名：1500 HCF<br />
                  • 第3名：1000 HCF<br />
                  • 第4-10名：500 HCF<br />
                  • 第11-100名：100 HCF
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="更新规则" extra={<FireOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>更新频率</Text>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  • 实时更新：质押量、推荐业绩<br />
                  • 每日更新：节点分红<br />
                  • 每周结算：排行榜奖励
                </Text>
              </div>
              <div>
                <Text strong>排名规则</Text>
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  • 质押排行：按质押总量排序<br />
                  • 推荐排行：按团队业绩排序<br />
                  • 节点排行：按累计分红排序
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Ranking;
