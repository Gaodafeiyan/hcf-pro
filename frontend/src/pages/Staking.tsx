import { useState } from 'react';
import { Row, Col, Card, Button, InputNumber, Typography, Space, Tag, Table, Modal, message } from 'antd';
import {
  BankOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RocketOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { STAKING_LEVELS } from '../config/contracts';

const { Title, Text, Paragraph } = Typography;

const Staking = () => {
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);

  // 模拟数据
  const stakingInfo = {
    totalStaked: 5000,
    currentLevel: 2,
    dailyReward: 25,
    totalRewards: 750,
    claimableRewards: 125,
    stakingTime: '30天',
    lpBonus: true,
    nodeBonus: false,
  };

  const stakingHistory = [
    { key: '1', action: '质押', amount: 1000, level: 2, time: '2024-08-01', status: 'active' },
    { key: '2', action: '质押', amount: 2000, level: 3, time: '2024-08-15', status: 'active' },
    { key: '3', action: '质押', amount: 2000, level: 3, time: '2024-08-20', status: 'active' },
  ];

  const handleStake = () => {
    if (stakeAmount < 100) {
      message.error('最小质押数量为 100 HCF');
      return;
    }
    setIsStakeModalVisible(true);
  };

  const confirmStake = () => {
    message.success(`成功质押 ${stakeAmount} HCF`);
    setIsStakeModalVisible(false);
  };

  const handleClaim = () => {
    message.success(`成功领取 ${stakingInfo.claimableRewards} HCF 奖励`);
  };

  const getLevelForAmount = (amount: number) => {
    for (let i = STAKING_LEVELS.length - 1; i >= 0; i--) {
      if (amount >= STAKING_LEVELS[i].minAmount) {
        return i;
      }
    }
    return 0;
  };

  return (
    <div>
      <Title level={2}>质押挖矿</Title>
      <Text type="secondary">质押 HCF 获取稳定收益</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={24} lg={8}>
          <Card title="我的质押信息" extra={<BankOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text type="secondary">总质押量</Text>
                <Title level={3} style={{ margin: '8px 0' }}>
                  {stakingInfo.totalStaked} HCF
                </Title>
                <Tag color={STAKING_LEVELS[stakingInfo.currentLevel - 1]?.color}>
                  等级 {stakingInfo.currentLevel}
                </Tag>
              </div>

              <div>
                <Text type="secondary">日收益率</Text>
                <Title level={4} style={{ margin: '8px 0', color: '#52c41a' }}>
                  {STAKING_LEVELS[stakingInfo.currentLevel - 1]?.dailyRate}% / 天
                </Title>
              </div>

              <div>
                <Text type="secondary">预计日收益</Text>
                <Title level={4} style={{ margin: '8px 0' }}>
                  {stakingInfo.dailyReward} HCF
                </Title>
              </div>

              <div>
                <Text type="secondary">加成状态</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color={stakingInfo.lpBonus ? 'success' : 'default'}>
                    LP加成 {stakingInfo.lpBonus ? '+100%' : '未激活'}
                  </Tag>
                  <Tag color={stakingInfo.nodeBonus ? 'success' : 'default'}>
                    节点加成 {stakingInfo.nodeBonus ? '+20%' : '未激活'}
                  </Tag>
                </div>
              </div>

              <div>
                <Text type="secondary">可领取奖励</Text>
                <Title level={3} style={{ margin: '8px 0', color: '#52c41a' }}>
                  {stakingInfo.claimableRewards} HCF
                </Title>
                <Button type="primary" block onClick={handleClaim} icon={<GiftOutlined />}>
                  领取奖励
                </Button>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={24} lg={16}>
          <Card title="质押等级" extra={<RocketOutlined />}>
            <Row gutter={[16, 16]}>
              {STAKING_LEVELS.map((level, index) => (
                <Col xs={24} sm={12} md={8} lg={8} key={index}>
                  <Card
                    size="small"
                    style={{
                      borderColor: selectedLevel === index ? level.color : '#303030',
                      borderWidth: selectedLevel === index ? 2 : 1,
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      background: selectedLevel === index ? 'rgba(24, 144, 255, 0.1)' : 'transparent'
                    }}
                    onClick={() => {
                      setSelectedLevel(index);
                      setStakeAmount(level.minAmount);
                    }}
                    hoverable
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Tag color={level.color}>等级 {level.level}</Tag>
                      <div>
                        <Text type="secondary">最小质押</Text>
                        <Title level={5}>{level.minAmount} HCF</Title>
                      </div>
                      <div>
                        <Text type="secondary">日收益率</Text>
                        <Title level={5} style={{ color: '#52c41a' }}>
                          {level.dailyRate}%
                        </Title>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card 
              style={{ 
                marginTop: 16, 
                background: '#1f1f1f',
                border: '1px solid #303030'
              }}
            >
              <Title level={4}>新增质押</Title>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text>质押数量</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 8 }}
                    size="large"
                    min={100}
                    max={1000000}
                    value={stakeAmount}
                    onChange={(val) => setStakeAmount(val || 100)}
                    addonAfter="HCF"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      预计等级: 
                    </Text>
                    <Tag color={STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.color} style={{ marginLeft: 8 }}>
                      等级 {getLevelForAmount(stakeAmount) + 1}
                    </Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      日收益率: {STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate}%
                    </Text>
                  </div>
                </div>

                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  onClick={handleStake}
                  icon={<SafetyOutlined />}
                >
                  确认质押
                </Button>

                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  <FireOutlined /> 质押说明：
                  <br />• 质押后立即开始计算收益
                  <br />• 收益每天结算，可随时领取
                  <br />• 解除质押需要3天冷却期
                  <br />• LP提供者享受2倍收益加成
                </Paragraph>
              </Space>
            </Card>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="质押记录" extra={<ClockCircleOutlined />}>
            <Table
              dataSource={stakingHistory}
              scroll={{ x: 600 }}
              columns={[
                {
                  title: '操作',
                  dataIndex: 'action',
                  key: 'action',
                  render: (text) => <Tag>{text}</Tag>,
                },
                {
                  title: '数量',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (val) => `${val} HCF`,
                },
                {
                  title: '等级',
                  dataIndex: 'level',
                  key: 'level',
                  render: (val) => (
                    <Tag color={STAKING_LEVELS[val - 1]?.color}>
                      等级 {val}
                    </Tag>
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
                  render: (status) => (
                    <Tag color={status === 'active' ? 'success' : 'default'}>
                      {status === 'active' ? '活跃' : '已解除'}
                    </Tag>
                  ),
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    record.status === 'active' && (
                      <Button size="small" danger>
                        解除质押
                      </Button>
                    )
                  ),
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
        okText="确认"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>质押数量：</Text>
            <Title level={4}>{stakeAmount} HCF</Title>
          </div>
          <div>
            <Text>预计等级：</Text>
            <Tag color={STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.color}>
              等级 {getLevelForAmount(stakeAmount) + 1}
            </Tag>
          </div>
          <div>
            <Text>日收益率：</Text>
            <Text strong style={{ color: '#52c41a' }}>
              {STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate}% / 天
            </Text>
          </div>
          <div>
            <Text>预计日收益：</Text>
            <Text strong>
              {(stakeAmount * STAKING_LEVELS[getLevelForAmount(stakeAmount)]?.dailyRate / 100).toFixed(2)} HCF
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default Staking;