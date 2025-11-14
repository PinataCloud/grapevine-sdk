import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PaymentManager } from '../src/payments.js';
import { AuthManager } from '../src/auth.js';

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

    it('should handle 402 response with valid payment requirements', async () => {
      const paymentRequirements = {
        x402Version: '1.0.0',
        accepts: [{
          chain: 'base-sepolia',
          address: '0x' + '2'.repeat(40),
          amount: '1000000000000000', // 0.001 ETH
          token: 'ETH'
        }]
      };

      const mockResponse = {
        status: 402,
        url: 'https://api.grapevine.markets/v1/test',
        json: () => Promise.resolve(paymentRequirements)
      };

      const retryRequest = mock(() => Promise.resolve(
        new Response('Success', { status: 200 })
      ));

      mockFetch = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        body: 'Success'
      }));
      global.fetch = mockFetch;

      const result = await paymentManager.handlePaymentRequired(
        mockResponse as any,
        retryRequest
      );

      expect(mockAuthManager.getAuthHeaders).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grapevine.markets/v1/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-PAYMENT': expect.any(String),
            'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE'
          })
        })
      );
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
          chain: 'ethereum', // Wrong network
          address: '0x' + '2'.repeat(40),
          amount: '1000000000000000',
          token: 'ETH'
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

    it('should handle mainnet payment requirements', async () => {
      const mainnetPaymentManager = new PaymentManager(mockAuthManager, false);
      
      const paymentRequirements = {
        x402Version: '1.0.0',
        accepts: [{
          chain: 'base',
          address: '0x' + '2'.repeat(40),
          amount: '1000000000000000',
          token: 'ETH'
        }]
      };

      const mockResponse = {
        status: 402,
        url: 'https://api.grapevine.fyi/v1/test',
        json: () => Promise.resolve(paymentRequirements)
      };

      const retryRequest = mock(() => Promise.resolve(
        new Response('Success', { status: 200 })
      ));

      mockFetch = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        body: 'Success'
      }));
      global.fetch = mockFetch;

      const result = await mainnetPaymentManager.handlePaymentRequired(
        mockResponse as any,
        retryRequest
      );

      expect(mockAuthManager.getAuthHeaders).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should get fresh auth headers after payment', async () => {
      const paymentRequirements = {
        x402Version: '1.0.0',
        accepts: [{
          chain: 'base-sepolia',
          address: '0x' + '2'.repeat(40),
          amount: '1000000000000000',
          token: 'ETH'
        }]
      };

      const mockResponse = {
        status: 402,
        url: 'https://api.grapevine.markets/v1/test',
        json: () => Promise.resolve(paymentRequirements)
      };

      const retryRequest = mock(() => Promise.resolve(
        new Response('Success', { status: 200 })
      ));

      await paymentManager.handlePaymentRequired(
        mockResponse as any,
        retryRequest
      );

      // Should be called once to get fresh headers after payment
      expect(mockAuthManager.getAuthHeaders).toHaveBeenCalledTimes(1);
    });
  });
});