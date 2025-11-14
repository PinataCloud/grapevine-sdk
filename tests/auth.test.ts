import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthManager } from '../src/auth.js';

describe('AuthManager', () => {
  // Use a valid private key (not all zeros)
  const validPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testApiUrl = 'https://api.grapevine.markets';
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ 
        message: 'Sign this message to authenticate: nonce-12345' 
      })
    }));
    global.fetch = mockFetch;
  });

  describe('constructor', () => {
    it('should initialize with testnet configuration', () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      expect(auth.walletAddress).toBeDefined();
      expect(auth.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should initialize with mainnet configuration', () => {
      const auth = new AuthManager(validPrivateKey, 'https://api.grapevine.fyi', false);
      expect(auth.walletAddress).toBeDefined();
      expect(auth.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should generate consistent wallet address from private key', () => {
      const auth1 = new AuthManager(validPrivateKey, testApiUrl, true);
      const auth2 = new AuthManager(validPrivateKey, testApiUrl, true);
      expect(auth1.walletAddress).toBe(auth2.walletAddress);
    });

    it('should generate different wallet addresses for different private keys', () => {
      const key1 = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const key2 = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const auth1 = new AuthManager(key1, testApiUrl, true);
      const auth2 = new AuthManager(key2, testApiUrl, true);
      expect(auth1.walletAddress).not.toBe(auth2.walletAddress);
    });
  });

  describe('getAuthHeaders', () => {
    it('should request nonce and return auth headers', async () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const headers = await auth.getAuthHeaders();
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${testApiUrl}/v1/auth/nonce`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: auth.walletAddress })
        })
      );
      
      expect(headers).toHaveProperty('x-wallet-address');
      expect(headers).toHaveProperty('x-signature');
      expect(headers).toHaveProperty('x-message');
      expect(headers).toHaveProperty('x-timestamp');
      expect(headers).toHaveProperty('x-chain-id');
    });

    it('should include correct chain ID for testnet', async () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const headers = await auth.getAuthHeaders();
      expect(headers['x-chain-id']).toBe('84532'); // Base Sepolia chain ID
    });

    it('should include correct chain ID for mainnet', async () => {
      const auth = new AuthManager(validPrivateKey, 'https://api.grapevine.fyi', false);
      const headers = await auth.getAuthHeaders();
      expect(headers['x-chain-id']).toBe('8453'); // Base mainnet chain ID
    });

    it('should include current timestamp', async () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const beforeTime = Math.floor(Date.now() / 1000);
      const headers = await auth.getAuthHeaders();
      const afterTime = Math.floor(Date.now() / 1000);
      
      const timestamp = parseInt(headers['x-timestamp']);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should throw error when nonce request fails', async () => {
      mockFetch = mock(() => Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error')
      }));
      global.fetch = mockFetch;

      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      await expect(auth.getAuthHeaders()).rejects.toThrow('Nonce request failed: 500');
    });

    it('should sign the message from server', async () => {
      const testMessage = 'Sign this message: test-nonce-789';
      mockFetch = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: testMessage })
      }));
      global.fetch = mockFetch;

      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const headers = await auth.getAuthHeaders();
      
      expect(headers['x-message']).toBe(testMessage);
      expect(headers['x-signature']).toBeDefined();
      expect(headers['x-signature']).toMatch(/^0x[a-fA-F0-9]+$/);
    });
  });

  describe('walletAddress getter', () => {
    it('should return the wallet address', () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const address = auth.walletAddress;
      
      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('getWalletClient', () => {
    it('should return a wallet client', () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const client = auth.getWalletClient();
      
      expect(client).toBeDefined();
      expect(client.account).toBeDefined();
      expect(client.account.address).toBe(auth.walletAddress);
    });

    it('should return wallet client with correct chain for testnet', () => {
      const auth = new AuthManager(validPrivateKey, testApiUrl, true);
      const client = auth.getWalletClient();
      
      expect(client.chain).toBeDefined();
      expect(client.chain?.id).toBe(84532); // Base Sepolia
    });

    it('should return wallet client with correct chain for mainnet', () => {
      const auth = new AuthManager(validPrivateKey, 'https://api.grapevine.fyi', false);
      const client = auth.getWalletClient();
      
      expect(client.chain).toBeDefined();
      expect(client.chain?.id).toBe(8453); // Base mainnet
    });
  });
});