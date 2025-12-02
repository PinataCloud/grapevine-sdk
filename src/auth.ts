import type { WalletClient } from 'viem';
import type { AuthHeaders } from './types.js';
import type { WalletAdapter } from './adapters/wallet-adapter.js';
import { PrivateKeyAdapter } from './adapters/private-key-adapter.js';

export class AuthManager {
  private walletAdapter: WalletAdapter;
  private apiUrl: string;

  /**
   * Create an AuthManager with a wallet adapter
   */
  constructor(walletAdapter: WalletAdapter, apiUrl: string);
  /**
   * Create an AuthManager with a private key (backward compatibility)
   */
  constructor(privateKey: string, apiUrl: string, isTestnet: boolean);
  constructor(
    walletAdapterOrPrivateKey: WalletAdapter | string,
    apiUrl: string,
    isTestnet?: boolean
  ) {
    this.apiUrl = apiUrl;
    
    if (typeof walletAdapterOrPrivateKey === 'string') {
      // Backward compatibility: create a PrivateKeyAdapter
      if (isTestnet === undefined) {
        throw new Error('isTestnet parameter is required when using private key');
      }
      this.walletAdapter = new PrivateKeyAdapter(walletAdapterOrPrivateKey, isTestnet);
    } else {
      // New way: use the provided adapter
      this.walletAdapter = walletAdapterOrPrivateKey;
    }
  }

  /**
   * Get auth headers for a request
   * 
   * NOTE: The API uses one-time-use nonces, so each call to this method
   * will fetch a fresh nonce and require a signature. For browser wallets,
   * this means a signature popup for each auth-requiring operation.
   */
  async getAuthHeaders(): Promise<AuthHeaders> {
    const walletAddress = this.walletAdapter.getAddress();
    
    // Request fresh nonce from API (nonces are one-time use)
    const nonceResponse = await fetch(`${this.apiUrl}/v1/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress })
    });
    
    if (!nonceResponse.ok) {
      throw new Error(`Nonce request failed: ${nonceResponse.status}`);
    }
    
    const responseData = await nonceResponse.json() as { message: string };
    const { message } = responseData;
    
    // Sign the message - this triggers wallet popup for browser wallets
    const signature = await this.walletAdapter.signMessage(message);
    
    return {
      'x-wallet-address': walletAddress,
      'x-signature': signature,
      'x-message': message,
      'x-timestamp': Math.floor(Date.now() / 1000).toString(),
      'x-chain-id': this.walletAdapter.getChainId()
    };
  }

  get walletAddress(): string {
    return this.walletAdapter.getAddress();
  }

  getWalletClient(): WalletClient {
    return this.walletAdapter.getWalletClient();
  }

  /**
   * Get the underlying wallet adapter
   */
  getWalletAdapter(): WalletAdapter {
    return this.walletAdapter;
  }
}
