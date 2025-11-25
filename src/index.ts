export { GrapevineClient } from './client.js';
export { FeedsResource } from './resources/feeds.js';
export { EntriesResource } from './resources/entries.js';
export { LeaderboardsResource } from './resources/leaderboards.js';
export { WalletsResource } from './resources/wallets.js';
export { TransactionsResource } from './resources/transactions.js';
export { CategoriesResource } from './resources/categories.js';
export { AuthManager } from './auth.js';
export { PaymentManager } from './payments.js';

// Export all types
export * from './types.js';

// Export error classes
export {
  GrapevineError,
  ErrorCode,
  ContentError,
  AuthError,
  ConfigError,
  ApiError,
  ValidationError
} from './errors.js';

// Export adapter types
export * from './adapters/wallet-adapter.js';
export { PrivateKeyAdapter } from './adapters/private-key-adapter.js';
export { WagmiAdapter } from './adapters/wagmi-adapter.js';
