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
 * import { useGrapevine } from '@pinata/grapevine-sdk/react';
 * import { useWalletClient } from 'wagmi';
 * 
 * function MyComponent() {
 *   const { data: walletClient } = useWalletClient();
 *   
 *   const grapevine = useGrapevine({
 *     walletClient,
 *     network: 'testnet'
 *   });
 *   
 *   // Use grapevine client...
 * }
 * ```
 */
export function useGrapevine(config: {
  walletClient: WalletClient | undefined;
  network?: 'testnet' | 'mainnet';
  debug?: boolean;
}): GrapevineClient | null {
  const { walletClient, network = 'testnet', debug = false } = config;
  const [client, setClient] = useState<GrapevineClient | null>(null);

  // Create the client configuration
  const clientConfig = useMemo<GrapevineConfig>(() => ({
    network,
    debug
  }), [network, debug]);

  // Initialize client once when config changes
  useEffect(() => {
    try {
      const grapevineClient = new GrapevineClient(clientConfig);
      setClient(grapevineClient);
    } catch (error) {
      console.error('Failed to initialize Grapevine client:', error);
      setClient(null);
    }
  }, [clientConfig]);

  // Update wallet when walletClient changes
  useEffect(() => {
    if (!client) return;

    if (walletClient) {
      try {
        // Create wagmi adapter and set wallet
        const adapter = new WagmiAdapter(walletClient);
        client.setWalletClient(adapter);
      } catch (error) {
        console.error('Failed to set wallet client:', error);
        client.clearWallet();
      }
    } else {
      // Clear wallet if disconnected
      client.clearWallet();
    }
  }, [client, walletClient]);

  return client;
}

/**
 * Hook to check if Grapevine client is ready
 */
export function useGrapevineReady(client: GrapevineClient | null): boolean {
  return client !== null;
}

/**
 * Hook to check if Grapevine client has a wallet configured
 */
export function useGrapevineWalletReady(client: GrapevineClient | null): boolean {
  return client !== null && client.hasWallet();
}