import mime from 'mime-types';
import type {
  Entry,
  CreateEntryInput,
  ListEntriesQuery,
  PaginatedResponse,
  ApiPaginatedResponse
} from '../types.js';
import type { GrapevineClient } from '../client.js';
import { 
  validateRequiredString,
  validateOptionalString,
  validateOptionalStringArray,
  validateOptionalTimestamp,
  validateOptionalBoolean,
} from '../validation.js';
import { ContentError, ErrorCode } from '../errors.js';

export class EntriesResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Create a new entry in a feed
   * Automatically handles authentication and content encoding
   */
  async create(feedId: string, input: CreateEntryInput): Promise<Entry> {
    // Validate required fields
    validateRequiredString('feedId', feedId);
    
    // Enhanced content validation with detailed error messages
    if (!input.content && !input.content_base64) {
      throw ContentError.contentRequired();
    }
    if (input.content && input.content_base64) {
      throw ContentError.bothContentProvided();
    }
    if (input.content !== undefined && (input.content === null || input.content === '')) {
      throw ContentError.contentEmpty('content');
    }
    if (input.content_base64 !== undefined && (input.content_base64 === null || input.content_base64 === undefined || input.content_base64 === '')) {
      throw ContentError.contentEmpty('content_base64');
    }
    
    // Validate base64 format if provided
    if (input.content_base64) {
      if (typeof input.content_base64 !== 'string') {
        throw new ContentError(
          'content_base64 must be a string',
          ErrorCode.CONTENT_INVALID,
          {
            suggestion: 'Ensure your base64 conversion returns a string',
            context: { providedType: typeof input.content_base64 }
          }
        );
      }
      
      // Basic base64 format validation
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(input.content_base64)) {
        throw ContentError.invalidBase64();
      }
    }
    
    // Validate optional fields - these will throw helpful errors for invalid values
    const title = validateOptionalString('title', input.title);
    const description = validateOptionalString('description', input.description);
    const mime_type = validateOptionalString('mime_type', input.mime_type);
    const tags = validateOptionalStringArray('tags', input.tags);
    const expires_at = validateOptionalTimestamp('expires_at', input.expires_at);
    const is_free = validateOptionalBoolean('is_free', input.is_free);
    // Auto-detect MIME type if not provided
    let mimeType = mime_type;
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

    // Handle content encoding with proper error boundaries
    let contentBase64: string;
    
    try {
      if (input.content_base64) {
        // Use pre-encoded base64 content directly
        contentBase64 = input.content_base64;
      } else if (input.content) {
        // Convert raw content to base64 (browser-compatible)
        contentBase64 = await this.encodeContentToBase64(input.content);
      } else {
        // This should never happen due to validation above, but just in case
        throw ContentError.contentRequired();
      }
    } catch (error) {
      // Wrap any encoding errors with helpful context
      if (error instanceof ContentError) {
        throw error; // Re-throw our own errors
      }
      throw ContentError.processingFailed('content encoding', error as Error);
    }

    // Build entry data using validated values
    const entryData: any = {
      content_base64: contentBase64,
      mime_type: mimeType,
      tags: tags || [],
      is_free: is_free !== false // default to free
    };
    
    // Only include optional fields if they are defined
    if (title !== undefined) entryData.title = title;
    if (description !== undefined) entryData.description = description;
    if (expires_at !== undefined) entryData.expires_at = expires_at;

    if (input.metadata) {
      entryData.metadata = JSON.stringify(input.metadata);
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
      requiresAuth: true
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
    // Validate required feed ID
    validateRequiredString('feedId', feedId);
    
    const params = new URLSearchParams();
    
    if (query) {
      // Validate query parameters - these will throw helpful errors for invalid values
      const page_token = validateOptionalString('page_token', query.page_token);
      const is_free = validateOptionalBoolean('is_free', query.is_free);

      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (page_token) params.append('page_token', page_token);
      if (is_free !== undefined) params.append('is_free', is_free.toString());
    }

    const url = `/v1/feeds/${feedId}/entries${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.client.request(url, {
      method: 'GET',
      requiresAuth: false
    });

    const apiResponse = await response.json() as ApiPaginatedResponse<Entry>;
    
    // API confirmed to use 'data' field format - direct HTTP testing verified this
    const entries = apiResponse.data || [];
    const pagination = apiResponse.pagination || { page_size: 20, next_page_token: null, has_more: false };
    
    return {
      data: entries,
      next_page_token: pagination.next_page_token || undefined,
      has_more: pagination.has_more
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
  
  /**
   * Encode content to base64 with proper error handling
   * @private
   */
  private async encodeContentToBase64(content: string | Buffer | Blob | File | ArrayBuffer | object): Promise<string> {
    try {
      if (content instanceof Blob || content instanceof File) {
        // Browser binary content (Blob/File)
        const arrayBuffer = await content.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        if (typeof Buffer !== 'undefined' && Buffer.from) {
          // Node.js environment
          return Buffer.from(bytes).toString('base64');
        } else {
          // Browser environment - convert bytes to binary string then base64
          let binaryString = '';
          for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
          }
          return btoa(binaryString);
        }
      } else if (content instanceof ArrayBuffer) {
        // Direct ArrayBuffer
        const bytes = new Uint8Array(content);
        if (typeof Buffer !== 'undefined' && Buffer.from) {
          // Node.js environment
          return Buffer.from(bytes).toString('base64');
        } else {
          // Browser environment - convert bytes to binary string then base64
          let binaryString = '';
          for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
          }
          return btoa(binaryString);
        }
      } else {
        // String, Buffer, or object content
        let contentStr: string;
        if (typeof content === 'object') {
          contentStr = JSON.stringify(content);
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(content)) {
          // Node.js Buffer
          contentStr = content.toString();
        } else {
          // String content
          contentStr = content as string;
        }

        // Text-based base64 encoding
        if (typeof Buffer !== 'undefined' && Buffer.from) {
          // Node.js environment
          return Buffer.from(contentStr).toString('base64');
        } else {
          // Browser environment
          return btoa(unescape(encodeURIComponent(contentStr)));
        }
      }
    } catch (error) {
      // This catches native errors from btoa(), Buffer operations, etc.
      throw ContentError.processingFailed('base64 encoding', error as Error);
    }
  }
}