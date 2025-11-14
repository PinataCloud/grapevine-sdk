import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { WagmiAdapter } from '../../src/adapters/wagmi-adapter.js';
import type { WalletClient } from 'viem';

describe('WagmiAdapter', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b8D28C5aF5D9C3e4Af';
  let mockWalletClient: WalletClient;

  beforeEach(() => {
    mockWalletClient = {
      chain: { id: 84532, name: 'Base Sepolia' },
      account: {
        address: testAddress as `0x${string}`,
        type: 'json-rpc'
      },
      signMessage: mock(async ({ message }: { message: string }) => {
        return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c' as `0x${string}`;
      })
    } as any;
  });

  describe('constructor', () => {
    it('should initialize with wallet client and address', () => {
      const adapter = new WagmiAdapter(mockWalletClient, testAddress);
      expect(adapter.getAddress()).toBe(testAddress);
      expect(adapter.getChainId()).toBe('84532');
    });

    it('should throw error when wallet client is not provided', () => {
      expect(() => new WagmiAdapter(null as any, testAddress))
        .toThrow('WalletClient is required');
    });

    it('should throw error when address is not provided', () => {
      expect(() => new WagmiAdapter(mockWalletClient, ''))
        .toThrow('Wallet address is required');
    });

    it('should throw error when chain ID is not available', () => {
      const walletClientNoChain = { ...mockWalletClient, chain: null };
      expect(() => new WagmiAdapter(walletClientNoChain as any, testAddress))
        .toThrow('Chain ID not available from wallet client');
    });

    it('should handle mainnet chain ID', () => {
      const mainnetWalletClient = {
        ...mockWalletClient,
        chain: { id: 8453, name: 'Base' }
      };
      const adapter = new WagmiAdapter(mainnetWalletClient, testAddress);
      expect(adapter.getChainId()).toBe('8453');
    });
  });

  describe('getAddress', () => {
    it('should return the wallet address', () => {
      const adapter = new WagmiAdapter(mockWalletClient, testAddress);
      expect(adapter.getAddress()).toBe(testAddress);
    });
  });

  describe('signMessage', () => {
    it('should sign a message using the wallet client', async () => {
      const adapter = new WagmiAdapter(mockWalletClient, testAddress);
      const message = 'Test message to sign';
      
      const signature = await adapter.signMessage(message);
      
      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        message,
        account: mockWalletClient.account
      });
      expect(signature).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c');
    });

    it('should work when wallet client has no account', async () => {
      const walletClientNoAccount = {
        ...mockWalletClient,
        account: undefined
      };
      const adapter = new WagmiAdapter(walletClientNoAccount, testAddress);
      
      const signature = await adapter.signMessage('test');
      
      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        message: 'test',
        account: {
          address: testAddress,
          type: 'json-rpc'
        }
      });
    });
  });

  describe('getWalletClient', () => {
    it('should return the wallet client', () => {
      const adapter = new WagmiAdapter(mockWalletClient, testAddress);
      expect(adapter.getWalletClient()).toBe(mockWalletClient);
    });
  });

  describe('getChainId', () => {
    it('should return the chain ID as string', () => {
      const adapter = new WagmiAdapter(mockWalletClient, testAddress);
      expect(adapter.getChainId()).toBe('84532');
    });

    it('should handle different chain IDs', () => {
      const arbitrumWalletClient = {
        ...mockWalletClient,
        chain: { id: 42161, name: 'Arbitrum One' }
      };
      const adapter = new WagmiAdapter(arbitrumWalletClient, testAddress);
      expect(adapter.getChainId()).toBe('42161');
    });
  });
});