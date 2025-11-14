import { useState, useMemo, useEffect, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { GrapevineClient } from '@grapevine/sdk';
import { useGrapevine } from '@grapevine/sdk/react';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
  data?: any;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  test: (client: GrapevineClient, currentFeedId?: string | null) => Promise<any>;
}

export default function TestSuite() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [authMode, setAuthMode] = useState<'wagmi' | 'private-key'>('wagmi');
  const [privateKey, setPrivateKey] = useState('');
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [createdFeedId, setCreatedFeedId] = useState<string | null>(null);
  const currentFeedIdRef = useRef<string | null>(null);

  // Debug: Log feed ID changes
  useEffect(() => {
    console.log('Feed ID state changed:', createdFeedId);
  }, [createdFeedId]);

  // Memoize wagmi client configuration to prevent recreation
  const grapevineConfig = useMemo(() => ({
    walletClient: authMode === 'wagmi' ? walletClient : undefined,
    address: authMode === 'wagmi' ? address : undefined,
    network,
    debug: true
  }), [authMode, walletClient, address, network]);

  const grapevine = useGrapevine(grapevineConfig);

  // Memoize private key client to prevent recreation on every render
  const privateKeyClient = useMemo(() => {
    if (authMode !== 'private-key' || !privateKey) return null;
    try {
      console.log('Creating new private key client instance');
      return new GrapevineClient({
        privateKey,
        network,
        debug: true
      });
    } catch (error) {
      console.error('Failed to create private key client:', error);
      return null;
    }
  }, [authMode, privateKey, network]);

  const testClient = authMode === 'wagmi' ? grapevine : privateKeyClient;

  // Clear any old stored feed IDs on mount - we only care about current session
  useEffect(() => {
    try {
      localStorage.removeItem('grapevine-test-feed-id');
      console.log('Cleared any previous feed IDs - starting fresh session');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, []); // Only run once on mount

  const testCases: TestCase[] = [
    {
      id: 'categories',
      name: 'Get Categories',
      description: 'Load available feed categories',
      category: 'Basic',
      test: async (client) => {
        const categories = await client.getCategories();
        if (!Array.isArray(categories)) throw new Error('Categories should be an array');
        return { count: categories.length, categories };
      }
    },
    {
      id: 'wallet-info',
      name: 'Wallet Information',
      description: 'Get wallet address and network info',
      category: 'Basic',
      test: async (client) => {
        const address = client.getWalletAddress();
        const network = client.getNetwork();
        const isTestnet = client.isTestNetwork();
        if (!address) throw new Error('No wallet address');
        return { address, network, isTestnet };
      }
    },
    {
      id: 'create-feed',
      name: 'Create Feed',
      description: 'Create a new feed with authentication',
      category: 'Feeds',
      test: async (client) => {
        const feed = await client.feeds.create({
          name: `Test Suite Feed ${Date.now()}`,
          description: 'Automated test feed',
          tags: ['test', 'automated', authMode]
        });
        if (!feed.id) throw new Error('Feed creation failed - no ID returned');
        return feed;
      }
    },
    {
      id: 'list-feeds',
      name: 'List My Feeds',
      description: 'Retrieve feeds owned by current wallet',
      category: 'Feeds',
      test: async (client) => {
        // Add small delay to allow feed creation to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const walletAddress = client.getWalletAddress();
        const response = await client.feeds.myFeeds();
        
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid feeds response');
        }
        
        return {
          count: response.data.length,
          total: response.total_count,
          hasNextPage: !!response.next_page_token,
          feeds: response.data.map(f => ({ id: f.id, name: f.name })),
          debug: {
            walletAddress,
            queryUrl: `owner_wallet_address=${walletAddress}`
          }
        };
      }
    },
    {
      id: 'list-all-feeds',
      name: 'List All Feeds (Debug)',
      description: 'Check if created feed appears in global list',
      category: 'Feeds',
      test: async (client) => {
        const response = await client.feeds.list({ page_size: 10 });
        const walletAddress = client.getWalletAddress();
        const myFeeds = response.data.filter(f => f.owner_wallet_address?.toLowerCase() === walletAddress.toLowerCase());
        
        return {
          totalFeeds: response.data.length,
          myFeedsInGlobalList: myFeeds.length,
          walletAddress,
          myFeedsFound: myFeeds.map(f => ({ id: f.id, name: f.name, owner: f.owner_wallet_address })),
          allFeeds: response.data.map(f => ({ id: f.id, name: f.name, owner: f.owner_wallet_address }))
        };
      }
    },
    {
      id: 'get-feed',
      name: 'Get Specific Feed',
      description: 'Retrieve feed details by ID',
      category: 'Feeds',
      test: async (client, currentFeedId) => {
        console.log('Get Specific Feed test - currentFeedId passed:', currentFeedId);
        console.log('Get Specific Feed test - closure createdFeedId:', createdFeedId);
        if (!currentFeedId) {
          throw new Error('No feed available. Run "Create Feed" test first, or click "Run All Tests" for automatic setup.');
        }
        
        const feed = await client.feeds.get(currentFeedId);
        if (feed.id !== currentFeedId) throw new Error('Retrieved wrong feed');
        return feed;
      }
    },
    {
      id: 'create-entry',
      name: 'Create Entry',
      description: 'Create a new entry in a feed',
      category: 'Entries',
      test: async (client, currentFeedId) => {
        console.log('Create Entry test - currentFeedId passed:', currentFeedId);
        console.log('Create Entry test - closure createdFeedId:', createdFeedId);
        if (!currentFeedId) {
          throw new Error('No feed available. Run "Create Feed" test first, or click "Run All Tests" for automatic setup.');
        }
        
        const timestamp = Date.now();
        const entry = await client.entries.create(currentFeedId, {
          title: `Test Entry ${timestamp}`,
          description: 'Automated test entry',
          content: `This is test content for the automated test suite - ${timestamp}`,
          tags: ['test', 'automated', authMode]
        });
        if (!entry.id) throw new Error('Entry creation failed - no ID returned');
        return { feedId: currentFeedId, entry };
      }
    },
    {
      id: 'list-feed-entries',
      name: 'List Feed Entries',
      description: 'Get entries for a specific feed',
      category: 'Entries',
      test: async (client, currentFeedId) => {
        console.log('List Feed Entries test - currentFeedId passed:', currentFeedId);
        console.log('List Feed Entries test - closure createdFeedId:', createdFeedId);
        if (!currentFeedId) {
          throw new Error('No feed available. Run "Create Feed" test first, or click "Run All Tests" for automatic setup.');
        }
        
        const entriesResponse = await client.entries.list(currentFeedId, { page_size: 5 });
        return {
          feedId: currentFeedId,
          entryCount: entriesResponse.data.length,
          total: entriesResponse.total_count,
          entries: entriesResponse.data.map(e => ({ id: e.id, title: e.title }))
        };
      }
    }
  ];

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setResults(prev => {
      const existing = prev.find(r => r.id === id);
      if (existing) {
        return prev.map(r => r.id === id ? { ...r, ...updates } : r);
      } else {
        const testCase = testCases.find(t => t.id === id);
        return [...prev, {
          id,
          name: testCase?.name || id,
          status: 'pending',
          ...updates
        }];
      }
    });
  };

  const runSingleTest = async (testCase: TestCase) => {
    if (!testClient) {
      updateTestResult(testCase.id, {
        status: 'failed',
        error: 'No client available'
      });
      return;
    }

    updateTestResult(testCase.id, { status: 'running' });
    const startTime = Date.now();

    try {
      // Use ref for immediate access to current feed ID
      const currentFeedId = currentFeedIdRef.current;
      console.log('Running test with feed ID (from ref):', currentFeedId);
      const data = await testCase.test(testClient, currentFeedId);
      const duration = Date.now() - startTime;
      
      // If this is the create feed test, immediately update the ref
      if (testCase.id === 'create-feed' && data && data.id) {
        console.log('Setting feed ID in ref:', data.id);
        currentFeedIdRef.current = data.id;
        setCreatedFeedId(data.id);
      }
      
      updateTestResult(testCase.id, {
        status: 'passed',
        duration,
        data
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      updateTestResult(testCase.id, {
        status: 'failed',
        error: errorMessage,
        duration
      });
    }
  };

  const runAllTests = async () => {
    if (!testClient) return;
    
    setRunning(true);
    setResults([]);

    for (const testCase of testCases) {
      await runSingleTest(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    setCreatedFeedId(null); // Reset the tracked feed ID
    currentFeedIdRef.current = null; // Reset the ref too
    console.log('Cleared test results and feed ID');
  };

  // Simple helper to check if we have a valid feed ID
  const requiresFeed = (testId: string): boolean => {
    return ['get-feed', 'create-entry', 'list-feed-entries'].includes(testId);
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = testCases.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Comprehensive Test Suite</h2>
        <p className="text-gray-600 mb-6">
          Run a comprehensive test suite to validate all SDK functionality with both authentication methods.
        </p>
      </div>

      {/* Configuration */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-medium mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Authentication Mode</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="wagmi"
                  checked={authMode === 'wagmi'}
                  onChange={(e) => setAuthMode(e.target.value as 'wagmi')}
                  className="mr-2"
                />
                Wagmi Integration
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="private-key"
                  checked={authMode === 'private-key'}
                  onChange={(e) => setAuthMode(e.target.value as 'private-key')}
                  className="mr-2"
                />
                Private Key
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Network</label>
            <div className="space-y-2">
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
        </div>

        {authMode === 'private-key' && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Private Key</label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
            />
          </div>
        )}
      </div>

      {/* Client Status */}
      <div className={`border rounded-lg p-4 ${
        testClient ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <h3 className="font-medium mb-2">
          {testClient ? '✅ Client Ready' : '❌ Client Not Available'}
        </h3>
        {testClient && (
          <div className="text-sm space-y-1">
            <div>Mode: {authMode}</div>
            <div>Address: <code>{testClient.getWalletAddress()}</code></div>
            <div>Network: {testClient.getNetwork()}</div>
            <div>Feed ID: {createdFeedId ? <code className="text-green-700">{createdFeedId}</code> : <span className="text-gray-500">None (create feed first)</span>}</div>
          </div>
        )}
        {!testClient && authMode === 'wagmi' && (
          <p className="text-sm text-red-700">Connect wallet in "Wallet Connection" tab</p>
        )}
        {!testClient && authMode === 'private-key' && (
          <p className="text-sm text-red-700">Enter a valid private key</p>
        )}
      </div>

      {/* Test Controls */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={runAllTests}
            disabled={!testClient || running}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mr-2"
          >
            {running ? 'Running Tests...' : 'Run All Tests'}
          </button>
          <button
            onClick={clearResults}
            disabled={running}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Clear Results
          </button>
        </div>
        
        {results.length > 0 && (
          <div className="text-sm">
            <span className="text-green-600 font-medium">{passed} passed</span>
            {' · '}
            <span className="text-red-600 font-medium">{failed} failed</span>
            {' · '}
            <span className="text-gray-600">{total} total</span>
          </div>
        )}
      </div>

      {/* Test Cases */}
      {categories.map(category => (
        <div key={category} className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">{category} Tests</h3>
          <div className="space-y-3">
            {testCases
              .filter(test => test.category === category)
              .map(testCase => {
                const result = results.find(r => r.id === testCase.id);
                const needsFeed = requiresFeed(testCase.id);
                const canRun = testClient && !running && (!needsFeed || createdFeedId);
                
                return (
                  <div key={testCase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-3 h-3 rounded-full
                          ${!result ? 'bg-gray-300' :
                            result.status === 'running' ? 'bg-yellow-400 animate-pulse' :
                            result.status === 'passed' ? 'bg-green-400' :
                            result.status === 'failed' ? 'bg-red-400' : 'bg-gray-300'}
                        `} />
                        <div>
                          <div className="font-medium">
                            {testCase.name}
                            {needsFeed && <span className="text-xs text-orange-600 ml-2">(requires feed - v2)</span>}
                          </div>
                          <div className="text-sm text-gray-600">{testCase.description}</div>
                          {result?.error && (
                            <div className="text-sm text-red-600 mt-1">Error: {result.error}</div>
                          )}
                          {result?.duration && (
                            <div className="text-xs text-gray-500 mt-1">
                              Duration: {result.duration}ms
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => runSingleTest(testCase)}
                      disabled={!canRun}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      title={needsFeed && !createdFeedId ? 'Requires a feed - run "Create Feed" first' : ''}
                    >
                      Run
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Results Details */}
      {results.some(r => r.data) && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Test Results Data</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results
              .filter(r => r.data && r.status === 'passed')
              .map(result => (
                <div key={result.id} className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="font-medium text-green-800 mb-2">{result.name}</div>
                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}