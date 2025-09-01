import { Row, Col, Card, Statistic, Typography, Progress, Space, Table, Tag, Spin, message, Alert, Tooltip, Badge } from 'antd';
import {
  WalletOutlined,
  RiseOutlined,
  FireOutlined,
  TeamOutlined,
  BankOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  FallOutlined,
  ThunderboltOutlined,
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
    dynamicYieldRate: 70, // 动态收益率 50%-100%
    decayRate: 0, // 衰减率
    burnRate: 5, // 销毁率 5%
    purchaseLimit: 10000, // 单次购买限额
    impermanentLossPool: 0, // 无常损失补偿池
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
      
      // 计算动态收益率 (50%-100% 基于总质押量)
      const totalStakedNum = Number(ethers.formatUnits(totalStaked, 18));
      let dynamicYieldRate = 100; // 默认100%
      if (totalStakedNum > 100000000) { // 超过1亿
        dynamicYieldRate = Math.max(50, 100 - (totalStakedNum - 100000000) / 2000000); // 每200万减1%
      }
      
      // 计算衰减率
      let decayRate = 0;
      if (totalStakedNum > 110000000) { // 超过1.1亿开始衰减
        decayRate = Math.min(50, (totalStakedNum - 110000000) / 1000000 * 0.1); // 每100万减0.1%
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
        totalStaked: totalStakedNum,
        totalNodes: nodeCount,
        maxNodes: 99,
        dynamicYieldRate: dynamicYieldRate,
        decayRate: decayRate,
        burnRate: 5,
        purchaseLimit: 10000,
        impermanentLossPool: totalStakedNum * 0.01, // 假设1%用于无常损失补偿
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

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Alert
              message="系统机制提示"
              description={
                <Space direction="vertical">
                  <Text>• 销毁率: 每笔交易自动销毁 {stats.burnRate}%</Text>
                  <Text>• 购买限制: 单次最大购买 {stats.purchaseLimit.toLocaleString()} HCF</Text>
                  <Text>• 赎回机制: BSDT/HCF 1:1 赎回保障</Text>
                  <Text>• 无常损失: 补偿池 {stats.impermanentLossPool.toFixed(0)} HCF</Text>
                </Space>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="HCF 价格"
                value={stats.price}
                prefix="$"
                suffix=""
                valueStyle={{ color: '#3f8600' }}
                precision={3}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                稳定区间: $0.099 - $0.101
              </Text>
              <Badge status="processing" text={`销毁率: ${stats.burnRate}%`} style={{ marginTop: 8 }} />
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
                title={<Space><FireOutlined />已销毁</Space>}
                value={stats.burned}
                suffix="HCF"
                valueStyle={{ color: '#ff4d4f' }}
                formatter={(value) => {
                  const num = Number(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
                  return num.toFixed(0);
                }}
              />
              <Progress 
                percent={Math.min((stats.burned / 990000000) * 100, 100)} 
                strokeColor="#ff4d4f" 
                showInfo={false} 
              />
              <Badge status="processing" text={`销毁率: ${stats.burnRate}%`} />
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
          <Col xs={24} lg={8}>
            <Card title="动态收益" extra={<ThunderboltOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">当前动态收益率</Text>
                  <Title level={3} style={{ margin: '8px 0', color: '#52c41a' }}>
                    {stats.dynamicYieldRate.toFixed(1)}%
                  </Title>
                  <Progress 
                    percent={stats.dynamicYieldRate} 
                    strokeColor={{
                      '0%': '#ff4d4f',
                      '50%': '#faad14',
                      '100%': '#52c41a',
                    }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    范围: 50% - 100%
                  </Text>
                </div>
                
                {stats.decayRate > 0 && (
                  <Alert
                    message={`衰减状态: -${stats.decayRate.toFixed(1)}%`}
                    description={`总质押量超过1.1亿，收益衰减${stats.decayRate.toFixed(1)}%`}
                    type="warning"
                    showIcon
                    icon={<FallOutlined />}
                  />
                )}
                
                <div style={{ background: '#f0f2f5', padding: 12, borderRadius: 8 }}>
                  <Text strong>实际收益计算</Text>
                  <div style={{ marginTop: 8 }}>
                    <Text>基础: 1000 HCF</Text><br />
                    <Text>动态: × {stats.dynamicYieldRate}%</Text><br />
                    {stats.decayRate > 0 && (
                      <><Text>衰减: - {stats.decayRate}%</Text><br /></>
                    )}
                    <Text strong style={{ color: '#52c41a' }}>
                      实际: {(1000 * stats.dynamicYieldRate / 100 * (1 - stats.decayRate / 100)).toFixed(0)} HCF
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
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

          <Col xs={24} lg={8}>
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
                    render: (val) => (
                      <Space>
                        <Text strong>+{val} HCF</Text>
                        <Tooltip title={`销毁 ${(Number(val) * 0.05).toFixed(2)} HCF (5%)`}>
                          <Tag color="red" style={{ fontSize: 10 }}>-5%</Tag>
                        </Tooltip>
                      </Space>
                    ),
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
                    title={<Tooltip title="初始总供应量 10亿 HCF">总供应量</Tooltip>}
                    value={stats.totalSupply}
                    suffix="HCF"
                    prefix={<FireOutlined />}
                    formatter={(value) => {
                      const num = Number(value);
                      if (num >= 1000000000) return `${(num / 1000000000).toFixed(0)}B`;
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