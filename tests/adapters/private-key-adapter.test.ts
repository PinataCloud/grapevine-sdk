import { describe, it, expect } from 'bun:test';
import { PrivateKeyAdapter } from '../../src/adapters/private-key-adapter.js';

describe('PrivateKeyAdapter', () => {
  const validPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('constructor', () => {
    it('should initialize with valid private key for testnet', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      expect(adapter.getAddress()).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(adapter.getChainId()).toBe('84532'); // Base Sepolia
    });

    it('should initialize with valid private key for mainnet', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, false);
      expect(adapter.getAddress()).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(adapter.getChainId()).toBe('8453'); // Base mainnet
    });

    it('should throw error for invalid private key format', () => {
      const invalidKey = '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(() => new PrivateKeyAdapter(invalidKey, true))
        .toThrow('Private key must start with 0x');
    });

    it('should generate consistent address for same private key', () => {
      const adapter1 = new PrivateKeyAdapter(validPrivateKey, true);
      const adapter2 = new PrivateKeyAdapter(validPrivateKey, true);
      expect(adapter1.getAddress()).toBe(adapter2.getAddress());
    });

    it('should generate different addresses for different private keys', () => {
      const key1 = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const key2 = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const adapter1 = new PrivateKeyAdapter(key1, true);
      const adapter2 = new PrivateKeyAdapter(key2, true);
      expect(adapter1.getAddress()).not.toBe(adapter2.getAddress());
    });
  });

  describe('getAddress', () => {
    it('should return the wallet address', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      const address = adapter.getAddress();
      
      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('signMessage', () => {
    it('should sign a message', async () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      const message = 'Test message to sign';
      
      const signature = await adapter.signMessage(message);
      
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signature.length).toBeGreaterThan(100); // Signatures are typically 132 chars
    });

    it('should generate consistent signatures for same message', async () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      const message = 'Consistent message';
      
      const signature1 = await adapter.signMessage(message);
      const signature2 = await adapter.signMessage(message);
      
      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different messages', async () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      
      const signature1 = await adapter.signMessage('Message 1');
      const signature2 = await adapter.signMessage('Message 2');
      
      expect(signature1).not.toBe(signature2);
    });
  });

  describe('getWalletClient', () => {
    it('should return a wallet client', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      const client = adapter.getWalletClient();
      
      expect(client).toBeDefined();
      expect(client.account).toBeDefined();
      expect(client.account.address).toBe(adapter.getAddress());
    });

    it('should return wallet client with correct chain for testnet', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      const client = adapter.getWalletClient();
      
      expect(client.chain).toBeDefined();
      expect(client.chain?.id).toBe(84532); // Base Sepolia
    });

    it('should return wallet client with correct chain for mainnet', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, false);
      const client = adapter.getWalletClient();
      
      expect(client.chain).toBeDefined();
      expect(client.chain?.id).toBe(8453); // Base mainnet
    });
  });

  describe('getChainId', () => {
    it('should return testnet chain ID', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, true);
      expect(adapter.getChainId()).toBe('84532');
    });

    it('should return mainnet chain ID', () => {
      const adapter = new PrivateKeyAdapter(validPrivateKey, false);
      expect(adapter.getChainId()).toBe('8453');
    });
  });
});