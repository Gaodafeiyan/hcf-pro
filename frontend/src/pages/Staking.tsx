import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, InputNumber, Typography, Space, Tag, Table, Modal, message, Spin, Checkbox, Divider, List } from 'antd';
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
  const [bsdtBalance, setBsdtBalance] = useState(0);
  const [isLPStake, setIsLPStake] = useState(false);
  const [isEquityStake, setIsEquityStake] = useState(false);
  const [bsdtAmount, setBsdtAmount] = useState<number>(0);
  const [userPositions, setUserPositions] = useState<any[]>([]);
  
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
      
      // 获取BSDT余额（用于权益LP）
      try {
        const bsdtContract = await getHCFTokenContract(signer); // 这里应该是getBSDTContract，但暂时使用相同的方式
        const bsdtBal = await bsdtContract.balanceOf(address);
        setBsdtBalance(Number(ethers.formatUnits(bsdtBal, 18)));
      } catch (error) {
        console.log('获取BSDT余额失败');
      }
      
      // 获取质押信息
      const userInfo = await stakingContract.getUserInfo(address);
      
      // 解析返回值 (9个值)
      const [amount, level, pending, totalClaimed, isLP, compoundCount, isEquityLP] = userInfo;
      
      // 计算质押天数 (暂时使用当前时间，因为合约没有返回stakingTime)
      const stakingDays = Number(amount) > 0 ? 1 : 0; // 简化处理
      
      // 获取日收益率 - 使用合约中定义的固定收益率
      const levelNum = Number(level);
      let dailyRate = 0;
      let dailyReward = 0;
      
      // 等级收益率（baseRate，单位：基点，需要除以10000）
      const levelRates = [
        40,  // Level 1: 0.4%
        50,  // Level 2: 0.5%
        60,  // Level 3: 0.6%
        70,  // Level 4: 0.7%
        80   // Level 5: 0.8%
      ];
      
      const lpRates = [
        80,   // Level 1 LP: 0.8%
        100,  // Level 2 LP: 1.0%
        120,  // Level 3 LP: 1.2%
        140,  // Level 4 LP: 1.4%
        160   // Level 5 LP: 1.6%
      ];
      
      if (levelNum >= 1 && levelNum <= 5) {
        // 如果是LP，使用LP收益率，否则使用基础收益率
        dailyRate = isLP ? lpRates[levelNum - 1] : levelRates[levelNum - 1];
        dailyReward = Number(ethers.formatUnits(amount, 18)) * dailyRate / 10000;
      }
      
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
      
      // 解析多个质押仓位（demux展示）
      const stakedAmount = Number(ethers.formatUnits(amount, 18));
      if (stakedAmount > 0) {
        const positions = [];
        // 如果是LP质押，显示LP收益率
        if (isLP && levelNum > 0) {
          positions.push({
            amount: stakedAmount,
            rate: STAKING_LEVELS[levelNum - 1].lpRate,
            type: 'LP质押',
            level: levelNum
          });
        } else if (levelNum > 0) {
          // 普通质押，显示基础收益率
          positions.push({
            amount: stakedAmount,
            rate: STAKING_LEVELS[levelNum - 1].dailyRate,
            type: '基础质押',
            level: levelNum
          });
        }
        
        // 如果有复投，显示复投收益
        if (Number(compoundCount) > 0) {
          const compoundMultiple = levelNum > 0 ? STAKING_LEVELS[levelNum - 1].compoundMultiple : 1;
          positions.push({
            amount: Number(compoundCount) * compoundMultiple,
            rate: dailyRate / 100,
            type: `复投(${compoundCount}次)`,
            level: levelNum
          });
        }
        setUserPositions(positions);
      } else {
        setUserPositions([]);
      }
      
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
      
      // 获取质押合约地址
      const stakingAddress = await stakingContract.getAddress();
      const stakeAmountWei = parseNumber(stakeAmount.toString(), 18);
      
      // 直接授权，避免allowance调用问题
      try {
        message.info('授权中...');
        // 授权一个较大的额度
        const approveAmount = parseNumber('1000000', 18); // 100万HCF
        
        const approveTx = await hcfToken.approve(stakingAddress, approveAmount);
        await waitForTransaction(approveTx);
        message.success('授权成功');
        
        // 等待确保授权生效
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (approveError: any) {
        // 如果授权失败，可能是已经授权过了，尝试继续
        console.log('授权可能已存在，继续质押...', approveError);
      }
      
      // 执行质押
      message.info('质押中...');
      console.log('质押参数:', {
        amount: stakeAmount,
        amountWei: stakeAmountWei.toString(),
        stakingContract: stakingAddress
      });
      
      // stake函数需要3个参数: amount, isLP, isEquity
      const stakeTx = await stakingContract.stake(stakeAmountWei, isLPStake, isEquityStake);
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
                      ? stakingInfo.lpBonus 
                        ? `${STAKING_LEVELS[stakingInfo.currentLevel - 1]?.lpRate}% / 天 (LP)`
                        : `${STAKING_LEVELS[stakingInfo.currentLevel - 1]?.dailyRate}% / 天`
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
                  <Text type="secondary">复投信息</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {stakingInfo.compoundCount} 次
                    {stakingInfo.currentLevel > 0 && stakingInfo.compoundCount > 0 && (
                      <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
                        (×{STAKING_LEVELS[stakingInfo.currentLevel - 1]?.compoundMultiple}倍)
                      </Text>
                    )}
                  </Title>
                </div>
                
                {userPositions.length > 0 && (
                  <div>
                    <Divider style={{ margin: '12px 0' }} />
                    <Text type="secondary">质押仓位明细</Text>
                    <List
                      size="small"
                      dataSource={userPositions}
                      renderItem={(item: any) => (
                        <List.Item style={{ padding: '4px 0' }}>
                          <Space>
                            <Tag color={STAKING_LEVELS[item.level - 1]?.color}>
                              {item.type}
                            </Tag>
                            <Text>{item.amount.toFixed(2)} HCF @ {item.rate}%</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
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
                  
                  <div style={{ marginTop: 12 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Checkbox 
                        checked={isLPStake} 
                        onChange={(e) => {
                          setIsLPStake(e.target.checked);
                          if (e.target.checked) setIsEquityStake(false);
                        }}
                      >
                        LP质押 (获得双倍收益率)
                      </Checkbox>
                      
                      <Checkbox 
                        checked={isEquityStake} 
                        onChange={(e) => {
                          setIsEquityStake(e.target.checked);
                          if (e.target.checked) {
                            setIsLPStake(false);
                            // 计算需要的BSDT数量（1:1比例）
                            setBsdtAmount(stakeAmount);
                          }
                        }}
                      >
                        权益LP (HCF + BSDT)
                      </Checkbox>
                      
                      {isEquityStake && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">需要BSDT: {bsdtAmount.toFixed(2)} BSDT</Text>
                          <br />
                          <Text type={bsdtBalance >= bsdtAmount ? "success" : "danger"}>
                            BSDT余额: {bsdtBalance.toFixed(2)}
                          </Text>
                        </div>
                      )}
                    </Space>
                  </div>
                  
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      预计等级: {getLevelForAmount(stakeAmount) + 1} | 
                      日收益率: {isLPStake || isEquityStake 
                        ? `${STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.lpRate}% (LP)`
                        : `${STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate}%`}
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
                    render: (amount) => `${amount.toLocaleString()}+ HCF`,
                  },
                  {
                    title: '基础日化',
                    dataIndex: 'dailyRate',
                    key: 'dailyRate',
                    render: (rate) => (
                      <Text strong style={{ color: '#52c41a' }}>{rate}%</Text>
                    ),
                  },
                  {
                    title: 'LP日化',
                    dataIndex: 'lpRate',
                    key: 'lpRate',
                    render: (rate) => (
                      <Text strong style={{ color: '#1890ff' }}>{rate}%</Text>
                    ),
                  },
                  {
                    title: '复投倍数',
                    dataIndex: 'compoundMultiple',
                    key: 'compoundMultiple',
                    render: (multiple) => (
                      <Text strong style={{ color: '#fa8c16' }}>×{multiple}</Text>
                    ),
                  },
                  {
                    title: '年化收益',
                    dataIndex: 'annualRate',
                    key: 'annualRate',
                    render: (rate) => (
                      <Text type="secondary">{rate.toFixed(0)}%</Text>
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
                {isLPStake || isEquityStake 
                  ? `${STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.lpRate}% / 天 (LP)`
                  : `${STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate}% / 天`}
              </Title>
            </div>
            {(isLPStake || isEquityStake) && (
              <div>
                <Text>复投倍数</Text>
                <Title level={4} style={{ color: '#fa8c16' }}>
                  ×{STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.compoundMultiple}
                </Title>
              </div>
            )}
            <div>
              <Text>预计日收益</Text>
              <Title level={4}>
                {(stakeAmount * (isLPStake || isEquityStake 
                  ? STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.lpRate 
                  : STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate) / 100).toFixed(2)} HCF
              </Title>
            </div>
            {isEquityStake && (
              <div>
                <Text>需要支付</Text>
                <Title level={4}>
                  {stakeAmount} HCF + {bsdtAmount.toFixed(2)} BSDT
                </Title>
              </div>
            )}
          </Space>
        </Modal>
      </div>
    </Spin>
  );
};

export default Staking;