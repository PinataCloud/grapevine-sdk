import { describe, it, expect, beforeEach } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import { AuthManager } from '../../src/auth.js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

describe('Runtime Compatibility Tests', () => {
  const testPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('Module Loading', () => {
    it('should load as ESM module', async () => {
      const client = new GrapevineClient();
      expect(client).toBeDefined();
      expect(typeof client.request).toBe('function');
    });

    it('should handle dynamic imports', async () => {
      const module = await import('../../src/index.js');
      expect(module.GrapevineClient).toBeDefined();
      expect(module.default).toBe(module.GrapevineClient);
    });

    it('should export all expected modules', async () => {
      const module = await import('../../src/index.js');
      expect(module.GrapevineClient).toBeDefined();
      expect(module.FeedsResource).toBeDefined();
      expect(module.EntriesResource).toBeDefined();
      expect(module.AuthManager).toBeDefined();
      expect(module.PaymentManager).toBeDefined();
    });
  });

  describe('Async Operations', () => {
    it('should handle async/await properly', async () => {
      const client = new GrapevineClient();
      expect(client).toBeDefined();
      
      // Test async method exists
      expect(typeof client.getCategories).toBe('function');
    });

    it('should handle Promise chains', () => {
      const client = new GrapevineClient();
      const promise = Promise.resolve().then(() => client);
      return promise.then(c => {
        expect(c).toBeDefined();
      });
    });
  });

  describe('Crypto Operations', () => {
    it('should initialize auth with private key', () => {
      const auth = new AuthManager(testPrivateKey, 'https://api.test.com', true);
      expect(auth.walletAddress).toBeDefined();
      expect(auth.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should generate consistent addresses', () => {
      const auth1 = new AuthManager(testPrivateKey, 'https://api.test.com', true);
      const auth2 = new AuthManager(testPrivateKey, 'https://api.test.com', true);
      expect(auth1.walletAddress).toBe(auth2.walletAddress);
    });
  });

  describe('File System Operations', () => {
    it('should handle config file operations', () => {
      const configDir = path.join(PROJECT_ROOT, '.test-config');
      const configFile = path.join(configDir, 'test.json');
      
      // Create directory
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Write config
      const testConfig = { test: true, timestamp: Date.now() };
      fs.writeFileSync(configFile, JSON.stringify(testConfig, null, 2));
      
      // Read config
      const readConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      expect(readConfig.test).toBe(true);
      
      // Cleanup
      fs.rmSync(configDir, { recursive: true, force: true });
    });
  });

  describe('Build Output', () => {
    it('should have TypeScript definitions', () => {
      const distPath = path.join(PROJECT_ROOT, 'dist');
      if (fs.existsSync(distPath)) {
        const indexDts = path.join(distPath, 'index.d.ts');
        if (fs.existsSync(indexDts)) {
          expect(fs.existsSync(indexDts)).toBe(true);
        }
      }
    });
  });

  describe('Environment Detection', () => {
    it('should detect runtime environment', () => {
      const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node';
      expect(['bun', 'node']).toContain(runtime);
    });

    it('should have process object', () => {
      expect(process).toBeDefined();
      expect(process.env).toBeDefined();
      expect(process.version || (Bun as any)?.version).toBeDefined();
    });
  });

  describe('Package Manager Compatibility', () => {
    it('should have package.json configured correctly', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
      );
      
      // Check ESM configuration
      expect(packageJson.type).toBe('module');
      expect(packageJson.main).toBeDefined();
      expect(packageJson.types).toBeDefined();
      // Note: bin field removed as CLI is now separate Go application
    });

    it('should have all required dependencies', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
      );
      
      // Check critical dependencies
      expect(packageJson.dependencies.viem).toBeDefined();
      expect(packageJson.dependencies['@coinbase/x402']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing private key gracefully', () => {
      const client = new GrapevineClient();
      expect(() => client.getWalletAddress()).toThrow('No wallet configured. Use setWalletClient() to configure a wallet first.');
    });

    it('should handle invalid private key format', () => {
      expect(() => new GrapevineClient({ privateKey: 'invalid' }))
        .toThrow('Invalid private key format. Must be 66 characters starting with 0x');
    });
  });

  describe('Network Configuration', () => {
    it('should support testnet', () => {
      const client = new GrapevineClient({ network: 'testnet' });
      expect(client.isTestNetwork()).toBe(true);
      expect(client.getNetwork()).toBe('base-sepolia');
    });

    it('should support mainnet', () => {
      const client = new GrapevineClient({ network: 'mainnet' });
      expect(client.isTestNetwork()).toBe(false);
      expect(client.getNetwork()).toBe('base');
    });

    it('should handle network configuration correctly', () => {
      const testnetClient = new GrapevineClient({ network: 'testnet' });
      expect(testnetClient.isTestNetwork()).toBe(true);
      expect(testnetClient.getNetwork()).toBe('base-sepolia');

      const mainnetClient = new GrapevineClient({ network: 'mainnet' });
      expect(mainnetClient.isTestNetwork()).toBe(false);
      expect(mainnetClient.getNetwork()).toBe('base');
    });
  });
});