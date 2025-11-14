# Grapevine SDK

Easy-to-use SDK for the Grapevine API. Create and manage content feeds with built-in authentication and x402 micropayment handling.

## Features

✨ **Simple API** - Clean, intuitive interface for all operations  
🔐 **Built-in Authentication** - Automatic wallet-based auth handling  
💰 **Transparent Payments** - x402 micropayments handled automatically  
🎯 **Smart Defaults** - Auto-detect network, MIME types, and more  
📦 **Batch Operations** - Efficiently handle multiple entries  
🔧 **CLI Included** - Command-line interface for quick operations  
📝 **Full TypeScript Support** - Complete type definitions included  

## Installation

```bash
# Using Bun
bun add @grapevine/sdk

# Using npm
npm install @grapevine/sdk

# Using yarn
yarn add @grapevine/sdk
```

## Quick Start

```typescript
import { GrapevineClient } from '@grapevine/sdk';

// Initialize the SDK
const grapevine = new GrapevineClient({
  network: 'testnet',  // or 'mainnet'
  privateKey: process.env.PRIVATE_KEY
});

// Create a feed (one line!)
const feed = await grapevine.feeds.create({
  name: 'My Content Feed',
  description: 'Created with Grapevine SDK',
  tags: ['content', 'marketplace']
});

// Add an entry (auto-detects MIME type)
const entry = await grapevine.entries.create(feed.id, {
  content: 'Hello World!',
  title: 'First Entry',
  is_free: true
});

console.log(`Feed created: ${feed.id}`);
console.log(`Entry created: ${entry.id}`);
```

## Configuration

### Basic Configuration

```typescript
const grapevine = new GrapevineClient({
  network: 'testnet',  // 'testnet' or 'mainnet'
  privateKey: '0x...'  // Your wallet private key
});
```

### Auto-Detection

The SDK automatically detects the network from the API URL:

```typescript
// Explicitly set API URL
const grapevine = new GrapevineClient({
  apiUrl: 'https://api.grapevine.markets',  // Auto-detects testnet
  privateKey: '0x...'
});
```

### Environment Variables

Create a `.env` file:

```env
PRIVATE_KEY=0x_your_private_key_here
```

Then use:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const grapevine = new GrapevineClient({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY
});
```

## API Reference

### Feeds

#### Create Feed
```typescript
const feed = await grapevine.feeds.create({
  name: 'Feed Name',
  description: 'Optional description',
  tags: ['tag1', 'tag2'],
  category_id: 'category-uuid',  // Optional
  image_url: 'https://...'       // Optional
});
```

#### Get Feed
```typescript
const feed = await grapevine.feeds.get('feed-id');
```

#### List Feeds
```typescript
// List with filters
const feeds = await grapevine.feeds.list({
  owner_wallet_address: '0x...',
  tags: ['tech', 'ai'],
  min_entries: 10,
  is_active: true,
  page_size: 20
});

// Get your own feeds
const myFeeds = await grapevine.feeds.myFeeds();
```

#### Update Feed
```typescript
const updated = await grapevine.feeds.update('feed-id', {
  name: 'New Name',
  description: 'Updated description',
  is_active: false
});
```

#### Delete Feed
```typescript
await grapevine.feeds.delete('feed-id');
```

### Entries

#### Create Entry
```typescript
// Simple text entry
const entry = await grapevine.entries.create('feed-id', {
  content: 'Text content',
  title: 'Entry Title',
  is_free: true
});

// JSON data (auto-detected)
const jsonEntry = await grapevine.entries.create('feed-id', {
  content: { data: 'value' },  // Automatically encoded
  title: 'JSON Entry'
});

// Paid entry
const paidEntry = await grapevine.entries.create('feed-id', {
  content: 'Premium content',
  title: 'Premium Article',
  is_free: false,
  price: {
    amount: '1000000',  // 1 USDC
    currency: 'USDC'
  }
});

