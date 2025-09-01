import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

import { wagmiConfig } from './config/wagmi';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/index';
import Dashboard from './pages/Dashboard';
import Staking from './pages/Staking';
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
          <ThemeProvider>
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
                  <Route path="/test" element={<Test />} />
                </Routes>
              </Layout>
            </Router>
          </ThemeProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App
