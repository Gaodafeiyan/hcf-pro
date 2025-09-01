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
    totalReferralReward: 0,
    totalTeamReward: 0,
    claimableReferralReward: 0,
    claimableTeamReward: 0,
    isActive: false,
    joinTime: 0,
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
      
      setReferralInfo({
        referrer: userData.referrer,
        directCount: Number(userData.directCount),
        teamLevel: Number(userData.teamLevel),
        personalVolume: Number(ethers.formatUnits(userData.personalVolume, 18)),
        teamVolume: Number(ethers.formatUnits(userData.teamVolume, 18)),
        totalReferralReward: Number(ethers.formatUnits(userData.totalReferralReward, 18)),
        totalTeamReward: Number(ethers.formatUnits(userData.totalTeamReward, 18)),
        claimableReferralReward: 0, // 需要从合约计算
        claimableTeamReward: 0, // 需要从合约计算
        isActive: userData.isActive,
        joinTime: Number(userData.joinTime),
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
                value={`V${referralInfo.teamLevel}`}
                prefix={<CrownOutlined />}
                valueStyle={{ 
                  color: referralInfo.teamLevel > 0 
                    ? TEAM_LEVELS[Math.min(referralInfo.teamLevel - 1, TEAM_LEVELS.length - 1)]?.color 
                    : '#666' 
                }}
              />
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
                title="团队业绩"
                value={referralInfo.teamVolume}
                suffix="HCF"
                precision={0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
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

          <Col xs={24} lg={12}>
            <Card title="邀请好友" extra={<TeamOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Title level={5}>推荐奖励机制</Title>
                  <Paragraph type="secondary">
                    • 直推奖励：获得下级质押金额的 5%<br />
                    • 团队奖励：根据团队等级获得 1-3% 奖励<br />
                    • 20级深度：享受20代内的推荐收益<br />
                    • 晋级奖励：达到更高等级获得额外奖金
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
          <Col span={24}>
            <Card title="团队等级表" extra={<TrophyOutlined />}>
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