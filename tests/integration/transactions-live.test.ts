import { describe, it, expect, beforeAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import type { Transaction } from '../../src/types.js';

describe('Transactions API Integration (Live)', () => {
  let client: GrapevineClient;
  let testTransaction: Transaction | null = null;

  beforeAll(async () => {
    client = new GrapevineClient({ 
      network: 'testnet',
      debug: false 
    });

    // Get a transaction for testing
    const response = await client.transactions.list({ page_size: 1 });
    if (response.data.length > 0) {
      testTransaction = response.data[0];
    }
  });

  describe('transactions.list() - Live API', () => {
    it('should list transactions from live API', async () => {
      const response = await client.transactions.list();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.has_more).toBe('boolean');
      
      if (response.data.length > 0) {
        const tx = response.data[0];
        expect(typeof tx.id).toBe('string');
        expect(typeof tx.payer).toBe('string');
        expect(typeof tx.pay_to).toBe('string');
        expect(typeof tx.amount).toBe('string');
        expect(typeof tx.transaction_hash).toBe('string');
      }
    });

    it('should handle pagination with page_size', async () => {
      const response = await client.transactions.list({ page_size: 5 });
      
      expect(response.data.length).toBeLessThanOrEqual(5);
      expect(typeof response.has_more).toBe('boolean');
    });

    it('should filter by payer', async () => {
      if (!testTransaction) {
        console.log('⚠️ Skipping - no transactions found');
        return;
      }

      const response = await client.transactions.list({ payer: testTransaction.payer });
      
      expect(response.data).toBeInstanceOf(Array);
      response.data.forEach(tx => {
        expect(tx.payer.toLowerCase()).toBe(testTransaction!.payer.toLowerCase());
      });
    });

    it('should filter by pay_to', async () => {
      if (!testTransaction) {
        console.log('⚠️ Skipping - no transactions found');
        return;
      }

      const response = await client.transactions.list({ pay_to: testTransaction.pay_to });
      
      expect(response.data).toBeInstanceOf(Array);
      response.data.forEach(tx => {
        expect(tx.pay_to.toLowerCase()).toBe(testTransaction!.pay_to.toLowerCase());
      });
    });

    it('should work with pagination generator', async () => {
      let pageCount = 0;
      let totalTransactions = 0;
      
      for await (const batch of client.transactions.paginate({ page_size: 5 })) {
        pageCount++;
        totalTransactions += batch.length;
        expect(batch).toBeInstanceOf(Array);
        
        if (pageCount >= 2) break;
      }
      
      expect(pageCount).toBeGreaterThan(0);
    });
  });

  describe('transactions.get() - Live API', () => {
    it('should get transaction by ID', async () => {
      if (!testTransaction) {
        console.log('⚠️ Skipping - no transactions found');
        return;
      }

      const tx = await client.transactions.get(testTransaction.id);
      
      expect(tx.id).toBe(testTransaction.id);
      expect(tx.transaction_hash).toBe(testTransaction.transaction_hash);
    });
  });

  describe('transactions.getByHash() - Live API', () => {
    it('should get transaction by hash', async () => {
      if (!testTransaction) {
        console.log('⚠️ Skipping - no transactions found');
        return;
      }

      const tx = await client.transactions.getByHash(testTransaction.transaction_hash);
      
      expect(tx.transaction_hash).toBe(testTransaction.transaction_hash);
      expect(tx.id).toBe(testTransaction.id);
    });
  });
});

