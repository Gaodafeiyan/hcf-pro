import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Typography, Space, Tag, Table, Statistic, Progress, Modal, message, Spin, Input } from 'antd';
import { TeamOutlined, GiftOutlined, TrophyOutlined, UserOutlined, CrownOutlined, CopyOutlined } from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getReferralContract,
  waitForTransaction,
  handleContractError
} from '../utils/contracts';
import { TEAM_LEVELS } from '../config/contracts';

const { Title, Text, Paragraph } = Typography;

const Referral = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  
  const [referralInfo, setReferralInfo] = useState({
    referrer: '',
    directCount: 0,
    teamLevel: 0,
    personalVolume: 0,
    teamVolume: 0,
    smallDistrictVolume: 0, // 小区业绩
    totalReferralReward: 0,
    totalTeamReward: 0,
    claimableReferralReward: 0,
    claimableTeamReward: 0,
    isActive: false,
    joinTime: 0,
    subordinateVCounts: { // 下级V等级统计
      V1: 0,
      V2: 0,
      V3: 0,
      V4: 0,
      V5: 0,
      V6: 0,
    },
    burnRate: 5, // 销毁率 5%
  });

  // const [referralList, setReferralList] = useState<any[]>([]);

  // 加载推荐数据
  const loadReferralData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const referralContract = getReferralContract(signer);
      
      // 获取用户推荐信息
      const userData = await referralContract.getUserData(address);
      
      // 计算小区业绩（团队业绩减去最大线业绩）
      const teamVolumeNum = Number(ethers.formatUnits(userData.teamVolume, 18));
      const personalVolumeNum = Number(ethers.formatUnits(userData.personalVolume, 18));
      // 小区业绩 = 团队总业绩 - 最大线业绩（这里简化为团队业绩的30%）
      const smallDistrictVolume = teamVolumeNum * 0.3;
      
      // TODO: 从合约事件或后端获取下级V等级统计
      // 这里暂时模拟数据
      const mockSubordinateVCounts = {
        V1: Number(userData.directCount) >= 5 ? Math.floor(Number(userData.directCount) / 5) : 0,
        V2: 0,
        V3: 0,
        V4: 0,
        V5: 0,
        V6: 0,
      };
      
      setReferralInfo({
        referrer: userData.referrer,
        directCount: Number(userData.directCount),
        teamLevel: Number(userData.teamLevel),
        personalVolume: personalVolumeNum,
        teamVolume: teamVolumeNum,
        smallDistrictVolume: smallDistrictVolume,
        totalReferralReward: Number(ethers.formatUnits(userData.totalReferralReward, 18)),
        totalTeamReward: Number(ethers.formatUnits(userData.totalTeamReward, 18)),
        claimableReferralReward: 0, // 需要从合约计算
        claimableTeamReward: 0, // 需要从合约计算
        isActive: userData.isActive,
        joinTime: Number(userData.joinTime),
        subordinateVCounts: mockSubordinateVCounts,
        burnRate: 5, // 固定5%销毁率
      });
      
      // TODO: 获取推荐列表（需要从事件或后端获取）
      
    } catch (error) {
      console.error('加载推荐数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isConnected && address) {
      loadReferralData();
      const interval = setInterval(loadReferralData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  // 领取推荐奖励
  const handleClaimReferral = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    try {
      setClaiming(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const referralContract = getReferralContract(signer);
      
      message.info('领取推荐奖励中...');
      const claimTx = await referralContract.claimReferralReward();
      await waitForTransaction(claimTx);
      
      message.success('成功领取推荐奖励');
      await loadReferralData();
      
    } catch (error: any) {
      console.error('领取失败:', error);
      message.error(handleContractError(error));
    } finally {
      setClaiming(false);
    }
  };

  // 领取团队奖励
  const handleClaimTeam = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    try {
      setClaiming(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const referralContract = getReferralContract(signer);
      
      message.info('领取团队奖励中...');
      const claimTx = await referralContract.claimTeamReward();
      await waitForTransaction(claimTx);
      
      message.success('成功领取团队奖励');
      await loadReferralData();
      
    } catch (error: any) {
      console.error('领取失败:', error);
      message.error(handleContractError(error));
    } finally {
      setClaiming(false);
    }
  };

  // 复制邀请链接
  const copyInviteLink = () => {
    const link = `https://hcf-finance.xyz/referral?ref=${address}`;
    navigator.clipboard.writeText(link);
    message.success('邀请链接已复制');
  };

  const handleInvite = () => {
    setIsInviteModalVisible(true);
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>请先连接钱包</Title>
        <Text type="secondary">连接钱包后查看推荐信息</Text>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={2}>推荐系统</Title>
        <Text type="secondary">邀请好友，享受多重奖励</Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="直推人数"
                value={referralInfo.directCount}
                prefix={<UserOutlined />}
              />
              <Progress 
                percent={Math.min((referralInfo.directCount / 20) * 100, 100)} 
                strokeColor="#52c41a" 
                showInfo={false} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="团队等级"
                value={referralInfo.teamLevel > 0 ? `V${referralInfo.teamLevel}` : '未达V1'}
                prefix={<CrownOutlined />}
                valueStyle={{ 
                  color: referralInfo.teamLevel > 0 
                    ? TEAM_LEVELS[Math.min(referralInfo.teamLevel - 1, TEAM_LEVELS.length - 1)]?.color 
                    : '#999' 
                }}
              />
              {referralInfo.teamLevel === 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  需直推5人达到V1
                </Text>
              )}
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="个人业绩"
                value={referralInfo.personalVolume}
                suffix="HCF"
                precision={0}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总业绩"
                value={referralInfo.teamVolume}
                suffix="HCF"
                precision={0}
                valueStyle={{ color: '#1890ff' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                小区: {referralInfo.smallDistrictVolume.toFixed(0)} HCF
              </Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <Card title="团队信息" extra={<TeamOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text type="secondary">直推人数</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {referralInfo.directCount} 人
                  </Title>
                </div>
                
                <div>
                  <Text type="secondary">团队等级</Text>
                  <Title level={4} style={{ margin: '8px 0' }}>
                    {referralInfo.teamLevel > 0 ? (
                      <Tag color={TEAM_LEVELS[referralInfo.teamLevel - 1]?.color}>
                        V{referralInfo.teamLevel}
                      </Tag>
                    ) : (
                      <Tag color="default">未达V1</Tag>
                    )}
                  </Title>
                </div>
                
                <div>
                  <Text type="secondary">下级V等级统计</Text>
                  <div style={{ marginTop: 8 }}>
                    {Object.entries(referralInfo.subordinateVCounts).map(([level, count]) => (
                      count > 0 && (
                        <Tag key={level} style={{ marginBottom: 4 }}>
                          {level}: {count}人
                        </Tag>
                      )
                    ))}
                    {Object.values(referralInfo.subordinateVCounts).every(v => v === 0) && (
                      <Text type="secondary">暂无</Text>
                    )}
                  </div>
                </div>
                
                <div>
                  <Text type="secondary">销毁率</Text>
                  <Title level={4} style={{ margin: '8px 0', color: '#ff4d4f' }}>
                    {referralInfo.burnRate}%
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    每笔交易销毁{referralInfo.burnRate}%
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card title="推荐奖励" extra={<GiftOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text type="secondary">累计推荐奖励</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {referralInfo.totalReferralReward.toFixed(2)} HCF
                  </Title>
                </div>

                <div>
                  <Text type="secondary">累计团队奖励</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {referralInfo.totalTeamReward.toFixed(2)} HCF
                  </Title>
                </div>

                <div>
                  <Text type="secondary">可领取奖励</Text>
                  <Title level={4} style={{ margin: '8px 0', color: '#52c41a' }}>
                    推荐: {referralInfo.claimableReferralReward.toFixed(2)} HCF
                  </Title>
                  <Title level={4} style={{ margin: '8px 0', color: '#52c41a' }}>
                    团队: {referralInfo.claimableTeamReward.toFixed(2)} HCF
                  </Title>
                </div>

                <Space>
                  <Button 
                    type="primary" 
                    onClick={handleClaimReferral}
                    loading={claiming}
                    disabled={referralInfo.claimableReferralReward <= 0}
                  >
                    领取推荐奖励
                  </Button>
                  <Button 
                    type="primary" 
                    onClick={handleClaimTeam}
                    loading={claiming}
                    disabled={referralInfo.claimableTeamReward <= 0}
                  >
                    领取团队奖励
                  </Button>
                </Space>

                <div>
                  <Tag color={referralInfo.isActive ? 'success' : 'default'}>
                    状态: {referralInfo.isActive ? '已激活' : '未激活'}
                  </Tag>
                  {referralInfo.joinTime > 0 && (
                    <Tag color="blue">
                      加入时间: {new Date(referralInfo.joinTime * 1000).toLocaleDateString()}
                    </Tag>
                  )}
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="邀请好友" extra={<TeamOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Title level={5}>推荐奖励机制</Title>
                  <Paragraph type="secondary" style={{ fontSize: 13 }}>
                    • 直推奖励：获得下级每日收益的 20%<br />
                    • 代数奖励：获得10代每日收益的 10%<br />
                    • 20级深度：享受20代内收益<br />
                    • 销毁机制：每笔交易销毁 {referralInfo.burnRate}%<br />
                    • 晋级奖励：达到更高等级额外奖金
                  </Paragraph>
                </div>

                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  onClick={handleInvite}
                  icon={<UserOutlined />}
                >
                  生成邀请链接
                </Button>

                <div>
                  <Text type="secondary">上级推荐人</Text>
                  <div style={{ marginTop: 8 }}>
                    {referralInfo.referrer && referralInfo.referrer !== '0x0000000000000000000000000000000000000000' ? (
                      <Tag color="purple">{referralInfo.referrer.slice(0, 6)}...{referralInfo.referrer.slice(-4)}</Tag>
                    ) : (
                      <Tag>无推荐人</Tag>
                    )}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={14}>
            <Card title="业绩统计" extra={<TrophyOutlined />}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="个人业绩"
                    value={referralInfo.personalVolume}
                    suffix="HCF"
                    precision={0}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="团队总业绩"
                    value={referralInfo.teamVolume}
                    suffix="HCF"
                    precision={0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="小区业绩"
                    value={referralInfo.smallDistrictVolume}
                    suffix="HCF"
                    precision={0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
              
              <div style={{ marginTop: 16 }}>
                <Progress 
                  percent={Math.min((referralInfo.teamVolume / 1000000) * 100, 100)} 
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={() => `${(referralInfo.teamVolume / 10000).toFixed(1)}万`}
                />
                <Text type="secondary">距离V5需要: {Math.max(0, 1000000 - referralInfo.teamVolume).toFixed(0)} HCF</Text>
              </div>
            </Card>
          </Col>
          
          <Col xs={24} lg={10}>
            <Card title="总收益" extra={<GiftOutlined />}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="推荐总收益"
                    value={referralInfo.totalReferralReward}
                    suffix="HCF"
                    precision={2}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="团队总收益"
                    value={referralInfo.totalTeamReward}
                    suffix="HCF"
                    precision={2}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">累计总收益</Text>
                <Title level={3} style={{ margin: '8px 0', color: '#fa8c16' }}>
                  {(referralInfo.totalReferralReward + referralInfo.totalTeamReward).toFixed(2)} HCF
                </Title>
              </div>
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="团队等级要求" extra={<TrophyOutlined />}>
              <Table
                dataSource={TEAM_LEVELS.map((level, index) => ({
                  key: index,
                  ...level,
                }))}
                columns={[
                  {
                    title: '等级',
                    dataIndex: 'level',
                    key: 'level',
                    render: (level, record) => (
                      <Tag color={record.color}>{level}</Tag>
                    ),
                  },
                  {
                    title: '晋级要求',
                    dataIndex: 'requirement',
                    key: 'requirement',
                  },
                  {
                    title: '奖励比例',
                    key: 'reward',
                    render: (_, record) => {
                      const rewardMap: {[key: string]: string} = {
                        'V1': '1%',
                        'V2': '1.5%',
                        'V3': '2%',
                        'V4': '2.5%',
                        'V5': '3%',
                        'V6': '3.5%'
                      };
                      return <Text strong style={{ color: '#52c41a' }}>{rewardMap[record.level] || '1%'}</Text>;
                    },
                  },
                  {
                    title: '状态',
                    key: 'status',
                    render: (_, _record, index) => {
                      const currentLevel = referralInfo.teamLevel;
                      if (currentLevel > index + 1) {
                        return <Tag color="success">已达成</Tag>;
                      } else if (currentLevel === index + 1) {
                        return <Tag color="processing">当前等级</Tag>;
                      }
                      return <Tag>未达成</Tag>;
                    },
                  },
                ]}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Modal
          title="邀请好友"
          open={isInviteModalVisible}
          onCancel={() => setIsInviteModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsInviteModalVisible(false)}>
              关闭
            </Button>,
          ]}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Title level={5}>您的专属邀请链接</Title>
              <Input
                value={`https://hcf-finance.xyz/referral?ref=${address}`}
                readOnly
                addonAfter={
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />} 
                    onClick={copyInviteLink}
                  >
                    复制
                  </Button>
                }
              />
            </div>
            
            <div>
              <Title level={5}>邀请码</Title>
              <Input
                value={address?.slice(0, 8) || ''}
                readOnly
                style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}
              />
            </div>

            <div>
              <Text type="secondary">
                分享链接或邀请码给好友，对方注册并质押后，您将获得推荐奖励。
              </Text>
            </div>
          </Space>
        </Modal>
      </div>
    </Spin>
  );
};

export default Referral;