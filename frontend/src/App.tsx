import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

import { wagmiConfig } from './config/wagmi';
import Layout from './components/Layout/index';
import Dashboard from './pages/Dashboard';
import Staking from './pages/Staking';
import NodeNFT from './pages/NodeNFT';
import Referral from './pages/Referral';
import Ranking from './pages/Ranking';
import Exchange from './pages/Exchange';
import Governance from './pages/Governance';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider theme={darkTheme()}>
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#1890ff',
                borderRadius: 8,
              },
            }}
          >
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/staking" element={<Staking />} />
                  <Route path="/node" element={<NodeNFT />} />
                  <Route path="/referral" element={<Referral />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/exchange" element={<Exchange />} />
                  <Route path="/governance" element={<Governance />} />
                </Routes>
              </Layout>
            </Router>
          </ConfigProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App
