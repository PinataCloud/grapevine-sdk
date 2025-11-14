import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { GrapevineClient } from '../src/client.js';
import { PrivateKeyAdapter } from '../src/adapters/private-key-adapter.js';
import { WagmiAdapter } from '../src/adapters/wagmi-adapter.js';
import type { GrapevineConfig } from '../src/types.js';
import type { WalletClient } from 'viem';

describe('GrapevineClient', () => {
  describe('constructor', () => {
    it('should initialize with default testnet config', () => {
      const client = new GrapevineClient();
      expect(client.isTestNetwork()).toBe(true);
      expect(client.getNetwork()).toBe('base-sepolia');
    });

    it('should initialize with mainnet config', () => {
      const client = new GrapevineClient({ network: 'mainnet' });
      expect(client.isTestNetwork()).toBe(false);
      expect(client.getNetwork()).toBe('base');
    });

    it('should use correct API URL for testnet', () => {
      const client = new GrapevineClient({ network: 'testnet' });
      expect(client.isTestNetwork()).toBe(true);
      expect(client.getNetwork()).toBe('base-sepolia');
    });

    it('should use correct API URL for mainnet', () => {
      const client = new GrapevineClient({ network: 'mainnet' });
      expect(client.isTestNetwork()).toBe(false);
      expect(client.getNetwork()).toBe('base');
    });

    it('should initialize auth when private key is provided', () => {
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const client = new GrapevineClient({ privateKey });
      expect(() => client.getWalletAddress()).not.toThrow();
    });

    it('should initialize auth when wallet adapter is provided', () => {
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const adapter = new PrivateKeyAdapter(privateKey, true);
      const client = new GrapevineClient({ walletAdapter: adapter });
      expect(() => client.getWalletAddress()).not.toThrow();
    });

    it('should throw error when both privateKey and walletAdapter are provided', () => {
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const adapter = new PrivateKeyAdapter(privateKey, true);
      expect(() => new GrapevineClient({ 
        privateKey, 
        walletAdapter: adapter 
      })).toThrow('Cannot provide both privateKey and walletAdapter');
    });

    it('should throw error when getting wallet address without auth', () => {
      const client = new GrapevineClient();
      expect(() => client.getWalletAddress()).toThrow('No authentication configured');
    });
  });

  describe('initializeAuth', () => {
    it('should initialize auth with valid private key', () => {
      const client = new GrapevineClient();
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      expect(() => client.initializeAuth(privateKey)).not.toThrow();
      expect(() => client.getWalletAddress()).not.toThrow();
    });

    it('should throw error for invalid private key format', () => {
      const client = new GrapevineClient();
      const invalidKey = '1234567890';
      
      expect(() => client.initializeAuth(invalidKey)).toThrow('Private key must start with 0x');
    });
  });

  describe('initializeAuthWithAdapter', () => {
    it('should initialize auth with private key adapter', () => {
      const client = new GrapevineClient();
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const adapter = new PrivateKeyAdapter(privateKey, true);
      
      expect(() => client.initializeAuthWithAdapter(adapter)).not.toThrow();
      expect(() => client.getWalletAddress()).not.toThrow();
    });

    it('should initialize auth with wagmi adapter', () => {
      const client = new GrapevineClient();
      const testAddress = '0x742d35Cc6634C0532925a3b8D28C5aF5D9C3e4Af';
      const mockWalletClient = {
        chain: { id: 84532, name: 'Base Sepolia' },
        account: { address: testAddress, type: 'json-rpc' },
        signMessage: mock(() => Promise.resolve('0x123'))
      } as any;
      const adapter = new WagmiAdapter(mockWalletClient, testAddress);
      
      expect(() => client.initializeAuthWithAdapter(adapter)).not.toThrow();
      expect(() => client.getWalletAddress()).not.toThrow();
      expect(client.getWalletAddress()).toBe(testAddress);
    });
  });

  describe('request', () => {
    let client: GrapevineClient;
    let mockFetch: any;

    beforeEach(() => {
      client = new GrapevineClient();
      mockFetch = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve('Success')
      }));
      global.fetch = mockFetch;
    });

    it('should make unauthenticated GET request', async () => {
      const response = await client.request('/v1/test', {
        method: 'GET',
        requiresAuth: false
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grapevine.markets/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(response.ok).toBe(true);
    });

    it('should make authenticated POST request', async () => {
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      client.initializeAuth(privateKey);
      
      const body = JSON.stringify({ test: 'data' });
      const response = await client.request('/v1/test', {
        method: 'POST',
        body,
        requiresAuth: true
      });
      
      // Verify the request was made with authentication
      expect(mockFetch).toHaveBeenCalledTimes(2); // One for nonce, one for actual request
      expect(response.ok).toBe(true);
    });

    it('should throw error for unauthenticated request when auth is required', async () => {
      await expect(
        client.request('/v1/test', {
          method: 'GET',
          requiresAuth: true
        })
      ).rejects.toThrow('Authentication required but no private key provided');
    });

    it('should throw error for failed API request', async () => {
      mockFetch = mock(() => Promise.resolve({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      }));
      global.fetch = mockFetch;

      await expect(
        client.request('/v1/test', {
          method: 'GET',
          requiresAuth: false
        })
      ).rejects.toThrow('API request failed (400): Bad Request');
    });

    it('should handle 402 payment required with payment manager', async () => {
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      client.initializeAuth(privateKey);
      
      let callCount = 0;
      mockFetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          // First call is nonce request
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ message: 'test-nonce-message' })
          });
        } else if (callCount === 2) {
          // Second call returns 402 with payment requirements
          return Promise.resolve({
            ok: false,
            status: 402,
            json: () => Promise.resolve({
              x402Version: '1.0.0',
              accepts: [{
                scheme: 'exact',
                network: 'base-sepolia',
                maxAmountRequired: '1000000000000000',
                resource: 'https://api.grapevine.markets/v1/test',
                description: 'Test payment',
                mimeType: 'application/json',
                payTo: '0x' + '1'.repeat(40),
                maxTimeoutSeconds: 3600,
                asset: '0x' + '1'.repeat(40)
              }]
            }),
            text: () => Promise.resolve('Payment Required')
          });
        }
        // Third call succeeds after payment
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        });
      });
      global.fetch = mockFetch;

      const response = await client.request('/v1/test', {
        method: 'GET',
        requiresAuth: true,
        handlePayment: true
      });
      
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    let client: GrapevineClient;
    let mockFetch: any;

    beforeEach(() => {
      client = new GrapevineClient();
      mockFetch = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: [
            { id: 1, name: 'Technology' },
            { id: 2, name: 'Finance' }
          ]
        })
      }));
      global.fetch = mockFetch;
    });

    it('should fetch categories from API', async () => {
      const categories = await client.getCategories();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grapevine.markets/v1/categories',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(categories).toEqual([
        { id: 1, name: 'Technology' },
        { id: 2, name: 'Finance' }
      ]);
    });
  });

  describe('resource initialization', () => {
    it('should initialize feeds resource', () => {
      const client = new GrapevineClient();
      expect(client.feeds).toBeDefined();
      expect(client.feeds.constructor.name).toBe('FeedsResource');
    });

    it('should initialize entries resource', () => {
      const client = new GrapevineClient();
      expect(client.entries).toBeDefined();
      expect(client.entries.constructor.name).toBe('EntriesResource');
    });
  });

  describe('debug mode', () => {
    it('should log when debug is enabled', () => {
      const consoleSpy = mock();
      const originalLog = console.log;
      console.log = consoleSpy;

      new GrapevineClient({ debug: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'GrapevineClient initialized:',
        expect.objectContaining({
          apiUrl: expect.any(String),
          network: expect.any(String),
          isTestnet: expect.any(Boolean)
        })
      );

      console.log = originalLog;
    });

    it('should not log when debug is disabled', () => {
      const consoleSpy = mock();
      const originalLog = console.log;
      console.log = consoleSpy;

      new GrapevineClient({ debug: false });
      
      expect(consoleSpy).not.toHaveBeenCalled();

      console.log = originalLog;
    });
  });
});