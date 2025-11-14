#!/usr/bin/env bun

import { GrapevineClient } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize SDK with simple configuration
  const grapevine = new GrapevineClient({
    network: 'testnet',  // or 'mainnet'
    privateKey: process.env.PRIVATE_KEY,
    debug: true
  });

  console.log('🍇 Grapevine SDK Example\n');

  try {
    // Example 1: Create a feed (one line!)
    console.log('Creating a new feed...');
    const feed = await grapevine.feeds.create({
      name: 'My Content Feed',
      description: 'A feed created with the Grapevine SDK',
      tags: ['example', 'sdk', 'test']
    });
    console.log(`✅ Feed created: ${feed.id}\n`);

    // Example 2: Add a simple text entry
    console.log('Adding a text entry...');
    const textEntry = await grapevine.entries.create(feed.id, {
      content: 'Hello from the Grapevine SDK! This is so much easier.',
      title: 'First Entry',
      is_free: true
    });
    console.log(`✅ Text entry created: ${textEntry.id}\n`);

    // Example 3: Add JSON data (auto-detects MIME type)
    console.log('Adding JSON data...');
    const jsonEntry = await grapevine.entries.create(feed.id, {
      content: {
        message: 'This is JSON data',
        timestamp: Date.now(),
        data: [1, 2, 3]
      },
      title: 'JSON Entry',
      is_free: true
    });
    console.log(`✅ JSON entry created: ${jsonEntry.id}\n`);

    // Example 4: Add a paid entry
    console.log('Adding a paid entry...');
    const paidEntry = await grapevine.entries.create(feed.id, {
      content: '# Premium Content\n\nThis is **premium** content that requires payment.',
      mime_type: 'text/markdown',
      title: 'Premium Article',
      is_free: false,
      price: {
        amount: '1000000', // 1 USDC
        currency: 'USDC'
      }
    });
    console.log(`✅ Paid entry created: ${paidEntry.id}\n`);

    // Example 5: List entries in the feed
    console.log('Listing entries...');
    const entries = await grapevine.entries.list(feed.id);
    console.log(`📝 Feed has ${entries.total_count} entries:`);
    entries.data.forEach(entry => {
      console.log(`  - ${entry.title} (${entry.is_free ? 'FREE' : 'PAID'})`);
    });

    // Example 6: Get my feeds
    console.log('\nGetting my feeds...');
    const myFeeds = await grapevine.feeds.myFeeds();
    console.log(`📁 You have ${myFeeds.total_count} feeds`);

    // Example 7: Search for feeds
    console.log('\nSearching for active feeds with tags...');
    const searchResults = await grapevine.feeds.list({
      tags: ['test'],
      is_active: true,
      page_size: 5
    });
    console.log(`🔍 Found ${searchResults.total_count} matching feeds`);

    // Display feed URL
    console.log(`\n✨ View your feed at:`);
    console.log(`   https://grapevine.markets/feeds/${feed.id}/entries`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
main().catch(console.error);