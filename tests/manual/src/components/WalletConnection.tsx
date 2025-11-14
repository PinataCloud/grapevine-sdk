import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';

export default function WalletConnection() {
  const { address, isConnected, connector, chain } = useAccount();
  const { data: balance } = useBalance({ address });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        <p className="text-gray-600 mb-6">
          Connect your wallet to test the Grapevine SDK wagmi integration.
        </p>
      </div>

      {/* Connection Button */}
      <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
        <ConnectButton />
      </div>

      {/* Connection Status */}
      {isConnected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-3">✅ Wallet Connected</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-green-700">Address:</span>{' '}
              <code className="bg-green-100 px-2 py-1 rounded text-green-800">
                {address}
              </code>
            </div>
            <div>
              <span className="font-medium text-green-700">Connector:</span>{' '}
              <span className="text-green-800">{connector?.name}</span>
            </div>
            <div>
              <span className="font-medium text-green-700">Chain:</span>{' '}
              <span className="text-green-800">
                {chain?.name} (ID: {chain?.id})
              </span>
            </div>
            {balance && (
              <div>
                <span className="font-medium text-green-700">Balance:</span>{' '}
                <span className="text-green-800">
                  {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Network Information</h4>
          {chain ? (
            <div className="space-y-1 text-sm">
              <div>Name: {chain.name}</div>
              <div>Chain ID: {chain.id}</div>
              <div>Currency: {chain.nativeCurrency.symbol}</div>
              <div className={`
                px-2 py-1 rounded text-xs font-medium
                ${chain.id === 84532 ? 'bg-blue-100 text-blue-800' : 
                  chain.id === 8453 ? 'bg-green-100 text-green-800' : 
                  'bg-yellow-100 text-yellow-800'}
              `}>
                {chain.id === 84532 ? 'Base Sepolia (Testnet)' :
                 chain.id === 8453 ? 'Base Mainnet' :
                 'Unsupported Network'}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No network detected</p>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Grapevine SDK Compatibility</h4>
          {chain ? (
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>SDK Support:</span>
                <span className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${chain.id === 84532 || chain.id === 8453 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'}
                `}>
                  {chain.id === 84532 || chain.id === 8453 ? 'Supported' : 'Not Supported'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Environment:</span>
                <span>
                  {chain.id === 84532 ? 'Testnet' : 
                   chain.id === 8453 ? 'Mainnet' : 'Unknown'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Connect wallet to check</p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Connect your wallet using the button above</li>
          <li>Ensure you're on Base Sepolia (testnet) or Base Mainnet</li>
          <li>Navigate to other tabs to test SDK functionality</li>
          <li>Use the "Private Key Tests" tab to compare with direct private key usage</li>
          <li>Use the "Wagmi Tests" tab to test the wagmi integration</li>
        </ol>
      </div>
    </div>
  );
}