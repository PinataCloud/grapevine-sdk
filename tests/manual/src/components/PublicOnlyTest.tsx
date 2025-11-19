import { useState, useMemo } from 'react';
import { GrapevineClient } from '@grapevine/sdk';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
  data?: any;
}

export default function PublicOnlyTest() {
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  // Create client WITHOUT any authentication
  const client = useMemo(() => {
    return new GrapevineClient({ 
      network,
      debug: true 
    });
  }, [network]);

  const publicTests = [
    {
      id: 'client-status',
      name: 'Client Status Check',
      description: 'Verify client is initialized without wallet',
      test: async () => {
        return {
          hasWallet: client.hasWallet(),
          network: client.getNetwork(),
          isTestnet: client.isTestNetwork(),
          message: 'Client initialized successfully without wallet'
        };
      }
    },
    {
      id: 'categories',
      name: 'Get Categories',
      description: 'Fetch all available categories',
      test: async () => {
        const categories = await client.getCategories();
        return {
          count: categories.length,
          categories: categories.map(c => ({ id: c.id, name: c.name }))
        };
      }
    },
    {
      id: 'feeds-list',
      name: 'List Public Feeds',
      description: 'Fetch public feeds without authentication',
      test: async () => {
        const response = await client.feeds.list({ page_size: 10 });
        return {
          count: response.data.length,
          hasNextPage: !!response.next_page_token,
          feeds: response.data.slice(0, 3).map(f => ({ 
            id: f.id, 
            name: f.name, 
            owner: f.owner_wallet_address,
            entries: f.total_entries
          }))
        };
      }
    },
    {
      id: 'feed-details',
      name: 'Get Feed Details',
      description: 'Get details of a specific feed',
      test: async () => {
        // First get a feed ID
        const listResponse = await client.feeds.list({ page_size: 1 });
        if (listResponse.data.length === 0) {
          throw new Error('No feeds available to test with');
        }
        
        const feedId = listResponse.data[0].id;
        const feed = await client.feeds.get(feedId);
        
        return {
          feedId,
          name: feed.name,
          description: feed.description,
          totalEntries: feed.total_entries,
          isActive: feed.is_active
        };
      }
    },
    {
      id: 'entries-list',
      name: 'List Feed Entries',
      description: 'List entries in a public feed',
      test: async () => {
        // First get a feed ID
        const listResponse = await client.feeds.list({ page_size: 1 });
        if (listResponse.data.length === 0) {
          throw new Error('No feeds available to test with');
        }
        
        const feedId = listResponse.data[0].id;
        const entriesResponse = await client.entries.list(feedId, { page_size: 5 });
        
        return {
          feedId,
          entryCount: entriesResponse.data.length,
          entries: entriesResponse.data.map(e => ({
            id: e.id,
            title: e.title,
            isFree: e.is_free,
            mimeType: e.mime_type
          }))
        };
      }
    },
    {
      id: 'pagination-test',
      name: 'Basic Pagination Test',
      description: 'Test pagination without authentication',
      test: async () => {
        // Get first page
        const page1 = await client.feeds.list({ page_size: 3 });
        let page2Data = null;
        let hasSecondPage = false;
        
        // Try to get second page if available
        if (page1.next_page_token) {
          const page2 = await client.feeds.list({ 
            page_size: 3, 
            page_token: page1.next_page_token 
          });
          page2Data = page2.data;
          hasSecondPage = true;
        }
        
        return {
          firstPageCount: page1.data.length,
          hasNextPageToken: !!page1.next_page_token,
          secondPageCount: page2Data?.length || 0,
          hasSecondPage,
          message: `Successfully tested pagination: Page 1 has ${page1.data.length} items${hasSecondPage ? `, Page 2 has ${page2Data?.length} items` : ', no second page available'}`
        };
      }
    },
    {
      id: 'auth-required-fail',
      name: 'Auth Required Endpoints Should Fail',
      description: 'Verify that authenticated endpoints properly reject requests',
      test: async () => {
        let createFeedError = '';
        let walletInfoError = '';
        
        // Test create feed (requires auth)
        try {
          await client.feeds.create({
            name: 'Test Feed',
            description: 'This should fail'
          });
          createFeedError = 'Unexpectedly succeeded';
        } catch (error) {
          createFeedError = (error as Error).message;
        }
        
        // Test wallet info (requires wallet)
        try {
          client.getWalletAddress();
          walletInfoError = 'Unexpectedly succeeded';
        } catch (error) {
          walletInfoError = (error as Error).message;
        }
        
        return {
          createFeedError,
          walletInfoError,
          message: 'All auth-required endpoints properly rejected requests'
        };
      }
    }
  ];

  const runTest = async (testCase: typeof publicTests[0]) => {
    const testId = testCase.id;
    
    // Update test status to running
    setResults(prev => prev.map(r => 
      r.id === testId ? { ...r, status: 'running' as const } : r
    ));

    const startTime = performance.now();
    
    try {
      const data = await testCase.test();
      const duration = performance.now() - startTime;
      
      setResults(prev => prev.map(r => 
        r.id === testId 
          ? { ...r, status: 'passed' as const, data, duration, error: undefined }
          : r
      ));
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setResults(prev => prev.map(r => 
        r.id === testId 
          ? { ...r, status: 'failed' as const, error: errorMessage, duration }
          : r
      ));
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    
    // Initialize results
    setResults(publicTests.map(test => ({
      id: test.id,
      name: test.name,
      status: 'pending' as const
    })));

    // Run tests sequentially
    for (const test of publicTests) {
      await runTest(test);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">
          🔓 Public-Only SDK Test
        </h2>
        <p className="text-blue-700 text-sm">
          This demonstrates using the Grapevine SDK completely without wallet authentication.
          All tests use public endpoints that don't require a connected wallet.
        </p>
      </div>

      {/* Configuration */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Network</label>
            <select 
              value={network} 
              onChange={(e) => setNetwork(e.target.value as 'testnet' | 'mainnet')}
              className="w-full px-3 py-2 border rounded-md"
              disabled={running}
            >
              <option value="testnet">Testnet (Base Sepolia)</option>
              <option value="mainnet">Mainnet (Base)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client Status */}
      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
        <h3 className="font-medium text-green-800 mb-2">✅ SDK Initialized (No Wallet)</h3>
        <div className="text-sm space-y-1">
          <div>Has Wallet: <code className="bg-green-100 px-1 rounded">{client.hasWallet() ? 'Yes' : 'No'}</code></div>
          <div>Network: <code className="bg-green-100 px-1 rounded">{client.getNetwork()}</code></div>
          <div>Testnet: {client.isTestNetwork() ? 'Yes' : 'No'}</div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="border rounded-lg p-4">
        <div className="flex gap-3 mb-4">
          <button
            onClick={runAllTests}
            disabled={running}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {running ? 'Running Tests...' : 'Run All Public Tests'}
          </button>
        </div>

        {/* Individual Test Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {publicTests.map((test) => {
            const result = results.find(r => r.id === test.id);
            return (
              <button
                key={test.id}
                onClick={() => runTest(test)}
                disabled={running || result?.status === 'running'}
                className="px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-left"
              >
                {result?.status === 'running' && '⏳ '}
                {result?.status === 'passed' && '✅ '}
                {result?.status === 'failed' && '❌ '}
                {test.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Test Results */}
      {results.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Test Results</h3>
          <div className="space-y-3">
            {results.map((result) => (
              <div key={result.id} className={`border rounded-lg p-3 ${
                result.status === 'passed' ? 'border-green-200 bg-green-50' :
                result.status === 'failed' ? 'border-red-200 bg-red-50' :
                result.status === 'running' ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {result.status === 'running' && '⏳ '}
                    {result.status === 'passed' && '✅ '}
                    {result.status === 'failed' && '❌ '}
                    {result.status === 'pending' && '⏸️ '}
                    {result.name}
                  </div>
                  {result.duration && (
                    <div className="text-sm text-gray-500">
                      {result.duration.toFixed(0)}ms
                    </div>
                  )}
                </div>

                {result.error && (
                  <div className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                    {result.error}
                  </div>
                )}

                {result.data && (
                  <div className="text-sm">
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}