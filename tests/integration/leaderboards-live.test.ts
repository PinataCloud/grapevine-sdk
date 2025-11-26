import { describe, it, expect, beforeAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';

describe('Leaderboards API Integration (Live)', () => {
  let client: GrapevineClient;

  beforeAll(() => {
    client = new GrapevineClient({ 
      network: 'testnet',
      debug: false 
    });
  });

  describe('leaderboards.trending() - Live API', () => {
    it('should get trending feeds', async () => {
      const response = await client.leaderboards.trending();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should respect page_size', async () => {
      const response = await client.leaderboards.trending({ page_size: 5 });
      
      expect(response.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('leaderboards.mostPopular() - Live API', () => {
    it('should get most popular feeds', async () => {
      const response = await client.leaderboards.mostPopular();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should filter by period', async () => {
      const response = await client.leaderboards.mostPopular({ period: '7d' });
      
      expect(response.data).toBeInstanceOf(Array);
    });
  });

  describe('leaderboards.topBuyers() - Live API', () => {
    it('should get top buyers', async () => {
      const response = await client.leaderboards.topBuyers();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should filter by period', async () => {
      const response = await client.leaderboards.topBuyers({ period: '30d' });
      
      expect(response.data).toBeInstanceOf(Array);
    });
  });

  describe('leaderboards.topProviders() - Live API', () => {
    it('should get top providers', async () => {
      const response = await client.leaderboards.topProviders();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should filter by period', async () => {
      const response = await client.leaderboards.topProviders({ period: '1d' });
      
      expect(response.data).toBeInstanceOf(Array);
    });
  });

  describe('leaderboards.categoryStats() - Live API', () => {
    it('should get category statistics', async () => {
      const response = await client.leaderboards.categoryStats();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      
      if (response.data.length > 0) {
        const stat = response.data[0];
        expect(typeof stat.category_id).toBe('string');
        expect(typeof stat.category_name).toBe('string');
      }
    });
  });

  describe('leaderboards.recentEntries() - Live API', () => {
    it('should get recent entries', async () => {
      const response = await client.leaderboards.recentEntries();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.has_more).toBe('boolean');
    });

    it('should handle pagination', async () => {
      const response = await client.leaderboards.recentEntries({ page_size: 5 });
      
      expect(response.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('leaderboards.topFeeds() - Live API', () => {
    it('should get top feeds by entry count', async () => {
      const response = await client.leaderboards.topFeeds();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should respect page_size', async () => {
      const response = await client.leaderboards.topFeeds({ page_size: 10 });
      
      expect(response.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('leaderboards.topRevenue() - Live API', () => {
    it('should get top revenue feeds', async () => {
      const response = await client.leaderboards.topRevenue();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should filter by period', async () => {
      const response = await client.leaderboards.topRevenue({ period: 'all' });
      
      expect(response.data).toBeInstanceOf(Array);
    });
  });
});

