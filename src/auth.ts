import { createWalletClient, http, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import type { AuthHeaders } from './types.js';

export class AuthManager {
  private walletClient: WalletClient;
  private account: ReturnType<typeof privateKeyToAccount>;
  private apiUrl: string;
  private chainId: string;

  constructor(privateKey: string, apiUrl: string, isTestnet: boolean) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.apiUrl = apiUrl;
    this.chainId = isTestnet ? '84532' : '8453';
    
    const chain = isTestnet ? baseSepolia : base;
    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http()
    });
  }

  async getAuthHeaders(): Promise<AuthHeaders> {
    // Request nonce from API
    const nonceResponse = await fetch(`${this.apiUrl}/v1/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: this.account.address })
    });
    
    if (!nonceResponse.ok) {
      throw new Error(`Nonce request failed: ${nonceResponse.status}`);
    }
    
    const responseData = await nonceResponse.json() as { message: string };
    const { message } = responseData;
    
    // Sign the message
    const signature = await this.walletClient.signMessage({ 
      message,
      account: this.account 
    });
    
    return {
      'x-wallet-address': this.account.address,
      'x-signature': signature,
      'x-message': message,
      'x-timestamp': Math.floor(Date.now() / 1000).toString(),
      'x-chain-id': this.chainId
    };
  }

  get walletAddress(): string {
    return this.account.address;
  }

  getWalletClient(): WalletClient {
    return this.walletClient;
  }
}