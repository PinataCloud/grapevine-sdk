import type { 
  TrendingFeed,
  PopularFeed,
  TopBuyer,
  TopProvider,
  CategoryStats,
  RecentEntry,
  TopRevenueFeed,
  LeaderboardResponse,
  LeaderboardPeriodQuery,
  LeaderboardBaseQuery,
  ApiPaginatedResponse,
  PaginatedResponse,
  TopFeed
} from '../types.js';
import type { GrapevineClient } from '../client.js';
import { 
  validateOptionalString,
} from '../validation.js';

export class LeaderboardsResource {
  constructor(private client: GrapevineClient) {}

  /**
   * Get trending feeds based on revenue velocity
   */
  async trending(query?: LeaderboardBaseQuery): Promise<LeaderboardResponse<TrendingFeed>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());

    const response = await this.client.request(`/v1/leaderboards/trending?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get most popular feeds by purchase count
   */
  async mostPopular(query?: LeaderboardPeriodQuery): Promise<LeaderboardResponse<PopularFeed>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());
    if (query?.period) params.append('period', query.period);

    const response = await this.client.request(`/v1/leaderboards/most-popular?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get top buyers by purchase volume
   */
  async topBuyers(query?: LeaderboardPeriodQuery): Promise<LeaderboardResponse<TopBuyer>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());
    if (query?.period) params.append('period', query.period);

    const response = await this.client.request(`/v1/leaderboards/top-buyers?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get top providers by revenue
   */
  async topProviders(query?: LeaderboardPeriodQuery): Promise<LeaderboardResponse<TopProvider>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());
    if (query?.period) params.append('period', query.period);

    const response = await this.client.request(`/v1/leaderboards/top-providers?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get category statistics
   */
  async categoryStats(): Promise<LeaderboardResponse<CategoryStats>> {
    const response = await this.client.request('/v1/leaderboards/category-stats', {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get most recent entries across all feeds
   */
  async recentEntries(query?: { page_size?: number; page_token?: string }): Promise<PaginatedResponse<RecentEntry>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());
    
    const page_token = validateOptionalString('page_token', query?.page_token);
    if (page_token) params.append('page_token', page_token);

    const response = await this.client.request(`/v1/leaderboards/recent-entries?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    const apiResponse = await response.json() as ApiPaginatedResponse<RecentEntry>;
    const entries = apiResponse.data || [];
    const pagination = apiResponse.pagination || { page_size: 20, next_page_token: null, has_more: false };

    return {
      data: entries,
      next_page_token: pagination.next_page_token || undefined,
      has_more: pagination.has_more
    };
  }

  /**
   * Get top feeds by total entry count
   * Returns feeds with additional owner and category info
   */
  async topFeeds(query?: LeaderboardBaseQuery): Promise<LeaderboardResponse<TopFeed>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());

    const response = await this.client.request(`/v1/leaderboards/top-feeds?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get top feeds by revenue
   */
  async topRevenue(query?: LeaderboardPeriodQuery): Promise<LeaderboardResponse<TopRevenueFeed>> {
    const params = new URLSearchParams();
    if (query?.page_size) params.append('page_size', query.page_size.toString());
    if (query?.period) params.append('period', query.period);

    const response = await this.client.request(`/v1/leaderboards/top-revenue?${params.toString()}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }
}
