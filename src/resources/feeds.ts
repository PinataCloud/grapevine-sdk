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
  validateOptionalStringArray,
  validateOptionalBoolean
} from '../validation.js';

export class FeedsResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Create a new feed
   * Automatically handles authentication and payment
   * 
   * @param input - Feed creation data
   * @param input.image_url - Image for the feed
   * 
   * Supports:
   * - HTTP/HTTPS URLs to publicly accessible images
   * - Base64 data URLs (e.g., 'data:image/jpeg;base64,...')
   * - Raw base64 encoded image data
   * 
   * The server will process the image and return an image_cid.
   */
  async create(input: CreateFeedInput): Promise<Feed> {
    // Validate required fields
    const name = validateRequiredString('name', input.name);
    
    // Validate optional fields - these will throw helpful errors for invalid values
    const description = validateOptionalString('description', input.description);
    const category_id = validateOptionalUUID('category_id', input.category_id, 'category');
    const tags = validateOptionalStringArray('tags', input.tags);
    
    // image_url accepts URLs or raw base64 - just validate it's a non-empty string
    const image_url = validateOptionalString('image_url', input.image_url);
    
    // Build validated payload (only include defined values)
    const validatedInput: any = { name };
    if (description !== undefined) validatedInput.description = description;
    if (category_id !== undefined) validatedInput.category_id = category_id;
    if (image_url !== undefined) validatedInput.image_url = image_url;
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
      const category = validateOptionalUUID('category', query.category, 'category');
      const tags = validateOptionalStringArray('tags', query.tags);
      const page_token = validateOptionalString('page_token', query.page_token);
      const is_active = validateOptionalBoolean('is_active', query.is_active);

      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (page_token) params.append('page_token', page_token);
      if (owner_id) params.append('owner_id', owner_id);
      if (category) params.append('category', category);
      // API expects tags as comma-separated string
      if (tags && tags.length > 0) params.append('tags', tags.join(','));
      if (query.min_entries !== undefined) params.append('min_entries', query.min_entries.toString());
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
      has_more: pagination.has_more
    };
  }

  /**
   * Update an existing feed
   * Requires authentication and ownership
   * 
   * @param input.image_url - Image for the feed
   * 
   * Supports:
   * - HTTP/HTTPS URLs to publicly accessible images
   * - Base64 data URLs (e.g., 'data:image/jpeg;base64,...')
   * - Raw base64 encoded image data
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
    
    // image_url accepts URLs or raw base64 - just validate it's a non-empty string
    const image_url = validateOptionalString('image_url', input.image_url);
    
    // Build validated payload (only include defined values)
    const validatedInput: any = {};
    if (name !== undefined) validatedInput.name = name;
    if (description !== undefined) validatedInput.description = description;
    if (category_id !== undefined) validatedInput.category_id = category_id;
    if (image_url !== undefined) validatedInput.image_url = image_url;
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
   * Requires looking up the wallet ID first, then filtering by owner_id
   * @throws {Error} If no wallet is configured
   */
  async myFeeds(query?: Omit<ListFeedsQuery, 'owner_id'>): Promise<PaginatedResponse<Feed>> {
    const walletAddress = this.client.getWalletAddress(); // This will throw if no wallet configured
    
    // Look up wallet to get owner_id
    const walletResponse = await this.client.request(`/v1/wallets/address/${walletAddress}`, {
      method: 'GET',
      requiresAuth: false
    });
    const wallet = await walletResponse.json() as { id: string };
    
    return this.list({ ...query, owner_id: wallet.id });
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
   * Create a private access link for a feed entry
   * Requires authentication (signature)
   */
  async createAccessLink(feedId: string, entryId: string): Promise<{ url: string; expires_at: number }> {
    validateRequiredString('feedId', feedId);
    validateRequiredString('entryId', entryId);

    const response = await this.client.request(`/v1/feeds/${feedId}/entries/${entryId}/access-link`, {
      method: 'POST',
      body: JSON.stringify({}),
      requiresAuth: true
    });

    return response.json();
  }

}