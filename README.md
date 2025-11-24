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
// Simple feed without category
const feed = await grapevine.feeds.create({
  name: 'My Feed',
  description: 'A simple feed',
  tags: ['example']
});

// Feed with category (must be valid UUID from /v1/categories)
const categories = await grapevine.getCategories();
const businessCategory = categories.find(c => c.name === 'Business');

const feedWithCategory = await grapevine.feeds.create({
  name: 'Categorized Feed',
  description: 'A feed with a category',
  tags: ['tag1', 'tag2'],
  category_id: businessCategory?.id,  // Optional - must be valid UUID from /v1/categories
  image_url: 'https://...'           // Optional
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
// Simple text entry (minimal required fields)
const entry = await grapevine.entries.create('feed-id', {
  content: 'Text content',
  // title is optional - omit if not needed
  // is_free defaults to true
});

// Entry with optional fields (proper way)
const entryWithDetails = await grapevine.entries.create('feed-id', {
  content: 'Text content',
  title: 'Entry Title',        // Optional string
  description: 'Description',  // Optional string  
  tags: ['news', 'update'],    // Optional array
  is_free: true               // Optional boolean
});

// ❌ Don't do this - empty strings for optional fields
// const badEntry = await grapevine.entries.create('feed-id', {
//   content: 'Text content',
//   title: '',           // ValidationError - use undefined instead
//   description: '',     // ValidationError - use undefined instead
//   tags: ['valid', '']  // ValidationError - empty strings in arrays not allowed
// });

// JSON data (auto-detects MIME type)
const jsonEntry = await grapevine.entries.create('feed-id', {
  content: { data: 'value' },  // Automatically encoded as JSON
  title: 'JSON Entry'
});

// Paid entry with expiration
const paidEntry = await grapevine.entries.create('feed-id', {
  content: 'Premium content',
  title: 'Premium Article',
  is_free: false,
  expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
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
// Get all available categories
const categories = await grapevine.getCategories();
categories.forEach(cat => {
  console.log(`${cat.name} (${cat.id}): ${cat.description}`);
});

// Create feed with a specific category
const businessCategory = categories.find(c => c.name === 'Business');
if (businessCategory) {
  const categorizedFeed = await grapevine.feeds.create({
    name: 'Business Updates',
    category_id: businessCategory.id,  // Must be valid UUID from getCategories()
    tags: ['business', 'news']
  });
}
```

**Category Validation:**
- `category_id` is **optional** - feeds can be created without it
- When provided, must be a valid UUID from `/v1/categories` endpoint  
- Empty strings or invalid UUIDs will be rejected with validation error
- Non-existent category UUIDs will be rejected

## Validation & Error Handling

The SDK includes comprehensive client-side validation to provide helpful error messages before API calls are made. This helps developers catch issues early with clear guidance on how to fix them.

### Validation Principles

1. **Optional fields can be omitted or `undefined`** - this is the recommended approach
2. **Empty strings are rejected** - use `undefined` instead of empty strings for optional fields
3. **Invalid formats are caught early** - UUIDs, URLs, and other formats are validated client-side
4. **Helpful error messages** - validation errors include specific guidance on how to fix the issue

### Common Validation Scenarios

```typescript
// ✅ Correct - omit optional fields or use undefined
await grapevine.feeds.create({
  name: 'My Feed',
  // category_id not specified - perfectly fine
});

await grapevine.feeds.create({
  name: 'My Feed',
  category_id: undefined,  // Also fine
  description: undefined   // Also fine
});

// ❌ Incorrect - empty strings for optional fields
await grapevine.feeds.create({
  name: 'My Feed',
  category_id: '',        // Will throw ValidationError
  description: '',        // Will throw ValidationError  
  image_url: ''           // Will throw ValidationError
});

// ✅ Correct - proper values when provided
const categories = await grapevine.getCategories();
await grapevine.feeds.create({
  name: 'My Feed',
  category_id: categories[0].id,    // Valid UUID
  description: 'A great feed',      // Non-empty string
  image_url: 'https://example.com/image.jpg'  // Valid URL with protocol
});
```

### Validation Error Examples

```typescript
try {
  await grapevine.feeds.create({
    name: 'My Feed',
    category_id: '',  // Empty string
  });
} catch (error) {
  console.log(error.message);
  // "Invalid category_id: expected valid UUID or omit the field entirely, got "". 
  //  Pass undefined or omit the field instead of empty string. 
  //  Get valid category IDs from the appropriate API endpoint."
}

try {
  await grapevine.feeds.create({
    name: 'My Feed', 
    image_url: 'not-a-url',  // Invalid URL
  });
} catch (error) {
  console.log(error.message);
  // "Invalid image_url: expected valid URL starting with http:// or https://, got "not-a-url". 
  //  Ensure the URL is properly formatted with protocol"
}

try {
  await grapevine.feeds.create({
    name: 'My Feed',
    tags: ['valid', '', 'also-valid'],  // Empty string in array
  });
} catch (error) {
  console.log(error.message);
  // "Invalid tags[1]: expected non-empty string, got "". Array items cannot be empty strings"
}
```

### Error Handling Best Practices

The SDK provides structured error handling with specific error types and helpful suggestions:

```typescript
import { 
  ValidationError, 
  ContentError, 
  AuthError, 
  ApiError, 
  ErrorCode 
} from '@pinata/grapevine-sdk';

try {
  const entry = await grapevine.entries.create('feed-id', {
    content_base64: base64Data,
    title: 'My Entry'
  });
  console.log('Entry created successfully:', entry.id);
} catch (error) {
  if (error instanceof ContentError) {
    // Content validation or processing error
    console.error('Content error:', error.message);
    console.log('Suggestion:', error.suggestion);
    
    if (error.code === ErrorCode.CONTENT_EMPTY) {
      // Handle empty content case
      console.log('Content was empty or undefined');
    } else if (error.code === ErrorCode.BASE64_INVALID) {
      // Handle invalid base64 format
      console.log('Base64 format is invalid');
    }
  } else if (error instanceof AuthError) {
    // Authentication/wallet error
    console.error('Auth error:', error.message);
    
    if (error.code === ErrorCode.AUTH_NO_WALLET) {
      // Prompt user to connect wallet
      console.log('Please connect your wallet first');
    }
  } else if (error instanceof ApiError) {
    // API request failed
    console.error(`API error (${error.status}):`, error.message);
    
    if (error.status === 402) {
      console.log('Payment required for this operation');
    } else if (error.status === 404) {
      console.log('Resource not found - check your IDs');
    }
  } else if (error instanceof ValidationError) {
    // Field validation error (from validation.ts)
    console.error('Validation error:', error.message);
  } else {
    // Unexpected error
    console.error('Unexpected error:', error.message);
  }
  
  // All SDK errors include helpful context
  if (error.getDetailedMessage) {
    console.log('Detailed help:');
    console.log(error.getDetailedMessage());
  }
}
```

#### Error Types

- **`ContentError`**: Issues with content validation, base64 encoding, or processing
- **`AuthError`**: Authentication, wallet, or private key issues  
- **`ConfigError`**: Configuration conflicts or invalid settings
- **`ApiError`**: HTTP request failures, server errors, payment required
- **`ValidationError`**: Field validation errors (legacy from validation.ts)

#### Common Content Error Solutions

```typescript
// ❌ Wrong - undefined base64 content
try {
  await grapevine.entries.create('feed-id', {
    content_base64: undefined  // This will throw ContentError.CONTENT_EMPTY
  });
} catch (error) {
  if (error instanceof ContentError && error.code === ErrorCode.CONTENT_EMPTY) {
    console.log(error.suggestion); // "Ensure your base64 conversion succeeded..."
    console.log(error.example);    // Shows code example
  }
}

// ✅ Correct - check conversion result
const base64Data = await convertFileToBase64(file);
if (!base64Data) {
  throw new Error('Failed to convert file to base64');
}

await grapevine.entries.create('feed-id', {
  content_base64: base64Data,
  title: 'My File'
});
```

### Validation Rules Reference

| Field Type | Validation Rules | Example Error |
|------------|------------------|---------------|
| **Optional UUID** | Must be valid UUID format when provided | `Invalid category_id: expected valid UUID format` |
| **Optional String** | Cannot be empty string when provided | `Invalid description: Pass undefined instead of empty string` |
| **Optional URL** | Must start with http:// or https:// when provided | `Invalid image_url: expected valid URL starting with http://` |
| **Optional Array** | Can be empty `[]` but cannot contain empty string elements | `Invalid tags[0]: Array items cannot be empty strings` |
| **Optional Boolean** | Must be `true`, `false`, or `undefined` | `Invalid is_active: expected boolean (true or false)` |
| **Optional Timestamp** | Must be positive Unix timestamp in seconds | `Invalid expires_at: expected Unix timestamp in seconds` |

### Working with Forms and User Input

When building forms, it's common to have empty strings from user input. Here's how to handle them properly:

```typescript
// ❌ Direct form values can cause validation errors
const formData = new FormData(formElement);
const feedData = {
  name: formData.get('name'),
  description: formData.get('description'), // Might be empty string ""
  category_id: formData.get('category'),    // Might be empty string ""
};

// ❌ This will throw ValidationError if description or category_id are empty strings
// await grapevine.feeds.create(feedData);

// ✅ Convert empty strings to undefined
function sanitizeOptionalField(value: string | null): string | undefined {
  if (!value || value.trim() === '') return undefined;
  return value.trim();
}

const cleanFeedData = {
  name: formData.get('name') as string, // Required field
  description: sanitizeOptionalField(formData.get('description') as string),
  category_id: sanitizeOptionalField(formData.get('category') as string),
};

await grapevine.feeds.create(cleanFeedData); // ✅ Works correctly
```

### Dynamic Field Updates

When updating feeds with partial data:

```typescript
// ✅ Only update fields that have values
const updateData: UpdateFeedInput = {};

if (newName && newName.trim()) updateData.name = newName.trim();
if (newDescription && newDescription.trim()) updateData.description = newDescription.trim(); 
if (selectedCategoryId) updateData.category_id = selectedCategoryId;
if (newTags && newTags.length > 0) updateData.tags = newTags.filter(tag => tag.trim());

// Only make API call if there's something to update
if (Object.keys(updateData).length > 0) {
  await grapevine.feeds.update(feedId, updateData);
}
```

### Migration from Older SDK Versions

If you're upgrading from an older SDK version that didn't have validation:

```typescript
// Old code that might have worked before:
// const feed = await grapevine.feeds.create({
//   name: 'My Feed',
//   description: '',      // This now throws ValidationError
//   category_id: '',      // This now throws ValidationError
//   tags: ['', 'valid']   // This now throws ValidationError
// });

// New code with proper validation:
const feed = await grapevine.feeds.create({
  name: 'My Feed',
  // description: omitted (or use undefined)
  // category_id: omitted (or use undefined)  
  tags: ['valid']  // Empty strings filtered out
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

// Import validation error for error handling
import { ValidationError } from '@pinata/grapevine-sdk';

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