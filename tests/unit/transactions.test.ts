/**
 * Transactions Resource Tests
 * 
 * Note: Full resource tests require x402 dependencies which need network install.
 * These tests validate the types and validation logic.
 * 
 * For complete integration testing, use: bun run test:integration
 */
import { describe, expect, test } from 'bun:test';
import type { Transaction, ListTransactionsQuery } from '../../src/types.js';
import { 
  validateRequiredString,
  validateOptionalString
} from '../../src/validation.js';

describe('Transactions Resource', () => {
  describe('Transaction Type', () => {
    test('Transaction has required fields', () => {
      const tx: Transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        payer: '0x1234567890123456789012345678901234567890',
        pay_to: '0x0987654321098765432109876543210987654321',
        amount: '1000000',
        asset: 'USDC',
        transaction_hash: '0x' + '1'.repeat(64),
        created_at: 1234567890
      };
      
      expect(tx.id).toBeDefined();
      expect(tx.payer).toBeDefined();
      expect(tx.pay_to).toBeDefined();
      expect(tx.amount).toBe('1000000');
      expect(tx.asset).toBe('USDC');
      expect(tx.transaction_hash).toBeDefined();
    });

    test('Transaction allows optional fields', () => {
      const tx: Transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        piid: 'piid_123',
        payer: '0x1234567890123456789012345678901234567890',
        pay_to: '0x0987654321098765432109876543210987654321',
        amount: '1000000',
        asset: 'USDC',
        entry_id: '123e4567-e89b-12d3-a456-426614174001',
        transaction_hash: '0x' + '1'.repeat(64),
        created_at: 1234567890
      };
      
      expect(tx.piid).toBe('piid_123');
      expect(tx.entry_id).toBeDefined();
    });
  });

  describe('ListTransactionsQuery validation', () => {
    test('page_token is optional string', () => {
      expect(validateOptionalString('page_token', undefined)).toBeUndefined();
      expect(validateOptionalString('page_token', 'token123')).toBe('token123');
    });

    test('payer is optional string', () => {
      expect(validateOptionalString('payer', undefined)).toBeUndefined();
      expect(validateOptionalString('payer', '0x1234')).toBe('0x1234');
    });

    test('pay_to is optional string', () => {
      expect(validateOptionalString('pay_to', undefined)).toBeUndefined();
      expect(validateOptionalString('pay_to', '0x5678')).toBe('0x5678');
    });

    test('entry_id is optional string', () => {
      expect(validateOptionalString('entry_id', undefined)).toBeUndefined();
      expect(validateOptionalString('entry_id', '123e4567-e89b-12d3-a456-426614174000'))
        .toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('ID validation', () => {
    test('transaction id is required for get', () => {
      expect(() => validateRequiredString('id', '')).toThrow();
      expect(() => validateRequiredString('id', null)).toThrow();
    });

    test('transaction hash is required for getByHash', () => {
      expect(() => validateRequiredString('hash', '')).toThrow();
      expect(() => validateRequiredString('hash', null)).toThrow();
    });
  });
});
