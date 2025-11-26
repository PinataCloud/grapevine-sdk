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
  image_cid?: string;  // IPFS CID returned by API after pinning
  is_active: boolean;
  total_entries: number;
  total_purchases: number;
  total_revenue: string;
  tags: string[] | null;
  created_at: number;
  updated_at: number;
}

export interface CreateFeedInput {
  name: string;
  description?: string;
  tags?: string[];
  category_id?: string;
  /**
   * Image for the feed. Supports multiple formats:
   * 
   * 1. HTTP/HTTPS URL - A publicly accessible image URL
   * 2. Base64 Data URL - Inline image data (e.g., 'data:image/jpeg;base64,...')
   * 3. Raw Base64 - Just the base64 encoded image data
   * 
   * The API will process the image and return an `image_cid`.
   * 
   * @example
   * // HTTP URL
   * image_url: 'https://example.com/my-image.png'
   * 
   * // Base64 Data URL
   * image_url: 'data:image/jpeg;base64,/9j/4AAQSkZ...'
   * 
   * // Raw Base64
   * image_url: '/9j/4AAQSkZ...'
   */
  image_url?: string;
}

export interface UpdateFeedInput {
  name?: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  category_id?: string;
  /**
   * Image for the feed. Supports multiple formats:
   * 
   * 1. HTTP/HTTPS URL - A publicly accessible image URL
   * 2. Base64 Data URL - Inline image data (e.g., 'data:image/jpeg;base64,...')
   * 3. Raw Base64 - Just the base64 encoded image data
   * 
   * The API will process the image and return an `image_cid`.
   * 
   * @example
   * // HTTP URL
   * image_url: 'https://example.com/my-image.png'
   * 
   * // Base64 Data URL
   * image_url: 'data:image/jpeg;base64,/9j/4AAQSkZ...'
   * 
   * // Raw Base64
   * image_url: '/9j/4AAQSkZ...'
   */
  image_url?: string;
}

