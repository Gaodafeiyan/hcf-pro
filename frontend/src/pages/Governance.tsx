import { useState } from 'react';
import { Row, Col, Card, Button, Typography, Space, Tag, Table, Statistic, Progress, Modal, message, Tabs } from 'antd';
import { SettingOutlined, CrownOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const Governance = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [isVoteModalVisible, setIsVoteModalVisible] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  // 模拟数据
  const governanceInfo = {
    totalProposals: 15,
    activeProposals: 3,
    executedProposals: 12,
    userVotingPower: 1500,
    totalVotingPower: 50000,
    userNodeCount: 1,
  };

  const activeProposals = [
    {
      key: '1',
      id: 1,
      title: '调整质押收益率',
      description: '将质押收益率从0.4%-0.8%调整为0.5%-1.0%',
      type: '参数修改',
      status: '投票中',
      forVotes: 2500,
      againstVotes: 800,
      abstainVotes: 200,
      endTime: '2024-09-15',
      userVote: null,
    },
    {
      key: '2',
      id: 2,
      title: '增加销毁机制',
      description: '新增交易销毁机制，每笔交易销毁0.1%',
      type: '合约升级',
      status: '投票中',
      forVotes: 1800,
      againstVotes: 1200,
      abstainVotes: 500,
      endTime: '2024-09-20',
      userVote: null,
    },
    {
      key: '3',
      id: 3,
      title: '分配营销资金',
      description: '从营销池中分配10万HCF用于市场推广',
      type: '资金分配',
      status: '投票中',
      forVotes: 3200,
      againstVotes: 600,
      abstainVotes: 300,
      endTime: '2024-09-25',
      userVote: null,
    },
  ];

  const executedProposals = [
    {
      key: '1',
      id: 1,
      title: '初始参数设置',
      description: '设置初始质押参数和税率',
      type: '参数修改',
      status: '已执行',
      result: '通过',
      executionTime: '2024-08-01',
    },
    {
      key: '2',
      id: 2,
      title: '节点NFT发布',
      description: '发布节点NFT合约',
      type: '合约升级',
      status: '已执行',
      result: '通过',
      executionTime: '2024-08-15',
    },
  ];

  const handleVote = (proposal: any, vote: 'for' | 'against' | 'abstain') => {
    setSelectedProposal({ ...proposal, userVote: vote });
    setIsVoteModalVisible(true);
  };

  const confirmVote = () => {
    if (selectedProposal) {
      message.success(`投票成功！您选择了${selectedProposal.userVote === 'for' ? '赞成' : selectedProposal.userVote === 'against' ? '反对' : '弃权'}`);
      setIsVoteModalVisible(false);
    }
  };

  const getVotePercentage = (votes: number, total: number) => {
    return total > 0 ? Math.round((votes / total) * 100) : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '投票中': return 'processing';
      case '已通过': return 'success';
      case '已拒绝': return 'error';
      case '已执行': return 'success';
      default: return 'default';
    }
  };

  const proposalColumns = [
    {
      title: '提案ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Text strong>{title}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: '赞成票',
      dataIndex: 'forVotes',
      key: 'forVotes',
      render: (votes: number, record: any) => (
        <div>
          <Text>{votes.toLocaleString()}</Text>
          <Progress 
            percent={getVotePercentage(votes, record.forVotes + record.againstVotes + record.abstainVotes)} 
            size="small" 
            showInfo={false}
            strokeColor="#52c41a"
          />
        </div>
      ),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time: string) => <Text type="secondary">{time}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            size="small" 
            type="primary" 
            onClick={() => handleVote(record, 'for')}
            disabled={record.userVote !== null}
          >
            赞成
          </Button>
          <Button 
            size="small" 
            danger 
            onClick={() => handleVote(record, 'against')}
            disabled={record.userVote !== null}
          >
            反对
          </Button>
          <Button 
            size="small" 
            onClick={() => handleVote(record, 'abstain')}
            disabled={record.userVote !== null}
          >
            弃权
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>治理</Title>
      <Text type="secondary">参与协议治理，投票决定项目发展方向</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总提案数"
              value={governanceInfo.totalProposals}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃提案"
              value={governanceInfo.activeProposals}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="我的投票权重"
              value={governanceInfo.userVotingPower}
              suffix={`/ ${governanceInfo.totalVotingPower.toLocaleString()}`}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress 
              percent={Math.round((governanceInfo.userVotingPower / governanceInfo.totalVotingPower) * 100)} 
              strokeColor="#722ed1" 
              showInfo={false} 
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="我的节点数"
              value={governanceInfo.userNodeCount}
              suffix="个"
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
              key: 'active',
              label: (
                <Space>
                  <SettingOutlined />
                  活跃提案 ({activeProposals.length})
                </Space>
              ),
              children: (
                <Table
                  dataSource={activeProposals}
                  columns={proposalColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
            {
              key: 'executed',
              label: (
                <Space>
                  <CheckCircleOutlined />
                  已执行提案 ({executedProposals.length})
                </Space>
              ),
              children: (
                <Table
                  dataSource={executedProposals}
                  columns={proposalColumns.filter(col => col.key !== 'action')}
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
          <Card title="投票权重说明" extra={<CrownOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>基础投票权重</Text>
                <Paragraph type="secondary">
                  • 每个地址基础权重：1票<br />
                  • 质押HCF获得额外权重<br />
                  • 节点NFT持有者获得倍数权重
                </Paragraph>
              </div>
              <div>
                <Text strong>权重计算</Text>
                <Paragraph type="secondary">
                  • 质押权重：质押量 / 1000<br />
                  • 节点权重：节点数量 × 10<br />
                  • 总权重 = 基础权重 + 质押权重 + 节点权重
                </Paragraph>
              </div>
              <div>
                <Text strong>投票要求</Text>
                <Paragraph type="secondary">
                  • 最小投票权重：100<br />
                  • 提案通过阈值：60%赞成票<br />
                  • 投票期：7天
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="治理流程" extra={<ClockCircleOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>1. 提案创建</Text>
                <Paragraph type="secondary">
                  任何持有足够投票权重的用户都可以创建提案
                </Paragraph>
              </div>
              <div>
                <Text strong>2. 投票期</Text>
                <Paragraph type="secondary">
                  提案创建后进入7天投票期，用户可以进行投票
                </Paragraph>
              </div>
              <div>
                <Text strong>3. 执行期</Text>
                <Paragraph type="secondary">
                  通过后进入48小时执行期，多签钱包可以执行提案
                </Paragraph>
              </div>
              <div>
                <Text strong>4. 提案执行</Text>
                <Paragraph type="secondary">
                  多签钱包确认后执行提案内容
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="确认投票"
        open={isVoteModalVisible}
        onOk={confirmVote}
        onCancel={() => setIsVoteModalVisible(false)}
        okText="确认投票"
        cancelText="取消"
      >
        {selectedProposal && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>提案标题：</Text>
              <Title level={4}>{selectedProposal.title}</Title>
            </div>
            <div>
              <Text>提案描述：</Text>
              <Paragraph>{selectedProposal.description}</Paragraph>
            </div>
            <div>
              <Text>您的投票：</Text>
              <Tag color={
                selectedProposal.userVote === 'for' ? 'success' : 
                selectedProposal.userVote === 'against' ? 'error' : 'default'
              }>
                {selectedProposal.userVote === 'for' ? '赞成' : 
                 selectedProposal.userVote === 'against' ? '反对' : '弃权'}
              </Tag>
            </div>
            <div>
              <Text>投票权重：</Text>
              <Text strong>{governanceInfo.userVotingPower}</Text>
            </div>
            <div>
              <Text>投票不可撤销，请确认您的选择。</Text>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default Governance;
