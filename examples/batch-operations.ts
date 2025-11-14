#!/usr/bin/env bun

import { GrapevineClient } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const grapevine = new GrapevineClient({
    privateKey: process.env.PRIVATE_KEY,
    network: 'testnet'
  });

  console.log('🍇 Batch Operations Example\n');

  // Create or use existing feed
  const feedId = process.env.EXISTING_FEED_ID || await createFeed(grapevine);

  // Example 1: Batch create entries with progress tracking
  console.log('📦 Batch creating entries...\n');
  
  const contents = [
    { content: 'Entry 1: Plain text', title: 'Entry 1' },
    { content: { data: 'Entry 2: JSON' }, title: 'Entry 2' },
    { content: '# Entry 3: Markdown', title: 'Entry 3', mime_type: 'text/markdown' },
    { content: '<h1>Entry 4: HTML</h1>', title: 'Entry 4', mime_type: 'text/html' },
    { 
      content: '<svg><circle cx="50" cy="50" r="40"/></svg>', 
      title: 'Entry 5', 
      mime_type: 'image/svg+xml' 
    }
  ];

  const results = await grapevine.entries.batchCreate(
    feedId,
    contents,
    {
      onProgress: (completed, total) => {
        console.log(`  Progress: ${completed}/${total} (${Math.round(completed/total * 100)}%)`);
      },
      delayMs: 500 // Rate limiting delay
    }
  );

  console.log(`\n✅ Batch complete:`);
  console.log(`  - Successful: ${results.successful.length}`);
  console.log(`  - Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed entries:');
    results.failed.forEach(({ input, error }) => {
      console.log(`  - ${input.title}: ${error}`);
    });
  }

  // Example 2: Paginate through feeds
  console.log('\n📄 Paginating through feeds...\n');
  
  let totalFeeds = 0;
  for await (const batch of grapevine.feeds.paginate({ is_active: true }, 5)) {
    console.log(`  Fetched batch with ${batch.length} feeds`);
    totalFeeds += batch.length;
    
    // Process each batch
    batch.forEach(feed => {
      console.log(`    - ${feed.name} (${feed.total_entries} entries)`);
    });
    
    // Stop after 3 batches for demo
    if (totalFeeds >= 15) break;
  }

  console.log(`\n📊 Total feeds processed: ${totalFeeds}`);

  // Example 3: Paginate through entries
  console.log('\n📄 Paginating through entries...\n');
  
  let totalEntries = 0;
  for await (const batch of grapevine.entries.paginate(feedId, { is_free: true }, 10)) {
    console.log(`  Fetched batch with ${batch.length} entries`);
    totalEntries += batch.length;
    
    // Stop after 2 batches for demo
    if (totalEntries >= 20) break;
  }

  console.log(`\n📊 Total entries processed: ${totalEntries}`);

  // Example 4: Bulk operations with error handling
  console.log('\n🔄 Performing bulk operations...\n');
  
  const operations = [
    grapevine.feeds.list({ tags: ['test'] }),
    grapevine.feeds.list({ min_entries: 5 }),
    grapevine.getCategories()
  ];

  const [testFeeds, activeFeeds, categories] = await Promise.all(operations);
  
  console.log('Results:');
  console.log(`  - Feeds with 'test' tag: ${testFeeds.total_count}`);
  console.log(`  - Feeds with 5+ entries: ${activeFeeds.total_count}`);
  console.log(`  - Available categories: ${categories.length}`);
}

async function createFeed(grapevine: GrapevineClient): Promise<string> {
  console.log('Creating test feed...');
  const feed = await grapevine.feeds.create({
    name: 'Batch Operations Test Feed',
    description: 'Testing batch operations',
    tags: ['batch', 'test']
  });
  console.log(`✅ Created feed: ${feed.id}\n`);
  return feed.id;
}

// Run the example
main().catch(console.error);