# Grapevine SDK Manual Tests

A comprehensive manual testing application for the Grapevine SDK, featuring wagmi wallet integration and private key testing.

## Quick Start

From the SDK root directory:

```bash
# Build the SDK first
bun run build

# Start the manual test app
bun run test:manual
```

The test app will be available at `http://localhost:5173`

## Features

### 🔗 Wallet Connection
- Connect via multiple wallet providers (MetaMask, WalletConnect, etc.)
- Network detection and validation
- Support for Base Sepolia (testnet) and Base Mainnet
- Real-time connection status

### 🔑 Private Key Testing
- Direct private key authentication testing
- Bypass wagmi for comparison testing
- Network configuration (testnet/mainnet)
- All core SDK operations

### 🌐 Wagmi Integration Testing
- Test the useGrapevine React hook
- Real wallet integration via wagmi
- Side-by-side comparison with private key method
- Network switching support

### 🧪 Comprehensive Test Suite
- Automated test runner for all SDK features
- Support for both authentication methods
- Pass/fail reporting with detailed results
- Individual test execution
- Performance timing

## Test Categories

### Basic Tests
- ✅ Get Categories
- ✅ Wallet Information
- ✅ Network Validation

### Feed Tests
- ✅ Create Feed
- ✅ List Feeds
- ✅ Get Specific Feed
- ✅ Update Feed (coming soon)

### Entry Tests
- ✅ List Feed Entries
- ✅ Create Entry (coming soon)
- ✅ File Upload (coming soon)

### Payment Tests
- ✅ x402 Payment Flow (coming soon)
- ✅ Payment Verification (coming soon)

## Usage Instructions

### 1. Wallet Connection
1. Navigate to "Wallet Connection" tab
2. Click "Connect Wallet" 
3. Choose your preferred wallet
4. Ensure you're on Base Sepolia (testnet) or Base Mainnet
5. Verify connection status shows green

### 2. Private Key Testing
1. Navigate to "Private Key Tests" tab
2. Select network (testnet recommended for testing)
3. Enter a test private key (⚠️ NEVER use production keys)
4. Click "Initialize SDK"
5. Run various SDK operations
6. Check results in the results panel

### 3. Wagmi Testing
1. Ensure wallet is connected from step 1
2. Navigate to "Wagmi Tests" tab
3. Select network configuration
4. Wait for Grapevine SDK to initialize
5. Run SDK operations using wagmi wallet
6. Compare results with private key tests

### 4. Full Test Suite
1. Choose authentication method (wagmi or private key)
2. Configure network settings
3. Click "Run All Tests" for comprehensive validation
4. Individual tests can be run by clicking "Run" next to each test
5. Review pass/fail status and detailed results

## Development

### Adding New Tests

1. Edit `src/components/TestSuite.tsx`
2. Add new test case to `testCases` array:

```typescript
{
  id: 'my-new-test',
  name: 'My New Test',
  description: 'Description of what this tests',
  category: 'Feeds', // or create new category
  test: async (client) => {
    // Your test logic here
    const result = await client.someMethod();
    if (!result) throw new Error('Test failed');
    return result;
  }
}
```

### Adding New Components

1. Create component in `src/components/`
2. Import and add to `App.tsx` tabs array
3. Follow existing patterns for styling and error handling

## Troubleshooting

### Common Issues

**"No client available"**
- Ensure wallet is connected for wagmi mode
- Verify private key format (must start with 0x)
- Check network compatibility

**"SDK not ready"** 
- Wait for initialization to complete
- Check browser console for errors
- Verify SDK build is up to date

**Network errors**
- Switch to Base Sepolia for testing
- Check wallet network settings
- Verify RPC connectivity

**Build errors**
- Run `bun run build` from SDK root
- Check TypeScript compilation
- Verify all dependencies are installed

### Getting Help

1. Check browser developer console for detailed errors
2. Verify SDK is built: `bun run build`
3. Test with a fresh wallet/private key
4. Try different networks (testnet vs mainnet)

## Security Notes

⚠️ **IMPORTANT SECURITY WARNINGS**

- **Never use production private keys in this test app**
- **Only use test wallets with minimal funds**
- **This is for development testing only**
- **Do not expose sensitive information in test results**

## Technical Details

- **Framework**: Vite + React + TypeScript
- **Styling**: TailwindCSS
- **Wallet Integration**: wagmi + RainbowKit
- **SDK Import**: Local file dependency on parent directory

## Contributing

When making changes to the SDK:

1. Build the SDK: `bun run build`
2. Test app automatically picks up changes
3. Run manual tests to verify functionality
4. Update test cases if new features added
5. Document any new testing procedures