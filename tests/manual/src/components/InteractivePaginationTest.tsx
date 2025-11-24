import { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { useGrapevine } from '@grapevine/sdk/react';
import type { Feed, Entry } from '@grapevine/sdk';

interface PaginationState {
  currentPage: number;
  pageSize: number;
  nextPageToken?: string;
  data: any[];
  totalPages: number;
  hasMore: boolean;
}

export default function InteractivePaginationTest() {
  const { data: walletClient } = useWalletClient();
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFeedId, setSelectedFeedId] = useState<string>('');
  
  // Feeds pagination state
  const [feedsPagination, setFeedsPagination] = useState<PaginationState>({
    currentPage: 0,
    pageSize: 5,
    data: [],
    totalPages: 0,
    hasMore: true,
    nextPageToken: undefined
  });
  
  // Entries pagination state
  const [entriesPagination, setEntriesPagination] = useState<PaginationState>({
    currentPage: 0,
    pageSize: 3,
    data: [],
    totalPages: 0,
    hasMore: true,
    nextPageToken: undefined
  });

  const grapevine = useGrapevine({
    walletClient: walletClient as any,
    network,
    debug: true
  });

  const resetFeedsPagination = () => {
    setFeedsPagination({
      currentPage: 0,
      pageSize: feedsPagination.pageSize,
      data: [],
      totalPages: 0,
      hasMore: true,
      nextPageToken: undefined
    });
  };

  const resetEntriesPagination = () => {
    setEntriesPagination({
      currentPage: 0,
      pageSize: entriesPagination.pageSize,
      data: [],
      totalPages: 0,
      hasMore: true,
      nextPageToken: undefined
    });
    setSelectedFeedId('');
  };

  const loadFeedsPage = async (pageToken?: string, reset: boolean = false) => {
    if (!grapevine) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await grapevine.feeds.list({
        page_size: feedsPagination.pageSize,
        page_token: pageToken
      });

      setFeedsPagination(prev => ({
        ...prev,
        currentPage: reset ? 1 : prev.currentPage + 1,
        data: reset ? response.data : [...prev.data, ...response.data],
        nextPageToken: response.next_page_token,
        hasMore: !!response.next_page_token,
        totalPages: reset ? 1 : prev.totalPages + 1
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  };

  const loadEntriesPage = async (feedId: string, pageToken?: string, reset: boolean = false) => {
    if (!grapevine || !feedId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await grapevine.entries.list(feedId, {
        page_size: entriesPagination.pageSize,
        page_token: pageToken
      });

      setEntriesPagination(prev => ({
        ...prev,
        currentPage: reset ? 1 : prev.currentPage + 1,
        data: reset ? response.data : [...prev.data, ...response.data],
        nextPageToken: response.next_page_token,
        hasMore: !!response.next_page_token,
        totalPages: reset ? 1 : prev.totalPages + 1
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const startFeedsPagination = () => {
    resetFeedsPagination();
    loadFeedsPage(undefined, true);
  };

  const loadNextFeedsPage = () => {
    if (feedsPagination.hasMore && feedsPagination.nextPageToken) {
      loadFeedsPage(feedsPagination.nextPageToken);
    }
  };

  const startEntriesPagination = (feedId: string) => {
    setSelectedFeedId(feedId);
    setEntriesPagination(prev => ({ ...prev, data: [], currentPage: 0, totalPages: 0, hasMore: true, nextPageToken: undefined }));
    loadEntriesPage(feedId, undefined, true);
  };

  const loadNextEntriesPage = () => {
    if (entriesPagination.hasMore && entriesPagination.nextPageToken && selectedFeedId) {
      loadEntriesPage(selectedFeedId, entriesPagination.nextPageToken);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-purple-800 mb-2">
          📄 Interactive Pagination Tests
        </h2>
        <p className="text-purple-700 text-sm">
          Manually test pagination by clicking through pages. This lets you see how the SDK handles 
          page tokens, data accumulation, and boundary conditions in real-time.
        </p>
      </div>

      {/* Network Selection */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Network</label>
            <select 
              value={network} 
              onChange={(e) => setNetwork(e.target.value as 'testnet' | 'mainnet')}
              className="w-full px-3 py-2 border rounded-md"
              disabled={loading}
            >
              <option value="testnet">Testnet (Base Sepolia)</option>
              <option value="mainnet">Mainnet (Base)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client Status */}
      <div className={`border rounded-lg p-4 ${
        grapevine ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <h3 className="font-medium mb-2">
          {grapevine ? '✅ Client Ready' : '❌ Client Not Available'}
        </h3>
        {grapevine && (
          <div className="text-sm space-y-1">
            <div>Network: {grapevine.getNetwork()}</div>
            <div>Has Wallet: {grapevine.hasWallet() ? 'Yes' : 'No'}</div>
            {grapevine.hasWallet() && (
              <div>Address: <code>{grapevine.getWalletAddress().slice(0, 8)}...</code></div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-700 text-sm font-mono">{error}</div>
        </div>
      )}

      {/* Feeds Pagination Test */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-lg mb-4">🗂️ Feeds Pagination Test</h3>
        
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex gap-3 items-center">
            <div>
              <label className="block text-sm font-medium mb-1">Page Size</label>
              <select 
                value={feedsPagination.pageSize} 
                onChange={(e) => setFeedsPagination(prev => ({ ...prev, pageSize: Number(e.target.value) }))}
                className="px-3 py-1 border rounded text-sm"
                disabled={loading || feedsPagination.data.length > 0}
              >
                <option value={3}>3 per page</option>
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={startFeedsPagination}
                disabled={loading || !grapevine}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                {feedsPagination.data.length > 0 ? 'Reset & Start Over' : 'Start Pagination'}
              </button>
              
              {feedsPagination.hasMore && feedsPagination.data.length > 0 && (
                <button
                  onClick={loadNextFeedsPage}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                >
                  {loading ? 'Loading...' : 'Load Next Page'}
                </button>
              )}
            </div>
          </div>

          {/* Pagination Status */}
          {feedsPagination.data.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-medium text-blue-800">Current Page</div>
                  <div className="text-blue-700">{feedsPagination.currentPage}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-800">Total Items</div>
                  <div className="text-blue-700">{feedsPagination.data.length}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-800">Has More</div>
                  <div className="text-blue-700">{feedsPagination.hasMore ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-800">Next Token</div>
                  <div className="text-blue-700 font-mono text-xs">
                    {feedsPagination.nextPageToken ? 'Available' : 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feeds Results */}
          {feedsPagination.data.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Loaded Feeds ({feedsPagination.data.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {feedsPagination.data.map((feed: Feed, index) => (
                  <div key={feed.id} className="border border-gray-200 rounded p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-blue-600">#{index + 1}</div>
                      <button
                        onClick={() => startEntriesPagination(feed.id)}
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        disabled={loading}
                      >
                        Test Entries
                      </button>
                    </div>
                    <div className="font-medium">{feed.name}</div>
                    <div className="text-gray-600">Owner: {feed.owner_wallet_address.slice(0, 8)}...</div>
                    <div className="text-gray-600">Entries: {feed.total_entries}</div>
                    <div className="text-gray-500 text-xs font-mono">ID: {feed.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entries Pagination Test */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-lg mb-4">📝 Entries Pagination Test</h3>
        
        {!selectedFeedId && (
          <div className="text-gray-500 text-center py-8">
            Select a feed from the feeds pagination test above to test entries pagination
          </div>
        )}

        {selectedFeedId && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex gap-3 items-center">
              <div>
                <label className="block text-sm font-medium mb-1">Page Size</label>
                <select 
                  value={entriesPagination.pageSize} 
                  onChange={(e) => setEntriesPagination(prev => ({ ...prev, pageSize: Number(e.target.value) }))}
                  className="px-3 py-1 border rounded text-sm"
                  disabled={loading || entriesPagination.data.length > 0}
                >
                  <option value={2}>2 per page</option>
                  <option value={3}>3 per page</option>
                  <option value={5}>5 per page</option>
                </select>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Selected Feed</div>
                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {selectedFeedId.slice(0, 16)}...
                </div>
              </div>
              
              <div className="flex gap-2">
                {entriesPagination.hasMore && entriesPagination.data.length > 0 && (
                  <button
                    onClick={loadNextEntriesPage}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    {loading ? 'Loading...' : 'Load Next Page'}
                  </button>
                )}
                
                <button
                  onClick={resetEntriesPagination}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Pagination Status */}
            {entriesPagination.data.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="font-medium text-purple-800">Current Page</div>
                    <div className="text-purple-700">{entriesPagination.currentPage}</div>
                  </div>
                  <div>
                    <div className="font-medium text-purple-800">Total Items</div>
                    <div className="text-purple-700">{entriesPagination.data.length}</div>
                  </div>
                  <div>
                    <div className="font-medium text-purple-800">Has More</div>
                    <div className="text-purple-700">{entriesPagination.hasMore ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-purple-800">Next Token</div>
                    <div className="text-purple-700 font-mono text-xs">
                      {entriesPagination.nextPageToken ? 'Available' : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Entries Results */}
            {entriesPagination.data.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Loaded Entries ({entriesPagination.data.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {entriesPagination.data.map((entry: Entry, index) => (
                    <div key={entry.id} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="font-medium text-purple-600 mb-2">#{index + 1}</div>
                      <div className="font-medium">{entry.title || 'Untitled'}</div>
                      <div className="text-gray-600">{entry.description || 'No description'}</div>
                      <div className="text-gray-500 text-xs mt-2 space-y-1">
                        <div>Type: {entry.mime_type}</div>
                        <div>Free: {entry.is_free ? 'Yes' : 'No'}</div>
                        <div className="font-mono">ID: {entry.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entriesPagination.data.length === 0 && entriesPagination.currentPage === 1 && !loading && (
              <div className="text-gray-500 text-center py-4">
                No entries found in this feed
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Guide */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-medium mb-2">📖 How to Use</h3>
        <div className="text-sm space-y-2 text-gray-700">
          <div><strong>1. Feeds Test:</strong> Click "Start Pagination" to load first page, then "Load Next Page" to continue</div>
          <div><strong>2. Entries Test:</strong> Click "Test Entries" button on any feed to start paginating through its entries</div>
          <div><strong>3. Watch Status:</strong> Monitor the pagination status boxes to see page tokens and boundary conditions</div>
          <div><strong>4. Try Different Sizes:</strong> Change page sizes to see how it affects the pagination behavior</div>
        </div>
      </div>
    </div>
  );
}