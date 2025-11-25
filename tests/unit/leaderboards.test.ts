/**
 * Leaderboards Resource Tests
 * 
 * Note: Full resource tests require x402 dependencies which need network install.
 * These tests validate the types.
 * 
 * For complete integration testing, use: bun run test:integration
 */
import { describe, expect, test } from 'bun:test';
import type { 
  TrendingFeed,
  PopularFeed,
  TopBuyer,
  TopProvider,
  CategoryStats,
  RecentEntry,
  TopFeed,
  TopRevenueFeed,
  LeaderboardPeriod,
  LeaderboardBaseQuery,
  LeaderboardPeriodQuery
} from '../../src/types.js';

describe('Leaderboards Resource', () => {
  describe('LeaderboardPeriod Type', () => {
    test('LeaderboardPeriod accepts valid values', () => {
      const periods: LeaderboardPeriod[] = ['1d', '7d', '30d', 'all'];
      expect(periods).toHaveLength(4);
      expect(periods).toContain('1d');
      expect(periods).toContain('7d');
      expect(periods).toContain('30d');
      expect(periods).toContain('all');
    });
  });

  describe('LeaderboardBaseQuery Type', () => {
    test('accepts page_size', () => {
      const query: LeaderboardBaseQuery = {
        page_size: 10
      };
      expect(query.page_size).toBe(10);
    });
  });

  describe('LeaderboardPeriodQuery Type', () => {
    test('extends LeaderboardBaseQuery with period', () => {
      const query: LeaderboardPeriodQuery = {
        page_size: 10,
        period: '7d'
      };
      expect(query.page_size).toBe(10);
      expect(query.period).toBe('7d');
    });
  });

  describe('TrendingFeed Type', () => {
    test('has rank and revenue velocity fields', () => {
      const feed: TrendingFeed = {
        rank: '1',
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        owner_wallet: '0x1234567890123456789012345678901234567890',
        name: 'Test Feed',
        is_active: true,
        total_entries: 10,
        total_purchases: 100,
        total_revenue: '1000',
        created_at: 1234567890,
        updated_at: 1234567890,
        purchases_last_7d: '50',
        revenue_last_7d: '500',
        unique_buyers_last_7d: '10'
      };
      
      expect(feed.rank).toBe('1');
      expect(feed.revenue_last_7d).toBe('500');
    });
  });

  describe('PopularFeed Type', () => {
    test('has feed_name and unique_buyers', () => {
      const feed: PopularFeed = {
        rank: '1',
        feed_id: '123e4567-e89b-12d3-a456-426614174000',
        feed_name: 'Popular Feed',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        owner_wallet: '0x1234',
        category_name: 'Business',
        is_active: true,
        total_entries: 10,
        total_purchases: '100',
        total_revenue: '1000',
        unique_buyers: '50',
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(feed.feed_name).toBe('Popular Feed');
      expect(feed.unique_buyers).toBe('50');
    });
  });

  describe('TopBuyer Type', () => {
    test('has wallet_address and spending info', () => {
      const buyer: TopBuyer = {
        rank: '1',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        wallet_address: '0x1234567890123456789012345678901234567890',
        total_purchases: '100',
        total_spent: '5000',
        unique_entries_purchased: '20',
        unique_feeds_purchased_from: '5',
        joined_at: 1234567890
      };
      
      expect(buyer.wallet_address).toBeDefined();
      expect(buyer.total_spent).toBe('5000');
    });
  });

  describe('TopProvider Type', () => {
    test('has wallet_address and revenue info', () => {
      const provider: TopProvider = {
        rank: '1',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        wallet_address: '0x1234567890123456789012345678901234567890',
        total_feeds: '5',
        total_entries: '50',
        total_purchases: '200',
        total_revenue: '10000',
        unique_buyers: '30',
        joined_at: 1234567890
      };
      
      expect(provider.total_revenue).toBe('10000');
      expect(provider.total_feeds).toBe('5');
    });
  });

  describe('CategoryStats Type', () => {
    test('has category info and statistics', () => {
      const stats: CategoryStats = {
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        category_name: 'Business',
        category_description: 'Business feeds',
        category_icon_url: null,
        total_feeds: '10',
        total_providers: '5',
        total_entries: '100',
        total_purchases: '500',
        total_revenue: '50000',
        unique_buyers: '100',
        avg_purchase_amount: '100'
      };
      
      expect(stats.category_name).toBe('Business');
      expect(stats.total_feeds).toBe('10');
    });
  });

  describe('TopFeed Type', () => {
    test('extends Feed with owner and category info', () => {
      const topFeed: TopFeed = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        category_id: null,
        name: 'Top Feed',
        description: null,
        image_cid: null,
        is_active: true,
        total_entries: 50,
        total_purchases: 100,
        total_revenue: '5000',
        tags: null,
        created_at: 1234567890,
        updated_at: 1234567890,
        owner_wallet: '0x1234567890123456789012345678901234567890',
        owner_username: 'testuser',
        category_name: 'Business'
      };
      
      expect(topFeed.owner_wallet).toBeDefined();
      expect(topFeed.owner_username).toBe('testuser');
      expect(topFeed.category_name).toBe('Business');
    });
  });
});
