# Grapevine SDK

Easy-to-use SDK for the Grapevine API. Create and manage content feeds with built-in authentication and x402 micropayment handling.

## Features

✨ **Simple API** - Clean, intuitive interface for all operations  
🔐 **Flexible Authentication** - Private keys or wagmi wallet integration  
💰 **Transparent Payments** - x402 micropayments handled automatically  
🎯 **Smart Defaults** - Auto-detect network, MIME types, and more  
📦 **Batch Operations** - Efficiently handle multiple entries  
⚛️ **React Integration** - Built-in hooks for React apps with wagmi  
  
📝 **Full TypeScript Support** - Complete type definitions included  
🌐 **Browser Compatible** - Works in Node.js and browser environments  

## Installation

```bash
# Using Bun
bun add @pinata/grapevine-sdk

# Using npm
npm install @pinata/grapevine-sdk

# Using yarn
yarn add @pinata/grapevine-sdk
```

## Quick Start

### Private Key Authentication (Node.js)

```typescript
import { GrapevineClient } from '@pinata/grapevine-sdk';

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

### React + wagmi Integration

```tsx
import { useGrapevine } from '@pinata/grapevine-sdk/react';
import { useAccount, useWalletClient } from 'wagmi';

function MyComponent() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const grapevine = useGrapevine({
    walletClient,
    address,
    network: 'testnet',
    debug: true
  });
  
  const createFeed = async () => {
    if (!grapevine) return;
    
    const feed = await grapevine.feeds.create({
      name: 'My React Feed',
      description: 'Created with React and wagmi!',
      tags: ['react', 'wagmi']
    });
    
    console.log('Feed created:', feed.id);
  };
  
  return (
    <div>
      {grapevine ? (
        <button onClick={createFeed}>Create Feed</button>
      ) : (
        <p>Connect your wallet to get started</p>
      )}
    </div>
  );
}
```

## Configuration

### Private Key Configuration

```typescript
const grapevine = new GrapevineClient({
  network: 'testnet',  // 'testnet' or 'mainnet'
  privateKey: '0x...'  // Your wallet private key
});
```

### wagmi Integration Configuration

```typescript
import { GrapevineClient } from '@pinata/grapevine-sdk';
import { WagmiAdapter } from '@pinata/grapevine-sdk/adapters';

const wagmiAdapter = new WagmiAdapter(walletClient, address);
const grapevine = new GrapevineClient({
  network: 'testnet',
  walletAdapter: wagmiAdapter
});

// Or use the React hook (recommended for React apps)
const grapevine = useGrapevine({
  walletClient,
  address,
  network: 'testnet'
});
```

### Auto-Detection

The SDK automatically detects the network from configuration:

```typescript
// Explicitly set network
const grapevine = new GrapevineClient({
  network: 'mainnet',  // Uses https://api.grapevine.fyi
  privateKey: '0x...'
});

const grapevine2 = new GrapevineClient({
  network: 'testnet',  // Uses https://api.grapevine.markets
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

## React Integration

The SDK provides React hooks for seamless integration with wagmi-based applications.

### useGrapevine Hook

```tsx
import { useGrapevine } from '@pinata/grapevine-sdk/react';
import { useAccount, useWalletClient } from 'wagmi';

function MyApp() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const grapevine = useGrapevine({
    walletClient,
    address,
    network: 'testnet',
    debug: true
  });

  // grapevine will be null until wallet is connected
  // and undefined if there's an error during initialization
  if (!grapevine) {
    return <div>Connect your wallet to get started</div>;
  }

  return <FeedManager grapevine={grapevine} />;
}
```

### Example React Component

```tsx
import React, { useState, useEffect } from 'react';
import { useGrapevine } from '@pinata/grapevine-sdk/react';
import { useAccount, useWalletClient } from 'wagmi';

function FeedManager() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const grapevine = useGrapevine({
    walletClient,
    address,
    network: 'testnet'
  });
  
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMyFeeds = async () => {
    if (!grapevine) return;
    
    setLoading(true);
    try {
      const result = await grapevine.feeds.myFeeds();
      setFeeds(result.data);
    } catch (error) {
      console.error('Failed to load feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFeed = async () => {
    if (!grapevine) return;
    
    setLoading(true);
    try {
      await grapevine.feeds.create({
        name: `My Feed ${Date.now()}`,
        description: 'Created from React app',
        tags: ['react', 'demo']
      });
      await loadMyFeeds(); // Refresh list
    } catch (error) {
      console.error('Failed to create feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (grapevine) {
      loadMyFeeds();
    }
  }, [grapevine]);

  if (!grapevine) {
    return <div>Connect your wallet to manage feeds</div>;
  }

  return (
    <div>
      <button onClick={createFeed} disabled={loading}>
        {loading ? 'Creating...' : 'Create Feed'}
      </button>
      
      <div>
        <h3>My Feeds ({feeds.length})</h3>
        {feeds.map(feed => (
          <div key={feed.id}>
            <h4>{feed.name}</h4>
            <p>{feed.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
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

- `basic-usage.ts` - Simple feed and entry creation with private key
- `batch-operations.ts` - Batch operations and pagination  
- `wagmi-usage.tsx` - React component with wagmi integration

Run examples:
```bash
bun run examples/basic-usage.ts
bun run examples/batch-operations.ts
```

### React + wagmi Setup

For React applications, install the required dependencies:

```bash
# wagmi v2 and dependencies
npm install wagmi viem @tanstack/react-query

# Grapevine SDK
npm install @pinata/grapevine-sdk
```

See `examples/wagmi-usage.tsx` for a complete React component example.

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
  PaginatedResponse,
  GrapevineConfig
} from '@pinata/grapevine-sdk';

// React types
import type {
  GrapevineHookConfig
} from '@pinata/grapevine-sdk/react';

// Adapter types  
import type {
  WalletAdapter
} from '@pinata/grapevine-sdk/adapters';
```

## Project Structure

```
grapevine-sdk/
├── src/                     # TypeScript SDK source
│   ├── client.ts           # Main client class
│   ├── resources/          # API resource classes
│   ├── adapters/           # Wallet adapters (wagmi, private key)
│   ├── react/              # React hooks
│   └── types.ts            # TypeScript definitions
├── tests/                  # Test suites
│   ├── unit/              # SDK unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── dist/                   # Built TypeScript output
└── examples/              # Usage examples
```


## License

MIT