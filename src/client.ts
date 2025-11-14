import { AuthManager } from './auth.js';
import { PaymentManager } from './payments.js';
import { FeedsResource } from './resources/feeds.js';
import { EntriesResource } from './resources/entries.js';
import type { GrapevineConfig, Category } from './types.js';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string;
  requiresAuth?: boolean;
  handlePayment?: boolean;
}

export class GrapevineClient {
  private authManager?: AuthManager;
  private paymentManager?: PaymentManager;
  private apiUrl: string;
  private isTestnet: boolean;
  private network: string;
  private debug: boolean;

  public feeds: FeedsResource;
  public entries: EntriesResource;

  constructor(config: GrapevineConfig = {}) {
    // Set API URL based on network (default to testnet)
    if (config.network === 'mainnet') {
      this.apiUrl = 'https://api.grapevine.fyi';
      this.isTestnet = false;
    } else {
      // Default to testnet
      this.apiUrl = 'https://api.grapevine.markets';
      this.isTestnet = true;
    }

    this.network = this.isTestnet ? 'base-sepolia' : 'base';
    this.debug = config.debug || false;

    // Initialize auth if private key is provided
    if (config.privateKey) {
      this.initializeAuth(config.privateKey);
    }

    // Initialize resources
    this.feeds = new FeedsResource(this);
    this.entries = new EntriesResource(this);

    if (this.debug) {
      console.log('GrapevineClient initialized:', {
        apiUrl: this.apiUrl,
        network: this.network,
        isTestnet: this.isTestnet
      });
    }
  }

  /**
   * Initialize authentication (can be called later if key not provided in constructor)
   */
  initializeAuth(privateKey: string): void {
    if (!privateKey.startsWith('0x')) {
      throw new Error('Private key must start with 0x');
    }
    
    this.authManager = new AuthManager(privateKey, this.apiUrl, this.isTestnet);
    this.paymentManager = new PaymentManager(this.authManager, this.isTestnet);
    
    if (this.debug) {
      console.log('Authentication initialized for wallet:', this.authManager.walletAddress);
    }
  }

  /**
   * Make an authenticated request to the API
   */
  async request(path: string, options: RequestOptions): Promise<Response> {
    const url = `${this.apiUrl}${path}`;
    
    if (this.debug) {
      console.log(`Request: ${options.method} ${url}`);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Add auth headers if required
    if (options.requiresAuth) {
      if (!this.authManager) {
        throw new Error('Authentication required but no private key provided');
      }
      const authHeaders = await this.authManager.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    // Make the request
    let response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body
    });

    // Handle payment if required and configured
    if (response.status === 402 && options.handlePayment && this.paymentManager) {
      if (this.debug) {
        console.log('Handling 402 payment required');
      }
      
      // Create payment header
      const paymentHeader = await this.paymentManager.createPaymentHeader(response);
      
      // Get fresh auth headers
      const freshAuthHeaders = await this.authManager!.getAuthHeaders();
      
      // Retry with payment
      response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...freshAuthHeaders,
          'X-PAYMENT': paymentHeader,
          'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE'
        },
        body: options.body
      });
      
      if (this.debug && response.headers.get('X-PAYMENT-RESPONSE')) {
        console.log('Payment processed successfully');
      }
    }

    // Check for errors
    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    return response;
  }

  /**
   * Get list of available categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await this.request('/v1/categories', {
      method: 'GET',
      requiresAuth: false
    });
    
    const data = await response.json();
    // API returns { data: Category[], pagination: {...} }
    return data.data || [];
  }

  /**
   * Get current wallet address
   */
  getWalletAddress(): string {
    if (!this.authManager) {
      throw new Error('No authentication configured');
    }
    return this.authManager.walletAddress;
  }

  /**
   * Get current network
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Check if using testnet
   */
  isTestNetwork(): boolean {
    return this.isTestnet;
  }
}