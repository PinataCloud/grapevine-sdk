import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { GrapevineClient, WagmiAdapter } from '@grapevine/sdk';

export default function WagmiTest() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [grapevine, setGrapevine] = useState<GrapevineClient | null>(null);
  const [isGrapevineReady, setIsGrapevineReady] = useState(false);

  // Initialize Grapevine with wagmi
  useEffect(() => {
    if (walletClient) {
      try {
        const adapter = new WagmiAdapter(walletClient as any);
        const client = new GrapevineClient({
          walletAdapter: adapter,
          network,
          debug: true
        });
        setGrapevine(client);
        setIsGrapevineReady(true);
      } catch (error) {
        console.error('Failed to initialize Grapevine:', error);
        setGrapevine(null);
        setIsGrapevineReady(false);
      }
    } else {
      setGrapevine(null);
      setIsGrapevineReady(false);
    }
  }, [walletClient, network]);

  const addResult = (type: 'success' | 'error' | 'info', message: string, data?: any) => {
    setResults(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testCategories = async () => {
    if (!grapevine) return;
    
    setLoading(true);
    try {
      const categories = await grapevine.getCategories();
      addResult('success', 'Categories loaded via wagmi', { count: categories.length, categories });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to load categories', { error: message });
    } finally {
      setLoading(false);
    }
  };

  const testCreateFeed = async () => {
    if (!grapevine) return;
    
    setLoading(true);
    try {
      const feed = await grapevine.feeds.create({
        name: `Wagmi Test Feed ${Date.now()}`,
        description: 'Created via wagmi integration test',
        tags: ['test', 'wagmi']
      });
      addResult('success', 'Feed created via wagmi', feed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to create feed', { error: message });
    } finally {
      setLoading(false);
    }
  };

  const testListFeeds = async () => {
    if (!grapevine) return;
    
    setLoading(true);
    try {
      const response = await grapevine.feeds.list({ page_size: 5 });
      addResult('success', 'Feeds loaded via wagmi', { 
        count: response.data.length, 
        hasMore: response.has_more,
        feeds: response.data
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to list feeds', { error: message });
    } finally {
      setLoading(false);
    }
  };

  const testSignMessage = async () => {
    if (!walletClient || !address) return;
    
    setLoading(true);
    try {
      const message = `Test message ${Date.now()}`;
      const signature = await walletClient.signMessage({
        message,
        account: address as `0x${string}`
      });
      addResult('success', 'Message signed via wagmi', { message, signature });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to sign message', { error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Wagmi Integration Testing</h2>
        <p className="text-gray-600 mb-6">
          Test the SDK with wagmi wallet integration. Connect your wallet first in the "Wallet Connection" tab.
        </p>
      </div>

      {/* Network Selection */}
      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <h3 className="font-medium mb-4">Network Configuration</h3>
        <div className="flex space-x-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="testnet"
              checked={network === 'testnet'}
              onChange={(e) => setNetwork(e.target.value as 'testnet')}
              className="mr-2"
            />
            Testnet (Base Sepolia)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="mainnet"
              checked={network === 'mainnet'}
              onChange={(e) => setNetwork(e.target.value as 'mainnet')}
              className="mr-2"
            />
            Mainnet (Base)
          </label>
        </div>
        <p className="text-sm text-blue-700">
          Changes to network setting will recreate the Grapevine client.
        </p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`border rounded-lg p-4 ${
          isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h4 className="font-medium mb-2">Wallet Status</h4>
          <div className="text-sm space-y-1">
            <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
            {address && <div>Address: <code className="text-xs">{address.slice(0, 8)}...{address.slice(-6)}</code></div>}
            {chain && <div>Chain: {chain.name} ({chain.id})</div>}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          walletClient ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h4 className="font-medium mb-2">Wallet Client</h4>
          <div className="text-sm">
            <div>Available: {walletClient ? '✅ Yes' : '⏳ Loading...'}</div>
            {walletClient?.account && (
              <div>Account: <code className="text-xs">{walletClient.account.address.slice(0, 8)}...</code></div>
            )}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          isGrapevineReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h4 className="font-medium mb-2">Grapevine SDK</h4>
          <div className="text-sm space-y-1">
            <div>Ready: {isGrapevineReady ? '✅ Yes' : '⏳ Initializing...'}</div>
            {grapevine && (
              <>
                <div>Network: {grapevine.getNetwork()}</div>
                <div>Address: <code className="text-xs">{grapevine.hasWallet() ? grapevine.getWalletAddress()?.slice(0, 8) + '...' : 'No wallet configured'}</code></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prerequisites Check */}
      {(!isConnected || !isGrapevineReady) && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Prerequisites</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {!isConnected && <li>• Connect your wallet in the "Wallet Connection" tab</li>}
            {isConnected && !walletClient && <li>• Waiting for wallet client to load...</li>}
            {walletClient && !isGrapevineReady && <li>• Initializing Grapevine SDK...</li>}
          </ul>
        </div>
      )}

      {/* Test Actions */}
      {isGrapevineReady && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Wagmi SDK Operations</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testCategories}
              disabled={loading}
              className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Categories'}
            </button>
            <button
              onClick={testListFeeds}
              disabled={loading}
              className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'List Feeds'}
            </button>
            <button
              onClick={testCreateFeed}
              disabled={loading}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Feed'}
            </button>
            <button
              onClick={testSignMessage}
              disabled={loading}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Signing...' : 'Sign Message'}
            </button>
            <button
              onClick={clearResults}
              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Results
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Results ({results.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded text-sm border ${
                  result.type === 'success' ? 'test-pass' :
                  result.type === 'error' ? 'test-fail' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">{result.message}</span>
                  <span className="text-xs opacity-75">{result.timestamp}</span>
                </div>
                {result.data && (
                  <pre className="text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Wagmi vs Private Key</h4>
        <p className="text-sm text-blue-700">
          Compare these results with the "Private Key Tests" tab to verify both authentication methods 
          produce the same results. The wagmi integration should be seamless and provide identical 
          functionality to direct private key usage.
        </p>
      </div>
    </div>
  );
}