import type { WalletClient } from 'viem';
import type { WalletAdapter } from './wallet-adapter.js';
import { AuthError, ErrorCode } from '../errors.js';

/**
 * Wallet adapter implementation for wagmi wallet clients
 */
export class WagmiAdapter implements WalletAdapter {
  private walletClient: WalletClient;
  private address: string;
  private chainId: string;

  constructor(walletClient: WalletClient) {
    if (!walletClient) {
      throw new AuthError(
        'WalletClient is required for WagmiAdapter',
        ErrorCode.AUTH_INVALID_KEY,
        {
          suggestion: 'Provide a valid WalletClient instance from wagmi',
          example: `import { useWalletClient } from 'wagmi';
import { WagmiAdapter } from '@pinata/grapevine-sdk';

const { data: walletClient } = useWalletClient();
if (walletClient) {
  const adapter = new WagmiAdapter(walletClient);
}`
        }
      );
    }
    
    // Extract address from wallet client account
    const address = walletClient.account?.address;
    if (!address) {
      throw new AuthError(
        'Wallet address not available from wallet client',
        ErrorCode.AUTH_NO_WALLET,
        {
          suggestion: 'Ensure the wallet is connected and has an account',
          example: `// Make sure wallet is connected first
if (!walletClient.account?.address) {
  // Connect wallet first
  await connect({ connector: ... });
}`
        }
      );
    }

    this.walletClient = walletClient;
    this.address = address;
    
    // Get chain ID from wallet client
    const chainId = this.walletClient.chain?.id;
    if (!chainId) {
      throw new AuthError(
        'Chain ID not available from wallet client',
        ErrorCode.CONFIG_INVALID,
        {
          suggestion: 'Ensure the wallet is connected to a supported network (Base or Base Sepolia)',
          context: { supportedChainIds: [8453, 84532] }
        }
      );
    }
    
    // Map chain IDs: 84532 = Base Sepolia, 8453 = Base Mainnet
    this.chainId = chainId.toString();
  }

  getAddress(): string {
    return this.address;
  }

  async signMessage(message: string): Promise<string> {
    // Find the account in the wallet client that matches our address
    const account = this.walletClient.account || {
      address: this.address as `0x${string}`,
      type: 'json-rpc'
    };

    return this.walletClient.signMessage({
      message,
      account: account as any
    });
  }

  getWalletClient(): WalletClient {
    return this.walletClient;
  }

  getChainId(): string {
    return this.chainId;
  }
}