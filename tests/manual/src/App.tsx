import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import WalletConnection from './components/WalletConnection';
import PrivateKeyTest from './components/PrivateKeyTest';
import WagmiTest from './components/WagmiTest';
import TestSuite from './components/TestSuite';
import PublicOnlyTest from './components/PublicOnlyTest';
import InteractivePaginationTest from './components/InteractivePaginationTest';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

type Tab = 'connection' | 'private-key' | 'wagmi' | 'public-only' | 'pagination' | 'test-suite';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('connection');

  const tabs = [
    { id: 'connection', label: 'Wallet Connection', component: WalletConnection },
    { id: 'private-key', label: 'Private Key Tests', component: PrivateKeyTest },
    { id: 'wagmi', label: 'Wagmi Tests', component: WagmiTest },
    { id: 'public-only', label: 'Public Only (No Wallet)', component: PublicOnlyTest },
    { id: 'pagination', label: 'Interactive Pagination', component: InteractivePaginationTest },
    { id: 'test-suite', label: 'Full Test Suite', component: TestSuite },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || WalletConnection;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Grapevine SDK Manual Tests
                  </h1>
                  <div className="text-sm text-gray-500">
                    Test wagmi integration and SDK functionality
                  </div>
                </div>
              </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Tab Navigation */}
              <div className="mb-8">
                <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-md transition-colors
                        ${activeTab === tab.id
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Active Tab Content */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <ActiveComponent />
              </div>
            </div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;