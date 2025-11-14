import mime from 'mime-types';
import type {
  Entry,
  CreateEntryInput,
  ListEntriesQuery,
  PaginatedResponse
} from '../types.js';
import type { GrapevineClient } from '../client.js';

export class EntriesResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Create a new entry in a feed
   * Automatically handles authentication, payment, and content encoding
   */
  async create(feedId: string, input: CreateEntryInput): Promise<Entry> {
    // Auto-detect MIME type if not provided
    let mimeType = input.mime_type;
    if (!mimeType) {
      if (typeof input.content === 'object') {
        mimeType = 'application/json';
      } else if (typeof input.content === 'string') {
        // Try to detect based on content
        if (input.content.trim().startsWith('<')) {
          mimeType = input.content.includes('<svg') ? 'image/svg+xml' : 'text/html';
        } else if (input.content.trim().startsWith('#')) {
          mimeType = 'text/markdown';
        } else {
          mimeType = 'text/plain';
        }
      } else {
        mimeType = 'application/octet-stream';
      }
    }

    // Convert content to base64
    let contentStr: string;
    if (typeof input.content === 'object') {
      contentStr = JSON.stringify(input.content);
    } else if (Buffer.isBuffer(input.content)) {
      contentStr = input.content.toString();
    } else {
      contentStr = input.content;
    }
    const contentBase64 = Buffer.from(contentStr).toString('base64');

    // Build entry data
    const entryData: any = {
      content_base64: contentBase64,
      mime_type: mimeType,
      title: input.title,
      description: input.description,
      tags: input.tags || [],
      is_free: input.is_free !== false // default to free
    };

    if (input.metadata) {
      entryData.metadata = JSON.stringify(input.metadata);
    }

    if (input.expires_at) {
      entryData.expires_at = input.expires_at;
    }

    if (!input.is_free && input.price) {
      entryData.price = {
        amount: input.price.amount,
        currency: input.price.currency || 'USDC',
        network: this.client.getNetwork()
      };
    }

    const response = await this.client.request(`/v1/feeds/${feedId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entryData),
      requiresAuth: true,
      handlePayment: true
    });

    return response.json();
  }

  /**
   * Get a specific entry
   * No authentication required
   */
  async get(feedId: string, entryId: string): Promise<Entry> {
    const response = await this.client.request(`/v1/feeds/${feedId}/entries/${entryId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * List entries in a feed
   * No authentication required
   */
  async list(feedId: string, query?: ListEntriesQuery): Promise<PaginatedResponse<Entry>> {
    const params = new URLSearchParams();
    
    if (query) {
      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (query.page_token) params.append('page_token', query.page_token);
      if (query.is_free !== undefined) params.append('is_free', query.is_free.toString());
      if (query.is_active !== undefined) params.append('is_active', query.is_active.toString());
      if (query.tags) query.tags.forEach(tag => params.append('tags', tag));
    }

    const url = `/v1/feeds/${feedId}/entries${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.client.request(url, {
      method: 'GET',
      requiresAuth: false
    });

    const data = await response.json();
    return {
      data: data.entries || data.data || [],
      next_page_token: data.next_page_token,
      total_count: data.total_count || data.pagination?.total || 0
    };
  }

  /**
   * Delete an entry
   * Requires authentication and ownership
   */
  async delete(feedId: string, entryId: string): Promise<void> {
    await this.client.request(`/v1/feeds/${feedId}/entries/${entryId}`, {
      method: 'DELETE',
      requiresAuth: true
    });
  }

  /**
   * Batch create multiple entries
   * Handles rate limiting and errors gracefully
   */
  async batchCreate(
    feedId: string,
    entries: CreateEntryInput[],
    options?: {
      onProgress?: (completed: number, total: number) => void;
      delayMs?: number;
    }
  ): Promise<{ successful: Entry[]; failed: { input: CreateEntryInput; error: string }[] }> {
    const successful: Entry[] = [];
    const failed: { input: CreateEntryInput; error: string }[] = [];
    const total = entries.length;

    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = await this.create(feedId, entries[i]);
        successful.push(entry);
        
        if (options?.onProgress) {
          options.onProgress(i + 1, total);
        }

        // Rate limiting delay
        if (options?.delayMs && i < entries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs));
        }
      } catch (error) {
        failed.push({
          input: entries[i],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Helper to paginate through all entries
   */
  async *paginate(feedId: string, query?: ListEntriesQuery, pageSize: number = 20): AsyncGenerator<Entry[]> {
    let pageToken: string | undefined;
    
    do {
      const response = await this.list(feedId, {
        ...query,
        page_size: pageSize,
        page_token: pageToken
      });
      
      yield response.data;
      pageToken = response.next_page_token;
    } while (pageToken);
  }
}