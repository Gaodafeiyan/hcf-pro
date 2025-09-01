import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, InputNumber, Typography, Space, Tag, Table, Modal, message, Spin } from 'antd';
import {
  BankOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RocketOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getHCFTokenContract,
  getStakingContract,
  parseNumber,
  waitForTransaction,
  handleContractError
} from '../utils/contracts';
import { STAKING_LEVELS } from '../config/contracts';

const { Title, Text } = Typography;

const Staking = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [staking, setStaking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [balance, setBalance] = useState(0);
  
  const [stakingInfo, setStakingInfo] = useState({
    totalStaked: 0,
    currentLevel: 1,
    dailyReward: 0,
    totalRewards: 0,
    claimableRewards: 0,
    stakingTime: '0天',
    lpBonus: false,
    nodeBonus: false,
    compoundCount: 0,
  });

  // 加载用户数据
  const loadUserData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const stakingContract = getStakingContract(signer);
      
      // 获取余额
      const hcfBalance = await hcfToken.balanceOf(address);
      setBalance(Number(ethers.formatUnits(hcfBalance, 18)));
      
      // 获取质押信息
      const userInfo = await stakingContract.getUserInfo(address);
      
      // 解析返回值 (9个值)
      const [amount, level, pending, totalClaimed, isLP, compoundCount, isEquityLP] = userInfo;
      
      // 计算质押天数 (暂时使用当前时间，因为合约没有返回stakingTime)
      const stakingDays = Number(amount) > 0 ? 1 : 0; // 简化处理
      
      // 获取日收益率
      const levelNum = Number(level);
      const dailyRate = levelNum > 0 ? await stakingContract.getDailyRate(levelNum) : 0;
      const dailyReward = Number(ethers.formatUnits(amount, 18)) * Number(dailyRate) / 10000;
      
      setStakingInfo({
        totalStaked: Number(ethers.formatUnits(amount, 18)),
        currentLevel: levelNum,
        dailyReward: dailyReward,
        totalRewards: Number(ethers.formatUnits(totalClaimed, 18)),
        claimableRewards: Number(ethers.formatUnits(pending, 18)),
        stakingTime: `${stakingDays}天`,
        lpBonus: isLP,
        nodeBonus: isEquityLP,
        compoundCount: Number(compoundCount),
      });
      
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 监听账户变化
  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
      const interval = setInterval(loadUserData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  const handleStake = async () => {
    if (stakeAmount < 100) {
      message.error('最小质押数量为 100 HCF');
      return;
    }
    
    // 1000 HCF以上必须是100的倍数
    if (stakeAmount >= 1000 && stakeAmount % 100 !== 0) {
      message.error('1000 HCF以上的质押数量必须是100的倍数');
      return;
    }
    
    if (stakeAmount > balance) {
      message.error('余额不足');
      return;
    }
    setIsStakeModalVisible(true);
  };

  const confirmStake = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    try {
      setStaking(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const stakingContract = getStakingContract(signer);
      
      // 检查余额
      const currentBalance = await hcfToken.balanceOf(address);
      console.log('当前HCF余额:', ethers.formatUnits(currentBalance, 18));
      
      if (currentBalance < parseNumber(stakeAmount.toString(), 18)) {
        message.error('余额不足！');
        setStaking(false);
        return;
      }
      
      // 检查授权
      const stakingAddress = await stakingContract.getAddress();
      const allowance = await hcfToken.allowance(address, stakingAddress);
      const stakeAmountWei = parseNumber(stakeAmount.toString(), 18);
      
      // 如果授权不足，授权一个较大的额度（避免每次都要授权）
      if (allowance < stakeAmountWei) {
        message.info('授权中...');
        // 授权10倍的质押额度或至少10000 HCF
        const approveAmount = stakeAmountWei * BigInt(10) > parseNumber('10000', 18) 
          ? stakeAmountWei * BigInt(10) 
          : parseNumber('10000', 18);
        
        const approveTx = await hcfToken.approve(stakingAddress, approveAmount);
        await waitForTransaction(approveTx);
        message.success('授权成功');
        
        // 等待一下确保授权生效
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 执行质押
      message.info('质押中...');
      console.log('质押参数:', {
        amount: stakeAmount,
        amountWei: stakeAmountWei.toString(),
        stakingContract: stakingAddress
      });
      
      // stake函数需要3个参数: amount, isLP, isEquity
      // 普通质押: isLP=false, isEquity=false
      const stakeTx = await stakingContract.stake(stakeAmountWei, false, false);
      console.log('质押交易发送:', stakeTx.hash);
      
      const receipt = await waitForTransaction(stakeTx);
      console.log('质押交易完成:', receipt);
      
      message.success(`成功质押 ${stakeAmount} HCF`);
      setIsStakeModalVisible(false);
      
      // 刷新数据
      await loadUserData();
      
    } catch (error: any) {
      console.error('质押失败:', error);
      message.error(handleContractError(error));
    } finally {
      setStaking(false);
    }
  };

  const handleClaim = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    if (stakingInfo.claimableRewards <= 0) {
      message.error('没有可领取的奖励');
      return;
    }
    
    try {
      setClaiming(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = getStakingContract(signer);
      
      message.info('领取奖励中...');
      const claimTx = await stakingContract.claim();
      await waitForTransaction(claimTx);
      
      message.success(`成功领取 ${stakingInfo.claimableRewards.toFixed(2)} HCF 奖励`);
      
      // 刷新数据
      await loadUserData();
      
    } catch (error: any) {
      console.error('领取失败:', error);
      message.error(handleContractError(error));
    } finally {
      setClaiming(false);
    }
  };

  const getLevelForAmount = (amount: number) => {
    for (let i = STAKING_LEVELS.length - 1; i >= 0; i--) {
      if (amount >= STAKING_LEVELS[i].minAmount) {
        return i;
      }
    }
    return 0;
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>请先连接钱包</Title>
        <Text type="secondary">连接钱包后开始质押挖矿</Text>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={2}>质押挖矿</Title>
        <Text type="secondary">质押 HCF 获取稳定收益 | 余额: {balance.toFixed(2)} HCF</Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} md={24} lg={8}>
            <Card title="我的质押信息" extra={<BankOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text type="secondary">总质押量</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {stakingInfo.totalStaked.toFixed(2)} HCF
                  </Title>
                  {stakingInfo.currentLevel > 0 && (
                    <Tag color={STAKING_LEVELS[stakingInfo.currentLevel - 1]?.color}>
                      等级 {stakingInfo.currentLevel}
                    </Tag>
                  )}
                </div>

                <div>
                  <Text type="secondary">日收益率</Text>
                  <Title level={4} style={{ margin: '8px 0', color: '#52c41a' }}>
                    {stakingInfo.currentLevel > 0 
                      ? `${STAKING_LEVELS[stakingInfo.currentLevel - 1]?.dailyRate}% / 天`
                      : '未质押'}
                  </Title>
                </div>

                <div>
                  <Text type="secondary">预计日收益</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {stakingInfo.dailyReward.toFixed(2)} HCF
                  </Title>
                </div>

                <div>
                  <Text type="secondary">加成状态</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color={stakingInfo.lpBonus ? 'success' : 'default'}>
                      LP加成: {stakingInfo.lpBonus ? '已激活' : '未激活'}
                    </Tag>
                    <Tag color={stakingInfo.nodeBonus ? 'success' : 'default'}>
                      节点加成: {stakingInfo.nodeBonus ? '已激活' : '未激活'}
                    </Tag>
                  </div>
                </div>

                <div>
                  <Text type="secondary">复投次数</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {stakingInfo.compoundCount} 次
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={24} lg={8}>
            <Card title="质押操作" extra={<RocketOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text>质押数量</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 8 }}
                    size="large"
                    min={100}
                    max={balance}
                    value={stakeAmount}
                    onChange={(value) => setStakeAmount(value || 100)}
                    formatter={(value) => `${value} HCF`}
                    parser={(value) => Number(value!.replace(' HCF', '')) || 0}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      预计等级: {getLevelForAmount(stakeAmount) + 1} | 
                      日收益率: {STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate}%
                    </Text>
                  </div>
                </div>

                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  onClick={handleStake}
                  loading={staking}
                  disabled={!isConnected}
                >
                  质押
                </Button>

                <div>
                  <Text type="secondary">质押时间</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {stakingInfo.stakingTime}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={24} lg={8}>
            <Card title="收益信息" extra={<GiftOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text type="secondary">可领取奖励</Text>
                  <Title level={3} style={{ margin: '8px 0', color: '#52c41a' }}>
                    {stakingInfo.claimableRewards.toFixed(2)} HCF
                  </Title>
                </div>

                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  onClick={handleClaim}
                  loading={claiming}
                  disabled={stakingInfo.claimableRewards <= 0}
                >
                  领取奖励
                </Button>

                <div>
                  <Text type="secondary">累计收益</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {stakingInfo.totalRewards.toFixed(2)} HCF
                  </Title>
                </div>

                <div>
                  <Tag icon={<SafetyOutlined />} color="blue">
                    智能合约保障
                  </Tag>
                  <Tag icon={<FireOutlined />} color="orange">
                    销毁机制
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="质押等级表" extra={<ClockCircleOutlined />}>
              <Table
                dataSource={STAKING_LEVELS.map((level, index) => ({
                  key: index,
                  ...level,
                  annualRate: level.dailyRate * 365,
                }))}
                columns={[
                  {
                    title: '等级',
                    dataIndex: 'level',
                    key: 'level',
                    render: (level, record) => (
                      <Tag color={record.color}>等级 {level}</Tag>
                    ),
                  },
                  {
                    title: '最低质押量',
                    dataIndex: 'minAmount',
                    key: 'minAmount',
                    render: (amount) => `${amount.toLocaleString()} HCF`,
                  },
                  {
                    title: '日收益率',
                    dataIndex: 'dailyRate',
                    key: 'dailyRate',
                    render: (rate) => (
                      <Text strong style={{ color: '#52c41a' }}>{rate}%</Text>
                    ),
                  },
                  {
                    title: '年化收益率',
                    dataIndex: 'annualRate',
                    key: 'annualRate',
                    render: (rate) => (
                      <Text strong style={{ color: '#1890ff' }}>{rate.toFixed(0)}%</Text>
                    ),
                  },
                  {
                    title: '状态',
                    key: 'status',
                    render: (_, record) => {
                      const userStaked = stakingInfo.totalStaked;
                      if (userStaked >= record.minAmount) {
                        return <Tag color="success">已达到</Tag>;
                      }
                      return <Tag>未达到</Tag>;
                    },
                  },
                ]}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Modal
          title="确认质押"
          open={isStakeModalVisible}
          onOk={confirmStake}
          onCancel={() => setIsStakeModalVisible(false)}
          confirmLoading={staking}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>质押数量</Text>
              <Title level={3}>{stakeAmount} HCF</Title>
            </div>
            <div>
              <Text>预计等级</Text>
              <Title level={4}>
                <Tag color={STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.color}>
                  等级 {getLevelForAmount(stakeAmount) + 1}
                </Tag>
              </Title>
            </div>
            <div>
              <Text>日收益率</Text>
              <Title level={4} style={{ color: '#52c41a' }}>
                {STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate}% / 天
              </Title>
            </div>
            <div>
              <Text>预计日收益</Text>
              <Title level={4}>
                {(stakeAmount * STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate / 100).toFixed(2)} HCF
              </Title>
            </div>
          </Space>
        </Modal>
      </div>
    </Spin>
  );
};

export default Staking;