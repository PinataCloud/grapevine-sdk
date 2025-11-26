import { describe, it, expect, beforeAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import type { Wallet } from '../../src/types.js';

describe('Wallets API Integration (Live)', () => {
  let client: GrapevineClient;
  let clientWithAuth: GrapevineClient;
  let testWallet: Wallet | null = null;
  const testPrivateKey = process.env.PRIVATE_KEY;

  beforeAll(async () => {
    client = new GrapevineClient({ 
      network: 'testnet',
      debug: false 
    });

    if (testPrivateKey) {
      clientWithAuth = new GrapevineClient({
        network: 'testnet',
        privateKey: testPrivateKey,
        debug: false
      });
      
      // Get the authenticated wallet for testing
      try {
        testWallet = await clientWithAuth.wallets.getMe();
      } catch (error) {
        console.log('⚠️ Could not fetch authenticated wallet');
      }
    }

    // If no auth wallet, find one from feeds
    if (!testWallet) {
      const feeds = await client.feeds.list({ page_size: 1 });
      if (feeds.data.length > 0) {
        try {
          testWallet = await client.wallets.getByAddress(feeds.data[0].owner_wallet_address);
        } catch (error) {
          console.log('⚠️ Could not fetch wallet by address');
        }
      }
    }
  });

  describe('wallets.getByAddress() - Live API', () => {
    it('should get wallet by address', async () => {
      if (!testWallet) {
        console.log('⚠️ Skipping - no test wallet found');
        return;
      }

      const wallet = await client.wallets.getByAddress(testWallet.wallet_address);
      
      expect(wallet).toBeDefined();
      expect(wallet.wallet_address.toLowerCase()).toBe(testWallet.wallet_address.toLowerCase());
      expect(typeof wallet.id).toBe('string');
    });

    it('should throw on invalid address format', async () => {
      await expect(
        client.wallets.getByAddress('invalid-address')
      ).rejects.toThrow('Invalid wallet address format');
    });
  });

  describe('wallets.get() - Live API', () => {
    it('should get wallet by ID', async () => {
      if (!testWallet) {
        console.log('⚠️ Skipping - no test wallet found');
        return;
      }

      const wallet = await client.wallets.get(testWallet.id);
      
      expect(wallet).toBeDefined();
      expect(wallet.id).toBe(testWallet.id);
      expect(typeof wallet.wallet_address).toBe('string');
    });
  });

  describe('wallets.getStats() - Live API', () => {
    it('should get wallet statistics', async () => {
      if (!testWallet) {
        console.log('⚠️ Skipping - no test wallet found');
        return;
      }

      const stats = await client.wallets.getStats(testWallet.id);
      
      expect(stats).toBeDefined();
      expect(stats.wallet_id).toBe(testWallet.id);
      expect(typeof stats.total_feeds_created).toBe('number');
      expect(typeof stats.total_entries_published).toBe('number');
      expect(typeof stats.total_revenue_earned).toBe('string');
    });
  });

  describe('wallets.getMe() - Live API', () => {
    it('should get authenticated wallet', async () => {
      if (!clientWithAuth) {
        console.log('⚠️ Skipping - no PRIVATE_KEY provided');
        return;
      }

      const wallet = await clientWithAuth.wallets.getMe();
      
      expect(wallet).toBeDefined();
      expect(wallet.wallet_address.toLowerCase()).toBe(
        clientWithAuth.getWalletAddress().toLowerCase()
      );
    });
  });

  describe('wallets.update() - Live API', () => {
    it('should update wallet profile if authenticated', async () => {
      if (!clientWithAuth || !testWallet) {
        console.log('⚠️ Skipping - no PRIVATE_KEY or test wallet');
        return;
      }

      try {
        const updatedWallet = await clientWithAuth.wallets.update(testWallet.id, {
          username: `sdk-test-${Date.now()}`
        });
        
        expect(updatedWallet).toBeDefined();
        expect(updatedWallet.id).toBe(testWallet.id);
      } catch (error) {
        // May fail if we don't own the wallet
        console.log('⚠️ Update failed (may not own wallet):', error);
      }
    });
  });
});

