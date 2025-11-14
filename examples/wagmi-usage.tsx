import { useState } from 'react';
import { useAccount, useWalletClient, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useGrapevine, useGrapevineReady } from '../src/react/use-grapevine.js';

/**
 * Example component showing how to use Grapevine SDK with wagmi
 */
export function GrapevineWithWagmi() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Initialize Grapevine client with wagmi
  const grapevine = useGrapevine({
    walletClient,
    address,
    network: 'testnet', // or 'mainnet'
    debug: true
  });
  
  const isGrapevineReady = useGrapevineReady(grapevine);
  
  const [feeds, setFeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const handleLoadFeeds = async () => {
    if (!grapevine || !isGrapevineReady) return;
    
    setLoading(true);
    try {
      const feedsData = await grapevine.feeds.list({
        page_size: 10
      });
      setFeeds(feedsData.data);
    } catch (error) {
      console.error('Failed to load feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeed = async () => {
    if (!grapevine || !isGrapevineReady) return;
    
    setLoading(true);
    try {
      const newFeed = await grapevine.feeds.create({
        name: `My Feed ${Date.now()}`,
        description: 'A feed created with wagmi integration',
        tags: ['example', 'wagmi']
      });
      console.log('Created feed:', newFeed);
      // Refresh feeds list
      await handleLoadFeeds();
    } catch (error) {
      console.error('Failed to create feed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Grapevine + wagmi Example</h1>
      
      {/* Wallet Connection */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Wallet Connection</h2>
        {isConnected ? (
          <div className="space-y-2">
            <p className="text-green-600">✓ Connected to {address}</p>
            <button 
              onClick={() => disconnect()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">No wallet connected</p>
            <button 
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Grapevine Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Grapevine Status</h2>
        {isGrapevineReady ? (
          <div className="space-y-2">
            <p className="text-green-600">✓ Grapevine client ready</p>
            <p className="text-sm text-gray-600">
              Network: {grapevine?.getNetwork()}
            </p>
            <p className="text-sm text-gray-600">
              Wallet: {grapevine?.getWalletAddress()}
            </p>
          </div>
        ) : (
          <p className="text-gray-600">
            {isConnected ? 'Initializing Grapevine...' : 'Connect wallet to initialize Grapevine'}
          </p>
        )}
      </div>

      {/* Actions */}
      {isGrapevineReady && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="flex space-x-4">
              <button
                onClick={handleLoadFeeds}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Feeds'}
              </button>
              <button
                onClick={handleCreateFeed}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Feed'}
              </button>
            </div>
          </div>

          {/* Feeds List */}
          {feeds.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Feeds ({feeds.length})</h2>
              <div className="space-y-2">
                {feeds.map((feed) => (
                  <div key={feed.id} className="p-3 bg-gray-50 rounded">
                    <h3 className="font-medium">{feed.name}</h3>
                    <p className="text-sm text-gray-600">{feed.description}</p>
                    <p className="text-xs text-gray-500">
                      Entries: {feed.total_entries} | Owner: {feed.owner_wallet_address?.slice(0, 8)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Alternative example showing more direct usage
 */
export function SimpleGrapevineExample() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  
  const grapevine = useGrapevine({
    walletClient,
    address,
    network: 'testnet'
  });

  const [categories, setCategories] = useState<any[]>([]);

  const loadCategories = async () => {
    if (!grapevine) return;
    
    try {
      // This doesn't require authentication
      const cats = await grapevine.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Simple Grapevine Example</h2>
      
      {grapevine ? (
        <div>
          <p className="text-green-600 mb-4">✓ Grapevine ready!</p>
          <button 
            onClick={loadCategories}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Load Categories
          </button>
          
          {categories.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Categories:</h3>
              <ul>
                {categories.map((cat) => (
                  <li key={cat.id} className="text-sm">
                    {cat.name} - {cat.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600">Connect your wallet to use Grapevine</p>
      )}
    </div>
  );
}