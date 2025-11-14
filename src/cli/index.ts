#!/usr/bin/env node

import { Command } from 'commander';
import { GrapevineClient } from '../client.js';
import fs from 'fs';
import path from 'path';

// Runtime detection
const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node';
const runtimeVersion = typeof Bun !== 'undefined' 
  ? (Bun as any).version 
  : process.version;

// Package info - hardcoded for standalone executable
const packageJson = {
  version: '0.1.4',
  name: '@pinata/grapevine-sdk'
};

// Initialize CLI
const program = new Command();

program
  .name('grapevine')
  .description('CLI for the Grapevine API')
  .version(packageJson.version)
  .option('-n, --network <network>', 'Network to use (testnet/mainnet)', 'testnet')
  .option('-k, --key <key>', 'Private key (or use PRIVATE_KEY env var)')
  .option('-d, --debug', 'Enable debug output');

// Get config file path (computed dynamically to respect env vars)
function getConfigPath(): { dir: string; file: string } {
  const configDir = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.grapevine');
  const configFile = path.join(configDir, 'config.json');
  return { dir: configDir, file: configFile };
}

// Load saved config
function loadConfig(): any {
  try {
    const { file } = getConfigPath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (error) {
    // Ignore errors
  }
  return {};
}

// Save config
function saveConfig(data: any): void {
  try {
    const { dir, file } = getConfigPath();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Helper to get client
function getClient(options: any, requireAuth: boolean = true): GrapevineClient {
  const savedConfig = loadConfig();
  const globalOpts = program.opts();
  const privateKey = options.key || globalOpts.key || process.env.PRIVATE_KEY;
  
  if (requireAuth && !privateKey) {
    console.error('❌ Private key required. Use --key flag');
    console.error('   You can also run "grapevine auth" to configure authentication');
    process.exit(1);
  }

  const config: any = {
    network: globalOpts.network || options.network || savedConfig.network,
    debug: globalOpts.debug || options.debug
  };
  
  // Only add private key if provided
  if (privateKey) {
    config.privateKey = privateKey;
  }

  return new GrapevineClient(config);
}

// Feed commands
const feedCmd = program.command('feed').description('Feed operations');

feedCmd
  .command('create <name>')
  .description('Create a new feed')
  .option('-d, --description <desc>', 'Feed description')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .action(async (name, options) => {
    try {
      const client = getClient(options);
      const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];
      
      console.log('Creating feed...');
      const feed = await client.feeds.create({
        name,
        description: options.description,
        tags
      });
      
      console.log(`✅ Feed created: ${feed.id}`);
      console.log(`   View at: https://grapevine.markets/feeds/${feed.id}/entries`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

feedCmd
  .command('list')
  .description('List feeds')
  .option('-o, --owner <address>', 'Filter by owner wallet address')
  .option('-t, --tags <tags>', 'Filter by comma-separated tags')
  .option('-a, --active', 'Only show active feeds')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action(async (options) => {
    try {
      const client = getClient(options);
      const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined;
      
      const feeds = await client.feeds.list({
        owner_wallet_address: options.owner,
        tags,
        is_active: options.active,
        page_size: parseInt(options.limit)
      });
      
      console.log(`Found ${feeds.total_count} feeds:\n`);
      feeds.data.forEach(feed => {
        console.log(`  📁 ${feed.name} (${feed.id})`);
        console.log(`     Entries: ${feed.total_entries}, Active: ${feed.is_active}`);
        if (feed.tags.length) console.log(`     Tags: ${feed.tags.join(', ')}`);
        console.log();
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

feedCmd
  .command('get <id>')
  .description('Get feed details')
  .action(async (id, options) => {
    try {
      const client = getClient(options);
      const feed = await client.feeds.get(id);
      
      console.log('\n📁 Feed Details:');
      console.log(`   Name: ${feed.name}`);
      console.log(`   ID: ${feed.id}`);
      console.log(`   Description: ${feed.description || 'None'}`);
      console.log(`   Owner: ${feed.owner_wallet_address}`);
      console.log(`   Entries: ${feed.total_entries}`);
      console.log(`   Active: ${feed.is_active}`);
      console.log(`   Tags: ${feed.tags.join(', ') || 'None'}`);
      console.log(`   URL: https://grapevine.markets/feeds/${feed.id}/entries`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Entry commands
const entryCmd = program.command('entry').description('Entry operations');

entryCmd
  .command('add <feedId> <content>')
  .description('Add an entry to a feed')
  .option('-t, --title <title>', 'Entry title')
  .option('-m, --mime <type>', 'MIME type')
  .option('-f, --file', 'Treat content as file path')
  .option('-p, --paid', 'Make this a paid entry')
  .option('--price <amount>', 'Price in USDC', '1000000')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (feedId, content, options) => {
    try {
      const client = getClient(options);
      
      let actualContent = content;
      if (options.file) {
        actualContent = fs.readFileSync(content, 'utf-8');
      }
      
      const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];
      
      console.log('Creating entry...');
      const entry = await client.entries.create(feedId, {
        content: actualContent,
        title: options.title,
        mime_type: options.mime,
        is_free: !options.paid,
        tags,
        price: options.paid ? {
          amount: options.price,
          currency: 'USDC'
        } : undefined
      });
      
      console.log(`✅ Entry created: ${entry.id}`);
      console.log(`   CID: ${entry.cid}`);
      console.log(`   Type: ${entry.is_free ? 'FREE' : 'PAID'}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

entryCmd
  .command('list <feedId>')
  .description('List entries in a feed')
  .option('-f, --free', 'Only show free entries')
  .option('-p, --paid', 'Only show paid entries')
  .option('-l, --limit <n>', 'Limit results', '20')
  .action(async (feedId, options) => {
    try {
      const client = getClient(options);
      
      const is_free = options.free ? true : options.paid ? false : undefined;
      
      const entries = await client.entries.list(feedId, {
        is_free,
        page_size: parseInt(options.limit)
      });
      
      console.log(`\nFound ${entries.total_count} entries:\n`);
      entries.data.forEach(entry => {
        console.log(`  📄 ${entry.title || 'Untitled'} (${entry.id})`);
        console.log(`     Type: ${entry.mime_type}, ${entry.is_free ? 'FREE' : 'PAID'}`);
        console.log(`     CID: ${entry.cid}`);
        if (entry.tags.length) console.log(`     Tags: ${entry.tags.join(', ')}`);
        console.log();
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Categories command
program
  .command('categories')
  .description('List available categories')
  .action(async (options) => {
    try {
      const client = getClient(options, false);
      const categories = await client.getCategories();
      
      console.log('\n📚 Available Categories:\n');
      categories.forEach(cat => {
        console.log(`  • ${cat.name}`);
        if (cat.description) console.log(`    ${cat.description}`);
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Auth commands
const authCmd = program.command('auth').description('Authentication management');

authCmd
  .command('login')
  .description('Configure authentication with private key')
  .option('-k, --key <key>', 'Private key')
  .option('-n, --network <network>', 'Default network (testnet/mainnet)')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const privateKey = options.key || globalOpts.key || process.env.PRIVATE_KEY;
      const network = options.network || globalOpts.network || 'testnet';
      
      if (!privateKey) {
        console.error('❌ Private key required. Use --key flag');
        console.error('\n⚠️  Security Note:');
        console.error('   Never share your private key with anyone.');
        console.error('   Consider using environment variables for production.');
        process.exit(1);
      }

      if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        console.error('❌ Invalid private key format. Must be 66 characters starting with 0x');
        process.exit(1);
      }

      // Test the key by creating a client
      const client = new GrapevineClient({
        privateKey,
        network: network as 'testnet' | 'mainnet'
      });

      const config = {
        network: network,
        wallet: client.getWalletAddress(),
        configuredAt: new Date().toISOString()
      };

      // Save config (without the private key - user must still provide via env or flag)
      saveConfig(config);

      const { file } = getConfigPath();
      console.log('\n✅ Authentication configured successfully!');
      console.log(`\n   Wallet: ${client.getWalletAddress()}`);
      console.log(`   Network: ${network}`);
      console.log(`\n   Config saved to: ${file}`);
      console.log('\n⚠️  Note: Private key is NOT saved. You must still provide it via:');
      console.log('   • PRIVATE_KEY environment variable');
      console.log('   • --key flag when running commands');
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

authCmd
  .command('status')
  .description('Show current authentication status')
  .action((options) => {
    const config = loadConfig();
    const globalOpts = program.opts();
    const privateKey = globalOpts.key || process.env.PRIVATE_KEY;
    
    console.log('\n🔐 Authentication Status\n');
    
    if (config.wallet) {
      console.log('   ✅ Configuration found');
      console.log(`   Wallet: ${config.wallet}`);
      console.log(`   Network: ${config.network || 'testnet'}`);
      console.log(`   Configured: ${config.configuredAt}`);
    } else {
      console.log('   ❌ No saved configuration found');
      console.log('   Run "grapevine auth login" to configure');
    }
    
    console.log('\n   Private Key Status:');
    if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
      const source = globalOpts.key ? '--key flag' : 'PRIVATE_KEY env var';
      console.log(`   ✅ Private key available (via ${source})`);
      try {
        const client = new GrapevineClient({ privateKey });
        console.log(`   Wallet: ${client.getWalletAddress()}`);
      } catch (error) {
        console.log('   ❌ Invalid private key');
      }
    } else {
      console.log('   ❌ No private key provided');
      console.log('   Use --key flag or PRIVATE_KEY env var');
    }
  });

authCmd
  .command('logout')
  .description('Remove saved authentication configuration')
  .action(() => {
    try {
      const { file } = getConfigPath();
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('\n✅ Authentication configuration removed');
      } else {
        console.log('\n⚠️  No configuration to remove');
      }
    } catch (error) {
      console.error('❌ Error removing configuration:', error);
    }
  });

// Info command
program
  .command('info')
  .description('Show SDK and network information')
  .action((options) => {
    const globalOpts = program.opts();
    const privateKey = globalOpts.key || process.env.PRIVATE_KEY;
    const network = globalOpts.network;
    const config = loadConfig();
    
    console.log('\n🍇 Grapevine SDK Info\n');
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   Runtime: ${runtime} ${runtimeVersion}`);
    console.log(`   Default Network: ${config.network || 'testnet'}`);
    
    if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
      try {
        const client = new GrapevineClient({ 
          privateKey,
          network: network || config.network 
        });
        console.log(`   Active Network: ${client.isTestNetwork() ? 'Testnet' : 'Mainnet'}`);
        console.log(`   Chain: ${client.getNetwork()}`);
        console.log(`   Wallet: ${client.getWalletAddress()}`);
      } catch (error) {
        console.log('   ❌ Invalid private key configuration');
      }
    } else if (config.wallet) {
      // Show saved config info even without private key
      console.log(`   Active Network: ${config.network === 'mainnet' ? 'Mainnet' : 'Testnet'}`);
      console.log(`   Wallet: ${config.wallet}`);
      console.log('   ⚠️  Private key not provided - some operations require --key flag');
    } else {
      console.log('   ⚠️  No authentication configured');
      console.log('   Run "grapevine auth login" to configure');
    }
    
    if (config.configuredAt) {
      console.log(`\n   Last configured: ${config.configuredAt}`);
    }
  });

// Parse arguments
program.parse();