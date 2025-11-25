import type { 
  Category, 
  ListCategoriesQuery, 
  PaginatedResponse,
  ApiPaginatedResponse
} from '../types.js';
import type { GrapevineClient } from '../client.js';
import { 
  validateRequiredString,
  validateOptionalString,
  validateOptionalBoolean
} from '../validation.js';

export class CategoriesResource {
  constructor(private client: GrapevineClient) {}

  /**
   * List categories with optional filtering
   * No authentication required
   */
  async list(query?: ListCategoriesQuery): Promise<PaginatedResponse<Category>> {
    const params = new URLSearchParams();
    
    if (query) {
      const page_token = validateOptionalString('page_token', query.page_token);
      const search = validateOptionalString('search', query.search);
      const is_active = validateOptionalBoolean('is_active', query.is_active);

      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (page_token) params.append('page_token', page_token);
      if (is_active !== undefined) params.append('is_active', is_active.toString());
      if (search) params.append('search', search);
    }

    const url = `/v1/categories${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.client.request(url, {
      method: 'GET',
      requiresAuth: false
    });

    const apiResponse = await response.json() as ApiPaginatedResponse<Category>;
    
    const categories = apiResponse.data || [];
    const pagination = apiResponse.pagination || { page_size: 20, next_page_token: null, has_more: false };
    
    return {
      data: categories,
      next_page_token: pagination.next_page_token || undefined,
      has_more: pagination.has_more
    };
  }

  /**
   * Get a specific category by ID
   * No authentication required
   */
  async get(categoryId: string): Promise<Category> {
    validateRequiredString('categoryId', categoryId);

    const response = await this.client.request(`/v1/categories/${categoryId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Helper to paginate through all categories
   */
  async *paginate(query?: ListCategoriesQuery, pageSize: number = 20): AsyncGenerator<Category[]> {
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
   * Get all categories (convenience method that fetches all pages)
   * Use with caution for large datasets
   */
  async getAll(query?: Omit<ListCategoriesQuery, 'page_token' | 'page_size'>): Promise<Category[]> {
    const allCategories: Category[] = [];
    
    for await (const batch of this.paginate(query, 100)) {
      allCategories.push(...batch);
    }
    
    return allCategories;
  }
}

