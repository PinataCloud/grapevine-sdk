import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { GrapevineClient } from '../src/client.js';
import type { GrapevineConfig } from '../src/types.js';

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
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grapevine.markets/v1/test',
        expect.objectContaining({
          method: 'POST',
          body,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Wallet-Address': expect.any(String),
            'X-Timestamp': expect.any(String),
            'X-Signature': expect.any(String)
          })
        })
      );
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
          return Promise.resolve({
            ok: false,
            status: 402,
            headers: {
              get: (key: string) => {
                if (key === 'X-Payment-Required') return '0.001';
                if (key === 'X-Payment-Address') return '0x' + '1'.repeat(40);
                return null;
              }
            },
            text: () => Promise.resolve('Payment Required')
          });
        }
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
      expect(mockFetch).toHaveBeenCalledTimes(2);
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
        json: () => Promise.resolve([
          { id: 1, name: 'Technology' },
          { id: 2, name: 'Finance' }
        ])
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