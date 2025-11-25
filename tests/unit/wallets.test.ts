/**
 * Wallets Resource Tests
 * 
 * Note: Full resource tests require x402 dependencies which need network install.
 * These tests validate the types and validation logic.
 * 
 * For complete integration testing, use: bun run test:integration
 */
import { describe, expect, test } from 'bun:test';
import type { Wallet, WalletStats, UpdateWalletInput, WalletNetwork } from '../../src/types.js';
import { 
  validateRequiredString,
  validateOptionalString,
  validateOptionalURL
} from '../../src/validation.js';

describe('Wallets Resource', () => {
  describe('Wallet Type', () => {
    test('Wallet has required fields', () => {
      const wallet: Wallet = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        wallet_address: '0x1234567890123456789012345678901234567890',
        wallet_address_network: 'base',
        username: null,
        picture_url: null,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(wallet.id).toBeDefined();
      expect(wallet.wallet_address).toBeDefined();
      expect(wallet.wallet_address_network).toBe('base');
    });
  });

  describe('WalletNetwork Type', () => {
    test('WalletNetwork accepts valid values', () => {
      const networks: WalletNetwork[] = [
        'base',
        'base-sepolia',
        'ethereum',
        'ethereum-sepolia',
        'polygon',
        'polygon-amoy'
      ];
      
      expect(networks).toHaveLength(6);
    });
  });

  describe('WalletStats Type', () => {
    test('WalletStats has all statistics fields', () => {
      const stats: WalletStats = {
        wallet_id: '123e4567-e89b-12d3-a456-426614174000',
        total_feeds_created: 5,
        total_entries_published: 50,
        total_revenue_earned: '10000',
        total_items_sold: 100,
        unique_buyers_count: 25,
        total_purchases_made: 30,
        total_amount_spent: '5000',
        unique_feeds_purchased_from: 10,
        revenue_rank: 5,
        purchases_rank: 10,
        last_calculated_at: 1234567890,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(stats.total_feeds_created).toBe(5);
      expect(stats.total_revenue_earned).toBe('10000');
    });
  });

  describe('Validation', () => {
    test('walletId is required', () => {
      expect(() => validateRequiredString('walletId', '')).toThrow();
      expect(() => validateRequiredString('walletId', null)).toThrow();
    });

    test('address format validation', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      
      expect(addressRegex.test(validAddress)).toBe(true);
      expect(addressRegex.test('invalid')).toBe(false);
      expect(addressRegex.test('0x1234')).toBe(false);
      expect(addressRegex.test('1234567890123456789012345678901234567890')).toBe(false);
    });

    test('username is optional string', () => {
      expect(validateOptionalString('username', undefined)).toBeUndefined();
      expect(validateOptionalString('username', 'testuser')).toBe('testuser');
    });

    test('picture_url must be valid URL', () => {
      expect(() => validateOptionalURL('picture_url', 'not-a-url')).toThrow();
      expect(validateOptionalURL('picture_url', 'https://example.com/pic.png'))
        .toBe('https://example.com/pic.png');
    });
  });
});
