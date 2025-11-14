// Main SDK export
export { GrapevineClient } from './client.js';
export { GrapevineClient as default } from './client.js';

// Export types
export type {
  Network,
  GrapevineConfig,
  Feed,
  CreateFeedInput,
  UpdateFeedInput,
  Entry,
  CreateEntryInput,
  ListFeedsQuery,
  ListEntriesQuery,
  PaginatedResponse,
  Category,
  AuthHeaders,
  PaymentRequirement
} from './types.js';

// Export resource classes if needed for advanced use
export { FeedsResource } from './resources/feeds.js';
export { EntriesResource } from './resources/entries.js';
export { AuthManager } from './auth.js';
export { PaymentManager } from './payments.js';