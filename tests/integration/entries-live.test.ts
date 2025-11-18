import { describe, it, expect, beforeAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import type { Entry, Feed } from '../../src/types.js';

describe('Entries API Integration (Live)', () => {
  let client: GrapevineClient;
  let clientWithAuth: GrapevineClient;
  let testFeed: Feed | null = null;
  const testPrivateKey = process.env.PRIVATE_KEY;

  beforeAll(async () => {
    client = new GrapevineClient({ 
      network: 'testnet',
      debug: false 
    });

    if (testPrivateKey) {
      clientWithAuth = new GrapevineClient({
        network: 'testnet',
        privateKey: testPrivateKey,
        debug: false
      });
    }

    // Find a feed with sufficient entries for pagination testing (prefer randomization)
    const feedsResponse = await client.feeds.list({ page_size: 100 });
    
    // Categorize feeds by entry count
    const highEntryFeeds = feedsResponse.data.filter(f => f.total_entries >= 5);
    const mediumEntryFeeds = feedsResponse.data.filter(f => f.total_entries >= 3 && f.total_entries < 5);
    const anyEntryFeeds = feedsResponse.data.filter(f => f.total_entries > 0);
    
    // Randomly select from available feeds (prefer higher entry counts)
    if (highEntryFeeds.length > 0) {
      const randomIndex = Math.floor(Math.random() * highEntryFeeds.length);
      testFeed = highEntryFeeds[randomIndex];
      console.log(`🎲 Randomly selected high-entry feed: ${testFeed.name} (${testFeed.total_entries} entries)`);
    } else if (mediumEntryFeeds.length > 0) {
      const randomIndex = Math.floor(Math.random() * mediumEntryFeeds.length);
      testFeed = mediumEntryFeeds[randomIndex];
      console.log(`🎲 Randomly selected medium-entry feed: ${testFeed.name} (${testFeed.total_entries} entries)`);
    } else if (anyEntryFeeds.length > 0) {
      const randomIndex = Math.floor(Math.random() * anyEntryFeeds.length);
      testFeed = anyEntryFeeds[randomIndex];
      console.log(`🎲 Randomly selected any-entry feed: ${testFeed.name} (${testFeed.total_entries} entries)`);
    } else {
      testFeed = null;
    }
    
    console.log(`📊 Feed distribution: ${highEntryFeeds.length} high-entry, ${mediumEntryFeeds.length} medium-entry, ${anyEntryFeeds.length} total with entries`);
  });

  describe('entries.list() - Live API', () => {
    it('should list entries from live API', async () => {
      if (!testFeed) {
        console.log('⚠️ Skipping entries test - no feeds with entries found');
        return;
      }

      const response = await client.entries.list(testFeed.id);
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.total_count).toBe('number');
      expect(response.next_page_token === undefined || typeof response.next_page_token === 'string').toBe(true);
      
      if (response.data.length > 0) {
        const entry = response.data[0];
        expect(typeof entry.id).toBe('string');
        expect(typeof entry.feed_id).toBe('string');
        expect(entry.feed_id).toBe(testFeed.id);
        expect(typeof entry.cid).toBe('string');
        expect(typeof entry.mime_type).toBe('string');
        expect(typeof entry.is_free).toBe('boolean');
      }
    });

    it('should handle pagination with page_size', async () => {
      if (!testFeed) {
        console.log('⚠️ Skipping entries pagination test - no feeds with entries found');
        return;
      }

      const response = await client.entries.list(testFeed.id, { page_size: 2 });
      
      expect(response.data.length).toBeLessThanOrEqual(2);
      expect(typeof response.total_count).toBe('number');
      
      // If there are more than 2 entries, should have next_page_token
      if (testFeed.total_entries > 2 && response.data.length === 2) {
        expect(typeof response.next_page_token).toBe('string');
      }
      
      console.log(`📊 Testing pagination on feed "${testFeed.name}" with ${testFeed.total_entries} entries`);
    });

    it('should work with pagination generator', async () => {
      if (!testFeed) {
        console.log('⚠️ Skipping entries generator test - no feeds with entries found');
        return;
      }

      let pageCount = 0;
      let totalEntries = 0;
      
      for await (const batch of client.entries.paginate(testFeed.id, { page_size: 2 })) {
        pageCount++;
        totalEntries += batch.length;
        expect(batch).toBeInstanceOf(Array);
        
        batch.forEach(entry => {
          expect(entry.feed_id).toBe(testFeed!.id);
        });
        
        if (pageCount >= 2) break; // Test first 2 pages
      }
      
      expect(pageCount).toBeGreaterThan(0);
      expect(totalEntries).toBeGreaterThan(0);
    });

    it('should respect pagination boundaries using next_page_token for entries', async () => {
      if (!testFeed) {
        console.log('⚠️ Skipping entries boundary test - no feeds with entries found');
        return;
      }

      console.log(`🔍 Testing boundary pagination on feed "${testFeed.name}" with ${testFeed.total_entries} entries`);
      
      if (testFeed.total_entries <= 2) {
        console.log('⚠️ Feed has too few entries for boundary testing, verifying single page behavior');
        const response = await client.entries.list(testFeed.id, { page_size: 2 });
        expect(response.data.length).toBe(testFeed.total_entries);
        expect(response.next_page_token).toBeUndefined();
        return;
      }

      let pageCount = 0;
      let allEntries: any[] = [];
      let lastToken: string | undefined;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const response = await client.entries.list(testFeed.id, { 
          page_size: 2, 
          page_token: lastToken 
        });
        
        pageCount++;
        allEntries.push(...response.data);
        
        // Validate response structure
        expect(typeof response.total_count).toBe('number');
        expect(response.next_page_token === undefined || typeof response.next_page_token === 'string').toBe(true);
        
        // All entries should belong to the test feed
        response.data.forEach(entry => {
          expect(entry.feed_id).toBe(testFeed!.id);
        });
        
        hasMorePages = !!response.next_page_token;
        lastToken = response.next_page_token;
        
        if (pageCount > 20) {
          throw new Error('Entry pagination test exceeded 20 pages');
        }
      }
      
      expect(pageCount).toBeGreaterThan(0);
      expect(allEntries.length).toBeGreaterThan(0);
      expect(allEntries.length).toBe(testFeed.total_entries);
      
      // Verify we got unique entries (no duplicates across pages)
      const uniqueIds = new Set(allEntries.map(e => e.id));
      expect(uniqueIds.size).toBe(allEntries.length);
      
      console.log(`✅ Successfully paginated through ${allEntries.length} entries in ${pageCount} pages`);
    });

    it('should handle maximum page_size for entries', async () => {
      if (!testFeed) {
        console.log('⚠️ Skipping entries large page_size test - no feeds with entries found');
        return;
      }

      const pageSize = Math.min(testFeed.total_entries, 100);
      const response = await client.entries.list(testFeed.id, { page_size: pageSize });
      
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.total_count).toBe('number');
      expect(response.data.length).toBeLessThanOrEqual(pageSize);
      expect(response.next_page_token === undefined || typeof response.next_page_token === 'string').toBe(true);
      
      response.data.forEach(entry => {
        expect(entry.feed_id).toBe(testFeed!.id);
      });
    });

    it('should handle entries pagination generator', async () => {
      if (!testFeed) {
        console.log('⚠️ Skipping entries generator test - no feeds with entries found');
        return;
      }

      let pageCount = 0;
      let totalEntries = 0;
      const seenIds = new Set<string>();
      
      for await (const batch of client.entries.paginate(testFeed.id, { page_size: 1 })) {
        pageCount++;
        totalEntries += batch.length;
        
        expect(batch).toBeInstanceOf(Array);
        expect(batch.length).toBeGreaterThan(0);
        expect(batch.length).toBeLessThanOrEqual(100);
        
        batch.forEach(entry => {
          expect(entry.feed_id).toBe(testFeed!.id);
          expect(seenIds.has(entry.id)).toBe(false);
          seenIds.add(entry.id);
        });
      }
      
      expect(pageCount).toBeGreaterThan(0);
      expect(totalEntries).toBeGreaterThan(0);
      expect(totalEntries).toBe(testFeed.total_entries);
      expect(totalEntries).toBe(seenIds.size);
    });
  });

  describe('entries with authentication', () => {
    it('should create entry if authenticated', async () => {
      if (!clientWithAuth) {
        console.log('⚠️ Skipping entry create test - no PRIVATE_KEY provided');
        return;
      }

      // First try to find or create a feed we own
      const myFeeds = await clientWithAuth.feeds.myFeeds();
      let targetFeed: Feed | null = null;
      
      if (myFeeds.data.length > 0) {
        targetFeed = myFeeds.data[0];
      } else {
        // Try to create a feed first
        try {
          const createdFeed = await clientWithAuth.feeds.create({
            name: `Entry Test Feed ${Date.now()}`,
            description: 'Feed for entry testing',
            tags: ['test']
          });
          targetFeed = createdFeed;
        } catch (error) {
          if (error.message.includes('402') || error.message.includes('payment')) {
            console.log('⚠️ Skipping entry test - payment required for feed creation');
            return;
          }
          throw error;
        }
      }

      if (!targetFeed) {
        console.log('⚠️ Skipping entry test - no accessible feed');
        return;
      }

      try {
        const entryContent = `Test entry content ${Date.now()}`;
        const createdEntry = await clientWithAuth.entries.create(targetFeed.id, {
          content: entryContent,
          title: 'Integration Test Entry',
          is_free: true
        });
        
        expect(createdEntry.id).toBeDefined();
        expect(createdEntry.feed_id).toBe(targetFeed.id);
        expect(createdEntry.title).toBe('Integration Test Entry');
        expect(createdEntry.is_free).toBe(true);
        
      } catch (error) {
        // If it's a payment error, that's expected for some test environments
        if (error.message.includes('402') || error.message.includes('payment')) {
          console.log('⚠️ Skipping entry create test - payment required');
          return;
        }
        throw error;
      }
    });
  });
});