# End-to-End Tests

These tests validate the **Grapevine SDK and CLI** with real API calls using a private key.

## Requirements

- A private key with some testnet ETH on Base Sepolia
- The private key wallet should have some testnet USDC for paid entry tests

## Usage

### Run All E2E Tests
```bash
GRAPEVINE_E2E_PRIVATE_KEY="0xYourPrivateKey" bun run test:e2e
```

### Run SDK E2E Tests Only
```bash
GRAPEVINE_E2E_PRIVATE_KEY="0xYourPrivateKey" bun run test:e2e:sdk
```

### Run CLI E2E Tests Only
```bash
GRAPEVINE_E2E_PRIVATE_KEY="0xYourPrivateKey" bun run test:e2e:cli
```

### Skip E2E Tests (Normal Unit Tests)
```bash
bun test tests/
```

## What These Tests Do

### SDK E2E Tests (`sdk-e2e.test.ts`)
- ✅ Authenticate with real private key
- ✅ Create a test feed using `client.feeds.create()`
- ✅ List feeds using `client.feeds.list()`
- ✅ Create free text entry using `client.entries.create()`
- ✅ Create JSON entry with auto-detection
- ✅ Create paid entry with x402 pricing
- ✅ List entries using `client.entries.list()`
- ✅ Batch create multiple entries
- ✅ Fetch categories using `client.getCategories()`
- ✅ Test error handling
- 🧹 **Automatic cleanup** of test data

### CLI E2E Tests (`cli-e2e.test.ts`)
- ✅ Configure authentication: `grapevine auth login`
- ✅ Create feed: `grapevine feed create "Test Feed"`
- ✅ List feeds: `grapevine feed list`
- ✅ Add free entry: `grapevine entry add <feedId> "content"`
- ✅ Add paid entry: `grapevine entry add --paid --price 500000`
- ✅ Add from file: `grapevine entry add --file content.txt`
- ✅ List entries: `grapevine entry list <feedId>`
- ✅ Filter entries: `--free`, `--paid`
- ✅ Network switching: `--network testnet/mainnet`
- ✅ Error handling for invalid commands
- 🧹 **Automatic cleanup** via CLI commands

## Safety Features

- **Testnet Only**: Uses `api.grapevine.markets` by default
- **Auto-cleanup**: Removes all test feeds and entries after tests
- **Skip Mode**: Tests skip gracefully if no private key provided
- **Tagged Data**: All test data tagged with timestamps for identification
- **Error Handling**: Graceful handling of API failures

## Test Output Example

```bash
$ GRAPEVINE_E2E_PRIVATE_KEY="0x..." bun run test:e2e:sdk

🍇 Running SDK E2E tests with wallet: 0xYourWalletAddress
✅ Created test feed: 019a7e8d-649e-7781-af22-cee458b5fb29
✅ Created free text entry: 019a7e8d-8494-78e0-af3c-c766aae57863
✅ Created JSON entry: 019a7e8d-9d06-7ded-ae23-efcdebe18c65
✅ Created paid entry: 019a7e8d-a1b2-7c3d-8e4f-567890abcdef
✅ Created 2 entries in batch
🧹 Cleaning up E2E test data...
   Deleted entry: 019a7e8d-8494-78e0-af3c-c766aae57863
   Deleted entry: 019a7e8d-9d06-7ded-ae23-efcdebe18c65
   Deleted feed: 019a7e8d-649e-7781-af22-cee458b5fb29

✅ All tests passed!
```

## What This Proves

- ✅ **SDK works**: Our GrapevineClient wrapper actually works with real API
- ✅ **CLI works**: Our CLI executable actually executes real commands  
- ✅ **Authentication**: x402 signature authentication works end-to-end
- ✅ **Payments**: Paid entries and x402 payment protocol works
- ✅ **All Operations**: Create, read, list, delete operations function
- ✅ **Error Handling**: Graceful handling of real API errors
- ✅ **Networks**: Both testnet and mainnet configurations work