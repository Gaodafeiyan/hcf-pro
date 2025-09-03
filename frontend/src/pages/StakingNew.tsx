import { useState, useEffect } from 'react';
import { Card, InputNumber, Button, Typography, Space, Checkbox, Select, message, Spin } from 'antd';
import { BankOutlined, FireOutlined, GiftOutlined } from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getHCFTokenContract,
  getBSDTTokenContract,
  getStakingContract,
  parseNumber,
  waitForTransaction,
  handleContractError
} from '../utils/contracts';
import { STAKING_LEVELS, COMPOUND_AMOUNTS, STAKING_CONFIG } from '../config/contracts';

const { Title, Text } = Typography;
const { Option } = Select;

const StakingNew = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [staking, setStaking] = useState(false);
  const [compounding, setCompounding] = useState(false);
  
  // 质押相关状态
  const [stakeAmount, setStakeAmount] = useState<number>(1000);
  const [isLPStake, setIsLPStake] = useState(false);
  const [compoundAmount, setCompoundAmount] = useState<number>(10);
  
  // 用户数据
  const [balance, setBalance] = useState(0);
  const [bsdtBalance, setBsdtBalance] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [hcfPrice] = useState(0.1); // 默认价格0.1 USDT
  
  // 计算当前等级
  const getCurrentLevel = (amount: number) => {
    for (const level of STAKING_LEVELS) {
      if (amount >= level.minAmount && amount <= level.maxAmount) {
        return level;
      }
    }
    return STAKING_LEVELS[0]; // 默认返回Level 1
  };

  // 验证10倍数
  const isValidMultiple = (amount: number) => {
    return amount % STAKING_CONFIG.multipleRequired === 0;
  };

  // 验证最低金额
  const isValidAmount = (amount: number) => {
    return amount >= STAKING_CONFIG.minStakeAmount;
  };

  // 计算等值BSDT
  const calculateBSDTAmount = (hcfAmount: number) => {
    return hcfAmount * hcfPrice;
  };

  // 加载用户数据
  const loadUserData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const bsdtToken = getBSDTTokenContract(signer);
      const stakingContract = getStakingContract(signer);
      
      // 获取余额
      const hcfBalance = await hcfToken.balanceOf(address);
      const bsdtBal = await bsdtToken.balanceOf(address);
      setBalance(Number(ethers.formatUnits(hcfBalance, 18)));
      setBsdtBalance(Number(ethers.formatUnits(bsdtBal, 18)));
      
      // 获取总质押量
      const totalStakedAmount = await stakingContract.getTotalStaked();
      setTotalStaked(Number(ethers.formatUnits(totalStakedAmount, 18)));
      
      // 获取用户质押信息
      const userInfo = await stakingContract.getUserInfo(address);
      const [, , pending] = userInfo;
      setPendingRewards(Number(ethers.formatUnits(pending, 18)));
      
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [isConnected, address]);

  // 质押函数
  const handleStake = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }

    if (!isValidAmount(stakeAmount)) {
      message.error(`最低质押${STAKING_CONFIG.minStakeAmount} HCF`);
      return;
    }

    if (!isValidMultiple(stakeAmount)) {
      message.error('质押数量必须是10的倍数');
      return;
    }

    try {
      setStaking(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const hcfToken = getHCFTokenContract(signer);
      const stakingContract = getStakingContract(signer);
      
      const amount = parseNumber(stakeAmount.toString());
      
      // 检查余额
      if (balance < stakeAmount) {
        message.error('HCF余额不足');
        return;
      }

      if (isLPStake) {
        const bsdtAmount = calculateBSDTAmount(stakeAmount);
        if (bsdtBalance < bsdtAmount) {
          message.error(`BSDT余额不足，需要${bsdtAmount.toFixed(2)} BSDT`);
          return;
        }

        // LP质押需要同时授权HCF和BSDT
        const bsdtToken = getBSDTTokenContract(signer);
        const bsdtAmountWei = parseNumber(bsdtAmount.toString());
        
        // 授权BSDT
        const bsdtApproveTx = await bsdtToken.approve(stakingContract.target, bsdtAmountWei);
        await waitForTransaction(bsdtApproveTx);
      }
      
      // 授权HCF
      const approveTx = await hcfToken.approve(stakingContract.target, amount);
      await waitForTransaction(approveTx);
      
      // 执行质押
      const stakeTx = await stakingContract.stake(amount, isLPStake, false);
      await waitForTransaction(stakeTx);
      
      message.success('质押成功！');
      loadUserData();
      
    } catch (error: any) {
      console.error('质押失败:', error);
      message.error(handleContractError(error));
    } finally {
      setStaking(false);
    }
  };

  // 复投函数
  const handleCompound = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }

    if (pendingRewards < compoundAmount) {
      message.error('待领取收益不足');
      return;
    }

    try {
      setCompounding(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const stakingContract = getStakingContract(signer);
      
      // 执行复投（固定金额）
      const compoundTx = await stakingContract.compoundFixed(parseNumber(compoundAmount.toString()));
      await waitForTransaction(compoundTx);
      
      message.success(`成功复投${compoundAmount} HCF！`);
      loadUserData();
      
    } catch (error: any) {
      console.error('复投失败:', error);
      message.error(handleContractError(error));
    } finally {
      setCompounding(false);
    }
  };

  const currentLevelInfo = getCurrentLevel(stakeAmount);
  const isValidStake = isValidAmount(stakeAmount) && isValidMultiple(stakeAmount);
  const bsdtRequired = calculateBSDTAmount(stakeAmount);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      
      {/* 当前总质押量 */}
      <Card style={{ marginBottom: 20, textAlign: 'center' }}>
        <Title level={4}>
          <BankOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          当前总质押: {totalStaked.toLocaleString()} HCF
        </Title>
      </Card>

      {/* 质押操作 */}
      <Card 
        title={
          <span>
            <FireOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            质押挖矿 (自动等级)
          </span>
        }
        style={{ marginBottom: 20 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          
          {/* 质押数量输入 */}
          <div>
            <Text strong>质押数量:</Text>
            <InputNumber
              value={stakeAmount}
              onChange={(value) => setStakeAmount(value || 1000)}
              min={STAKING_CONFIG.minStakeAmount}
              step={10}
              style={{ width: '100%', marginTop: 8 }}
              placeholder="输入质押数量（必须10倍数）"
              addonAfter="HCF"
            />
            {!isValidMultiple(stakeAmount) && (
              <Text type="danger" style={{ fontSize: 12 }}>
                ⚠️ 必须是10的倍数，如10/20/30...
              </Text>
            )}
            {!isValidAmount(stakeAmount) && (
              <Text type="danger" style={{ fontSize: 12 }}>
                ⚠️ 最低质押{STAKING_CONFIG.minStakeAmount} HCF
              </Text>
            )}
          </div>

          {/* 当前等级显示 */}
          <Card size="small" style={{ background: currentLevelInfo.color + '20' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: currentLevelInfo.color }}>
                当前等级: Level {currentLevelInfo.level}
              </Text>
              <Text>日化收益: {currentLevelInfo.dailyRate}%</Text>
              <Text>LP加成: {currentLevelInfo.lpRate}% (总收益{currentLevelInfo.totalRate}%)</Text>
            </Space>
          </Card>

          {/* LP质押选项 */}
          <div>
            <Checkbox 
              checked={isLPStake}
              onChange={(e) => setIsLPStake(e.target.checked)}
            >
              LP质押 (HCF+BSDT等额)
            </Checkbox>
            {isLPStake && (
              <div style={{ marginTop: 8, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                <Text>需要等额BSDT: <Text strong>{bsdtRequired.toFixed(2)} BSDT</Text></Text>
                <br />
                <Text type="secondary">基于当前价格: {hcfPrice} USDT/HCF</Text>
              </div>
            )}
          </div>

          {/* 余额显示 */}
          <div style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
            <Space>
              <Text>HCF余额: <Text strong>{balance.toFixed(2)}</Text></Text>
              <Text>BSDT余额: <Text strong>{bsdtBalance.toFixed(2)}</Text></Text>
            </Space>
          </div>

          {/* 质押按钮 */}
          <Button
            type="primary"
            size="large"
            loading={staking}
            disabled={!isValidStake || (isLPStake && bsdtBalance < bsdtRequired)}
            onClick={handleStake}
            style={{ width: '100%' }}
          >
            {!isValidStake ? '请输入有效金额' : `确认质押 ${stakeAmount} HCF`}
          </Button>
        </Space>
      </Card>

      {/* 复投操作 */}
      <Card 
        title={
          <span>
            <GiftOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            复投操作 (固定金额)
          </span>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          
          <div>
            <Text strong>待领取收益: </Text>
            <Text style={{ color: '#52c41a', fontSize: 18, fontWeight: 'bold' }}>
              {pendingRewards.toFixed(4)} HCF
            </Text>
          </div>

          <div>
            <Text strong>选择复投金额:</Text>
            <Select
              value={compoundAmount}
              onChange={setCompoundAmount}
              style={{ width: '100%', marginTop: 8 }}
            >
              {COMPOUND_AMOUNTS.map(amount => (
                <Option key={amount} value={amount}>
                  {amount} HCF
                </Option>
              ))}
            </Select>
          </div>

          <Button
            type="primary"
            size="large"
            loading={compounding}
            disabled={pendingRewards < compoundAmount}
            onClick={handleCompound}
            style={{ width: '100%' }}
          >
            {pendingRewards < compoundAmount 
              ? `收益不足，需要${compoundAmount} HCF` 
              : `确认复投 ${compoundAmount} HCF`
            }
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default StakingNew;
