import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Typography, Space, Tag, Progress, Modal, message, Statistic, Spin } from 'antd';
import { NodeIndexOutlined, RocketOutlined, GiftOutlined, CrownOutlined } from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getNodeNFTContract,
  getHCFTokenContract,
  parseNumber,
  waitForTransaction,
  handleContractError
} from '../utils/contracts';

const { Title, Text, Paragraph } = Typography;

const NodeNFT = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  
  const [nodeInfo, setNodeInfo] = useState({
    totalNodes: 0,
    maxNodes: 99,
    userNodes: 0,
    nodePrice: 10000,
    totalDividends: 0,
    userDividends: 0,
    claimableDividends: 0,
  });
  
  const [userNodes, setUserNodes] = useState<any[]>([]);

  // 加载节点数据
  const loadNodeData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nodeContract = getNodeNFTContract(signer);
      
      // 获取基本信息
      const [totalSupply, nodePrice, userNodeCount] = await Promise.all([
        nodeContract.totalSupply(),
        nodeContract.NODE_PRICE(),
        nodeContract.balanceOf(address)
      ]);
      
      // 获取用户的节点信息
      const userNodesList = [];
      for (let i = 0; i < Number(userNodeCount); i++) {
        try {
          const tokenId = await nodeContract.tokenOfOwnerByIndex(address, i);
          const nodeData = await nodeContract.getNodeInfo(tokenId);
          userNodesList.push({
            id: Number(tokenId),
            power: Number(nodeData.power || 100),
            level: Number(nodeData.level || 1),
            rewards: Number(ethers.formatUnits(nodeData.rewards || 0, 18)),
            purchaseDate: new Date(Number(nodeData.timestamp || Date.now() / 1000) * 1000).toLocaleDateString(),
          });
        } catch (error) {
          console.log('获取节点信息失败:', error);
        }
      }
      
      // 获取分红信息
      let claimable = 0;
      try {
        const dividends = await nodeContract.getClaimableDividends(address);
        claimable = Number(ethers.formatUnits(dividends, 18));
      } catch (error) {
        console.log('获取分红信息失败，使用默认值');
      }
      
      setNodeInfo({
        totalNodes: Number(totalSupply),
        maxNodes: 99,
        userNodes: Number(userNodeCount),
        nodePrice: Number(ethers.formatUnits(nodePrice, 18)),
        totalDividends: 0, // 需要从合约事件计算
        userDividends: userNodesList.reduce((sum, node) => sum + node.rewards, 0),
        claimableDividends: claimable,
      });
      
      setUserNodes(userNodesList);
      
    } catch (error) {
      console.error('加载节点数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isConnected && address) {
      loadNodeData();
      const interval = setInterval(loadNodeData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  // 购买节点
  const handleBuyNode = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    if (nodeInfo.totalNodes >= nodeInfo.maxNodes) {
      message.error('节点已售罄');
      return;
    }
    
    try {
      setBuying(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const nodeContract = getNodeNFTContract(signer);
      const nodeAddress = await nodeContract.getAddress();
      
      // 检查余额
      const balance = await hcfToken.balanceOf(address);
      const nodePriceWei = parseNumber(nodeInfo.nodePrice.toString(), 18);
      
      if (balance < nodePriceWei) {
        message.error('HCF余额不足');
        return;
      }
      
      // 授权
      message.info('授权HCF...');
      const approveTx = await hcfToken.approve(nodeAddress, nodePriceWei);
      await waitForTransaction(approveTx);
      
      // 购买节点
      message.info('购买节点NFT中...');
      const mintTx = await nodeContract.mintNode();
      await waitForTransaction(mintTx);
      
      message.success('节点NFT购买成功！');
      setIsBuyModalVisible(false);
      
      // 刷新数据
      await loadNodeData();
      
    } catch (error: any) {
      console.error('购买失败:', error);
      message.error(handleContractError(error));
    } finally {
      setBuying(false);
    }
  };

  // 领取分红
  const handleClaimDividends = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    if (nodeInfo.claimableDividends <= 0) {
      message.error('没有可领取的分红');
      return;
    }
    
    try {
      setClaiming(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nodeContract = getNodeNFTContract(signer);
      
      message.info('领取分红中...');
      const claimTx = await nodeContract.claimDividends();
      await waitForTransaction(claimTx);
      
      message.success('分红领取成功！');
      
      // 刷新数据
      await loadNodeData();
      
    } catch (error: any) {
      console.error('领取失败:', error);
      message.error(handleContractError(error));
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>请先连接钱包</Title>
        <Text type="secondary">连接钱包后查看节点NFT</Text>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
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
                title="我的节点"
                value={nodeInfo.userNodes}
                suffix="个"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="可领分红"
                value={nodeInfo.claimableDividends.toFixed(2)}
                suffix="HCF"
                valueStyle={{ color: '#52c41a' }}
              />
              <Button 
                type="primary" 
                size="small" 
                style={{ marginTop: 8 }}
                onClick={handleClaimDividends}
                loading={claiming}
                disabled={nodeInfo.claimableDividends <= 0}
              >
                领取分红
              </Button>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="我的节点" extra={<CrownOutlined />}>
              {userNodes.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {userNodes.map((node, index) => (
                    <Card key={node.id} size="small">
                      <Space>
                        <Text strong>节点 #{node.id}</Text>
                        <Tag color="purple">等级 {node.level}</Tag>
                        <Text>算力: {node.power}</Text>
                        <Text type="success">累计: {node.rewards.toFixed(2)} HCF</Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <NodeIndexOutlined style={{ fontSize: 48, color: '#999' }} />
                  <Paragraph type="secondary" style={{ marginTop: 16 }}>
                    您还没有节点NFT
                  </Paragraph>
                  <Button 
                    type="primary" 
                    onClick={() => setIsBuyModalVisible(true)}
                    disabled={nodeInfo.totalNodes >= nodeInfo.maxNodes}
                  >
                    {nodeInfo.totalNodes >= nodeInfo.maxNodes ? '已售罄' : '购买节点'}
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
                <div style={{ marginTop: 16 }}>
                  <Space>
                    <Tag color="blue">限量: {nodeInfo.maxNodes}个</Tag>
                    <Tag color="orange">剩余: {nodeInfo.maxNodes - nodeInfo.totalNodes}个</Tag>
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Modal
          title="购买节点NFT"
          open={isBuyModalVisible}
          onOk={handleBuyNode}
          onCancel={() => setIsBuyModalVisible(false)}
          confirmLoading={buying}
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
            <Progress 
              percent={Math.round(nodeInfo.totalNodes / nodeInfo.maxNodes * 100)} 
              status={nodeInfo.totalNodes >= nodeInfo.maxNodes ? 'exception' : 'active'}
            />
            <Paragraph type="warning">
              注意：节点NFT限量99个，售完即止。购买后享受永久分红权益。
            </Paragraph>
          </Space>
        </Modal>
      </div>
    </Spin>
  );
};

export default NodeNFT;