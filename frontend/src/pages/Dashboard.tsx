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
  getNodeNFTContract,
  getExchangeContract
} from '../utils/contracts';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSupply: 1000000000, // 10亿初始供应
    circulatingSupply: 1000000000,
    burned: 0,
    price: 0.1, // HCF价格
    priceUSD: 0.1, // USD价格
    marketCap: 0,
    holders: 0,
    totalStaked: 0,
    totalNodes: 0,
    maxNodes: 99, // 最大节点数
  });

  const [userStats, setUserStats] = useState({
    balance: 0,
    staked: 0,
    dailyReward: 0,
    referralReward: 0,
    teamLevel: 'V0',
    ranking: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

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
      
      // 获取节点数量
      let nodeCount = 0;
      try {
        const totalNodes = await nodeNFT.totalSupply();
        nodeCount = Number(totalNodes);
      } catch (error) {
        console.log('获取节点数量失败');
      }
      
      // 计算流通量
      const circulatingSupply = totalSupply - burned;
      
      // 获取价格 (从Exchange合约获取汇率)
      let hcfPrice = 0.1; // 默认价格
      try {
        const exchangeContract = getExchangeContract(signer);
        const reserves = await exchangeContract.getReserves();
        const hcfReserve = Number(ethers.formatUnits(reserves.hcfReserve, 18));
        const usdtReserve = Number(ethers.formatUnits(reserves.bsdtReserve, 18));
        if (hcfReserve > 0) {
          hcfPrice = usdtReserve / hcfReserve; // USDT/HCF 价格
        }
      } catch (error) {
        console.log('获取价格失败，使用默认值');
      }
      
      // 设置状态
      const totalSupplyNum = Number(ethers.formatUnits(totalSupply, 18));
      const circulatingSupplyNum = Number(ethers.formatUnits(circulatingSupply, 18));
      const burnedNum = Number(ethers.formatUnits(burned, 18));
      
      setStats({
        totalSupply: totalSupplyNum,
        circulatingSupply: circulatingSupplyNum,
        burned: burnedNum,
        price: hcfPrice,
        priceUSD: hcfPrice,
        marketCap: circulatingSupplyNum * hcfPrice,
        holders: 0, // 需要后端或索引器支持
        totalStaked: Number(ethers.formatUnits(totalStaked, 18)),
        totalNodes: nodeCount,
        maxNodes: 99,
      });
      
      // 计算日收益
      const stakedAmount = Number(ethers.formatUnits(stakingInfo.amount, 18));
      const stakingLevel = Number(stakingInfo.level);
      let dailyReward = 0;
      
      if (stakingLevel > 0 && stakedAmount > 0) {
        // 根据等级计算日收益率
        const dailyRates = [0.004, 0.005, 0.006, 0.007, 0.008]; // 0.4%, 0.5%, 0.6%, 0.7%, 0.8%
        const rate = dailyRates[stakingLevel - 1] || 0;
        dailyReward = stakedAmount * rate;
      }
      
      setUserStats({
        balance: Number(ethers.formatUnits(hcfBalance, 18)),
        staked: stakedAmount,
        dailyReward: dailyReward,
        referralReward: Number(ethers.formatUnits(referralInfo.totalReferralReward, 18)),
        teamLevel: Number(referralInfo.teamLevel) > 0 ? `V${referralInfo.teamLevel}` : 'V0',
        ranking: 0,
      });
      
      // 模拟交易记录（实际应从链上事件获取）
      const mockTransactions = [
        { key: '1', type: '质押', amount: stakedAmount > 0 ? stakedAmount.toFixed(2) : '0', time: '2分钟前', status: 'success' },
        { key: '2', type: '领取', amount: dailyReward.toFixed(2), time: '1小时前', status: 'success' },
        { key: '3', type: '兑换', amount: '100', time: '3小时前', status: 'success' },
      ].filter(tx => Number(tx.amount) > 0);
      
      setRecentTransactions(mockTransactions);
      
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
                suffix=""
                valueStyle={{ color: '#3f8600' }}
                precision={4}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                24h: <Text type={stats.price > 0.1 ? "success" : "danger"}>
                  {stats.price > 0.1 ? '+' : ''}{((stats.price - 0.1) / 0.1 * 100).toFixed(2)}%
                </Text>
              </Text>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总市值"
                value={stats.marketCap}
                prefix="$"
                valueStyle={{ color: '#1890ff' }}
                formatter={(value) => {
                  const num = Number(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
                  return num.toFixed(2);
                }}
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
              <Progress 
                percent={Math.round((stats.totalNodes / stats.maxNodes) * 100)} 
                strokeColor="#722ed1" 
                showInfo={false} 
              />
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
                    formatter={(value) => {
                      const num = Number(value);
                      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                      if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
                      return num.toFixed(0);
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="持币地址"
                    value={stats.holders || 'N/A'}
                    prefix={<TeamOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="流通量"
                    value={stats.circulatingSupply}
                    suffix="HCF"
                    prefix={<DollarOutlined />}
                    formatter={(value) => {
                      const num = Number(value);
                      if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
                      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                      return num.toFixed(0);
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="总供应量"
                    value={stats.totalSupply}
                    suffix="HCF"
                    prefix={<FireOutlined />}
                    formatter={(value) => {
                      const num = Number(value);
                      if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
                      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                      return num.toFixed(0);
                    }}
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