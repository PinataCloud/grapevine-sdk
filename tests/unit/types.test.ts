import { describe, expect, test } from 'bun:test';
import type {
  Feed,
  Entry,
  Category,
  Wallet,
  WalletStats,
  Transaction,
  PaginatedResponse,
  TopFeed,
  TrendingFeed,
  PopularFeed,
  TopProvider,
  TopBuyer,
  CategoryStats,
  RecentEntry,
  WalletNetwork,
  LeaderboardPeriod
} from '../../src/types.js';

describe('Type Definitions', () => {
  describe('Feed', () => {
    test('Feed type has required fields', () => {
      const feed: Feed = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        owner_wallet_address: '0x1234567890123456789012345678901234567890',
        name: 'Test Feed',
        is_active: true,
        total_entries: 0,
        total_purchases: 0,
        total_revenue: '0',
        tags: null,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(feed.id).toBeDefined();
      expect(feed.owner_id).toBeDefined();
      expect(feed.name).toBeDefined();
    });

    test('Feed allows optional fields', () => {
      const feed: Feed = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        owner_wallet_address: '0x1234567890123456789012345678901234567890',
        name: 'Test Feed',
        description: 'A test feed',
        image_cid: 'QmTest123',
        category_id: '123e4567-e89b-12d3-a456-426614174002',
        is_active: true,
        total_entries: 5,
        total_purchases: 10,
        total_revenue: '1000000',
        tags: ['test', 'example'],
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(feed.description).toBe('A test feed');
      expect(feed.image_cid).toBe('QmTest123');
    });
  });

  describe('Entry', () => {
    test('Entry type has required fields', () => {
      const entry: Entry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        feed_id: '123e4567-e89b-12d3-a456-426614174001',
        cid: 'QmTest123',
        mime_type: 'text/plain',
        is_free: true,
        is_active: true,
        total_purchases: 0,
        total_revenue: '0',
        tags: null,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(entry.id).toBeDefined();
      expect(entry.feed_id).toBeDefined();
      expect(entry.cid).toBeDefined();
    });
  });

  describe('Category', () => {
    test('Category type has all required fields', () => {
      const category: Category = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Business',
        description: 'Business feeds',
        icon_url: 'https://example.com/icon.png',
        is_active: true,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.is_active).toBeDefined();
      expect(category.created_at).toBeDefined();
      expect(category.updated_at).toBeDefined();
    });

    test('Category allows null for optional fields', () => {
      const category: Category = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Business',
        description: null,
        icon_url: null,
        is_active: true,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(category.description).toBeNull();
      expect(category.icon_url).toBeNull();
    });
  });

  describe('Wallet', () => {
    test('Wallet type has required fields', () => {
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
      expect(wallet.wallet_address_network).toBeDefined();
    });
  });

  describe('WalletNetwork', () => {
    test('WalletNetwork type accepts valid values', () => {
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

  describe('PaginatedResponse', () => {
    test('PaginatedResponse has required fields', () => {
      const response: PaginatedResponse<Feed> = {
        data: [],
        has_more: false
      };
      
      expect(response.data).toBeDefined();
      expect(response.has_more).toBeDefined();
    });

    test('PaginatedResponse includes optional next_page_token', () => {
      const response: PaginatedResponse<Feed> = {
        data: [],
        next_page_token: 'abc123',
        has_more: true
      };
      
      expect(response.next_page_token).toBe('abc123');
    });
  });

  describe('TopFeed', () => {
    test('TopFeed has additional owner/category fields', () => {
      const topFeed: TopFeed = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        category_id: null,
        name: 'Test Feed',
        description: null,
        image_cid: null,
        is_active: true,
        total_entries: 5,
        total_purchases: 10,
        total_revenue: '1000',
        tags: null,
        created_at: 1234567890,
        updated_at: 1234567890,
        owner_wallet: '0x1234567890123456789012345678901234567890',
        owner_username: 'testuser',
        category_name: 'Business'
      };
      
      expect(topFeed.owner_wallet).toBeDefined();
      expect(topFeed.owner_username).toBeDefined();
      expect(topFeed.category_name).toBeDefined();
    });
  });

  describe('LeaderboardPeriod', () => {
    test('LeaderboardPeriod accepts valid values', () => {
      const periods: LeaderboardPeriod[] = ['1d', '7d', '30d', 'all'];
      expect(periods).toHaveLength(4);
    });
  });

  describe('Transaction', () => {
    test('Transaction type has required fields', () => {
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
      expect(tx.amount).toBeDefined();
      expect(tx.transaction_hash).toBeDefined();
    });
  });
});

