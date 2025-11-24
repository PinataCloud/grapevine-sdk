import { createWalletClient, http, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import type { WalletAdapter } from './wallet-adapter.js';
import { AuthError } from '../errors.js';

/**
 * Wallet adapter implementation for private key authentication
 */
export class PrivateKeyAdapter implements WalletAdapter {
  private walletClient: WalletClient;
  private account: ReturnType<typeof privateKeyToAccount>;
  private chainId: string;

  constructor(privateKey: string, isTestnet: boolean) {
    if (!privateKey.startsWith('0x')) {
      throw AuthError.invalidPrivateKey(privateKey);
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.chainId = isTestnet ? '84532' : '8453';
    
    const chain = isTestnet ? baseSepolia : base;
    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http()
    });
  }

  getAddress(): string {
    return this.account.address;
  }

  async signMessage(message: string): Promise<string> {
    return this.account.signMessage({ 
      message: { raw: new TextEncoder().encode(message) }
    });
  }

  getWalletClient(): WalletClient {
    return this.walletClient;
  }

  getChainId(): string {
    return this.chainId;
  }
}