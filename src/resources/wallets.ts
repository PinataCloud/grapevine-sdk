import type { 
  Wallet, 
  WalletStats, 
  UpdateWalletInput 
} from '../types.js';
import type { GrapevineClient } from '../client.js';
import { 
  validateRequiredString,
  validateOptionalString,
  validateOptionalURL
} from '../validation.js';

export class WalletsResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Get wallet by ID
   * No authentication required
   */
  async get(walletId: string): Promise<Wallet> {
    validateRequiredString('walletId', walletId);
    
    const response = await this.client.request(`/v1/wallets/${walletId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get wallet by Ethereum address
   * No authentication required
   */
  async getByAddress(address: string): Promise<Wallet> {
    validateRequiredString('address', address);
    
    // Basic address format validation
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(`Invalid wallet address format: ${address}`);
    }

    const response = await this.client.request(`/v1/wallets/address/${address}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get wallet statistics
   * No authentication required
   */
  async getStats(walletId: string): Promise<WalletStats> {
    validateRequiredString('walletId', walletId);

    const response = await this.client.request(`/v1/wallets/${walletId}/stats`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Update wallet profile
   * Requires authentication and ownership
   */
  async update(walletId: string, input: UpdateWalletInput): Promise<Wallet> {
    validateRequiredString('walletId', walletId);

    const username = validateOptionalString('username', input.username);
    const picture_url = validateOptionalURL('picture_url', input.picture_url);

    // Build validated payload
    const validatedInput: any = {};
    if (username !== undefined) validatedInput.username = username;
    if (picture_url !== undefined) validatedInput.picture_url = picture_url;

    const response = await this.client.request(`/v1/wallets/${walletId}`, {
      method: 'PATCH',
      body: JSON.stringify(validatedInput),
      requiresAuth: true
    });

    return response.json();
  }

  /**
   * Get current authenticated wallet
   * Helper method that uses the locally stored wallet address
   */
  async getMe(): Promise<Wallet> {
    const address = this.client.getWalletAddress();
    return this.getByAddress(address);
  }
}
