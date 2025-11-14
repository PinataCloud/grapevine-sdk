import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');
const CLI_EXECUTABLE = path.join(PROJECT_ROOT, 'grapevine-cli');

describe('CLI Executable Tests', () => {
  let tempDir: string;
  const testPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    // Build the CLI executable
    console.log('Building CLI executable...');
    try {
      execSync('bun run build:cli', { 
        cwd: PROJECT_ROOT,
        stdio: 'inherit' 
      });
      
      // Wait a moment for file to be written
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to build CLI:', error);
      throw error;
    }

    // Verify executable exists
    if (!fs.existsSync(CLI_EXECUTABLE)) {
      throw new Error(`CLI executable not found at ${CLI_EXECUTABLE}`);
    }

    // Make it executable
    fs.chmodSync(CLI_EXECUTABLE, '755');
  });

  beforeAll(() => {
    // Create temp directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grapevine-cli-test-'));
  });

  afterAll(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to run the compiled CLI
  async function runCLI(args: string[], env: any = {}): Promise<{ stdout: string; stderr: string; code: number }> {
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
      
      const child = spawn(CLI_EXECUTABLE, args, {
        env: {
          ...baseEnv,
          ...env
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data);
      child.stderr.on('data', (data) => stderr += data);
      child.on('close', (code) => resolve({ 
        stdout, 
        stderr, 
        code: code || 0 
      }));
    });
  }

  describe('Basic Commands', () => {
    it('should show version', async () => {
      const result = await runCLI(['--version']);
      expect(result.stdout).toContain('0.1.5');
      expect(result.code).toBe(0);
    });

    it('should show help', async () => {
      const result = await runCLI(['--help']);
      expect(result.stdout).toContain('CLI for the Grapevine API');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('feed');
      expect(result.stdout).toContain('entry');
      expect(result.stdout).toContain('auth');
      expect(result.code).toBe(0);
    });

    it('should show info', async () => {
      const result = await runCLI(['info']);
      expect(result.stdout).toContain('Grapevine SDK Info');
      expect(result.stdout).toContain('Version:');
      expect(result.stdout).toContain('Runtime:');
      expect(result.code).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('should configure auth with valid key', async () => {
      const result = await runCLI(['auth', 'login', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Authentication configured successfully');
      expect(result.code).toBe(0);
    });

    it('should show auth status', async () => {
      // First configure
      await runCLI(['auth', 'login', '--key', testPrivateKey]);
      
      // Then check status
      const result = await runCLI(['auth', 'status']);
      expect(result.stdout).toContain('Authentication Status');
      expect(result.code).toBe(0);
    });

    it('should logout', async () => {
      await runCLI(['auth', 'login', '--key', testPrivateKey]);
      const result = await runCLI(['auth', 'logout']);
      expect(result.stdout).toContain('removed');
      expect(result.code).toBe(0);
    });
  });

  describe('Network Configuration', () => {
    it('should work with testnet', async () => {
      const result = await runCLI(['--network', 'testnet', 'info', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Testnet');
      expect(result.code).toBe(0);
    });

    it('should work with mainnet', async () => {
      const result = await runCLI(['--network', 'mainnet', 'info', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Mainnet');
      expect(result.code).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should require auth for feed commands', async () => {
      const result = await runCLI(['feed', 'create', 'Test']);
      expect(result.stderr).toContain('Private key required');
      expect(result.code).toBe(1);
    });

    it('should handle invalid private key', async () => {
      const result = await runCLI(['auth', 'login', '--key', 'invalid']);
      expect(result.stderr).toContain('Invalid private key format');
      expect(result.code).toBe(1);
    });
  });

  describe('Environment Variables', () => {
    it('should accept private key from flag', async () => {
      const result = await runCLI(['info', '--key', testPrivateKey]);
      expect(result.stdout).toContain('Wallet:');
      expect(result.code).toBe(0);
    });

    it('should work with CLI flag', async () => {
      const key1 = '0x' + '1'.repeat(64);
      
      const result = await runCLI(['--key', key1, 'info']);
      expect(result.code).toBe(0);
    });
  });

  describe('Categories Command', () => {
    it('should not require auth for categories', async () => {
      const result = await runCLI(['categories']);
      // Should attempt to fetch (may fail with network error but not auth error)
      expect(result.stderr).not.toContain('Private key required');
    });
  });
});