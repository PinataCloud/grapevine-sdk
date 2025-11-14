import type { WalletClient } from 'viem';

/**
 * Common interface for wallet adapters
 * Allows the SDK to work with different wallet types (private key, wagmi, etc.)
 */
export interface WalletAdapter {
  /**
   * Get the wallet address
   */
  getAddress(): string;

  /**
   * Sign a message with the wallet
   */
  signMessage(message: string): Promise<string>;

  /**
   * Get the underlying Viem WalletClient for advanced operations
   */
  getWalletClient(): WalletClient;

  /**
   * Get the chain ID
   */
  getChainId(): string;
}