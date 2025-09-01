import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Tag, Table, Statistic, Tabs, Spin, Alert, Select, Button, Radio } from 'antd';
import { TrophyOutlined, CrownOutlined, FireOutlined, TeamOutlined, BankOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getStakingContract,
  getReferralContract,
  getNodeNFTContract
} from '../utils/contracts';

const { Title, Text } = Typography;

const Ranking = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('staking');
  const [period, setPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [rankingLimit, setRankingLimit] = useState(100); // Default to top 100, can show up to 2000
  
  const [userStats, setUserStats] = useState({
    stakingAmount: 0,
    stakingLevel: 0,
    teamLevel: 0,
    teamVolume: 0,
    nodeCount: 0,
    estimatedRank: 0,
  });

  // 质押排行榜数据 - 实际生产环境应从后端/索引器获取
  const [stakingRanking] = useState([
    { key: '1', rank: 1, address: '0x1234...5678', amount: 50000, dailyReward: 400, level: 5, bonus: 10000, bonusPercent: 20 },
    { key: '2', rank: 2, address: '0x2345...6789', amount: 45000, dailyReward: 360, level: 5, bonus: 4500, bonusPercent: 10 },
    { key: '3', rank: 3, address: '0x3456...7890', amount: 40000, dailyReward: 320, level: 4, bonus: 4000, bonusPercent: 10 },
    { key: '4', rank: 4, address: '0x4567...8901', amount: 35000, dailyReward: 280, level: 4, bonus: 3500, bonusPercent: 10 },
    { key: '5', rank: 5, address: '0x5678...9012', amount: 30000, dailyReward: 240, level: 3, bonus: 3000, bonusPercent: 10 },
  ]);

  // 小区排行榜数据 (只显示业绩>0且直推>1的)
  const [communityRanking] = useState([
    { key: '1', rank: 1, address: '0x1234...5678', teamLevel: 'V6', communityVolume: 600000, directCount: 20, bonus: 120000, bonusPercent: 20 },
    { key: '2', rank: 2, address: '0x2345...6789', teamLevel: 'V5', communityVolume: 450000, directCount: 15, bonus: 45000, bonusPercent: 10 },
    { key: '3', rank: 3, address: '0x3456...7890', teamLevel: 'V4', communityVolume: 300000, directCount: 12, bonus: 30000, bonusPercent: 10 },
    { key: '4', rank: 4, address: '0x4567...8901', teamLevel: 'V3', communityVolume: 240000, directCount: 8, bonus: 24000, bonusPercent: 10 },
    { key: '5', rank: 5, address: '0x5678...9012', teamLevel: 'V2', communityVolume: 150000, directCount: 5, bonus: 15000, bonusPercent: 10 },
  ]);

  const [nodeRanking] = useState([
    { key: '1', rank: 1, address: '0x1234...5678', nodeId: 23, power: 150, totalDividends: 8000 },
    { key: '2', rank: 2, address: '0x2345...6789', nodeId: 45, power: 140, totalDividends: 7500 },
    { key: '3', rank: 3, address: '0x3456...7890', nodeId: 67, power: 130, totalDividends: 7000 },
    { key: '4', rank: 4, address: '0x4567...8901', nodeId: 89, power: 120, totalDividends: 6500 },
    { key: '5', rank: 5, address: '0x5678...9012', nodeId: 12, power: 110, totalDividends: 6000 },
  ]);

  // 加载用户数据
  const loadUserData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const stakingContract = getStakingContract(signer);
      const referralContract = getReferralContract(signer);
      const nodeContract = getNodeNFTContract(signer);
      
      // 获取质押信息
      let stakingAmount = 0;
      let stakingLevel = 0;
      try {
        const userInfo = await stakingContract.getUserInfo(address);
        stakingAmount = Number(ethers.formatUnits(userInfo.amount, 18));
        stakingLevel = Number(userInfo.level);
      } catch (error) {
        console.log('获取质押信息失败');
      }
      
      // 获取推荐信息
      let teamLevel = 0;
      let teamVolume = 0;
      try {
        const userData = await referralContract.getUserData(address);
        teamLevel = Number(userData.teamLevel);
        teamVolume = Number(ethers.formatUnits(userData.teamVolume, 18));
      } catch (error) {
        console.log('获取推荐信息失败');
      }
      
      // 获取节点信息
      let nodeCount = 0;
      try {
        nodeCount = Number(await nodeContract.balanceOf(address));
      } catch (error) {
        console.log('获取节点信息失败');
      }
      
      // 估算排名（简单示例，实际应从后端获取）
      let estimatedRank = 999;
      if (stakingAmount > 30000) estimatedRank = 5;
      else if (stakingAmount > 20000) estimatedRank = 10;
      else if (stakingAmount > 10000) estimatedRank = 50;
      else if (stakingAmount > 5000) estimatedRank = 100;
      else if (stakingAmount > 1000) estimatedRank = 200;
      
      setUserStats({
        stakingAmount,
        stakingLevel,
        teamLevel,
        teamVolume,
        nodeCount,
        estimatedRank,
      });
      
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
      const interval = setInterval(loadUserData, 60000); // 每分钟更新
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

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
      title: '奖励',
      key: 'reward',
      render: (record: any) => (
        <Space direction="vertical" size="small">
          <Text strong style={{ color: '#52c41a' }}>+{record.bonus.toLocaleString()} HCF</Text>
          <Tag color="gold">{record.bonusPercent}% 加成</Tag>
        </Space>
      ),
    },
  ];

  const communityColumns = [
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
      title: '小区业绩',
      dataIndex: 'communityVolume',
      key: 'communityVolume',
      render: (val: number) => `${val.toLocaleString()} HCF`,
    },
    {
      title: '直推人数',
      dataIndex: 'directCount',
      key: 'directCount',
      render: (val: number) => (
        <Tag color="blue">{val} 人</Tag>
      ),
    },
    {
      title: '奖励',
      key: 'reward',
      render: (record: any) => (
        <Space direction="vertical" size="small">
          <Text strong style={{ color: '#52c41a' }}>+{record.bonus.toLocaleString()} HCF</Text>
          <Tag color="gold">{record.bonusPercent}% 加成</Tag>
        </Space>
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

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>请先连接钱包</Title>
        <Text type="secondary">连接钱包后查看排行榜</Text>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>排行榜</Title>
            <Text type="secondary">查看各维度排名，争夺奖励</Text>
          </Col>
          <Col>
            <Space>
              <Radio.Group value={period} onChange={(e) => setPeriod(e.target.value)} buttonStyle="solid">
                <Radio.Button value="DAY">日榜</Radio.Button>
                <Radio.Button value="WEEK">周榜</Radio.Button>
                <Radio.Button value="MONTH">月榜</Radio.Button>
              </Radio.Group>
              <Select
                value={rankingLimit}
                onChange={setRankingLimit}
                style={{ width: 120 }}
                options={[
                  { value: 10, label: 'Top 10' },
                  { value: 50, label: 'Top 50' },
                  { value: 100, label: 'Top 100' },
                  { value: 500, label: 'Top 500' },
                  { value: 2000, label: 'Top 2000' },
                ]}
              />
              <Button type="primary" ghost>刷新</Button>
            </Space>
          </Col>
        </Row>

        <Alert
          message="排行榜数据说明"
          description="当前显示的是示例数据。完整的排行榜功能需要后端服务或链上索引器支持，以实时追踪和排序所有用户数据。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginTop: 16, marginBottom: 16 }}
        />

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="我的质押量"
                value={userStats.stakingAmount}
                suffix="HCF"
                prefix={<BankOutlined />}
                valueStyle={{ color: '#1890ff' }}
                precision={0}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="团队等级"
                value={`V${userStats.teamLevel}`}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="节点数量"
                value={userStats.nodeCount}
                suffix="个"
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="预估排名"
                value={userStats.estimatedRank}
                suffix="名"
                valueStyle={{ color: '#52c41a' }}
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
                key: 'community',
                label: (
                  <Space>
                    <TeamOutlined />
                    小区排行
                  </Space>
                ),
                children: (
                  <>
                    <Alert
                      message="小区排行规则"
                      description="只显示业绩>0且直推人数>1的用户，按小区业绩（团队业绩减去最大线）排序"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      dataSource={communityRanking.filter(item => item.communityVolume > 0 && item.directCount > 1)}
                      columns={communityColumns}
                      pagination={{
                        pageSize: 20,
                        total: Math.min(rankingLimit, communityRanking.length),
                        showTotal: (total) => `共 ${total} 条记录`,
                      }}
                      size="small"
                    />
                  </>
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
                    • 第1名：基础产出的 <Text strong style={{ color: '#52c41a' }}>20%</Text> 加成<br />
                    • 第2-10名：基础产出的 <Text strong style={{ color: '#52c41a' }}>10%</Text> 加成<br />
                    • 第11-50名：基础产出的 <Text strong style={{ color: '#52c41a' }}>5%</Text> 加成<br />
                    • 第51-100名：基础产出的 <Text strong style={{ color: '#52c41a' }}>3%</Text> 加成<br />
                    • 第101-2000名：基础产出的 <Text strong style={{ color: '#52c41a' }}>1%</Text> 加成
                  </Text>
                </div>
                <div>
                  <Text strong>小区排行榜奖励</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    • 第1名：小区业绩的 <Text strong style={{ color: '#52c41a' }}>20%</Text> 奖励<br />
                    • 第2-10名：小区业绩的 <Text strong style={{ color: '#52c41a' }}>10%</Text> 奖励<br />
                    • 第11-50名：小区业绩的 <Text strong style={{ color: '#52c41a' }}>5%</Text> 奖励<br />
                    • 第51-100名：小区业绩的 <Text strong style={{ color: '#52c41a' }}>3%</Text> 奖励<br />
                    • 第101-2000名：小区业绩的 <Text strong style={{ color: '#52c41a' }}>1%</Text> 奖励<br />
                    • <Text type="warning">仅业绩{'>'}0且直推{'>'}1的用户可参与</Text>
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
                    • 实时更新：质押量、小区业绩<br />
                    • 每日重置：日榜（UTC 00:00）<br />
                    • 每周重置：周榜（周一 UTC 00:00）<br />
                    • 每月重置：月榜（每月1日 UTC 00:00）<br />
                    • 结算时间：每个周期结束时自动结算奖励
                  </Text>
                </div>
                <div>
                  <Text strong>排名规则</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    • 质押排行：按质押总量排序（显示Top 2000）<br />
                    • 小区排行：按小区业绩排序（业绩{'>'}0且直推{'>'}1）<br />
                    • 节点排行：按累计分红排序（持有节点NFT用户）<br />
                    • 同分情况：按达到时间先后排序
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Ranking;