import { useEffect, useMemo, useState } from 'react';
import type { WalletClient } from 'viem';
import { GrapevineClient } from '../client.js';
import { WagmiAdapter } from '../adapters/wagmi-adapter.js';
import type { GrapevineConfig } from '../types.js';

/**
 * React hook for using Grapevine SDK with wagmi
 * 
 * @example
 * ```tsx
 * import { useGrapevine } from '@grapevine/sdk/react';
 * import { useWalletClient, useAccount } from 'wagmi';
 * 
 * function MyComponent() {
 *   const { data: walletClient } = useWalletClient();
 *   const { address } = useAccount();
 *   
 *   const grapevine = useGrapevine({
 *     walletClient,
 *     address,
 *     network: 'testnet'
 *   });
 *   
 *   // Use grapevine client...
 * }
 * ```
 */
export function useGrapevine(config: {
  walletClient: WalletClient | undefined;
  address: string | undefined;
  network?: 'testnet' | 'mainnet';
  debug?: boolean;
}): GrapevineClient | null {
  const { walletClient, address, network = 'testnet', debug = false } = config;
  const [client, setClient] = useState<GrapevineClient | null>(null);

  // Create the client configuration
  const clientConfig = useMemo<GrapevineConfig>(() => ({
    network,
    debug
  }), [network, debug]);

  useEffect(() => {
    if (!walletClient || !address) {
      setClient(null);
      return;
    }

    try {
      // Create wagmi adapter
      const adapter = new WagmiAdapter(walletClient, address);
      
      // Create Grapevine client with the adapter
      const grapevineClient = new GrapevineClient(clientConfig);
      grapevineClient.initializeAuthWithAdapter(adapter);
      
      setClient(grapevineClient);
    } catch (error) {
      console.error('Failed to initialize Grapevine client:', error);
      setClient(null);
    }
  }, [walletClient, address, clientConfig]);

  return client;
}

/**
 * Hook to check if Grapevine client is ready
 */
export function useGrapevineReady(client: GrapevineClient | null): boolean {
  return client !== null;
}