import type { WalletClient } from 'viem';
import type { WalletAdapter } from './wallet-adapter.js';

/**
 * Wallet adapter implementation for wagmi wallet clients
 */
export class WagmiAdapter implements WalletAdapter {
  private walletClient: WalletClient;
  private address: string;
  private chainId: string;

  constructor(walletClient: WalletClient) {
    if (!walletClient) {
      throw new Error('WalletClient is required');
    }
    
    // Extract address from wallet client account
    const address = walletClient.account?.address;
    if (!address) {
      throw new Error('Wallet address not available from wallet client account');
    }

    this.walletClient = walletClient;
    this.address = address;
    
    // Get chain ID from wallet client
    const chainId = this.walletClient.chain?.id;
    if (!chainId) {
      throw new Error('Chain ID not available from wallet client');
    }
    
    // Map chain IDs: 84532 = Base Sepolia, 8453 = Base Mainnet
    this.chainId = chainId.toString();
  }

  getAddress(): string {
    return this.address;
  }

  async signMessage(message: string): Promise<string> {
    // Find the account in the wallet client that matches our address
    const account = this.walletClient.account || {
      address: this.address as `0x${string}`,
      type: 'json-rpc'
    };

    return this.walletClient.signMessage({
      message,
      account: account as any
    });
  }

  getWalletClient(): WalletClient {
    return this.walletClient;
  }

  getChainId(): string {
    return this.chainId;
  }
}