export interface Entry {
  id: string;
  feed_id: string;
  cid: string;
  mime_type: string;
  title?: string | null;
  description?: string | null;
  metadata?: string | null;
  tags: string[] | null;
  is_free: boolean;
  expires_at?: number | null;
  is_active: boolean;
  total_purchases: number;
  total_revenue: string;
  pinata_upload_id?: string | null;
  piid?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateEntryInput {
  // Either provide raw content (SDK will base64 encode it)
  content?: string | Buffer | Blob | File | ArrayBuffer | object;
  // OR provide pre-encoded base64 content (for advanced users)
  content_base64?: string;
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
}

export interface PaginatedResponse<T> {
  data: T[];
  next_page_token?: string;
  has_more: boolean;
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
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface ListCategoriesQuery {
  page_size?: number;
  page_token?: string;
  is_active?: boolean;
  search?: string;
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

// --- New Types for Full Coverage ---

// Network Types
export type WalletNetwork = 
  | 'base' 
  | 'base-sepolia' 
  | 'ethereum' 
  | 'ethereum-sepolia' 
  | 'polygon' 
  | 'polygon-amoy';

// Wallets
export interface Wallet {
  id: string;
  wallet_address: string;
  wallet_address_network: WalletNetwork;
  username: string | null;
  picture_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface UpdateWalletInput {
  username?: string;
  picture_url?: string;
}

export interface WalletStats {
  wallet_id: string;
  total_feeds_created: number;
  total_entries_published: number;
  total_revenue_earned: string;
  total_items_sold: number;
  unique_buyers_count: number;
  total_purchases_made: number;
  total_amount_spent: string;
  unique_feeds_purchased_from: number;
  revenue_rank?: number | null;
  purchases_rank?: number | null;
  last_calculated_at: number;
  created_at: number;
  updated_at: number;
}

// Transactions
export interface Transaction {
  id: string;
  piid?: string | null;
  payer: string;
  pay_to: string;
  amount: string;
  asset: string;
  entry_id?: string | null;
  transaction_hash: string;
  created_at: number;
}

export interface ListTransactionsQuery {
  page_size?: number;
  page_token?: string;
  payer?: string;
  pay_to?: string;
  entry_id?: string;
}

// Access Links
export interface AccessLink {
  url: string;
  expires_at: number;
}

// Leaderboards

export type LeaderboardPeriod = '1d' | '7d' | '30d' | 'all';

export interface LeaderboardBaseQuery {
  page_size?: number;
}

export interface LeaderboardPeriodQuery extends LeaderboardBaseQuery {
  period?: LeaderboardPeriod;
}

export interface LeaderboardResponse<T> {
  data: T[];
  period?: string;
}

export interface TrendingFeed {
  rank: string;
  id: string;
  owner_id: string;
  owner_wallet: string;
  owner_username?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  name: string;
  description?: string | null;
  image_cid?: string | null;
  is_active: boolean;
  total_entries: number;
  total_purchases: number;
  total_revenue: string;
  tags?: string[] | null;
  created_at: number;
  updated_at: number;
  purchases_last_7d: string;
  revenue_last_7d: string;
  unique_buyers_last_7d: string;
}

export interface PopularFeed {
  rank: string;
  id: string;
  feed: string;
  owner_id: string;
  owner_username?: string | null;
  owner_wallet: string;
  category_id?: string | null;
  category_name: string;
  description?: string | null;
  image_cid?: string | null;
  is_active: boolean;
  tags?: string[] | null;
  total_entries: number;
  total_purchases: string;
  total_revenue: string;
  unique_buyers: string;
  avg_revenue_per_purchase?: string | null;
  created_at: number;
  updated_at: number;
}

// Note: TopRevenueFeed is very similar to PopularFeed but has different timestamps
export interface TopRevenueFeed {
  rank: string;
  id: string;
  feed: string;
  owner_id: string;
  owner_username?: string | null;
  owner_wallet: string;
  category_id?: string | null;
  category_name: string;
  description?: string | null;
  image_cid?: string | null;
  is_active: boolean;
  tags?: string[] | null;
  total_entries: number;
  total_purchases: string;
  total_revenue: string;
  unique_buyers: string;
  feed_created_at: number;
  feed_updated_at: number;
}

export interface TopProvider {
  rank: string;
  user_id: string;
  username?: string | null;
  wallet_address: string;
  total_feeds: string;
  total_entries: string;
  total_purchases: string;
  total_revenue: string;
  unique_buyers: string;
  joined_at: number;
}

export interface TopBuyer {
  rank: string;
  user_id: string;
  username?: string | null;
  wallet_address: string;
  total_purchases: string;
  total_spent: string;
  unique_entries_purchased: string;
  unique_feeds_purchased_from: string;
  joined_at: number;
}

export interface CategoryStats {
  category_id: string;
  category_name: string;
  category_description: string | null;
  category_icon_url: string | null;
  total_feeds: string;
  total_providers: string;
  total_entries: string;
  total_purchases: string;
  total_revenue: string;
  unique_buyers: string;
  avg_purchase_amount: string;
}

// Top Feeds (from leaderboards) - extends Feed with additional joined fields
export interface TopFeed {
  id: string;
  owner_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_cid: string | null;
  is_active: boolean;
  total_entries: number;
  total_purchases: number;
  total_revenue: string;
  tags: string[] | null;
  created_at: number;
  updated_at: number;
  owner_wallet: string;
  owner_username: string | null;
  category_name: string | null;
}

export interface RecentEntry {
  id: string;
  feed_id: string;
  cid: string;
  mime_type: string;
  title?: string | null;
  description?: string | null;
  metadata?: string | null;
  tags?: string[] | null;
  price: string;
  asset: string;
  is_free: boolean;
  expires_at?: number | null;
  piid?: string | null;
  feed_name: string;
  feed_owner_id: string;
  owner_wallet: string;
  category_name: string;
  created_at: number;
  updated_at: number;
  pinata_upload_id?: string | null;
}
