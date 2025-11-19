import type { WalletClient } from 'viem';

// React hooks for wagmi integration
export { useGrapevine, useGrapevineReady, useGrapevineWalletReady } from './use-grapevine.js';

// Re-export viem types that users will need
export type { WalletClient } from 'viem';

// React hook configuration types
export type GrapevineHookConfig = {
  walletClient: WalletClient | undefined;
  address: string | undefined;
  network?: 'testnet' | 'mainnet';
  debug?: boolean;
};