import { useState } from 'react';
import { Row, Col, Card, Button, Typography, Space, Tag, Progress, Modal, message, Statistic } from 'antd';
import { NodeIndexOutlined, RocketOutlined, GiftOutlined, CrownOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const NodeNFT = () => {
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);

  const nodeInfo = {
    totalNodes: 45,
    maxNodes: 99,
    userNodes: 1,
    nodePrice: 10000,
    totalDividends: 50000,
    userDividends: 1200,
    claimableDividends: 350,
  };

  const userNode = {
    id: 23,
    power: 120,
    level: 3,
    rewards: 1200,
    purchaseDate: '2024-08-01',
  };

  return (
    <div>
      <Title level={2}>节点 NFT</Title>
      <Text type="secondary">限量99个节点，享受永久分红</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="节点总数"
              value={nodeInfo.totalNodes}
              suffix={`/ ${nodeInfo.maxNodes}`}
              prefix={<NodeIndexOutlined />}
            />
            <Progress percent={Math.round(nodeInfo.totalNodes / nodeInfo.maxNodes * 100)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="节点价格"
              value={nodeInfo.nodePrice}
              suffix="HCF"
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总分红池"
              value={nodeInfo.totalDividends}
              suffix="HCF"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="我的分红"
              value={nodeInfo.claimableDividends}
              suffix="HCF"
              valueStyle={{ color: '#1890ff' }}
            />
            <Button type="primary" size="small" style={{ marginTop: 8 }}>
              领取分红
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="我的节点" extra={<CrownOutlined />}>
            {userNode ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">节点编号</Text>
                  <Title level={4}>#{userNode.id}</Title>
                </div>
                <div>
                  <Text type="secondary">算力</Text>
                  <Title level={4}>{userNode.power}</Title>
                </div>
                <div>
                  <Text type="secondary">等级</Text>
                  <Tag color="purple">等级 {userNode.level}</Tag>
                </div>
                <div>
                  <Text type="secondary">累计收益</Text>
                  <Title level={4} style={{ color: '#52c41a' }}>
                    {userNode.rewards} HCF
                  </Title>
                </div>
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <NodeIndexOutlined style={{ fontSize: 48, color: '#999' }} />
                <Paragraph type="secondary" style={{ marginTop: 16 }}>
                  您还没有节点NFT
                </Paragraph>
                <Button type="primary" onClick={() => setIsBuyModalVisible(true)}>
                  购买节点
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="节点权益" extra={<GiftOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>40% 手续费分红</Text>
                <Paragraph type="secondary">
                  所有交易手续费的40%分配给节点持有者
                </Paragraph>
              </div>
              <div>
                <Text strong>滑点收益分红</Text>
                <Paragraph type="secondary">
                  市场控制产生的滑点收益40%分配给节点
                </Paragraph>
              </div>
              <div>
                <Text strong>治理投票权</Text>
                <Paragraph type="secondary">
                  节点NFT持有者拥有协议治理投票权
                </Paragraph>
              </div>
              <div>
                <Text strong>额外加成</Text>
                <Paragraph type="secondary">
                  质押收益+20%，推荐奖励+20%
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="购买节点NFT"
        visible={isBuyModalVisible}
        onOk={() => {
          message.success('节点购买成功！');
          setIsBuyModalVisible(false);
        }}
        onCancel={() => setIsBuyModalVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>价格：</Text>
            <Title level={4}>{nodeInfo.nodePrice} HCF</Title>
          </div>
          <div>
            <Text>剩余数量：</Text>
            <Title level={4}>{nodeInfo.maxNodes - nodeInfo.totalNodes} / {nodeInfo.maxNodes}</Title>
          </div>
          <Paragraph type="warning">
            注意：节点NFT限量99个，售完即止。购买后不可转让。
          </Paragraph>
        </Space>
      </Modal>
    </div>
  );
};

export default NodeNFT;