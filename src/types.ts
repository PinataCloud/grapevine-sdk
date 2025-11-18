import type { WalletAdapter } from './adapters/wallet-adapter.js';

export type Network = 'testnet' | 'mainnet';

export interface GrapevineConfig {
  network?: Network;
  privateKey?: string;
  walletAdapter?: WalletAdapter;
  debug?: boolean;
}

export interface Feed {
  id: string;
  owner_id: string;
  owner_wallet_address: string;
  category_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  total_entries: number;
  total_purchases: number;
  total_revenue: string;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface CreateFeedInput {
  name: string;
  description?: string;
  tags?: string[];
  category_id?: string;
  image_url?: string;
}

export interface UpdateFeedInput {
  name?: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  category_id?: string;
  image_url?: string;
}

export interface Entry {
  id: string;
  feed_id: string;
  cid: string;
  mime_type: string;
  title?: string;
  description?: string;
  metadata?: string;
  tags: string[];
  is_free: boolean;
  expires_at?: number;
  is_active: boolean;
  total_purchases: number;
  total_revenue: string;
  created_at: number;
  updated_at: number;
}

export interface CreateEntryInput {
  content: string | Buffer | object;
  mime_type?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  is_free?: boolean;
  expires_at?: number;
  price?: {
    amount: string;
    currency: string;
  };
}

export interface ListFeedsQuery {
  page_size?: number;
  page_token?: string;
  owner_id?: string;
  owner_wallet_address?: string;
  category?: string;
  tags?: string[];
  min_entries?: number;
  min_age?: number;
  max_age?: number;
  is_active?: boolean;
}

export interface ListEntriesQuery {
  page_size?: number;
  page_token?: string;
  is_free?: boolean;
  is_active?: boolean;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  next_page_token?: string;
  total_count: number;
}

// Internal API response format matching actual API (confirmed by direct testing)
export interface ApiPaginationInfo {
  page_size: number;
  next_page_token: string | null;
  has_more: boolean;
}

// This matches the REAL API format (confirmed by direct HTTP calls)
export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: ApiPaginationInfo;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface AuthHeaders {
  'x-wallet-address': string;
  'x-signature': string;
  'x-message': string;
  'x-timestamp': string;
  'x-chain-id': string;
}

export interface PaymentRequirement {
  scheme: string;
  asset: string;
  network: string;
  maxAmountRequired: string;
}