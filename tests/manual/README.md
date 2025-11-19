# Grapevine SDK Manual Tests

Manual testing application with wagmi wallet integration and private key testing.

## Quick Start

From the SDK root directory:

```bash
bun run build && bun run test:manual
```

Test app available at `http://localhost:5173`

## Features

- **Wallet Connection**: MetaMask, WalletConnect support with Base Sepolia/Mainnet
- **Private Key Testing**: Direct authentication bypassing wagmi
- **Wagmi Integration**: Test useGrapevine React hook with real wallets
- **Test Suite**: Automated runner for all SDK features with pass/fail reporting

## Tests Available

Categories, wallet info, feed operations (create/list/get), entry operations, x402 payments.

## Usage

1. **Wallet Connection**: Connect MetaMask/WalletConnect on Base Sepolia/Mainnet
2. **Private Key Testing**: Enter test private key (⚠️ testnet only), run SDK operations  
3. **Test Suite**: Run all tests or individual tests with pass/fail results

## Development

**Add Tests**: Edit `TestSuite.tsx`, add to `testCases` array  
**Add Components**: Create in `src/components/`, import to `App.tsx`

## Troubleshooting

**No client**: Check wallet connection, verify private key format (0x prefix)  
**SDK not ready**: Wait for initialization, check console, rebuild SDK  
**Network errors**: Use Base Sepolia, check wallet network settings  
**Build errors**: Run `bun run build` from SDK root

## Security

⚠️ **TESTNET ONLY** - Never use production keys or mainnet funds

## Tech Stack

Vite + React + TypeScript + TailwindCSS + wagmi