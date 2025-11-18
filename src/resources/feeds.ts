import type { 
  Feed, 
  CreateFeedInput, 
  UpdateFeedInput, 
  ListFeedsQuery, 
  PaginatedResponse,
  ApiPaginatedResponse
} from '../types.js';
import type { GrapevineClient } from '../client.js';

export class FeedsResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Create a new feed
   * Automatically handles authentication and payment
   */
  async create(input: CreateFeedInput): Promise<Feed> {
    const response = await this.client.request('/v1/feeds', {
      method: 'POST',
      body: JSON.stringify(input),
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
      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (query.page_token) params.append('page_token', query.page_token);
      if (query.owner_id) params.append('owner_id', query.owner_id);
      if (query.owner_wallet_address) params.append('owner_wallet_address', query.owner_wallet_address);
      if (query.category) params.append('category', query.category);
      if (query.tags) query.tags.forEach(tag => params.append('tags', tag));
      if (query.min_entries) params.append('min_entries', query.min_entries.toString());
      if (query.min_age) params.append('min_age', query.min_age.toString());
      if (query.max_age) params.append('max_age', query.max_age.toString());
      if (query.is_active !== undefined) params.append('is_active', query.is_active.toString());
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
    const response = await this.client.request(`/v1/feeds/${feedId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
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
   */
  async myFeeds(): Promise<PaginatedResponse<Feed>> {
    const walletAddress = this.client.getWalletAddress();
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
}