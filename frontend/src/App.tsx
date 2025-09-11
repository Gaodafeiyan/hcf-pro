import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import './styles/theme.css'; // 3D科技感主题
import './i18n'; // Initialize i18n

import { wagmiConfig } from './config/wagmi';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import Layout from './components/Layout/index';
import Dashboard from './components/Dashboard'; // 使用新的3D科技感Dashboard
import StakingNew from './pages/StakingNew';
import NodeNFT from './pages/NodeNFT';
import Referral from './pages/Referral';
import Ranking from './pages/Ranking';
import Exchange from './pages/Exchange';
import Governance from './pages/Governance';
import Test from './pages/Test';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider theme={darkTheme()}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/staking" element={<Layout><StakingNew /></Layout>} />
                  <Route path="/node" element={<Layout><NodeNFT /></Layout>} />
                  <Route path="/referral" element={<Layout><Referral /></Layout>} />
                  <Route path="/ranking" element={<Layout><Ranking /></Layout>} />
                  <Route path="/exchange" element={<Layout><Exchange /></Layout>} />
                  <Route path="/governance" element={<Layout><Governance /></Layout>} />
                  <Route path="/test" element={<Layout><Test /></Layout>} />
                  {/* 添加通配符路由，确保所有路径都能正确渲染 */}
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Router>
            </ThemeProvider>
          </I18nextProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App