// With specific MIME type
const htmlEntry = await grapevine.entries.create('feed-id', {
  content: '<h1>HTML Content</h1>',
  mime_type: 'text/html',
  title: 'HTML Page'
});
```

#### Get Entry
```typescript
const entry = await grapevine.entries.get('feed-id', 'entry-id');
```

#### List Entries
```typescript
const entries = await grapevine.entries.list('feed-id', {
  is_free: true,
  tags: ['tutorial'],
  page_size: 50
});
```

#### Delete Entry
```typescript
await grapevine.entries.delete('feed-id', 'entry-id');
```

### Batch Operations

#### Batch Create Entries
```typescript
const results = await grapevine.entries.batchCreate(
  'feed-id',
  [
    { content: 'Entry 1', title: 'First' },
    { content: { data: 'json' }, title: 'Second' },
    { content: '# Markdown', title: 'Third' }
  ],
  {
    onProgress: (completed, total) => {
      console.log(`Progress: ${completed}/${total}`);
    },
    delayMs: 500  // Rate limiting delay
  }
);

console.log(`Created: ${results.successful.length}`);
console.log(`Failed: ${results.failed.length}`);
```

### Pagination

#### Paginate Through Feeds
```typescript
// Using async generator
for await (const batch of grapevine.feeds.paginate({ is_active: true }, 20)) {
  console.log(`Processing ${batch.length} feeds`);
  // Process batch
}
```

#### Paginate Through Entries
```typescript
for await (const batch of grapevine.entries.paginate('feed-id', { is_free: true })) {
  console.log(`Processing ${batch.length} entries`);
  // Process batch
}
```

### Categories

```typescript
const categories = await grapevine.getCategories();
categories.forEach(cat => {
  console.log(`${cat.name}: ${cat.description}`);
});
```

## CLI Usage

The SDK includes a command-line interface for quick operations.

### Installation
```bash
npm install -g @grapevine/sdk
# or
bun add -g @grapevine/sdk
```

### Authentication

Set your private key as an environment variable:

```bash
export PRIVATE_KEY="0xYourPrivateKeyHere"
```

Or use the `--key` flag with each command:

```bash
grapevine --key "0xYourPrivateKeyHere" feed create "My Feed"
```

### Commands

#### Create Feed
```bash
grapevine feed create "My Feed" --description "Test feed" --tags tech,ai
```

#### List Feeds
```bash
grapevine feed list --active --limit 10
grapevine feed list --owner 0xAddress --tags tech
```

#### Get Feed Details
```bash
grapevine feed get <feed-id>
```

#### Add Entry
```bash
# Add text
grapevine entry add <feed-id> "Hello World" --title "First Entry"

# Add from file
grapevine entry add <feed-id> ./content.md --file --mime text/markdown

# Add paid entry
grapevine entry add <feed-id> "Premium content" --paid --price 1000000
```

#### List Entries
```bash
grapevine entry list <feed-id> --free --limit 20
```

#### List Categories
```bash
grapevine categories
```

#### Show Info
```bash
grapevine info
```

### CLI Options
```bash
# Global options
--network <network>  # testnet or mainnet (default: testnet)
--key <key>         # Private key (or use PRIVATE_KEY env var)
--debug            # Enable debug output
```

## Advanced Usage

### Custom Network Configuration
```typescript
const grapevine = new GrapevineClient({
  apiUrl: 'https://custom-api.example.com',
  privateKey: '0x...'
});
```

### Debug Mode
```typescript
const grapevine = new GrapevineClient({
  network: 'testnet',
  privateKey: '0x...',
  debug: true  // Enables detailed logging
});
```

### Error Handling
```typescript
try {
  const feed = await grapevine.feeds.create({ name: 'Test' });
} catch (error) {
  if (error.message.includes('402')) {
    console.error('Payment required but not processed');
  } else if (error.message.includes('401')) {
    console.error('Authentication failed');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Examples

See the `examples` directory for complete examples:

- `basic-usage.ts` - Simple feed and entry creation
- `batch-operations.ts` - Batch operations and pagination

Run examples:
```bash
bun run examples/basic-usage.ts
bun run examples/batch-operations.ts
```

## Testing

### Get Test Tokens

For Base Sepolia testnet:
- ETH: https://www.alchemy.com/faucets/base-sepolia
- Test USDC: Bridge from Ethereum Sepolia or use a faucet

### Run Tests
```bash
bun test
```

## TypeScript Support

The SDK includes complete TypeScript definitions:

```typescript
import type {
  Feed,
  Entry,
  CreateFeedInput,
  CreateEntryInput,
  PaginatedResponse
} from '@grapevine/sdk';
```

## License

MIT