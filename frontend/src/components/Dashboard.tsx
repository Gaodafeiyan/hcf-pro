import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import WalletConnection from './WalletConnection';
import '../styles/theme.css';

const Dashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 获取代币余额
  const { data: hcfBalance } = useBalance({
    address: address,
    token: '0xc5c3f24a212838968759045d1654d3643016d585' as `0x${string}`, // HCF Token
    query: { enabled: !!address }
  });

  const { data: bsdtBalance } = useBalance({
    address: address,
    token: '0x3932968a904Bf6773E8a13F1D2358331B9a1a530' as `0x${string}`, // BSDT Token
    query: { enabled: !!address }
  });

  const { data: bnbBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 模拟数据
  const mockData = {
    totalUsers: 15847,
    totalStaked: 2847293,
    totalRewards: 184729,
    apy: 285.6,
    nodeCount: 67,
    stakingLevels: [
      { level: 'L3', users: 8429, percentage: 53 },
      { level: 'L4', users: 5234, percentage: 33 },
      { level: 'L5', users: 2184, percentage: 14 },
    ]
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isConnected) {
    return (
      <div className="dashboard-container">
        <div className="welcome-section">
          <div className="welcome-card glass-card">
            <div className="welcome-content">
              <h1 className="welcome-title">
                <span className="gradient-text">HCF DeFi Platform</span>
              </h1>
              <p className="welcome-subtitle">
                体验下一代DeFi生态系统
              </p>
              <div className="feature-list">
                <div className="feature-item">
                  <span className="feature-icon">🚀</span>
                  <span>高收益质押挖矿</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💎</span>
                  <span>限量节点NFT</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span>20级推荐奖励</span>
                </div>
              </div>
              <div className="connect-section">
                <WalletConnection />
              </div>
            </div>
          </div>
        </div>
        
        <div style={{display: 'none'}}>{`
          .dashboard-container {
            min-height: 100vh;
            background: var(--bg-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .welcome-section {
            max-width: 600px;
            width: 100%;
          }
          
          .welcome-card {
            padding: 40px;
            text-align: center;
            animation: float 3s ease-in-out infinite;
          }
          
          .welcome-title {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 16px;
          }
          
          .gradient-text {
            background: linear-gradient(135deg, var(--neon-blue), var(--neon-green));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .welcome-subtitle {
            font-size: 1.2rem;
            color: var(--text-secondary);
            margin-bottom: 32px;
          }
          
          .feature-list {
            display: flex;
            justify-content: space-around;
            margin-bottom: 40px;
            flex-wrap: wrap;
            gap: 20px;
          }
          
          .feature-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 16px;
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
          }
          
          .feature-item:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-4px);
          }
          
          .feature-icon {
            font-size: 2rem;
            margin-bottom: 8px;
          }
          
          .connect-section {
            margin-top: 32px;
          }
          
          @media (max-width: 768px) {
            .welcome-card {
              padding: 24px;
            }
            
            .welcome-title {
              font-size: 2rem;
            }
            
            .feature-list {
              flex-direction: column;
              align-items: center;
            }
          }
        `}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 顶部状态栏 */}
      <div className="top-bar glass-card">
        <div className="time-display">
          <span className="time-label">当前时间</span>
          <span className="time-value">{currentTime.toLocaleTimeString()}</span>
        </div>
        <div className="network-status">
          <span className="network-dot"></span>
          <span>BSC 主网</span>
        </div>
        <WalletConnection className="compact" />
      </div>

      {/* 主要统计卡片 */}
      <div className="stats-grid">
        <div className="stats-card gradient-card">
          <div className="stats-icon">👥</div>
          <div className="stats-number">{formatNumber(mockData.totalUsers)}</div>
          <div className="stats-label">总用户数</div>
        </div>
        
        <div className="stats-card gradient-card success">
          <div className="stats-icon">💰</div>
          <div className="stats-number">{formatNumber(mockData.totalStaked)}</div>
          <div className="stats-label">总质押量 HCF</div>
        </div>
        
        <div className="stats-card gradient-card warning">
          <div className="stats-icon">🎁</div>
          <div className="stats-number">{formatNumber(mockData.totalRewards)}</div>
          <div className="stats-label">总奖励 HCF</div>
        </div>
        
        <div className="stats-card gradient-card danger">
          <div className="stats-icon">📈</div>
          <div className="stats-number">{mockData.apy}%</div>
          <div className="stats-label">最高年化收益</div>
        </div>
      </div>

      {/* 用户资产面板 */}
      <div className="user-assets glass-card">
        <h3 className="section-title">我的资产</h3>
        <div className="assets-grid">
          <div className="asset-item">
            <div className="asset-icon">🔥</div>
            <div className="asset-info">
              <div className="asset-name">HCF</div>
              <div className="asset-balance">
                {hcfBalance ? parseFloat(hcfBalance.formatted).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          
          <div className="asset-item">
            <div className="asset-icon">💎</div>
            <div className="asset-info">
              <div className="asset-name">BSDT</div>
              <div className="asset-balance">
                {bsdtBalance ? parseFloat(bsdtBalance.formatted).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          
          <div className="asset-item">
            <div className="asset-icon">⚡</div>
            <div className="asset-info">
              <div className="asset-name">BNB</div>
              <div className="asset-balance">
                {bnbBalance ? parseFloat(bnbBalance.formatted).toFixed(4) : '0.0000'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 质押等级分布 */}
      <div className="staking-levels glass-card">
        <h3 className="section-title">质押等级分布</h3>
        <div className="levels-grid">
          {mockData.stakingLevels.map((level) => (
            <div key={level.level} className="level-item">
              <div className="level-header">
                <span className="level-name">{level.level}</span>
                <span className="level-percentage">{level.percentage}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${level.percentage}%` }}
                ></div>
              </div>
              <div className="level-users">{formatNumber(level.users)} 用户</div>
            </div>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="quick-actions">
        <button className="action-btn neon-button">
          <span>🚀</span>
          开始质押
        </button>
        <button className="action-btn neon-button success">
          <span>💎</span>
          申请节点
        </button>
        <button 
          className="action-btn neon-button warning"
          onClick={() => navigate('/swap')}
        >
          <span>🔄</span>
          兑换代币
        </button>
      </div>

      <div style={{display: 'none'}}>{`
        .dashboard-container {
          min-height: 100vh;
          background: var(--bg-dark);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
        }
        
        .time-display {
          display: flex;
          flex-direction: column;
        }
        
        .time-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .time-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--neon-blue);
        }
        
        .network-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        
        .network-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--neon-green);
          box-shadow: 0 0 10px var(--neon-green);
          animation: glow 2s ease-in-out infinite;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        
        .stats-card {
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .stats-icon {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }
        
        .user-assets, .staking-levels {
          padding: 24px;
        }
        
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-green));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .assets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .asset-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          transition: all 0.3s ease;
        }
        
        .asset-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        
        .asset-icon {
          font-size: 1.5rem;
        }
        
        .asset-info {
          display: flex;
          flex-direction: column;
        }
        
        .asset-name {
          font-size: 14px;
          color: var(--text-muted);
        }
        
        .asset-balance {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .levels-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .level-item {
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
        }
        
        .level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .level-name {
          font-weight: 600;
          color: var(--neon-blue);
        }
        
        .level-percentage {
          color: var(--neon-green);
          font-weight: 600;
        }
        
        .level-users {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }
        
        .quick-actions {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          min-width: 140px;
          justify-content: center;
        }
        
        .action-btn span {
          font-size: 18px;
        }
        
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 12px;
            gap: 16px;
          }
          
          .top-bar {
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .assets-grid {
            grid-template-columns: 1fr;
          }
          
          .quick-actions {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</div>
    </div>
  );
};

export default Dashboard;
