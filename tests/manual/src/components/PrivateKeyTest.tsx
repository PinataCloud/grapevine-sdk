import { useState } from 'react';
import { GrapevineClient } from '@grapevine/sdk';

export default function PrivateKeyTest() {
  const [privateKey, setPrivateKey] = useState('');
  const [client, setClient] = useState<GrapevineClient | null>(null);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connectWithPrivateKey = () => {
    try {
      setError(null);
      const newClient = new GrapevineClient({
        privateKey,
        network,
        debug: true
      });
      setClient(newClient);
      addResult('success', 'Client initialized', { 
        address: newClient.getWalletAddress(),
        network: newClient.getNetwork()
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      addResult('error', 'Failed to initialize client', { error: message });
    }
  };

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
    setError(null);
  };

  const testCategories = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const categories = await client.getCategories();
      addResult('success', 'Categories loaded', { count: categories.length, categories });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to load categories', { error: message });
    } finally {
      setLoading(false);
    }
  };

  const testCreateFeed = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const feed = await client.feeds.create({
        name: `Test Feed ${Date.now()}`,
        description: 'Created via private key test',
        tags: ['test', 'private-key']
      });
      addResult('success', 'Feed created', feed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to create feed', { error: message });
    } finally {
      setLoading(false);
    }
  };

  const testListFeeds = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const response = await client.feeds.list({ page_size: 5 });
      addResult('success', 'Feeds loaded', { 
        count: response.data.length, 
        total: response.total_count,
        feeds: response.data
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addResult('error', 'Failed to list feeds', { error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Private Key Testing</h2>
        <p className="text-gray-600 mb-6">
          Test the SDK with direct private key authentication. This bypasses wagmi entirely.
        </p>
      </div>

      {/* Configuration */}
      <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
        <h3 className="font-medium mb-4">⚠️ Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Network</label>
            <div className="flex space-x-4">
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Private Key (for testing only)
            </label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use a test wallet only. Never use real funds or production keys.
            </p>
          </div>

          <button
            onClick={connectWithPrivateKey}
            disabled={!privateKey}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Initialize SDK
          </button>
        </div>
      </div>

      {/* Client Status */}
      {client && (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <h3 className="font-medium text-green-800 mb-2">✅ SDK Initialized</h3>
          <div className="text-sm space-y-1">
            <div>Address: <code className="bg-green-100 px-1 rounded">{client.getWalletAddress()}</code></div>
            <div>Network: <code className="bg-green-100 px-1 rounded">{client.getNetwork()}</code></div>
            <div>Testnet: {client.isTestNetwork() ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}

      {/* Test Actions */}
      {client && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">SDK Operations</h3>
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
              onClick={clearResults}
              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Results
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">Error</h4>
          <p className="text-sm text-red-700">{error}</p>
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
    </div>
  );
}