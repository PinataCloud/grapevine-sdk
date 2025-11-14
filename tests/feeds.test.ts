import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { FeedsResource } from '../src/resources/feeds.js';
import type { GrapevineClient } from '../src/client.js';
import type { CreateFeedInput, UpdateFeedInput, ListFeedsQuery } from '../src/types.js';

describe('FeedsResource', () => {
  let feedsResource: FeedsResource;
  let mockClient: any;
  let mockRequest: any;

  const mockFeed = {
    id: 'feed-123',
    title: 'Test Feed',
    description: 'A test feed',
    owner_id: 'owner-123',
    owner_wallet_address: '0x' + '1'.repeat(40),
    category: 'technology',
    tags: ['test', 'demo'],
    entries_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
    metadata: {}
  };

  beforeEach(() => {
    mockRequest = mock((path: string, options: any) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFeed)
      });
    });

    mockClient = {
      request: mockRequest,
      getWalletAddress: () => '0x' + '1'.repeat(40)
    };

    feedsResource = new FeedsResource(mockClient as GrapevineClient);
  });

  describe('create', () => {
    it('should create a new feed with authentication and payment handling', async () => {
      const input: CreateFeedInput = {
        title: 'New Feed',
        description: 'A new test feed',
        category: 'technology',
        tags: ['new', 'test']
      };

      const result = await feedsResource.create(input);

      expect(mockRequest).toHaveBeenCalledWith('/v1/feeds', {
        method: 'POST',
        body: JSON.stringify(input),
        requiresAuth: true,
        handlePayment: true
      });
      expect(result).toEqual(mockFeed);
    });
  });

  describe('get', () => {
    it('should fetch a feed by ID without authentication', async () => {
      const feedId = 'feed-123';
      const result = await feedsResource.get(feedId);

      expect(mockRequest).toHaveBeenCalledWith(`/v1/feeds/${feedId}`, {
        method: 'GET',
        requiresAuth: false
      });
      expect(result).toEqual(mockFeed);
    });
  });

  describe('list', () => {
    it('should list feeds without filters', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          feeds: [mockFeed],
          next_page_token: 'next-token',
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      const result = await feedsResource.list();

      expect(mockRequest).toHaveBeenCalledWith('/v1/feeds', {
        method: 'GET',
        requiresAuth: false
      });
      expect(result).toEqual({
        data: [mockFeed],
        next_page_token: 'next-token',
        total_count: 1
      });
    });

    it('should list feeds with all query filters', async () => {
      const query: ListFeedsQuery = {
        page_size: 10,
        page_token: 'token-123',
        owner_id: 'owner-123',
        owner_wallet_address: '0x' + '2'.repeat(40),
        category: 'technology',
        tags: ['tag1', 'tag2'],
        min_entries: 5,
        min_age: 86400,
        max_age: 604800,
        is_active: true
      };

      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          feeds: [mockFeed],
          next_page_token: 'next-token',
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      await feedsResource.list(query);

      const expectedUrl = '/v1/feeds?page_size=10&page_token=token-123' +
        '&owner_id=owner-123&owner_wallet_address=' + '0x' + '2'.repeat(40) +
        '&category=technology&tags=tag1&tags=tag2&min_entries=5' +
        '&min_age=86400&max_age=604800&is_active=true';

      expect(mockRequest).toHaveBeenCalledWith(expectedUrl, {
        method: 'GET',
        requiresAuth: false
      });
    });

    it('should handle empty feeds response', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      }));
      mockClient.request = mockRequest;

      const result = await feedsResource.list();

      expect(result).toEqual({
        data: [],
        next_page_token: undefined,
        total_count: 0
      });
    });
  });

  describe('update', () => {
    it('should update an existing feed with authentication', async () => {
      const feedId = 'feed-123';
      const input: UpdateFeedInput = {
        title: 'Updated Feed',
        description: 'Updated description',
        tags: ['updated']
      };

      const result = await feedsResource.update(feedId, input);

      expect(mockRequest).toHaveBeenCalledWith(`/v1/feeds/${feedId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
        requiresAuth: true
      });
      expect(result).toEqual(mockFeed);
    });
  });

  describe('delete', () => {
    it('should delete a feed with authentication', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 204
      }));
      mockClient.request = mockRequest;

      const feedId = 'feed-123';
      await feedsResource.delete(feedId);

      expect(mockRequest).toHaveBeenCalledWith(`/v1/feeds/${feedId}`, {
        method: 'DELETE',
        requiresAuth: true
      });
    });
  });

  describe('myFeeds', () => {
    it('should list feeds owned by authenticated wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40);
      mockClient.getWalletAddress = () => walletAddress;

      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          feeds: [mockFeed],
          next_page_token: null,
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      const result = await feedsResource.myFeeds();

      expect(mockRequest).toHaveBeenCalledWith(
        `/v1/feeds?owner_wallet_address=${walletAddress}`,
        {
          method: 'GET',
          requiresAuth: false
        }
      );
      expect(result.data).toEqual([mockFeed]);
    });
  });

  describe('paginate', () => {
    it('should paginate through all feeds', async () => {
      const feeds1 = [{ ...mockFeed, id: 'feed-1' }];
      const feeds2 = [{ ...mockFeed, id: 'feed-2' }];
      const feeds3 = [{ ...mockFeed, id: 'feed-3' }];

      let callCount = 0;
      mockRequest = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              feeds: feeds1,
              next_page_token: 'token-2',
              total_count: 3
            })
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              feeds: feeds2,
              next_page_token: 'token-3',
              total_count: 3
            })
          });
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              feeds: feeds3,
              next_page_token: null,
              total_count: 3
            })
          });
        }
      });
      mockClient.request = mockRequest;

      const results = [];
      for await (const batch of feedsResource.paginate({}, 1)) {
        results.push(batch);
      }

      expect(results).toEqual([feeds1, feeds2, feeds3]);
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should paginate with custom query and page size', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          feeds: [mockFeed],
          next_page_token: null,
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      const query: ListFeedsQuery = { category: 'technology' };
      const results = [];
      
      for await (const batch of feedsResource.paginate(query, 50)) {
        results.push(batch);
      }

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds?category=technology&page_size=50',
        {
          method: 'GET',
          requiresAuth: false
        }
      );
      expect(results).toEqual([[mockFeed]]);
    });
  });
});