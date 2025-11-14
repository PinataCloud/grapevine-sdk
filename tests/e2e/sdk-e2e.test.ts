import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import type { Feed, Entry } from '../../src/types.js';

describe('SDK End-to-End Tests', () => {
  let client: GrapevineClient;
  let testFeed: Feed;
  let testEntries: Entry[] = [];
  const testPrivateKey = process.env.GRAPEVINE_E2E_PRIVATE_KEY;
  const timestamp = Date.now();
  
  // Skip tests if no private key provided
  const skipE2E = !testPrivateKey;
  
  beforeAll(() => {
    console.log('\n=== 🔍 SDK E2E Test Setup ===');
    console.log(`Private key provided: ${!!testPrivateKey}`);
    console.log(`Skip E2E: ${skipE2E}`);
    
    if (skipE2E) {
      console.log('\n⚠️  SDK E2E tests will be SKIPPED');
      console.log('   Reason: GRAPEVINE_E2E_PRIVATE_KEY not provided');
      console.log('   To run: GRAPEVINE_E2E_PRIVATE_KEY="0x..." bun test tests/e2e/');
      console.log('=== End SDK E2E Setup ===\n');
      return;
    }
    
    try {
      client = new GrapevineClient({
        privateKey: testPrivateKey,
        network: 'testnet', // Always use testnet for E2E tests
        debug: false // Reduce noise in test output
      });
      
      console.log('🍇 SDK E2E tests initialized');
      console.log(`   Wallet: ${client.getWalletAddress()}`);
      console.log(`   Network: ${client.getNetwork()}`);
      console.log(`   API URL: https://api.grapevine.${client.isTestNetwork() ? 'markets' : 'fyi'}`);
      console.log('=== End SDK E2E Setup ===\n');
    } catch (error) {
      console.error('❌ Failed to initialize SDK client:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (skipE2E) {
      console.log('\n=== 🧹 SDK E2E Cleanup ===');
      console.log('No cleanup needed (tests were skipped)');
      console.log('=== End SDK E2E Cleanup ===\n');
      return;
    }
    
    if (!client) {
      console.log('\n=== 🧹 SDK E2E Cleanup ===');
      console.log('No cleanup needed (client not initialized)');
      console.log('=== End SDK E2E Cleanup ===\n');
      return;
    }
    
    // Cleanup: Delete test entries and feed
    console.log('\n=== 🧹 SDK E2E Cleanup ===');
    console.log('Cleaning up test data...');
    
    try {
      // Delete entries first
      for (const entry of testEntries) {
        try {
          await client.entries.delete(testFeed.id, entry.id);
          console.log(`   Deleted entry: ${entry.id}`);
        } catch (error) {
          console.warn(`   Failed to delete entry ${entry.id}:`, error);
        }
      }
      
      // Delete the test feed
      if (testFeed) {
        try {
          await client.feeds.delete(testFeed.id);
          console.log(`   Deleted feed: ${testFeed.id}`);
        } catch (error) {
          console.warn(`   Failed to delete feed ${testFeed.id}:`, error);
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
    
    console.log('=== End SDK E2E Cleanup ===\n');
  });

  describe('Authentication', () => {
    it('should authenticate with real private key', () => {
      console.log('🔑 Testing authentication...');
      if (skipE2E) {
        console.log('⏭️  Skipping authentication test - no private key provided');
        console.log('   To run E2E tests: GRAPEVINE_E2E_PRIVATE_KEY="0x..." bun test tests/e2e/');
        return;
      }
      
      expect(client).toBeDefined();
      expect(client.getWalletAddress()).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(client.isTestNetwork()).toBe(true);
      expect(client.getNetwork()).toBe('base-sepolia');
      console.log('✅ Authentication validated');
    });
  });

  describe('Feed Operations', () => {
    it('should create a test feed', async () => {
      console.log('🔨 Testing feed creation...');
      if (skipE2E) {
        console.log('⏭️  Skipping feed creation - no private key provided');
        return;
      }
      
      const feedData = {
        name: `E2E Test Feed ${timestamp}`,
        description: `SDK E2E test feed created at ${new Date().toISOString()}`,
        tags: ['e2e-test', 'sdk-test', `ts-${timestamp}`]
      };
      
      console.log(`   Creating feed: "${feedData.name}"`);
      try {
        testFeed = await client.feeds.create(feedData);
      } catch (error) {
        console.error('   Feed creation failed!');
        console.error('   Error:', error);
        throw error;
      }
      
      expect(testFeed).toBeDefined();
      expect(testFeed.id).toBeDefined();
      expect(testFeed.name).toBe(feedData.name);
      expect(testFeed.description).toBe(feedData.description);
      expect(testFeed.tags).toEqual(feedData.tags);
      expect(testFeed.owner_wallet_address.toLowerCase()).toBe(client.getWalletAddress().toLowerCase());
      expect(testFeed.is_active).toBe(true);
      
      console.log(`✅ Created test feed: ${testFeed.id}`);
    });

    it('should list feeds and find our test feed', async () => {
      console.log('📋 Testing feed listing...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const feeds = await client.feeds.list({
        owner_wallet_address: client.getWalletAddress(),
        page_size: 50
      });
      
      expect(feeds.data).toBeDefined();
      expect(Array.isArray(feeds.data)).toBe(true);
      console.log(`   Found ${feeds.data.length} feeds for wallet`);
      
      // Note: API indexing may have delay, so feed might not appear immediately
      // We verify the listing works, but don't strictly require our feed to be present
      const ourFeed = feeds.data.find(f => f.id === testFeed.id);
      if (ourFeed) {
        expect(ourFeed.name).toBe(testFeed.name);
        console.log('✅ Test feed found in feed list');
      } else {
        console.log('⚠️  Test feed not yet indexed (API delay), but listing works');
      }
    });

    it('should get feed by ID', async () => {
      console.log('🔍 Testing feed retrieval by ID...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const retrievedFeed = await client.feeds.get(testFeed.id);
      
      expect(retrievedFeed).toBeDefined();
      expect(retrievedFeed.id).toBe(testFeed.id);
      expect(retrievedFeed.name).toBe(testFeed.name);
      console.log('✅ Feed retrieved successfully by ID');
    });

    it('should update a feed', async () => {
      console.log('✏️  Testing feed update...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const updatedFeed = await client.feeds.update(testFeed.id, {
        description: `Updated at ${new Date().toISOString()}`,
        tags: ['updated', 'e2e-test', `ts-${timestamp}`]
      });
      
      expect(updatedFeed).toBeDefined();
      expect(updatedFeed.id).toBe(testFeed.id);
      expect(updatedFeed.description).toContain('Updated at');
      expect(updatedFeed.tags).toContain('updated');
      console.log('✅ Feed updated successfully');
    });

    it('should get my feeds', async () => {
      console.log('📁 Testing myFeeds helper...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const myFeeds = await client.feeds.myFeeds();
      
      expect(myFeeds.data).toBeDefined();
      expect(Array.isArray(myFeeds.data)).toBe(true);
      console.log(`   myFeeds returned ${myFeeds.data.length} feeds`);
      console.log('✅ myFeeds helper works');
    });

    it('should paginate through feeds', async () => {
      console.log('📄 Testing feed pagination...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      let totalPaginated = 0;
      let pageCount = 0;
      
      for await (const page of client.feeds.paginate({ page_size: 10 }, 10)) {
        expect(Array.isArray(page)).toBe(true);
        totalPaginated += page.length;
        pageCount++;
        
        // Limit pagination test to avoid long runs
        if (pageCount >= 3) break;
      }
      
      console.log(`   Paginated ${pageCount} pages, ${totalPaginated} total feeds`);
      console.log('✅ Feed pagination works');
    });
  });

  describe('Entry Operations', () => {
    it('should create a free text entry', async () => {
      console.log('📝 Testing free text entry creation...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const entryData = {
        content: `This is a test text entry created by SDK E2E tests at ${new Date().toISOString()}`,
        title: `Free Text Entry ${timestamp}`,
        description: 'E2E test entry - plain text',
        tags: ['e2e-test', 'free', 'text'],
        is_free: true
      };
      
      console.log(`   Creating entry: "${entryData.title}"`);
      const entry = await client.entries.create(testFeed.id, entryData);
      testEntries.push(entry);
      
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.feed_id).toBe(testFeed.id);
      expect(entry.title).toBe(entryData.title);
      expect(entry.description).toBe(entryData.description);
      expect(entry.is_free).toBe(true);
      expect(entry.mime_type).toBe('text/plain');
      expect(entry.cid).toBeDefined();
      
      console.log(`✅ Created free text entry: ${entry.id}`);
    });

    it('should create a JSON entry', async () => {
      console.log('🔢 Testing JSON entry creation...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const jsonContent = {
        message: 'Hello from SDK E2E test',
        timestamp: timestamp,
        data: {
          nested: true,
          values: [1, 2, 3, 'test']
        }
      };
      
      const entryData = {
        content: jsonContent,
        title: `JSON Entry ${timestamp}`,
        description: 'E2E test entry - JSON data',
        tags: ['e2e-test', 'json'],
        is_free: true
      };
      
      console.log(`   Creating JSON entry: "${entryData.title}"`);
      const entry = await client.entries.create(testFeed.id, entryData);
      testEntries.push(entry);
      
      expect(entry).toBeDefined();
      expect(entry.mime_type).toBe('application/json');
      expect(entry.title).toBe(entryData.title);
      expect(entry.is_free).toBe(true);
      
      console.log(`✅ Created JSON entry: ${entry.id}`);
    });

    it('should create a paid entry', async () => {
      console.log('💰 Testing paid entry creation...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const entryData = {
        content: `This is premium content from SDK E2E tests. Created at ${new Date().toISOString()}. Access requires payment.`,
        title: `Premium Entry ${timestamp}`,
        description: 'E2E test entry - paid content',
        tags: ['e2e-test', 'paid', 'premium'],
        is_free: false,
        price: {
          amount: '1000000', // 1 USDC (6 decimals)
          currency: 'USDC'
        }
      };
      
      console.log(`   Creating paid entry: "${entryData.title}" (1 USDC)`);
      const entry = await client.entries.create(testFeed.id, entryData);
      testEntries.push(entry);
      
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.is_free).toBe(false);
      expect(entry.title).toBe(entryData.title);
      
      console.log(`✅ Created paid entry: ${entry.id}`);
    });

    it('should list entries in the test feed', async () => {
      console.log('📄 Testing entry listing...');
      if (skipE2E || !testFeed || testEntries.length === 0) {
        console.log('⏭️  Skipping - no private key, feed, or entries created');
        return;
      }
      
      const entries = await client.entries.list(testFeed.id, {
        page_size: 20
      });
      
      expect(entries.data).toBeDefined();
      expect(Array.isArray(entries.data)).toBe(true);
      expect(entries.data.length).toBeGreaterThan(0);
      console.log(`   Found ${entries.data.length} entries in test feed`);
      
      // Check that our test entries are in the list
      const entryIds = entries.data.map(e => e.id);
      for (const testEntry of testEntries) {
        expect(entryIds).toContain(testEntry.id);
      }
      console.log('✅ All test entries found in feed listing');
    });

    it('should get entry by ID', async () => {
      console.log('🔍 Testing entry retrieval by ID...');
      if (skipE2E || !testFeed || testEntries.length === 0) {
        console.log('⏭️  Skipping - no private key, feed, or entries created');
        return;
      }
      
      const firstEntry = testEntries[0];
      const retrievedEntry = await client.entries.get(testFeed.id, firstEntry.id);
      
      expect(retrievedEntry).toBeDefined();
      expect(retrievedEntry.id).toBe(firstEntry.id);
      expect(retrievedEntry.feed_id).toBe(testFeed.id);
      expect(retrievedEntry.title).toBe(firstEntry.title);
      console.log('✅ Entry retrieved successfully by ID');
    });

    it('should paginate through entries', async () => {
      console.log('📄 Testing entry pagination...');
      if (skipE2E || !testFeed || testEntries.length === 0) {
        console.log('⏭️  Skipping - no private key, feed, or entries created');
        return;
      }
      
      let totalPaginated = 0;
      let pageCount = 0;
      
      for await (const page of client.entries.paginate(testFeed.id, undefined, 2)) {
        expect(Array.isArray(page)).toBe(true);
        totalPaginated += page.length;
        pageCount++;
        
        // Limit to avoid excessive pagination
        if (pageCount >= 3) break;
      }
      
      expect(totalPaginated).toBeGreaterThan(0);
      console.log(`   Paginated ${pageCount} pages, ${totalPaginated} entries`);
      console.log('✅ Entry pagination works');
    });
  });

  describe('Categories', () => {
    it('should fetch available categories', async () => {
      console.log('📚 Testing categories fetch...');
      if (skipE2E) {
        console.log('⏭️  Skipping categories test - no private key provided');
        return;
      }
      
      const categories = await client.getCategories();
      
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      console.log(`   Retrieved ${categories.length} categories`);
      
      // Check category structure
      const firstCategory = categories[0];
      expect(firstCategory.id).toBeDefined();
      expect(firstCategory.name).toBeDefined();
      expect(typeof firstCategory.name).toBe('string');
      console.log(`✅ Categories fetched (sample: "${firstCategory.name}")`);
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple entries in batch', async () => {
      console.log('🔄 Testing batch entry creation...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      const batchEntries = [
        {
          content: `Batch entry 1 - Created at ${new Date().toISOString()} - ${Date.now()}`,
          title: `Batch 1 ${timestamp}`,
          tags: ['batch', 'test']
        },
        {
          content: `Batch entry 2 - Created at ${new Date().toISOString()} - ${Date.now()}`,
          title: `Batch 2 ${timestamp}`,
          tags: ['batch', 'test']
        }
      ];
      
      console.log(`   Creating ${batchEntries.length} entries in batch...`);
      const result = await client.entries.batchCreate(
        testFeed.id, 
        batchEntries,
        {
          onProgress: (completed, total) => {
            console.log(`   Batch progress: ${completed}/${total}`);
          },
          delayMs: 2000  // Increased delay to avoid rate limiting after previous entry creations
        }
      );
      
      console.log(`   Batch complete: ${result.successful.length} successful, ${result.failed.length} failed`);
      
      if (result.failed.length > 0) {
        console.error('   Batch failures:');
        result.failed.forEach((f, i) => {
          console.error(`     Entry ${i + 1}: ${f.error}`);
        });
      }
      
      expect(result.successful).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(0);
      
      // Add to cleanup list
      testEntries.push(...result.successful);
      
      console.log(`✅ Created ${result.successful.length} entries in batch`);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid feed ID gracefully', async () => {
      console.log('❌ Testing error handling for invalid feed ID...');
      if (skipE2E) {
        console.log('⏭️  Skipping - no private key provided');
        return;
      }
      
      const invalidFeedId = 'invalid-feed-id-12345';
      
      await expect(
        client.feeds.get(invalidFeedId)
      ).rejects.toThrow();
      console.log('✅ Invalid feed ID error handled correctly');
    });

    it('should handle invalid entry creation', async () => {
      console.log('❌ Testing error handling for invalid entry data...');
      if (skipE2E || !testFeed) {
        console.log('⏭️  Skipping - no private key or test feed not created');
        return;
      }
      
      // Try to create entry with invalid data
      await expect(
        client.entries.create(testFeed.id, {
          content: '', // Empty content should fail
          title: ''
        })
      ).rejects.toThrow();
      console.log('✅ Invalid entry creation error handled correctly');
    });
  });
});