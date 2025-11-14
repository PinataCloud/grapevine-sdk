import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Grapevine SDK Test App',
  projectId: 'test-project-id', // Replace with actual project ID if needed
  chains: [baseSepolia, base],
  ssr: false,
});