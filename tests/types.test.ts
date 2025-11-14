import { describe, it, expect } from 'bun:test';
import type {
  Network,
  GrapevineConfig,
  Feed,
  CreateFeedInput,
  UpdateFeedInput,
  Entry,
  CreateEntryInput,
  ListFeedsQuery,
  ListEntriesQuery,
  PaginatedResponse,
  Category,
  AuthHeaders,
  PaymentRequirement
} from '../src/types.js';

describe('Types', () => {
  describe('Network type', () => {
    it('should accept valid network values', () => {
      const testnet: Network = 'testnet';
      const mainnet: Network = 'mainnet';
      
      expect(testnet).toBe('testnet');
      expect(mainnet).toBe('mainnet');
    });
  });

  describe('GrapevineConfig', () => {
    it('should allow minimal config', () => {
      const config: GrapevineConfig = {};
      expect(config).toEqual({});
    });

    it('should accept all config options', () => {
      const config: GrapevineConfig = {
        network: 'mainnet',
        apiUrl: 'https://api.grapevine.fyi',
        privateKey: '0x' + '0'.repeat(64),
        debug: true
      };
      
      expect(config.network).toBe('mainnet');
      expect(config.apiUrl).toBe('https://api.grapevine.fyi');
      expect(config.privateKey).toBeDefined();
      expect(config.debug).toBe(true);
    });
  });

  describe('Feed type', () => {
    it('should have required fields', () => {
      const feed: Feed = {
        id: 'feed-123',
        owner_id: 'owner-123',
        owner_wallet_address: '0x' + '1'.repeat(40),
        name: 'Test Feed',
        is_active: true,
        total_entries: 10,
        total_purchases: 5,
        total_revenue: '1000000',
        tags: ['test'],
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      expect(feed.id).toBe('feed-123');
      expect(feed.owner_wallet_address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(feed.tags).toBeInstanceOf(Array);
    });

    it('should accept optional fields', () => {
      const feed: Feed = {
        id: 'feed-123',
        owner_id: 'owner-123',
        owner_wallet_address: '0x' + '1'.repeat(40),
        category_id: 'cat-123',
        name: 'Test Feed',
        description: 'A test feed',
        image_url: 'https://example.com/image.png',
        is_active: true,
        total_entries: 0,
        total_purchases: 0,
        total_revenue: '0',
        tags: [],
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      expect(feed.category_id).toBe('cat-123');
      expect(feed.description).toBe('A test feed');
      expect(feed.image_url).toBe('https://example.com/image.png');
    });
  });

  describe('CreateFeedInput', () => {
    it('should require only name', () => {
      const input: CreateFeedInput = {
        name: 'New Feed'
      };
      
      expect(input.name).toBe('New Feed');
      expect(input.description).toBeUndefined();
    });

    it('should accept all optional fields', () => {
      const input: CreateFeedInput = {
        name: 'New Feed',
        description: 'Description',
        tags: ['tag1', 'tag2'],
        category_id: 'cat-123',
        image_url: 'https://example.com/image.png'
      };
      
      expect(input.tags).toEqual(['tag1', 'tag2']);
      expect(input.category_id).toBe('cat-123');
    });
  });

  describe('UpdateFeedInput', () => {
    it('should allow partial updates', () => {
      const input1: UpdateFeedInput = { name: 'Updated Name' };
      const input2: UpdateFeedInput = { tags: ['new-tag'] };
      const input3: UpdateFeedInput = { is_active: false };
      
      expect(input1.name).toBe('Updated Name');
      expect(input2.tags).toEqual(['new-tag']);
      expect(input3.is_active).toBe(false);
    });

    it('should allow empty update', () => {
      const input: UpdateFeedInput = {};
      expect(input).toEqual({});
    });
  });

  describe('Entry type', () => {
    it('should have required fields', () => {
      const entry: Entry = {
        id: 'entry-123',
        feed_id: 'feed-123',
        cid: 'Qm' + 'a'.repeat(44),
        mime_type: 'text/plain',
        tags: [],
        is_free: true,
        is_active: true,
        total_purchases: 0,
        total_revenue: '0',
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      expect(entry.id).toBe('entry-123');
      expect(entry.cid).toMatch(/^Qm[a-zA-Z0-9]{44}$/);
      expect(entry.mime_type).toBe('text/plain');
    });

    it('should accept optional fields', () => {
      const entry: Entry = {
        id: 'entry-123',
        feed_id: 'feed-123',
        cid: 'Qm' + 'a'.repeat(44),
        mime_type: 'text/plain',
        title: 'Entry Title',
        description: 'Entry description',
        metadata: '{"custom": "data"}',
        tags: ['tag1'],
        is_free: false,
        expires_at: Date.now() + 86400000,
        is_active: true,
        total_purchases: 10,
        total_revenue: '10000000',
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      expect(entry.title).toBe('Entry Title');
      expect(entry.metadata).toBe('{"custom": "data"}');
      expect(entry.expires_at).toBeGreaterThan(Date.now());
    });
  });

  describe('CreateEntryInput', () => {
    it('should accept string content', () => {
      const input: CreateEntryInput = {
        content: 'Plain text content'
      };
      
      expect(input.content).toBe('Plain text content');
    });

    it('should accept Buffer content', () => {
      const buffer = Buffer.from('Binary data');
      const input: CreateEntryInput = {
        content: buffer
      };
      
      expect(input.content).toBe(buffer);
    });

    it('should accept object content', () => {
      const input: CreateEntryInput = {
        content: { data: 'structured', nested: { value: 123 } }
      };
      
      expect(input.content).toEqual({ data: 'structured', nested: { value: 123 } });
    });

    it('should accept all optional fields', () => {
      const input: CreateEntryInput = {
        content: 'Content',
        mime_type: 'text/markdown',
        title: 'Title',
        description: 'Description',
        metadata: { version: 1, author: 'test' },
        tags: ['tag1', 'tag2'],
        is_free: false,
        expires_at: Date.now() + 3600000,
        price: {
          amount: '1000000',
          currency: 'USDC'
        }
      };
      
      expect(input.mime_type).toBe('text/markdown');
      expect(input.metadata).toEqual({ version: 1, author: 'test' });
      expect(input.price?.amount).toBe('1000000');
      expect(input.price?.currency).toBe('USDC');
    });
  });

  describe('ListFeedsQuery', () => {
    it('should allow empty query', () => {
      const query: ListFeedsQuery = {};
      expect(query).toEqual({});
    });

    it('should accept all query parameters', () => {
      const query: ListFeedsQuery = {
        page_size: 20,
        page_token: 'token-123',
        owner_id: 'owner-123',
        owner_wallet_address: '0x' + '1'.repeat(40),
        category: 'technology',
        tags: ['tag1', 'tag2'],
        min_entries: 5,
        min_age: 86400,
        max_age: 604800,
        is_active: true
      };
      
      expect(query.page_size).toBe(20);
      expect(query.tags).toEqual(['tag1', 'tag2']);
      expect(query.min_age).toBe(86400);
    });
  });

  describe('ListEntriesQuery', () => {
    it('should allow empty query', () => {
      const query: ListEntriesQuery = {};
      expect(query).toEqual({});
    });

    it('should accept all query parameters', () => {
      const query: ListEntriesQuery = {
        page_size: 10,
        page_token: 'token-456',
        is_free: true,
        is_active: false,
        tags: ['tag1']
      };
      
      expect(query.page_size).toBe(10);
      expect(query.is_free).toBe(true);
      expect(query.is_active).toBe(false);
    });
  });

  describe('PaginatedResponse', () => {
    it('should handle response with data', () => {
      const response: PaginatedResponse<string> = {
        data: ['item1', 'item2'],
        next_page_token: 'next-token',
        total_count: 10
      };
      
      expect(response.data).toEqual(['item1', 'item2']);
      expect(response.next_page_token).toBe('next-token');
      expect(response.total_count).toBe(10);
    });

    it('should handle response without next token', () => {
      const response: PaginatedResponse<number> = {
        data: [1, 2, 3],
        total_count: 3
      };
      
      expect(response.data).toEqual([1, 2, 3]);
      expect(response.next_page_token).toBeUndefined();
    });
  });

  describe('Category', () => {
    it('should have required fields', () => {
      const category: Category = {
        id: 'cat-123',
        name: 'Technology'
      };
      
      expect(category.id).toBe('cat-123');
      expect(category.name).toBe('Technology');
    });

    it('should accept optional description', () => {
      const category: Category = {
        id: 'cat-123',
        name: 'Technology',
        description: 'Tech related content'
      };
      
      expect(category.description).toBe('Tech related content');
    });
  });

  describe('AuthHeaders', () => {
    it('should have all required headers', () => {
      const headers: AuthHeaders = {
        'x-wallet-address': '0x' + '1'.repeat(40),
        'x-signature': '0x' + 'a'.repeat(130),
        'x-message': 'Sign this message',
        'x-timestamp': '1234567890',
        'x-chain-id': '84532'
      };
      
      expect(headers['x-wallet-address']).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(headers['x-signature']).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(headers['x-message']).toBe('Sign this message');
      expect(headers['x-timestamp']).toBe('1234567890');
      expect(headers['x-chain-id']).toBe('84532');
    });
  });

  describe('PaymentRequirement', () => {
    it('should have all required fields', () => {
      const requirement: PaymentRequirement = {
        scheme: 'exact',
        asset: 'ETH',
        network: 'base-sepolia',
        maxAmountRequired: '1000000000000000'
      };
      
      expect(requirement.scheme).toBe('exact');
      expect(requirement.asset).toBe('ETH');
      expect(requirement.network).toBe('base-sepolia');
      expect(requirement.maxAmountRequired).toBe('1000000000000000');
    });
  });
});