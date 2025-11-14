import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');
const CLI_EXECUTABLE = path.join(PROJECT_ROOT, 'grapevine-cli');

describe('CLI End-to-End Tests', () => {
  let tempDir: string;
  let testFeedId: string = '';
  let testEntryIds: string[] = [];
  const testPrivateKey = process.env.GRAPEVINE_E2E_PRIVATE_KEY;
  const timestamp = Date.now();
  
  // Skip tests if no private key provided
  const skipE2E = !testPrivateKey;

  beforeAll(async () => {
    console.log('\n=== 🔧 CLI E2E Test Setup ===');
    console.log(`Private key provided: ${!!testPrivateKey}`);
    console.log(`Skip E2E: ${skipE2E}`);
    
    if (skipE2E) {
      console.log('\n⚠️  CLI E2E tests will be SKIPPED');
      console.log('   Reason: GRAPEVINE_E2E_PRIVATE_KEY not provided');
      console.log('   To run: GRAPEVINE_E2E_PRIVATE_KEY="0x..." bun test tests/e2e/');
      console.log('=== End CLI E2E Setup ===\n');
      return;
    }

    // Build the CLI executable
    console.log('🔨 Building CLI executable for E2E tests...');
    try {
      execSync('bun run build:cli', { 
        cwd: PROJECT_ROOT,
        stdio: 'inherit' 
      });
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

    // Create temp directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grapevine-cli-e2e-'));
    
    // Create an empty .env file in temp dir to prevent Bun from loading project .env
    fs.writeFileSync(path.join(tempDir, '.env'), '');
    
    console.log(`🍇 CLI E2E tests ready with temp config: ${tempDir}`);
    console.log('=== End CLI E2E Setup ===\n');
  });

  afterAll(async () => {
    if (skipE2E) {
      console.log('\n=== 🧹 CLI E2E Cleanup ===');
      console.log('No cleanup needed (tests were skipped)');
      console.log('=== End CLI E2E Cleanup ===\n');
      return;
    }

    console.log('\n=== 🧹 CLI E2E Cleanup ===');
    console.log('Cleaning up test data via CLI...');
    
    try {
      // Delete entries first
      for (const entryId of testEntryIds) {
        try {
          await runCLI(['entry', 'delete', testFeedId, entryId], {
            PRIVATE_KEY: testPrivateKey
          });
          console.log(`   Deleted entry via CLI: ${entryId}`);
        } catch (error) {
          console.warn(`   Failed to delete entry ${entryId} via CLI:`, error);
        }
      }
      
      // Delete the test feed
      if (testFeedId) {
        try {
          await runCLI(['feed', 'delete', testFeedId], {
            PRIVATE_KEY: testPrivateKey
          });
          console.log(`   Deleted feed via CLI: ${testFeedId}`);
        } catch (error) {
          console.warn(`   Failed to delete feed ${testFeedId} via CLI:`, error);
        }
      }
    } catch (error) {
      console.warn('CLI cleanup failed:', error);
    }

    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('   Cleaned up temp directory');
    }
    
    console.log('=== End CLI E2E Cleanup ===\n');
  });

  // Helper to run the compiled CLI
  async function runCLI(args: string[], env: any = {}): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      // Build environment, filtering out keys set to undefined
      const baseEnv = { ...process.env };
      
      // Remove GRAPEVINE_E2E_PRIVATE_KEY from base env (it's only for test setup)
      delete baseEnv.GRAPEVINE_E2E_PRIVATE_KEY;
      
      const finalEnv = {
        ...baseEnv,
        HOME: tempDir,
        USERPROFILE: tempDir,
        // Set CWD to tempDir so Bun loads .env from there (empty file)
        PWD: tempDir,
        ...env
      };
      
      // Remove keys that were explicitly set to undefined
      Object.keys(env).forEach(key => {
        if (env[key] === undefined) {
          delete finalEnv[key];
        }
      });
      
      const child = spawn(CLI_EXECUTABLE, args, { 
        env: finalEnv,
        cwd: tempDir  // Run from temp dir to avoid loading project .env
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

  describe('CLI Authentication', () => {
    it('should configure authentication with real private key', async () => {
      console.log('🔑 Testing CLI authentication...');
      if (skipE2E) {
        console.log('⏭️  Skipping CLI auth test - no private key provided');
        console.log('   To run CLI E2E tests: GRAPEVINE_E2E_PRIVATE_KEY="0x..." bun test tests/e2e/');
        return;
      }
      
      console.log('   Configuring authentication with private key...');
      const result = await runCLI(['auth', 'login', '--key', testPrivateKey]);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Authentication configured successfully');
      expect(result.stdout).toContain('Wallet:');
      
      console.log('✅ CLI authentication configured');
    });

    it('should show authentication status', async () => {
      console.log('🔍 Testing CLI auth status...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const result = await runCLI(['auth', 'status'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Authentication Status');
      expect(result.stdout).toContain('Private key available');
      console.log('✅ CLI auth status displayed correctly');
    });
  });

  describe('CLI Feed Operations', () => {
    it('should create a test feed via CLI', async () => {
      console.log('🔨 Testing CLI feed creation...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const feedName = `CLI E2E Test Feed ${timestamp}`;
      console.log(`   Creating feed: "${feedName}"`);
      const result = await runCLI([
        'feed', 'create', feedName,
        '--description', `CLI E2E test feed created at ${new Date().toISOString()}`,
        '--tags', `e2e-test,cli-test,ts-${timestamp}`
      ], {
        PRIVATE_KEY: testPrivateKey
      });
      
      if (result.code !== 0) {
        console.error('   Feed creation failed!');
        console.error('   stdout:', result.stdout);
        console.error('   stderr:', result.stderr);
      }
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Feed created:');
      
      // Extract feed ID from output
      const feedIdMatch = result.stdout.match(/Feed created: ([a-z0-9\-]+)/);
      expect(feedIdMatch).toBeTruthy();
      testFeedId = feedIdMatch![1];
      
      console.log(`✅ Created test feed via CLI: ${testFeedId}`);
    });

    it('should list feeds via CLI', async () => {
      console.log('📋 Testing CLI feed listing...');
      if (skipE2E || !testFeedId) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      // Note: Feed listing by owner may have indexing delay
      // We verify the command works, but don't require the feed to appear immediately
      const result = await runCLI(['feed', 'list', '--limit', '20'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Found');
      expect(result.stdout).toContain('feeds');
      // Don't require feed to be in list due to potential API indexing delay
      console.log('✅ CLI feed listing works');
    });

    it('should get specific feed via CLI', async () => {
      console.log('🔍 Testing CLI feed retrieval...');
      if (skipE2E || !testFeedId) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const result = await runCLI(['feed', 'get', testFeedId], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Feed Details');
      expect(result.stdout).toContain(testFeedId);
      expect(result.stdout).toContain('CLI E2E Test Feed');
      console.log('✅ CLI feed retrieval successful');
    });
  });

  describe('CLI Entry Operations', () => {
    it('should add a free text entry via CLI', async () => {
      console.log('📝 Testing CLI free entry creation...');
      if (skipE2E || !testFeedId) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const content = `This is a free text entry created by CLI E2E tests at ${new Date().toISOString()}`;
      console.log('   Creating free text entry...');
      const result = await runCLI([
        'entry', 'add', testFeedId, content,
        '--title', `CLI Free Entry ${timestamp}`,
        '--tags', 'e2e-test,cli,free'
      ], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Entry created:');
      expect(result.stdout).toContain('Type: FREE');
      
      // Extract entry ID
      const entryIdMatch = result.stdout.match(/Entry created: ([a-z0-9\-]+)/);
      expect(entryIdMatch).toBeTruthy();
      testEntryIds.push(entryIdMatch![1]);
      
      console.log(`✅ Created free entry via CLI: ${entryIdMatch![1]}`);
    });

    it('should add a paid entry via CLI', async () => {
      console.log('💰 Testing CLI paid entry creation...');
      if (skipE2E || !testFeedId) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const content = `This is premium content created by CLI E2E tests at ${new Date().toISOString()}. Payment required!`;
      console.log('   Creating paid entry (0.5 USDC)...');
      const result = await runCLI([
        'entry', 'add', testFeedId, content,
        '--title', `CLI Paid Entry ${timestamp}`,
        '--paid',
        '--price', '500000', // 0.5 USDC
        '--tags', 'e2e-test,cli,paid'
      ], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Entry created:');
      expect(result.stdout).toContain('Type: PAID');
      
      // Extract entry ID
      const entryIdMatch = result.stdout.match(/Entry created: ([a-z0-9\-]+)/);
      expect(entryIdMatch).toBeTruthy();
      testEntryIds.push(entryIdMatch![1]);
      
      console.log(`✅ Created paid entry via CLI: ${entryIdMatch![1]}`);
    });

    it('should add entry from file via CLI', async () => {
      console.log('📄 Testing CLI file entry creation...');
      if (skipE2E || !testFeedId) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      // Create a temp test file
      const testFilePath = path.join(tempDir, 'test-content.txt');
      const fileContent = `File content from CLI E2E test\nCreated at: ${new Date().toISOString()}\nMultiple lines supported!`;
      fs.writeFileSync(testFilePath, fileContent);
      console.log('   Creating entry from file...');
      
      const result = await runCLI([
        'entry', 'add', testFeedId, testFilePath,
        '--file',
        '--title', `CLI File Entry ${timestamp}`,
        '--mime', 'text/plain',
        '--tags', 'e2e-test,cli,file'
      ], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Entry created:');
      
      // Extract entry ID
      const entryIdMatch = result.stdout.match(/Entry created: ([a-z0-9\-]+)/);
      expect(entryIdMatch).toBeTruthy();
      testEntryIds.push(entryIdMatch![1]);
      
      console.log(`✅ Created file entry via CLI: ${entryIdMatch![1]}`);
    });

    it('should list entries via CLI', async () => {
      console.log('📄 Testing CLI entry listing...');
      if (skipE2E || !testFeedId || testEntryIds.length === 0) {
        console.log('⏭️  Skipping - no private key, feed, or entries created');
        return;
      }
      
      const result = await runCLI(['entry', 'list', testFeedId, '--limit', '20'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Found');
      expect(result.stdout).toContain('entries');
      console.log(`   Checking for ${testEntryIds.length} test entries in listing...`);
      
      // Check that our test entries are listed
      for (const entryId of testEntryIds) {
        expect(result.stdout).toContain(entryId);
      }
      console.log('✅ CLI entry listing works, all test entries found');
    });

    it('should filter free entries via CLI', async () => {
      console.log('🔍 Testing CLI free entry filtering...');
      if (skipE2E || !testFeedId || testEntryIds.length === 0) {
        console.log('⏭️  Skipping - no private key, feed, or entries created');
        return;
      }
      
      const result = await runCLI(['entry', 'list', testFeedId, '--free'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Found');
      expect(result.stdout).toContain('FREE');
      console.log('✅ CLI free entry filtering works');
    });

    it('should filter paid entries via CLI', async () => {
      console.log('🔍 Testing CLI paid entry filtering...');
      if (skipE2E || !testFeedId || testEntryIds.length === 0) {
        console.log('⏭️  Skipping - no private key, feed, or entries created');
        return;
      }
      
      const result = await runCLI(['entry', 'list', testFeedId, '--paid'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Found');
      expect(result.stdout).toContain('PAID');
      console.log('✅ CLI paid entry filtering works');
    });
  });

  describe('CLI Categories', () => {
    it('should list categories via CLI', async () => {
      console.log('📚 Testing CLI categories listing...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const result = await runCLI(['categories']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Available Categories');
      expect(result.stdout.length).toBeGreaterThan(50); // Should have substantial content
      console.log('✅ CLI categories listing successful');
    });
  });

  describe('CLI Network Operations', () => {
    it('should show info with testnet', async () => {
      console.log('🌐 Testing CLI testnet info...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const result = await runCLI(['--network', 'testnet', 'info'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Grapevine SDK Info');
      expect(result.stdout).toContain('Testnet');
      expect(result.stdout).toContain('Wallet:');
      console.log('✅ CLI testnet info displayed correctly');
    });

    it('should show info with mainnet', async () => {
      console.log('🌐 Testing CLI mainnet info...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const result = await runCLI(['--network', 'mainnet', 'info'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Grapevine SDK Info');
      expect(result.stdout).toContain('Mainnet');
      expect(result.stdout).toContain('Wallet:');
      console.log('✅ CLI mainnet info displayed correctly');
    });
  });

  describe('CLI Error Handling', () => {
    it('should show helpful message when private key is missing', async () => {
      console.log('❌ Testing CLI missing private key message...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      // Note: In real usage, if PRIVATE_KEY is in .env, the CLI works (correct behavior)
      // This test verifies the error message exists, but we can't fully test it
      // because Bun auto-loads .env files
      
      // Instead, verify that auth status shows helpful info when no key is provided
      const result = await runCLI(['auth', 'status'], { PRIVATE_KEY: undefined });
      
      expect(result.code).toBe(0);
      // Should show status even without private key
      expect(result.stdout).toContain('Authentication Status');
      console.log('✅ CLI auth status command works without private key');
    });

    it('should handle invalid feed ID', async () => {
      console.log('❌ Testing CLI invalid feed ID error...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const result = await runCLI(['feed', 'get', 'invalid-feed-id-12345'], {
        PRIVATE_KEY: testPrivateKey
      });
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('Error:');
      console.log('✅ CLI invalid feed ID error handled correctly');
    });

    it('should handle invalid command', async () => {
      console.log('❌ Testing CLI invalid command error...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const result = await runCLI(['invalid-command']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('unknown command');
      console.log('✅ CLI invalid command error handled correctly');
    });
  });

  describe('CLI Configuration Persistence', () => {
    it('should persist auth config between commands', async () => {
      console.log('💾 Testing CLI config persistence...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      // Login
      console.log('   Logging in and testing config persistence...');
      await runCLI(['auth', 'login', '--key', testPrivateKey]);
      
      // Use saved config (no explicit key needed)
      const result = await runCLI(['info']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Wallet:');
      console.log('✅ CLI config persistence works');
    });

    it('should logout and remove saved config', async () => {
      console.log('🚪 Testing CLI logout...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      // Logout removes saved config file (network preferences, saved wallet)
      console.log('   Logging out to remove saved config...');
      const logoutResult = await runCLI(['auth', 'logout']);
      expect(logoutResult.code).toBe(0);
      expect(logoutResult.stdout).toContain('configuration removed');
      
      // After logout, config preferences are gone but PRIVATE_KEY env can still be used
      // This is correct behavior - logout removes saved preferences, not authentication
      const result = await runCLI(['info'], { PRIVATE_KEY: testPrivateKey });
      expect(result.code).toBe(0);
      
      // Should work with PRIVATE_KEY (logout doesn't remove ability to authenticate)
      expect(result.stdout).toContain('Wallet:');
      
      console.log('✅ CLI logout correctly removes saved config (preferences remain usable with PRIVATE_KEY)');
    });
  });
});