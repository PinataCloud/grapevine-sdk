import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '../src/cli/index.ts');

describe('Grapevine CLI', () => {
  let tempDir: string;
  let configFile: string;
  const testPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    // Create temp directory for test config
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grapevine-test-'));
    configFile = path.join(tempDir, '.grapevine', 'config.json');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to run CLI command
  async function runCommand(args: string[], env: any = {}): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      // Start with clean environment, only copy non-sensitive vars
      const baseEnv: any = {
        PATH: process.env.PATH,
        NODE_PATH: process.env.NODE_PATH,
        HOME: tempDir,
        USERPROFILE: tempDir
      };
      
      // Only add PRIVATE_KEY if explicitly provided in env parameter
      if (env.hasOwnProperty('PRIVATE_KEY')) {
        baseEnv.PRIVATE_KEY = env.PRIVATE_KEY;
      }
      
      const child = spawn('bun', [CLI_PATH, ...args], {
        env: {
          ...baseEnv,
          ...env
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data);
      child.stderr.on('data', (data) => stderr += data);
      child.on('close', (code) => resolve({ stdout, stderr, code: code || 0 }));
    });
  }

  describe('version', () => {
    it('should display version', async () => {
      const result = await runCommand(['--version']);
      expect(result.stdout).toContain('0.1.0');
      expect(result.code).toBe(0);
    });
  });

  describe('help', () => {
    it('should display help', async () => {
      const result = await runCommand(['--help']);
      expect(result.stdout).toContain('CLI for the Grapevine API');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('feed');
      expect(result.stdout).toContain('entry');
      expect(result.stdout).toContain('auth');
      expect(result.stdout).toContain('categories');
      expect(result.stdout).toContain('info');
      expect(result.code).toBe(0);
    });
  });

  describe('auth commands', () => {
    describe('auth login', () => {
      it('should configure authentication with valid key', async () => {
        const result = await runCommand(['auth', 'login', '--key', testPrivateKey]);
        expect(result.stdout).toContain('Authentication configured successfully');
        expect(result.stdout).toContain('Wallet:');
        expect(result.stdout).toContain('Config saved to:');
        expect(result.code).toBe(0);

        // Check config file was created
        expect(fs.existsSync(configFile)).toBe(true);
        const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        expect(config.network).toBe('testnet');
        expect(config.wallet).toBeDefined();
        expect(config.configuredAt).toBeDefined();
      });

      it('should fail with invalid key format', async () => {
        const result = await runCommand(['auth', 'login', '--key', 'invalid']);
        expect(result.stderr).toContain('Invalid private key format');
        expect(result.code).toBe(1);
      });

      it('should fail without key', async () => {
        const result = await runCommand(['auth', 'login']);
        expect(result.stderr).toContain('Private key required');
        expect(result.code).toBe(1);
      });

      it('should accept key via flag', async () => {
        const result = await runCommand(['auth', 'login', '--key', testPrivateKey]);
        expect(result.stdout).toContain('Authentication configured successfully');
        expect(result.code).toBe(0);
      });

      it('should configure with custom network', async () => {
        const result = await runCommand(['auth', 'login', '--key', testPrivateKey, '--network', 'mainnet']);
        expect(result.stdout).toContain('Network: mainnet');
        expect(result.code).toBe(0);

        const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        expect(config.network).toBe('mainnet');
      });
    });

    describe('auth status', () => {
      it('should show status when not configured', async () => {
        // Run without PRIVATE_KEY env var to get "no private key" state
        const result = await runCommand(['auth', 'status']);
        expect(result.stdout).toContain('Authentication Status');
        expect(result.stdout).toContain('No saved configuration found');
        expect(result.stdout).toContain('No private key provided');
        expect(result.code).toBe(0);
      });

      it('should show status when configured', async () => {
        // First login
        await runCommand(['auth', 'login', '--key', testPrivateKey]);
        
        // Then check status with key provided
        const result = await runCommand(['auth', 'status', '--key', testPrivateKey]);
        expect(result.stdout).toContain('Configuration found');
        expect(result.stdout).toContain('Private key available');
        expect(result.stdout).toContain('Wallet:');
        expect(result.code).toBe(0);
      });
    });

    describe('auth logout', () => {
      it('should remove configuration', async () => {
        // First login
        await runCommand(['auth', 'login', '--key', testPrivateKey]);
        expect(fs.existsSync(configFile)).toBe(true);
        
        // Then logout
        const result = await runCommand(['auth', 'logout']);
        expect(result.stdout).toContain('Authentication configuration removed');
        expect(result.code).toBe(0);
        expect(fs.existsSync(configFile)).toBe(false);
      });

      it('should handle logout when not configured', async () => {
        const result = await runCommand(['auth', 'logout']);
        expect(result.stdout).toContain('No configuration to remove');
        expect(result.code).toBe(0);
      });
    });
  });

  describe('info command', () => {
    it('should show info without authentication', async () => {
      const result = await runCommand(['info']);
      expect(result.stdout).toContain('Grapevine SDK Info');
      expect(result.stdout).toContain('Version:');
      expect(result.stdout).toContain('Default Network:');
      expect(result.stdout).toContain('No authentication configured');
      expect(result.code).toBe(0);
    });

    it('should show info with authentication', async () => {
      const result = await runCommand(['info', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Grapevine SDK Info');
      expect(result.stdout).toContain('Active Network:');
      expect(result.stdout).toContain('Chain:');
      expect(result.stdout).toContain('Wallet:');
      expect(result.code).toBe(0);
    });
  });

  describe('categories command', () => {
    it('should request categories without authentication', async () => {
      // This will fail with actual API call, but tests the command structure
      const result = await runCommand(['categories']);
      // Command should run without requiring auth
      expect(result.stderr).not.toContain('Private key required');
    });
  });

  describe('feed commands', () => {
    it('should require authentication for feed create', async () => {
      const result = await runCommand(['feed', 'create', 'Test Feed']);
      expect(result.stderr).toContain('Private key required');
      expect(result.stderr).toContain('You can also run "grapevine auth"');
      expect(result.code).toBe(1);
    });

    it('should require authentication for feed list', async () => {
      const result = await runCommand(['feed', 'list']);
      expect(result.stderr).toContain('Private key required');
      expect(result.code).toBe(1);
    });

    it('should accept private key via flag', async () => {
      // Will fail with API error but shows auth is working
      const result = await runCommand(['feed', 'create', 'Test', '--key', testPrivateKey]);
      expect(result.stderr).not.toContain('Private key required');
    });
  });

  describe('entry commands', () => {
    it('should require authentication for entry add', async () => {
      const result = await runCommand(['entry', 'add', 'feed-123', 'content']);
      expect(result.stderr).toContain('Private key required');
      expect(result.code).toBe(1);
    });

    it('should require authentication for entry list', async () => {
      const result = await runCommand(['entry', 'list', 'feed-123']);
      expect(result.stderr).toContain('Private key required');
      expect(result.code).toBe(1);
    });
  });

  describe('network options', () => {
    it('should accept network flag globally', async () => {
      const result = await runCommand(['--network', 'mainnet', 'info', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Mainnet');
      expect(result.code).toBe(0);
    });

    it('should use saved network config', async () => {
      // Login with mainnet
      await runCommand(['auth', 'login', '--key', testPrivateKey, '--network', 'mainnet']);
      
      // Run info without specifying network but with key
      const result = await runCommand(['info', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Default Network: mainnet');
    });
  });

  describe('debug mode', () => {
    it('should accept debug flag', async () => {
      const result = await runCommand(['--debug', 'info', '--key', testPrivateKey]);
      expect(result.code).toBe(0);
    });
  });
});