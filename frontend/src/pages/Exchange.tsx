import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Typography, Space, Tag, InputNumber, Statistic, Modal, message, Spin } from 'antd';
import { SwapOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getHCFTokenContract,
  getUSDTTokenContract,
  getExchangeContract,
  parseNumber,
  waitForTransaction,
  handleContractError
} from '../utils/contracts';

const { Title, Text, Paragraph } = Typography;

const Exchange = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapAmount, setSwapAmount] = useState<number>(100);
  const [swapDirection, setSwapDirection] = useState<'hcf2usdt' | 'usdt2hcf'>('hcf2usdt');
  const [isSwapModalVisible, setIsSwapModalVisible] = useState(false);
  
  const [balances, setBalances] = useState({
    hcf: 0,
    usdt: 0
  });
  
  const [exchangeInfo, setExchangeInfo] = useState({
    hcfPrice: 0.1,
    usdtPrice: 1.0,
    exchangeRate: 10, // 1 USDT = 10 HCF
    slippage: 0.5,
    minSwap: 10,
    maxSwap: 10000,
    totalVolume: 0,
    dailyVolume: 0,
  });

  // 加载数据
  const loadData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const usdtToken = getUSDTTokenContract(signer);
      const exchangeContract = getExchangeContract(signer);
      
      // 获取余额
      const [hcfBal, usdtBal] = await Promise.all([
        hcfToken.balanceOf(address),
        usdtToken.balanceOf(address)
      ]);
      
      setBalances({
        hcf: Number(ethers.formatUnits(hcfBal, 18)),
        usdt: Number(ethers.formatUnits(usdtBal, 18))
      });
      
      // 获取兑换信息
      try {
        const [reserves, sellFee] = await Promise.all([
          exchangeContract.getReserves(),
          exchangeContract.sellFeeRate()
        ]);
        
        // 计算兑换率 (HCF/USDT比率)
        const hcfReserve = Number(ethers.formatUnits(reserves.hcfReserve, 18));
        const usdtReserve = Number(ethers.formatUnits(reserves.usdtReserve, 18));
        const rate = usdtReserve > 0 ? hcfReserve / usdtReserve : 10;
        
        setExchangeInfo(prev => ({
          ...prev,
          exchangeRate: rate,
          slippage: Number(sellFee) / 100 // sellFeeRate是基点，除以100得到百分比
        }));
      } catch (error) {
        console.log('获取兑换信息失败，使用默认值');
      }
      
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isConnected && address) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  const calculateOutput = (input: number, direction: string) => {
    if (direction === 'hcf2usdt') {
      // HCF换USDT，扣除3%手续费
      const feeRate = exchangeInfo.slippage / 100;
      const afterFee = input * (1 - feeRate);
      return afterFee / exchangeInfo.exchangeRate; // HCF价格相对于USDT
    } else {
      // USDT换HCF，无手续费
      return input * exchangeInfo.exchangeRate;
    }
  };

  const handleSwap = () => {
    const sourceToken = swapDirection === 'hcf2usdt' ? 'HCF' : 'USDT';
    const sourceBalance = swapDirection === 'hcf2usdt' ? balances.hcf : balances.usdt; // 注：usdt余额实际是USDT
    
    if (swapAmount < exchangeInfo.minSwap) {
      message.error(`最小兑换数量为 ${exchangeInfo.minSwap} ${sourceToken}`);
      return;
    }
    if (swapAmount > exchangeInfo.maxSwap) {
      message.error(`最大兑换数量为 ${exchangeInfo.maxSwap} ${sourceToken}`);
      return;
    }
    if (swapAmount > sourceBalance) {
      message.error(`${sourceToken} 余额不足`);
      return;
    }
    setIsSwapModalVisible(true);
  };

  const confirmSwap = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }
    
    try {
      setSwapping(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const usdtToken = getUSDTTokenContract(signer);
      const exchangeContract = getExchangeContract(signer);
      const exchangeAddress = await exchangeContract.getAddress();
      
      const swapAmountWei = parseNumber(swapAmount.toString(), 18);
      
      if (swapDirection === 'hcf2usdt') {
        // HCF -> USDT (实际上USDT和USDT 1:1锚定)
        // 先授权HCF
        message.info('授权HCF...');
        const approveTx = await hcfToken.approve(exchangeAddress, swapAmountWei);
        await waitForTransaction(approveTx);
        
        // 执行兑换
        message.info('兑换中...');
        const swapTx = await exchangeContract.swapHCFToUSDT(swapAmountWei);
        await waitForTransaction(swapTx);
        
      } else {
        // USDT -> HCF (使用USDT作为USDT)
        // 先授权USDT（作为USDT）
        message.info('授权USDT...');
        const approveTx = await usdtToken.approve(exchangeAddress, swapAmountWei);
        await waitForTransaction(approveTx);
        
        // 执行兑换
        message.info('兑换中...');
        const swapTx = await exchangeContract.swapUSDTToHCF(swapAmountWei);
        await waitForTransaction(swapTx);
      }
      
      const output = calculateOutput(swapAmount, swapDirection);
      message.success(`成功兑换 ${swapAmount} ${swapDirection === 'hcf2usdt' ? 'HCF' : 'USDT'} 获得 ${output.toFixed(2)} ${swapDirection === 'hcf2usdt' ? 'USDT' : 'HCF'}`);
      
      setIsSwapModalVisible(false);
      
      // 刷新余额
      await loadData();
      
    } catch (error: any) {
      console.error('兑换失败:', error);
      message.error(handleContractError(error));
    } finally {
      setSwapping(false);
    }
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>请先连接钱包</Title>
        <Text type="secondary">连接钱包后进行兑换操作</Text>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={2}>USDT 兑换</Title>
        <Text type="secondary">HCF 与 USDT 稳定币之间的兑换</Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="HCF 价格"
                value={exchangeInfo.hcfPrice}
                prefix="$"
                suffix="USDT"
                valueStyle={{ color: '#3f8600' }}
                precision={4}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="USDT 价格"
                value={exchangeInfo.usdtPrice}
                prefix="$"
                suffix="USDT"
                valueStyle={{ color: '#1890ff' }}
                precision={2}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="兑换汇率"
                value={exchangeInfo.exchangeRate}
                suffix="HCF/USDT"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="滑点"
                value={exchangeInfo.slippage}
                suffix="%"
                valueStyle={{ color: '#fa8c16' }}
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="兑换" extra={<SwapOutlined />}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text>我的余额</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <Tag color="blue">HCF: {balances.hcf.toFixed(2)}</Tag>
                      <Tag color="green">USDT: {balances.usdt.toFixed(2)}</Tag>
                    </Space>
                  </div>
                </div>

                <div>
                  <Text>兑换方向</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <Button
                        type={swapDirection === 'hcf2usdt' ? 'primary' : 'default'}
                        onClick={() => setSwapDirection('hcf2usdt')}
                      >
                        HCF → USDT
                      </Button>
                      <Button
                        type={swapDirection === 'usdt2hcf' ? 'primary' : 'default'}
                        onClick={() => setSwapDirection('usdt2hcf')}
                      >
                        USDT → HCF
                      </Button>
                    </Space>
                  </div>
                </div>

                <div>
                  <Text>兑换数量</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 8 }}
                    size="large"
                    min={exchangeInfo.minSwap}
                    max={Math.min(
                      exchangeInfo.maxSwap,
                      swapDirection === 'hcf2usdt' ? balances.hcf : balances.usdt
                    )}
                    value={swapAmount}
                    onChange={(value) => setSwapAmount(value || 100)}
                    formatter={(value) => `${value} ${swapDirection === 'hcf2usdt' ? 'HCF' : 'USDT'}`}
                    parser={(value) => Number(value!.replace(/[^\d.]/g, '')) || 0}
                  />
                </div>

                <div>
                  <Text>预计获得</Text>
                  <Title level={3} style={{ margin: '8px 0', color: '#52c41a' }}>
                    {calculateOutput(swapAmount, swapDirection).toFixed(4)} {swapDirection === 'hcf2usdt' ? 'USDT' : 'HCF'}
                  </Title>
                  <Text type="secondary">
                    (已扣除 {exchangeInfo.slippage}% 滑点)
                  </Text>
                </div>

                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  onClick={handleSwap}
                  disabled={!isConnected}
                >
                  兑换
                </Button>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="兑换说明" extra={<InfoCircleOutlined />}>
              <Space direction="vertical" size="middle">
                <div>
                  <Title level={5}>USDT 稳定币</Title>
                  <Paragraph type="secondary">
                    USDT 是与美元 1:1 锚定的稳定币，提供稳定的价值存储和交易媒介。
                  </Paragraph>
                </div>

                <div>
                  <Title level={5}>兑换机制</Title>
                  <Paragraph type="secondary">
                    - 实时汇率基于流动性池自动计算<br />
                    - 大额交易可能产生较高滑点<br />
                    - 所有交易需要支付少量手续费
                  </Paragraph>
                </div>

                <div>
                  <Title level={5}>使用场景</Title>
                  <Paragraph type="secondary">
                    - 价值存储：将收益转换为稳定币<br />
                    - 风险对冲：市场波动时的避险工具<br />
                    - 支付结算：稳定的支付和结算方式
                  </Paragraph>
                </div>

                <div>
                  <Space>
                    <Tag color="blue">最小兑换: {exchangeInfo.minSwap}</Tag>
                    <Tag color="orange">最大兑换: {exchangeInfo.maxSwap}</Tag>
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Modal
          title="确认兑换"
          open={isSwapModalVisible}
          onOk={confirmSwap}
          onCancel={() => setIsSwapModalVisible(false)}
          confirmLoading={swapping}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>兑换方向</Text>
              <Title level={4}>
                {swapDirection === 'hcf2usdt' ? 'HCF → USDT' : 'USDT → HCF'}
              </Title>
            </div>
            <div>
              <Text>支付数量</Text>
              <Title level={3}>
                {swapAmount} {swapDirection === 'hcf2usdt' ? 'HCF' : 'USDT'}
              </Title>
            </div>
            <div>
              <Text>预计获得</Text>
              <Title level={3} style={{ color: '#52c41a' }}>
                {calculateOutput(swapAmount, swapDirection).toFixed(4)} {swapDirection === 'hcf2usdt' ? 'USDT' : 'HCF'}
              </Title>
            </div>
            <div>
              <Text type="secondary">
                汇率: 1 USDT = {exchangeInfo.exchangeRate} HCF<br />
                滑点: {exchangeInfo.slippage}%
              </Text>
            </div>
          </Space>
        </Modal>
      </div>
    </Spin>
  );
};

export default Exchange;