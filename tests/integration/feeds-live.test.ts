import { describe, it, expect, beforeAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import type { Feed } from '../../src/types.js';

describe('Feeds API Integration (Live)', () => {
  let client: GrapevineClient;
  let clientWithAuth: GrapevineClient;
  const testPrivateKey = process.env.PRIVATE_KEY;

  beforeAll(() => {
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
    }
  });

  describe('feeds.list() - Live API', () => {
    it('should list feeds from live API', async () => {
      const response = await client.feeds.list();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.total_count).toBe('number');
      expect(response.next_page_token === undefined || typeof response.next_page_token === 'string').toBe(true);
      
      if (response.data.length > 0) {
        const feed = response.data[0];
        expect(typeof feed.id).toBe('string');
        expect(typeof feed.name).toBe('string');
        expect(typeof feed.owner_wallet_address).toBe('string');
        expect(typeof feed.is_active).toBe('boolean');
        expect(typeof feed.total_entries).toBe('number');
      }
    });

    it('should handle pagination with page_size', async () => {
      const response = await client.feeds.list({ page_size: 5 });
      
      expect(response.data.length).toBeLessThanOrEqual(5);
      expect(typeof response.total_count).toBe('number');
      
      // If there are more than 5 feeds total, should have next_page_token
      if (response.data.length === 5) {
        expect(typeof response.next_page_token).toBe('string');
      }
    });

    it('should handle second page with page_token', async () => {
      const firstPage = await client.feeds.list({ page_size: 3 });
      
      if (firstPage.next_page_token) {
        const secondPage = await client.feeds.list({ 
          page_size: 3, 
          page_token: firstPage.next_page_token 
        });
        
        expect(secondPage.data).toBeInstanceOf(Array);
        expect(secondPage.data.length).toBeGreaterThan(0);
        
        // Should have different feeds
        const firstPageIds = firstPage.data.map(f => f.id);
        const secondPageIds = secondPage.data.map(f => f.id);
        const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
        expect(hasOverlap).toBe(false);
      }
    });

    it('should work with pagination generator', async () => {
      let pageCount = 0;
      let totalFeeds = 0;
      
      for await (const batch of client.feeds.paginate({ page_size: 5 })) {
        pageCount++;
        totalFeeds += batch.length;
        expect(batch).toBeInstanceOf(Array);
        
        if (pageCount >= 2) break; // Test first 2 pages
      }
      
      expect(pageCount).toBeGreaterThan(0);
      expect(totalFeeds).toBeGreaterThan(0);
    });

    it('should respect pagination boundaries using next_page_token', async () => {
      let pageCount = 0;
      let allFeeds: any[] = [];
      let lastToken: string | undefined;
      let hasMorePages = true;

      // Test complete pagination until next_page_token is undefined
      while (hasMorePages) {
        const response = await client.feeds.list({ 
          page_size: 3, 
          page_token: lastToken 
        });
        
        pageCount++;
        allFeeds.push(...response.data);
        
        // Validate response structure
        expect(typeof response.total_count).toBe('number');
        expect(response.next_page_token === undefined || typeof response.next_page_token === 'string').toBe(true);
        
        hasMorePages = !!response.next_page_token;
        lastToken = response.next_page_token;
        
        if (pageCount > 100) {
          console.log(`⚠️ Stopped pagination test at ${pageCount} pages (${allFeeds.length} feeds found)`);
          throw new Error('Pagination test exceeded 100 pages - API has extensive data');
        }
      }
      
      expect(pageCount).toBeGreaterThan(0);
      expect(allFeeds.length).toBeGreaterThan(0);
      
      // Verify we got unique feeds (no duplicates across pages)
      const uniqueIds = new Set(allFeeds.map(f => f.id));
      expect(uniqueIds.size).toBe(allFeeds.length);
      
      const reachedNaturalBoundary = !hasMorePages;
      console.log(`🔍 Pagination boundary test: ${pageCount} pages, ${allFeeds.length} feeds, natural boundary: ${reachedNaturalBoundary}`);
    });

    it('should handle maximum page_size', async () => {
      const response = await client.feeds.list({ page_size: 100 });
      
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.total_count).toBe('number');
      expect(response.data.length).toBeLessThanOrEqual(100);
      expect(response.next_page_token === undefined || typeof response.next_page_token === 'string').toBe(true);
    });

    it('should handle pagination generator', async () => {
      let pageCount = 0;
      let totalFeeds = 0;
      const seenIds = new Set<string>();
      
      for await (const batch of client.feeds.paginate({ page_size: 4 })) {
        pageCount++;
        totalFeeds += batch.length;
        
        expect(batch).toBeInstanceOf(Array);
        expect(batch.length).toBeGreaterThan(0);
        expect(batch.length).toBeLessThanOrEqual(100);
        
        batch.forEach(feed => {
          expect(seenIds.has(feed.id)).toBe(false);
          seenIds.add(feed.id);
        });
        
        if (pageCount > 20) break;
      }
      
      expect(pageCount).toBeGreaterThan(0);
      expect(totalFeeds).toBeGreaterThan(0);
      expect(totalFeeds).toBe(seenIds.size);
    });
  });

  describe('feeds.get() - Live API', () => {
    it('should get specific feed by ID', async () => {
      // First get a feed ID
      const listResponse = await client.feeds.list({ page_size: 1 });
      
      if (listResponse.data.length > 0) {
        const feedId = listResponse.data[0].id;
        const feed = await client.feeds.get(feedId);
        
        expect(feed.id).toBe(feedId);
        expect(typeof feed.name).toBe('string');
        expect(typeof feed.owner_wallet_address).toBe('string');
      }
    });
  });

  describe('feeds with authentication', () => {
    it('should list my feeds if authenticated', async () => {
      if (!clientWithAuth) {
        console.log('⚠️ Skipping auth test - no PRIVATE_KEY provided');
        return;
      }

      const response = await clientWithAuth.feeds.myFeeds();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      
      const walletAddress = clientWithAuth.getWalletAddress();
      
      // All returned feeds should be owned by the authenticated wallet
      response.data.forEach(feed => {
        expect(feed.owner_wallet_address.toLowerCase()).toBe(walletAddress.toLowerCase());
      });
    });

    it('should create and retrieve feed if authenticated', async () => {
      if (!clientWithAuth) {
        console.log('⚠️ Skipping create test - no PRIVATE_KEY provided');
        return;
      }

      const feedName = `Integration Test Feed ${Date.now()}`;
      
      try {
        const createdFeed = await clientWithAuth.feeds.create({
          name: feedName,
          description: 'Integration test feed',
          tags: ['test', 'integration']
        });
        
        expect(createdFeed.id).toBeDefined();
        expect(createdFeed.name).toBe(feedName);
        expect(createdFeed.description).toBe('Integration test feed');
        
        // Verify we can retrieve it
        const retrievedFeed = await client.feeds.get(createdFeed.id);
        expect(retrievedFeed.id).toBe(createdFeed.id);
        expect(retrievedFeed.name).toBe(feedName);
        
      } catch (error) {
        // If it's a payment error, that's expected for some test environments
        if (error.message.includes('402') || error.message.includes('payment')) {
          console.log('⚠️ Skipping create test - payment required');
          return;
        }
        throw error;
      }
    });
  });
});