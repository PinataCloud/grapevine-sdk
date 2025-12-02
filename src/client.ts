import { AuthManager } from './auth.js';
import { PaymentManager } from './payments.js';
import { FeedsResource } from './resources/feeds.js';
import { EntriesResource } from './resources/entries.js';
import { LeaderboardsResource } from './resources/leaderboards.js';
import { WalletsResource } from './resources/wallets.js';
import { TransactionsResource } from './resources/transactions.js';
import { CategoriesResource } from './resources/categories.js';
import type { GrapevineConfig } from './types.js';
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
  public leaderboards: LeaderboardsResource;
  public wallets: WalletsResource;
  public transactions: TransactionsResource;
  public categories: CategoriesResource;

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
    this.leaderboards = new LeaderboardsResource(this);
    this.wallets = new WalletsResource(this);
    this.transactions = new TransactionsResource(this);
    this.categories = new CategoriesResource(this);

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
   * Make a request to the API
   * 
   * Auth is handled lazily - only triggered when API returns 401.
   * This minimizes signature popups to only when truly required.
   */
  async request(path: string, options: RequestOptions): Promise<Response> {
    const url = `${this.apiUrl}${path}`;
    
    if (this.debug) {
      console.log(`Request: ${options.method} ${url}`);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Make the initial request without auth
    let response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body
    });

    // Handle 401 - auth required (lazy auth)
    if (response.status === 401 && options.requiresAuth) {
      if (!this.authManager) {
        throw AuthError.noWallet();
      }
      
      const authHeaders = await this.authManager.getAuthHeaders();
      
      response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: options.body
      });
    }

    // Handle 402 - payment required
    if (response.status === 402 && options.handlePayment) {
      if (!this.paymentManager) {
        throw AuthError.noWalletForPayment();
      }
      
      // Create payment header
      const paymentHeader = await this.paymentManager.createPaymentHeader(response);
      
      // Retry with payment
      response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
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
   * @deprecated Use client.categories.list() or client.categories.getAll() instead
   */
  async getCategories(): Promise<import('./types.js').Category[]> {
    return this.categories.getAll();
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
