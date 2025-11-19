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

  // Update wallet when walletClient or address changes
  useEffect(() => {
    if (!client) return;

    if (walletClient && address) {
      try {
        // Create wagmi adapter and set wallet
        const adapter = new WagmiAdapter(walletClient, address);
        client.setWalletClient(adapter);
      } catch (error) {
        console.error('Failed to set wallet client:', error);
        client.clearWallet();
      }
    } else {
      // Clear wallet if disconnected
      client.clearWallet();
    }
  }, [client, walletClient, address]);

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