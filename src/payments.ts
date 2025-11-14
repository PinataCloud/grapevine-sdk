import { facilitator } from '@coinbase/x402';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';
import { PaymentRequirementsSchema } from 'x402/types';
import type { WalletClient } from 'viem';
import type { AuthManager } from './auth.js';

export class PaymentManager {
  private authManager: AuthManager;
  private network: string;

  constructor(authManager: AuthManager, isTestnet: boolean) {
    this.authManager = authManager;
    this.network = isTestnet ? 'base-sepolia' : 'base';
  }

  async createPaymentHeader(response: Response): Promise<string> {
    const paymentData = await response.json();
    const { x402Version, accepts } = paymentData;
    
    if (!accepts || !Array.isArray(accepts)) {
      throw new Error('Invalid payment requirements in 402 response');
    }

    const requirements = accepts.map((x: any) => PaymentRequirementsSchema.parse(x));
    const selected = selectPaymentRequirements(
      requirements,
      [this.network as 'base-sepolia' | 'base'],
      'exact'
    );
    
    if (!selected) {
      throw new Error(`No payment requirements match network: ${this.network}`);
    }

    const walletClient = this.authManager.getWalletClient();
    const paymentHeader = await createPaymentHeader(
      walletClient as any,
      parseInt(x402Version) || 0,
      selected,
      facilitator as any
    );

    return paymentHeader;
  }
}