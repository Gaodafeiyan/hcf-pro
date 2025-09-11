import React, { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Card, Button, Input, Select, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import '../styles/theme.css';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const { Option } = Select;

interface Token {
  symbol: string;
  address: string;
  decimals: number;
  logo: string;
}

const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: 'USDT',
    address: CONTRACT_ADDRESSES.USDT,
    decimals: 18,
    logo: '💵'
  },
  {
    symbol: 'BSDT',
    address: CONTRACT_ADDRESSES.BSDT,
    decimals: 18,
    logo: '🔷'
  },
  {
    symbol: 'HCF',
    address: CONTRACT_ADDRESSES.HCFToken,
    decimals: 18,
    logo: '🚀'
  }
];

const SwapInterface: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [fromToken, setFromToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(SUPPORTED_TOKENS[2]);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [slippage] = useState<string>('0.5');

  // 获取代币余额
  const { data: fromBalance, refetch: refetchFromBalance } = useBalance({
    address: address,
    token: fromToken.address as `0x${string}`
  });

  const { data: toBalance, refetch: refetchToBalance } = useBalance({
    address: address,
    token: toToken.address as `0x${string}`
  });

  // 交换代币选择
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // 计算输出金额（简化版，实际需要调用合约）
  const calculateOutputAmount = (inputAmount: string) => {
    if (!inputAmount || isNaN(Number(inputAmount))) return '0';
    
    // 简化的汇率计算（实际应该调用合约获取实时汇率）
    let rate = 1;
    if (fromToken.symbol === 'USDT' && toToken.symbol === 'BSDT') {
      rate = 1; // 1:1
    } else if (fromToken.symbol === 'BSDT' && toToken.symbol === 'HCF') {
      rate = 10; // 1 BSDT = 10 HCF
    } else if (fromToken.symbol === 'USDT' && toToken.symbol === 'HCF') {
      rate = 10; // 1 USDT = 10 HCF
    } else if (fromToken.symbol === 'HCF' && toToken.symbol === 'BSDT') {
      rate = 0.1; // 1 HCF = 0.1 BSDT
    } else if (fromToken.symbol === 'BSDT' && toToken.symbol === 'USDT') {
      rate = 1; // 1:1
    } else if (fromToken.symbol === 'HCF' && toToken.symbol === 'USDT') {
      rate = 0.1; // 1 HCF = 0.1 USDT
    }
    
    const output = (Number(inputAmount) * rate).toFixed(6);
    setExchangeRate(rate.toString());
    return output;
  };

  // 处理输入金额变化
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    const output = calculateOutputAmount(value);
    setToAmount(output);
  };

  // 设置最大金额
  const handleMaxAmount = () => {
    if (fromBalance) {
      const maxAmount = formatEther(fromBalance.value);
      setFromAmount(maxAmount);
      const output = calculateOutputAmount(maxAmount);
      setToAmount(output);
    }
  };

  // 执行交换（简化版，需要实际的合约调用）
  const handleSwap = async () => {
    if (!isConnected) {
      message.error('请先连接钱包');
      return;
    }

    if (!fromAmount || Number(fromAmount) <= 0) {
      message.error('请输入有效的交换金额');
      return;
    }

    setIsLoading(true);
    try {
      // 这里需要实际的合约调用逻辑
      message.success(`模拟交换成功: ${fromAmount} ${fromToken.symbol} → ${toAmount} ${toToken.symbol}`);
      
      // 刷新余额
      setTimeout(() => {
        refetchFromBalance();
        refetchToBalance();
      }, 1000);
      
    } catch (error) {
      console.error('Swap error:', error);
      message.error('交换失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0033, #000000, #0a001a)',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '2.5rem',
            background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 10px 0',
            fontWeight: 'bold'
          }}>
            🔄 HCF Swap
          </h1>
          <p style={{ 
            color: '#888',
            fontSize: '1.1rem',
            margin: 0
          }}>
            交换您的数字资产
          </p>
        </div>

        {/* 主交换界面 */}
        <Card className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 8px 32px 0 rgba(0, 212, 255, 0.2)'
        }}>
          
          {/* From Token */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>从</span>
              {fromBalance && (
                <span style={{ color: '#888', fontSize: '0.9rem' }}>
                  余额: {Number(formatEther(fromBalance.value)).toFixed(4)} {fromToken.symbol}
                </span>
              )}
            </div>
            
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Select
                  value={fromToken.symbol}
                  onChange={(value) => {
                    const token = SUPPORTED_TOKENS.find(t => t.symbol === value);
                    if (token) setFromToken(token);
                  }}
                  style={{ minWidth: '120px' }}
                  dropdownStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(0, 212, 255, 0.3)'
                  }}
                >
                  {SUPPORTED_TOKENS.map(token => (
                    <Option key={token.symbol} value={token.symbol}>
                      <span style={{ color: '#fff' }}>
                        {token.logo} {token.symbol}
                      </span>
                    </Option>
                  ))}
                </Select>
                
                <Input
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  placeholder="0.0"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.2rem',
                    textAlign: 'right'
                  }}
                />
                
                <Button
                  onClick={handleMaxAmount}
                  size="small"
                  style={{
                    background: 'linear-gradient(45deg, #00d4ff, #00ff88)',
                    border: 'none',
                    color: '#000',
                    fontWeight: 'bold'
                  }}
                >
                  MAX
                </Button>
              </div>
            </div>
          </div>

          {/* 交换按钮 */}
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Button
              icon={<SwapOutlined />}
              onClick={handleSwapTokens}
              style={{
                background: 'rgba(0, 212, 255, 0.2)',
                border: '1px solid rgba(0, 212, 255, 0.5)',
                color: '#00d4ff',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </div>

          {/* To Token */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{ color: '#00ff88', fontWeight: 'bold' }}>到</span>
              {toBalance && (
                <span style={{ color: '#888', fontSize: '0.9rem' }}>
                  余额: {Number(formatEther(toBalance.value)).toFixed(4)} {toToken.symbol}
                </span>
              )}
            </div>
            
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Select
                  value={toToken.symbol}
                  onChange={(value) => {
                    const token = SUPPORTED_TOKENS.find(t => t.symbol === value);
                    if (token) setToToken(token);
                  }}
                  style={{ minWidth: '120px' }}
                  dropdownStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(0, 255, 136, 0.3)'
                  }}
                >
                  {SUPPORTED_TOKENS.map(token => (
                    <Option key={token.symbol} value={token.symbol}>
                      <span style={{ color: '#fff' }}>
                        {token.logo} {token.symbol}
                      </span>
                    </Option>
                  ))}
                </Select>
                
                <Input
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.2rem',
                    textAlign: 'right'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 交易信息 */}
          {fromAmount && toAmount && (
            <div style={{
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px',
              border: '1px solid rgba(0, 212, 255, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#888' }}>汇率</span>
                <span style={{ color: '#00d4ff' }}>
                  1 {fromToken.symbol} = {exchangeRate} {toToken.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#888' }}>滑点容限</span>
                <span style={{ color: '#00ff88' }}>{slippage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>预计手续费</span>
                <span style={{ color: '#ffa500' }}>~0.001 BNB</span>
              </div>
            </div>
          )}

          {/* 交换按钮 */}
          <Button
            onClick={handleSwap}
            loading={isLoading}
            disabled={!isConnected || !fromAmount || Number(fromAmount) <= 0}
            className="neon-button"
            style={{
              width: '100%',
              height: '50px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: isConnected && fromAmount && Number(fromAmount) > 0 
                ? 'linear-gradient(45deg, #00d4ff, #00ff88)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: isConnected && fromAmount && Number(fromAmount) > 0 ? '#000' : '#666'
            }}
          >
            {!isConnected 
              ? '请连接钱包' 
              : !fromAmount || Number(fromAmount) <= 0
              ? '请输入金额'
              : `交换 ${fromToken.symbol} → ${toToken.symbol}`
            }
          </Button>
        </Card>

        {/* 快速交换选项 */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginTop: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { from: 'USDT', to: 'BSDT', label: 'USDT→BSDT' },
            { from: 'BSDT', to: 'HCF', label: 'BSDT→HCF' },
            { from: 'USDT', to: 'HCF', label: 'USDT→HCF' }
          ].map((option, index) => (
            <Button
              key={index}
              onClick={() => {
                const fromTokenObj = SUPPORTED_TOKENS.find(t => t.symbol === option.from);
                const toTokenObj = SUPPORTED_TOKENS.find(t => t.symbol === option.to);
                if (fromTokenObj && toTokenObj) {
                  setFromToken(fromTokenObj);
                  setToToken(toTokenObj);
                  setFromAmount('');
                  setToAmount('');
                }
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#00d4ff',
                borderRadius: '8px',
                padding: '8px 16px'
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;
