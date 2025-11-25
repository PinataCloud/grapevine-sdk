import type { 
  Transaction, 
  ListTransactionsQuery, 
  PaginatedResponse,
  ApiPaginatedResponse 
} from '../types.js';
import type { GrapevineClient } from '../client.js';
import { 
  validateRequiredString,
  validateOptionalString,
} from '../validation.js';

export class TransactionsResource {
  constructor(private client: GrapevineClient) {}

  /**
   * List transactions with optional filtering
   * No authentication required
   */
  async list(query?: ListTransactionsQuery): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams();
    
    if (query) {
      const page_token = validateOptionalString('page_token', query.page_token);
      const payer = validateOptionalString('payer', query.payer);
      const pay_to = validateOptionalString('pay_to', query.pay_to);
      const entry_id = validateOptionalString('entry_id', query.entry_id);

      if (query.page_size) params.append('page_size', query.page_size.toString());
      if (page_token) params.append('page_token', page_token);
      if (payer) params.append('payer', payer);
      if (pay_to) params.append('pay_to', pay_to);
      if (entry_id) params.append('entry_id', entry_id);
    }

    const url = `/v1/transactions${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.client.request(url, {
      method: 'GET',
      requiresAuth: false
    });

    const apiResponse = await response.json() as ApiPaginatedResponse<Transaction>;
    
    const transactions = apiResponse.data || [];
    const pagination = apiResponse.pagination || { page_size: 20, next_page_token: null, has_more: false };
    
    return {
      data: transactions,
      next_page_token: pagination.next_page_token || undefined,
      has_more: pagination.has_more
    };
  }

  /**
   * Get transaction by ID
   * No authentication required
   */
  async get(id: string): Promise<Transaction> {
    validateRequiredString('id', id);

    const response = await this.client.request(`/v1/transactions/${id}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Get transaction by hash
   * No authentication required
   */
  async getByHash(hash: string): Promise<Transaction> {
    validateRequiredString('hash', hash);

    const response = await this.client.request(`/v1/transactions/hash/${hash}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response.json();
  }

  /**
   * Helper to paginate through all transactions
   */
  async *paginate(query?: ListTransactionsQuery, pageSize: number = 20): AsyncGenerator<Transaction[]> {
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
