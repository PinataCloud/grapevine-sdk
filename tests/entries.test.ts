import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { EntriesResource } from '../src/resources/entries.js';
import type { GrapevineClient } from '../src/client.js';
import type { CreateEntryInput, ListEntriesQuery } from '../src/types.js';

describe('EntriesResource', () => {
  let entriesResource: EntriesResource;
  let mockClient: any;
  let mockRequest: any;

  const mockEntry = {
    id: 'entry-123',
    feed_id: 'feed-123',
    title: 'Test Entry',
    description: 'A test entry',
    content_base64: Buffer.from('Test content').toString('base64'),
    mime_type: 'text/plain',
    tags: ['test'],
    is_free: true,
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
        json: () => Promise.resolve(mockEntry)
      });
    });

    mockClient = {
      request: mockRequest,
      getNetwork: () => 'base-sepolia',
      getWalletAddress: () => '0x' + '1'.repeat(40)
    };

    entriesResource = new EntriesResource(mockClient as GrapevineClient);
  });

  describe('create', () => {
    it('should create entry with string content and auto-detect text/plain', async () => {
      const input: CreateEntryInput = {
        title: 'Test Entry',
        description: 'Test description',
        content: 'Plain text content',
        tags: ['test']
      };

      const result = await entriesResource.create('feed-123', input);

      const expectedBody = {
        content_base64: Buffer.from('Plain text content').toString('base64'),
        mime_type: 'text/plain',
        title: 'Test Entry',
        description: 'Test description',
        tags: ['test'],
        is_free: true
      };

      expect(mockRequest).toHaveBeenCalledWith('/v1/feeds/feed-123/entries', {
        method: 'POST',
        body: JSON.stringify(expectedBody),
        requiresAuth: true,
        handlePayment: true
      });
      expect(result).toEqual(mockEntry);
    });

    it('should auto-detect HTML mime type', async () => {
      const input: CreateEntryInput = {
        content: '<html><body>Test</body></html>'
      };

      await entriesResource.create('feed-123', input);

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"mime_type":"text/html"')
        })
      );
    });

    it('should auto-detect SVG mime type', async () => {
      const input: CreateEntryInput = {
        content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
      };

      await entriesResource.create('feed-123', input);

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"mime_type":"image/svg+xml"')
        })
      );
    });

    it('should auto-detect Markdown mime type', async () => {
      const input: CreateEntryInput = {
        content: '# Heading\n\nMarkdown content'
      };

      await entriesResource.create('feed-123', input);

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"mime_type":"text/markdown"')
        })
      );
    });

    it('should auto-detect JSON mime type for objects', async () => {
      const input: CreateEntryInput = {
        content: { key: 'value', nested: { data: 123 } }
      };

      await entriesResource.create('feed-123', input);

      const expectedContent = JSON.stringify({ key: 'value', nested: { data: 123 } });
      const expectedBase64 = Buffer.from(expectedContent).toString('base64');

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining(`"content_base64":"${expectedBase64}"`)
        })
      );
      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"mime_type":"application/json"')
        })
      );
    });

    it('should use provided mime type over auto-detection', async () => {
      const input: CreateEntryInput = {
        content: '# Markdown',
        mime_type: 'text/x-custom'
      };

      await entriesResource.create('feed-123', input);

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"mime_type":"text/x-custom"')
        })
      );
    });

    it('should handle Buffer content', async () => {
      const buffer = Buffer.from('Binary data');
      const input: CreateEntryInput = {
        content: buffer,
        mime_type: 'application/octet-stream'
      };

      const result = await entriesResource.create('feed-123', input);

      // Verify the call was made with correct endpoint
      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          method: 'POST',
          requiresAuth: true,
          handlePayment: true,
          body: expect.any(String) // Just verify body exists
        })
      );
      expect(result).toEqual(mockEntry);
    });

    it('should create paid entry with price', async () => {
      const input: CreateEntryInput = {
        content: 'Premium content',
        is_free: false,
        price: {
          amount: '1000000',
          currency: 'USDC'
        }
      };

      await entriesResource.create('feed-123', input);

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"is_free":false')
        })
      );
      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"price":{"amount":"1000000","currency":"USDC","network":"base-sepolia"}')
        })
      );
    });

    it('should include metadata and expiration', async () => {
      const input: CreateEntryInput = {
        content: 'Content',
        metadata: { custom: 'data', version: 2 },
        expires_at: '2024-12-31T23:59:59Z'
      };

      await entriesResource.create('feed-123', input);

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"metadata":"{\\"custom\\":\\"data\\",\\"version\\":2}"')
        })
      );
      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/feeds/feed-123/entries',
        expect.objectContaining({
          body: expect.stringContaining('"expires_at":"2024-12-31T23:59:59Z"')
        })
      );
    });
  });

  describe('get', () => {
    it('should fetch an entry by ID without authentication', async () => {
      const result = await entriesResource.get('feed-123', 'entry-123');

      expect(mockRequest).toHaveBeenCalledWith('/v1/feeds/feed-123/entries/entry-123', {
        method: 'GET',
        requiresAuth: false
      });
      expect(result).toEqual(mockEntry);
    });
  });

  describe('list', () => {
    it('should list entries without filters', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          entries: [mockEntry],
          next_page_token: 'next-token',
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      const result = await entriesResource.list('feed-123');

      expect(mockRequest).toHaveBeenCalledWith('/v1/feeds/feed-123/entries', {
        method: 'GET',
        requiresAuth: false
      });
      expect(result).toEqual({
        data: [mockEntry],
        next_page_token: 'next-token',
        total_count: 1
      });
    });

    it('should list entries with query filters', async () => {
      const query: ListEntriesQuery = {
        page_size: 10,
        page_token: 'token-123',
        is_free: true,
        is_active: false,
        tags: ['tag1', 'tag2']
      };

      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          entries: [mockEntry],
          next_page_token: 'next-token',
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      await entriesResource.list('feed-123', query);

      const expectedUrl = '/v1/feeds/feed-123/entries?page_size=10&page_token=token-123' +
        '&is_free=true&is_active=false&tags=tag1&tags=tag2';

      expect(mockRequest).toHaveBeenCalledWith(expectedUrl, {
        method: 'GET',
        requiresAuth: false
      });
    });

    it('should handle alternative response structure with data field', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: [mockEntry],
          next_page_token: 'next',
          pagination: { total: 5 }
        })
      }));
      mockClient.request = mockRequest;

      const result = await entriesResource.list('feed-123');

      expect(result).toEqual({
        data: [mockEntry],
        next_page_token: 'next',
        total_count: 5
      });
    });

    it('should handle empty entries response', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      }));
      mockClient.request = mockRequest;

      const result = await entriesResource.list('feed-123');

      expect(result).toEqual({
        data: [],
        next_page_token: undefined,
        total_count: 0
      });
    });
  });

  describe('delete', () => {
    it('should delete an entry with authentication', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 204
      }));
      mockClient.request = mockRequest;

      await entriesResource.delete('feed-123', 'entry-123');

      expect(mockRequest).toHaveBeenCalledWith('/v1/feeds/feed-123/entries/entry-123', {
        method: 'DELETE',
        requiresAuth: true
      });
    });
  });

  describe('batchCreate', () => {
    it('should batch create multiple entries successfully', async () => {
      const entries: CreateEntryInput[] = [
        { content: 'Entry 1' },
        { content: 'Entry 2' },
        { content: 'Entry 3' }
      ];

      let callCount = 0;
      mockRequest = mock(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ...mockEntry, id: `entry-${callCount}` })
        });
      });
      mockClient.request = mockRequest;

      const result = await entriesResource.batchCreate('feed-123', entries);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch create', async () => {
      const entries: CreateEntryInput[] = [
        { content: 'Entry 1' },
        { content: 'Entry 2' },
        { content: 'Entry 3' }
      ];

      let callCount = 0;
      mockRequest = mock(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Server error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ...mockEntry, id: `entry-${callCount}` })
        });
      });
      mockClient.request = mockRequest;

      const result = await entriesResource.batchCreate('feed-123', entries);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].input).toEqual(entries[1]);
      expect(result.failed[0].error).toBe('Server error');
    });

    it('should call progress callback', async () => {
      const entries: CreateEntryInput[] = [
        { content: 'Entry 1' },
        { content: 'Entry 2' }
      ];

      const progressCalls: Array<[number, number]> = [];
      const onProgress = (completed: number, total: number) => {
        progressCalls.push([completed, total]);
      };

      await entriesResource.batchCreate('feed-123', entries, { onProgress });

      expect(progressCalls).toEqual([[1, 2], [2, 2]]);
    });

    it('should apply rate limiting delay', async () => {
      const entries: CreateEntryInput[] = [
        { content: 'Entry 1' },
        { content: 'Entry 2' }
      ];

      const startTime = Date.now();
      await entriesResource.batchCreate('feed-123', entries, { delayMs: 100 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('paginate', () => {
    it('should paginate through all entries', async () => {
      const entries1 = [{ ...mockEntry, id: 'entry-1' }];
      const entries2 = [{ ...mockEntry, id: 'entry-2' }];

      let callCount = 0;
      mockRequest = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              entries: entries1,
              next_page_token: 'token-2',
              total_count: 2
            })
          });
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              entries: entries2,
              next_page_token: null,
              total_count: 2
            })
          });
        }
      });
      mockClient.request = mockRequest;

      const results = [];
      for await (const batch of entriesResource.paginate('feed-123', {}, 1)) {
        results.push(batch);
      }

      expect(results).toEqual([entries1, entries2]);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should paginate with query parameters', async () => {
      mockRequest = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          entries: [mockEntry],
          next_page_token: null,
          total_count: 1
        })
      }));
      mockClient.request = mockRequest;

      const query: ListEntriesQuery = { is_free: true };
      const results = [];
      
      for await (const batch of entriesResource.paginate('feed-123', query, 50)) {
        results.push(batch);
      }

      // Verify pagination worked correctly
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('/v1/feeds/feed-123/entries'),
        expect.objectContaining({
          method: 'GET',
          requiresAuth: false
        })
      );
      // Verify the URL contains our query parameters
      const calledUrl = mockRequest.mock.calls[0][0];
      expect(calledUrl).toContain('is_free=true');
      expect(calledUrl).toContain('page_size=50');
      expect(results).toEqual([[mockEntry]]);
    });
  });
});