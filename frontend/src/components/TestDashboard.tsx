import React from 'react';

const TestDashboard: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0033, #000000, #0a001a)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{
        fontSize: '3rem',
        background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '20px'
      }}>
        🚀 3D科技感测试页面
      </h1>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#00d4ff' }}>
          ✅ 新组件加载成功！
        </h2>
        
        <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
          如果您看到这个页面，说明：
        </p>
        
        <ul style={{ 
          textAlign: 'left', 
          fontSize: '1.1rem', 
          lineHeight: '1.8',
          listStyle: 'none',
          padding: 0
        }}>
          <li>✅ 路由配置正确</li>
          <li>✅ 3D组件可以加载</li>
          <li>✅ 样式系统工作正常</li>
          <li>✅ 部署流程成功</li>
        </ul>
        
        <div style={{
          marginTop: '30px',
          padding: '15px 30px',
          background: 'linear-gradient(45deg, #00d4ff, #00ff88)',
          borderRadius: '8px',
          color: '#000',
          fontWeight: 'bold'
        }}>
          🎉 3D科技感界面准备就绪！
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;
