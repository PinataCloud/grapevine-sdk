import type { 
  Feed, 
  CreateFeedInput, 
  UpdateFeedInput, 
  ListFeedsQuery, 
  PaginatedResponse,
  ApiPaginatedResponse
} from '../types.js';
import type { GrapevineClient } from '../client.js';
import { 
  validateRequiredString,
  validateOptionalString,
  validateOptionalUUID,
  validateOptionalURL,
  validateOptionalStringArray,
  validateOptionalBoolean
} from '../validation.js';
import { ContentError, ConfigError, ErrorCode } from '../errors.js';

export class FeedsResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Create a new feed
   * Automatically handles authentication and payment
   */
  async create(input: CreateFeedInput): Promise<Feed> {
    // Validate required fields
    const name = validateRequiredString('name', input.name);
    
    // Validate optional fields - these will throw helpful errors for invalid values
    const description = validateOptionalString('description', input.description);
    const category_id = validateOptionalUUID('category_id', input.category_id, 'category');
    const tags = validateOptionalStringArray('tags', input.tags);
    
    // Handle image content validation - similar to entry content validation
    const imageOptionsCount = [input.image, input.image_base64, input.image_url].filter(Boolean).length;
    if (imageOptionsCount > 1) {
      throw new ConfigError(
        'Cannot provide multiple image fields',
        ErrorCode.CONFIG_CONFLICTING,
        {
          suggestion: 'Choose only one: image (raw), image_base64 (pre-encoded), or image_url (legacy)',
          example: `// ✅ Choose one option
{
  name: 'My Feed',
  image: fileBlob  // Raw image - SDK will encode
}
// OR
{
  name: 'My Feed', 
  image_base64: 'iVBORw0...'  // Pre-encoded base64
}
// OR
{
  name: 'My Feed',
  image_url: 'https://example.com/image.jpg'  // Legacy URL
}`,
          context: {
            providedFields: [
              input.image && 'image',
              input.image_base64 && 'image_base64', 
              input.image_url && 'image_url'
            ].filter(Boolean)
          }
        }
      );
    }
    
    // Validate base64 image format if provided
    if (input.image_base64) {
      if (typeof input.image_base64 !== 'string') {
        throw new ContentError(
          'image_base64 must be a string',
          ErrorCode.CONTENT_INVALID,
          {
            suggestion: 'Ensure your base64 conversion returns a string',
            context: { providedType: typeof input.image_base64 }
          }
        );
      }
      
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(input.image_base64)) {
        throw ContentError.invalidBase64();
      }
    }
    
    const image_url = validateOptionalURL('image_url', input.image_url);
    
    // Handle image encoding with proper error boundaries
    let imageBase64: string | undefined;
    try {
      if (input.image_base64) {
        imageBase64 = input.image_base64;
      } else if (input.image) {
        imageBase64 = await this.encodeImageToBase64(input.image);
      }
    } catch (error) {
      if (error instanceof ContentError) {
        throw error;
      }
      throw ContentError.processingFailed('image encoding', error as Error);
    }
    
    // Build validated payload (only include defined values)
    const validatedInput: any = { name };
    if (description !== undefined) validatedInput.description = description;
    if (category_id !== undefined) validatedInput.category_id = category_id;
    if (image_url !== undefined) validatedInput.image_url = image_url;
    if (imageBase64 !== undefined) validatedInput.image_base64 = imageBase64;
    if (tags !== undefined) validatedInput.tags = tags;

    const response = await this.client.request('/v1/feeds', {
      method: 'POST',
      body: JSON.stringify(validatedInput),
      requiresAuth: true,
      handlePayment: true
    });

    return response.json();
  }

  /**
   * Get a specific feed by ID
   * No authentication required
   */
  async get(feedId: string): Promise<Feed> {
    const response = await this.client.request(`/v1/feeds/${feedId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * List feeds with optional filters
   * No authentication required
   */
  async list(query?: ListFeedsQuery): Promise<PaginatedResponse<Feed>> {
    const params = new URLSearchParams();
    
    if (query) {
      // Validate query parameters - these will throw helpful errors for invalid values
      const owner_id = validateOptionalUUID('owner_id', query.owner_id, 'wallet owner');
      const owner_wallet_address = validateOptionalString('owner_wallet_address', query.owner_wallet_address);
      const category = validateOptionalUUID('category', query.category, 'category');
      const tags = validateOptionalStringArray('tags', query.tags);
      const page_token = validateOptionalString('page_token', query.page_token);
      const is_active = validateOptionalBoolean('is_active', query.is_active);

      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (page_token) params.append('page_token', page_token);
      if (owner_id) params.append('owner_id', owner_id);
      if (owner_wallet_address) params.append('owner_wallet_address', owner_wallet_address);
      if (category) params.append('category', category);
      if (tags) tags.forEach(tag => params.append('tags', tag));
      if (query.min_entries) params.append('min_entries', query.min_entries.toString());
      if (query.min_age) params.append('min_age', query.min_age.toString());
      if (query.max_age) params.append('max_age', query.max_age.toString());
      if (is_active !== undefined) params.append('is_active', is_active.toString());
    }

    const url = `/v1/feeds${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.client.request(url, {
      method: 'GET',
      requiresAuth: false
    });

    const apiResponse = await response.json() as ApiPaginatedResponse<Feed>;
    
    // API confirmed to use 'data' field format - direct HTTP testing verified this
    const feeds = apiResponse.data || [];
    const pagination = apiResponse.pagination || { page_size: 20, next_page_token: null, has_more: false };
    
    return {
      data: feeds,
      next_page_token: pagination.next_page_token || undefined,
      total_count: feeds.length // API doesn't provide total_count, use current batch size
    };
  }

  /**
   * Update an existing feed
   * Requires authentication and ownership
   */
  async update(feedId: string, input: UpdateFeedInput): Promise<Feed> {
    // Validate feed ID
    validateRequiredString('feedId', feedId);
    
    // Validate optional fields - these will throw helpful errors for invalid values
    const name = validateOptionalString('name', input.name);
    const description = validateOptionalString('description', input.description);
    const category_id = validateOptionalUUID('category_id', input.category_id, 'category');
    const tags = validateOptionalStringArray('tags', input.tags);
    const is_active = validateOptionalBoolean('is_active', input.is_active);
    
    // Handle image content validation - similar to entry content validation
    const imageOptionsCount = [input.image, input.image_base64, input.image_url].filter(Boolean).length;
    if (imageOptionsCount > 1) {
      throw new ConfigError(
        'Cannot provide multiple image fields',
        ErrorCode.CONFIG_CONFLICTING,
        {
          suggestion: 'Choose only one: image (raw), image_base64 (pre-encoded), or image_url (legacy)',
          example: `// ✅ Choose one option
{
  name: 'My Feed',
  image: fileBlob  // Raw image - SDK will encode
}
// OR
{
  name: 'My Feed', 
  image_base64: 'iVBORw0...'  // Pre-encoded base64
}
// OR
{
  name: 'My Feed',
  image_url: 'https://example.com/image.jpg'  // Legacy URL
}`,
          context: {
            providedFields: [
              input.image && 'image',
              input.image_base64 && 'image_base64', 
              input.image_url && 'image_url'
            ].filter(Boolean)
          }
        }
      );
    }
    
    // Validate base64 image format if provided
    if (input.image_base64) {
      if (typeof input.image_base64 !== 'string') {
        throw new ContentError(
          'image_base64 must be a string',
          ErrorCode.CONTENT_INVALID,
          {
            suggestion: 'Ensure your base64 conversion returns a string',
            context: { providedType: typeof input.image_base64 }
          }
        );
      }
      
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(input.image_base64)) {
        throw ContentError.invalidBase64();
      }
    }
    
    const image_url = validateOptionalURL('image_url', input.image_url);
    
    // Handle image encoding with proper error boundaries
    let imageBase64: string | undefined;
    try {
      if (input.image_base64) {
        imageBase64 = input.image_base64;
      } else if (input.image) {
        imageBase64 = await this.encodeImageToBase64(input.image);
      }
    } catch (error) {
      if (error instanceof ContentError) {
        throw error;
      }
      throw ContentError.processingFailed('image encoding', error as Error);
    }
    
    // Build validated payload (only include defined values)
    const validatedInput: any = {};
    if (name !== undefined) validatedInput.name = name;
    if (description !== undefined) validatedInput.description = description;
    if (category_id !== undefined) validatedInput.category_id = category_id;
    if (image_url !== undefined) validatedInput.image_url = image_url;
    if (imageBase64 !== undefined) validatedInput.image_base64 = imageBase64;
    if (tags !== undefined) validatedInput.tags = tags;
    if (is_active !== undefined) validatedInput.is_active = is_active;

    const response = await this.client.request(`/v1/feeds/${feedId}`, {
      method: 'PATCH',
      body: JSON.stringify(validatedInput),
      requiresAuth: true
    });

    return response.json();
  }

  /**
   * Delete a feed
   * Requires authentication and ownership
   */
  async delete(feedId: string): Promise<void> {
    await this.client.request(`/v1/feeds/${feedId}`, {
      method: 'DELETE',
      requiresAuth: true
    });
  }

  /**
   * Get feeds owned by the authenticated wallet
   * @throws {Error} If no wallet is configured
   */
  async myFeeds(): Promise<PaginatedResponse<Feed>> {
    const walletAddress = this.client.getWalletAddress(); // This will throw if no wallet configured
    return this.list({ owner_wallet_address: walletAddress });
  }

  /**
   * Helper to paginate through all feeds
   */
  async *paginate(query?: ListFeedsQuery, pageSize: number = 20): AsyncGenerator<Feed[]> {
    let pageToken: string | undefined;
    
    do {
      const response = await this.list({
        ...query,
        page_size: pageSize,
        page_token: pageToken
      });
      
      yield response.data;
      pageToken = response.next_page_token;
    } while (pageToken);
  }

  /**
   * Encode image content to base64 (browser-compatible)
   * Similar to the encoding logic in entries.ts
   */
  private async encodeImageToBase64(image: string | Blob | File | ArrayBuffer): Promise<string> {
    if (image instanceof Blob || image instanceof File) {
      // Browser binary content (Blob/File)
      const arrayBuffer = await image.arrayBuffer();
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
    } else if (image instanceof ArrayBuffer) {
      // Direct ArrayBuffer
      const bytes = new Uint8Array(image);
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
      // String content - assume it's already base64 or a data URL
      let imageStr = typeof image === 'string' ? image : String(image);
      
      // If it's a data URL, extract just the base64 part
      if (imageStr.startsWith('data:')) {
        const base64Index = imageStr.indexOf(',');
        if (base64Index !== -1) {
          imageStr = imageStr.substring(base64Index + 1);
        }
      }
      
      // Text-based base64 encoding for non-base64 strings
      if (typeof Buffer !== 'undefined' && Buffer.from) {
        // Node.js environment
        return Buffer.from(imageStr).toString('base64');
      } else {
        // Browser environment
        return btoa(unescape(encodeURIComponent(imageStr)));
      }
    }
  }
}