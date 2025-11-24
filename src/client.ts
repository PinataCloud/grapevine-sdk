import { AuthManager } from './auth.js';
import { PaymentManager } from './payments.js';
import { FeedsResource } from './resources/feeds.js';
import { EntriesResource } from './resources/entries.js';
import type { GrapevineConfig, Category } from './types.js';
import type { WalletAdapter } from './adapters/wallet-adapter.js';
import { AuthError, ConfigError, ApiError } from './errors.js';

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

    // Initialize auth if private key or wallet adapter is provided
    if (config.privateKey && config.walletAdapter) {
      throw ConfigError.conflictingConfig('privateKey', 'walletAdapter');
    }
    
    // Validate private key format if provided
    if (config.privateKey) {
      if (typeof config.privateKey !== 'string' || !config.privateKey.startsWith('0x') || config.privateKey.length !== 66) {
        throw AuthError.invalidPrivateKey(config.privateKey);
      }
      this.initializeAuth(config.privateKey);
    } else if (config.walletAdapter) {
      this.initializeAuthWithAdapter(config.walletAdapter);
    }
    // Note: No wallet is provided - client will work for public endpoints only

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
   * Initialize authentication with a private key (backward compatibility)
   */
  initializeAuth(privateKey: string): void {
    if (!privateKey.startsWith('0x')) {
      throw AuthError.invalidPrivateKey(privateKey);
    }
    
    this.authManager = new AuthManager(privateKey, this.apiUrl, this.isTestnet);
    this.paymentManager = new PaymentManager(this.authManager, this.isTestnet);
    
    if (this.debug) {
      console.log('Authentication initialized for wallet:', this.authManager.walletAddress);
    }
  }

  /**
   * Initialize authentication with a wallet adapter (for wagmi and other wallets)
   */
  initializeAuthWithAdapter(walletAdapter: WalletAdapter): void {
    this.authManager = new AuthManager(walletAdapter, this.apiUrl);
    this.paymentManager = new PaymentManager(this.authManager, this.isTestnet);
    
    if (this.debug) {
      console.log('Authentication initialized with adapter for wallet:', walletAdapter.getAddress());
    }
  }

  /**
   * Set or update the wallet client for authentication
   * This allows dynamic wallet configuration after initialization
   */
  setWalletClient(walletAdapter: WalletAdapter): void {
    this.initializeAuthWithAdapter(walletAdapter);
    
    if (this.debug) {
      console.log('Wallet client updated:', walletAdapter.getAddress());
    }
  }

  /**
   * Check if a wallet is currently configured
   */
  hasWallet(): boolean {
    return this.authManager !== undefined;
  }

  /**
   * Clear the current wallet configuration
   * Useful for logout scenarios
   */
  clearWallet(): void {
    this.authManager = undefined;
    this.paymentManager = undefined;
    
    if (this.debug) {
      console.log('Wallet configuration cleared');
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

    let authHeaders: any = {};
    
    // Add auth headers if required
    if (options.requiresAuth) {
      if (!this.authManager) {
        throw AuthError.noWallet();
      }
      authHeaders = await this.authManager.getAuthHeaders();
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
      
      // Retry with payment using original auth headers (no additional signature needed)
      response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders, // Reuse original auth headers
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
      throw ApiError.requestFailed(response.status, errorText, url);
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
   * @throws {Error} If no wallet is configured
   */
  getWalletAddress(): string {
    if (!this.authManager) {
      throw AuthError.noWallet();
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