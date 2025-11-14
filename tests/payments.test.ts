import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PaymentManager } from '../src/payments.js';
import { AuthManager } from '../src/auth.js';

// Mock the x402 library
mock.module('x402/client', () => ({
  createPaymentHeader: mock(() => Promise.resolve('mock-payment-header')),
  selectPaymentRequirements: mock((requirements: any[], networks: string[]) => {
    return requirements.find(req => networks.includes(req.network)) || null;
  })
}));

describe('PaymentManager', () => {
  let paymentManager: PaymentManager;
  let mockAuthManager: any;
  let mockWalletClient: any;
  let mockFetch: any;
  
  const validPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    mockWalletClient = {
      account: { address: '0x' + '1'.repeat(40) },
      chain: { id: 84532 },
      signMessage: mock(() => Promise.resolve('0x' + 'a'.repeat(130))),
      sendTransaction: mock(() => Promise.resolve('0x' + 'b'.repeat(64)))
    };

    mockAuthManager = {
      getWalletClient: () => mockWalletClient,
      getAuthHeaders: mock(() => Promise.resolve({
        'x-wallet-address': '0x' + '1'.repeat(40),
        'x-signature': '0x' + 'a'.repeat(130),
        'x-message': 'test-message',
        'x-timestamp': '1234567890',
        'x-chain-id': '84532'
      })),
      walletAddress: '0x' + '1'.repeat(40)
    };

    paymentManager = new PaymentManager(mockAuthManager, true);

    mockFetch = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true })
    }));
    global.fetch = mockFetch;
  });

  describe('constructor', () => {
    it('should initialize with testnet configuration', () => {
      const pm = new PaymentManager(mockAuthManager, true);
      expect(pm).toBeDefined();
    });

    it('should initialize with mainnet configuration', () => {
      const pm = new PaymentManager(mockAuthManager, false);
      expect(pm).toBeDefined();
    });
  });

  describe('handlePaymentRequired', () => {
    it('should return original response if status is not 402', async () => {
      const response = new Response('OK', { status: 200 });
      const retryRequest = mock(() => Promise.resolve(new Response()));
      
      const result = await paymentManager.handlePaymentRequired(response, retryRequest);
      
      expect(result).toBe(response);
      expect(retryRequest).not.toHaveBeenCalled();
    });

    it('should throw error for invalid payment requirements', async () => {
      const invalidPaymentData = {
        x402Version: '1.0.0',
        accepts: null // Invalid - should be an array
      };

      const mockResponse = {
        status: 402,
        json: () => Promise.resolve(invalidPaymentData)
      };

      const retryRequest = mock(() => Promise.resolve(new Response()));

      await expect(
        paymentManager.handlePaymentRequired(mockResponse as any, retryRequest)
      ).rejects.toThrow('Invalid payment requirements in 402 response');
    });

    it('should throw error when no requirements match network', async () => {
      const paymentRequirements = {
        x402Version: '1.0.0',
        accepts: [{
          scheme: 'exact',
          network: 'polygon', // Wrong network for base-sepolia
          maxAmountRequired: '1000000000000000',
          resource: 'https://api.grapevine.markets/v1/feeds',
          description: 'Access to feed creation',
          mimeType: 'application/json',
          payTo: '0x' + '2'.repeat(40),
          maxTimeoutSeconds: 3600,
          asset: '0x' + '2'.repeat(40)
        }]
      };

      const mockResponse = {
        status: 402,
        json: () => Promise.resolve(paymentRequirements)
      };

      const retryRequest = mock(() => Promise.resolve(new Response()));

      await expect(
        paymentManager.handlePaymentRequired(mockResponse as any, retryRequest)
      ).rejects.toThrow('No payment requirements match network: base-sepolia');
    });
  });
});