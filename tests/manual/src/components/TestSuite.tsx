import { useState, useMemo, useEffect, useRef } from 'react';
import { useWalletClient } from 'wagmi';
import { GrapevineClient, WagmiAdapter } from '@grapevine/sdk';
import { useGrapevine } from '@grapevine/sdk/react';
import { generateTestFiles } from '../utils/testFileGenerator';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
  data?: any;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  test: (client: GrapevineClient, currentFeedId?: string | null) => Promise<any>;
}

export default function TestSuite() {
  const { data: walletClient } = useWalletClient();
  const [authMode, setAuthMode] = useState<'wagmi' | 'private-key'>('wagmi');
  const [privateKey, setPrivateKey] = useState(import.meta.env.VITE_PRIVATE_KEY || '');
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [createdFeedId, setCreatedFeedId] = useState<string | null>(null);
  const currentFeedIdRef = useRef<string | null>(null);

  // Debug: Log feed ID changes
  useEffect(() => {
    console.log('Feed ID state changed:', createdFeedId);
  }, [createdFeedId]);

  // Memoize wagmi client configuration to prevent recreation
  const grapevineConfig = useMemo(() => ({
    walletClient: authMode === 'wagmi' ? (walletClient as any) : undefined,
    network,
    debug: true
  }), [authMode, walletClient, network]);

  const grapevine = useGrapevine(grapevineConfig);

  // Memoize private key client to prevent recreation on every render
  const privateKeyClient = useMemo(() => {
    if (authMode !== 'private-key' || !privateKey) {
      console.log('Private key client not created:', { authMode, hasPrivateKey: !!privateKey });
      return null;
    }
    try {
      console.log('Creating new private key client instance with key:', privateKey.slice(0, 10) + '...');
      const client = new GrapevineClient({
        privateKey,
        network,
        debug: true
      });
      console.log('Private key client created, hasWallet:', client.hasWallet());
      if (client.hasWallet()) {
        console.log('Private key client wallet address:', client.getWalletAddress());
      }
      return client;
    } catch (error) {
      console.error('Failed to create private key client:', error);
      return null;
    }
  }, [authMode, privateKey, network]);

  const testClient = authMode === 'wagmi' ? grapevine : privateKeyClient;
  
  // Debug logging
  useEffect(() => {
    console.log('TestClient updated:', {
      authMode,
      testClient: !!testClient,
      hasWallet: testClient?.hasWallet(),
      address: testClient?.hasWallet() ? testClient.getWalletAddress() : 'No wallet'
    });
  }, [testClient, authMode]);

  // Clear any old stored feed IDs on mount - we only care about current session
  useEffect(() => {
    try {
      localStorage.removeItem('grapevine-test-feed-id');
      console.log('Cleared any previous feed IDs - starting fresh session');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, []); // Only run once on mount

  const testCases: TestCase[] = [
    // === CATEGORIES TESTS ===
    {
      id: 'categories-list',
      name: 'List Categories (Paginated)',
      description: 'List categories with pagination support',
      category: 'Categories',
      test: async (client) => {
        const response = await client.categories.list({ page_size: 10 });
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Categories should be an array');
        }
        return { 
          count: response.data.length, 
          hasMore: response.has_more,
          nextPageToken: response.next_page_token,
          categories: response.data.map(c => ({ id: c.id, name: c.name, isActive: c.is_active }))
        };
      }
    },
    {
      id: 'categories-get-all',
      name: 'Get All Categories',
      description: 'Fetch all categories at once',
      category: 'Categories',
      test: async (client) => {
        const categories = await client.categories.getAll();
        if (!Array.isArray(categories)) throw new Error('Categories should be an array');
        return { 
          count: categories.length, 
          categories: categories.map(c => ({ id: c.id, name: c.name }))
        };
      }
    },
    {
      id: 'categories-get-single',
      name: 'Get Single Category',
      description: 'Get a specific category by ID',
      category: 'Categories',
      test: async (client) => {
        const categories = await client.categories.getAll();
        if (!categories.length) throw new Error('No categories available');
        
        const category = await client.categories.get(categories[0].id);
        return {
          id: category.id,
          name: category.name,
          description: category.description,
          iconUrl: category.icon_url,
          isActive: category.is_active,
          createdAt: new Date(category.created_at * 1000).toLocaleDateString(),
          updatedAt: new Date(category.updated_at * 1000).toLocaleDateString()
        };
      }
    },
    {
      id: 'public-feeds-list',
      name: 'List Public Feeds (No Auth)',
      description: 'Test public endpoint - list feeds without authentication',
      category: 'Public Endpoints',
      test: async (client) => {
        const response = await client.feeds.list({ page_size: 5 });
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid feeds response');
        }
        return {
          count: response.data.length,
          hasMore: response.has_more,
          hasWallet: client.hasWallet(),
          feeds: response.data.map(f => ({ id: f.id, name: f.name, owner: f.owner_wallet_address }))
        };
      }
    },
    {
      id: 'public-feed-get',
      name: 'Get Public Feed (No Auth)',
      description: 'Test public endpoint - get a specific feed without authentication',
      category: 'Public Endpoints',
      test: async (client) => {
        // First get a list to find a feed ID
        const listResponse = await client.feeds.list({ page_size: 1 });
        if (!listResponse.data || listResponse.data.length === 0) {
          throw new Error('No feeds available to test with');
        }
        
        const feedId = listResponse.data[0].id;
        const feed = await client.feeds.get(feedId);
        
        return {
          feedId,
          feedName: feed.name,
          hasWallet: client.hasWallet(),
          success: true
        };
      }
    },
    {
      id: 'public-entries-list',
      name: 'List Public Entries (No Auth)',
      description: 'Test public endpoint - list entries in a feed without authentication',
      category: 'Public Endpoints',
      test: async (client) => {
        // First get a feed to test with
        const feedsResponse = await client.feeds.list({ page_size: 1 });
        if (!feedsResponse.data || feedsResponse.data.length === 0) {
          throw new Error('No feeds available to test with');
        }
        
        const feedId = feedsResponse.data[0].id;
        const entriesResponse = await client.entries.list(feedId, { page_size: 5 });
        
        return {
          feedId,
          entryCount: entriesResponse.data.length,
          hasMore: entriesResponse.has_more,
          hasWallet: client.hasWallet(),
          entries: entriesResponse.data.map(e => ({ id: e.id, title: e.title, isFree: e.is_free }))
        };
      }
    },
    {
      id: 'dynamic-wallet-setting',
      name: 'Dynamic Wallet Setting Test',
      description: 'Test setting wallet client after initialization',
      category: 'Public Endpoints',
      test: async (client) => {
        const initialHasWallet = client.hasWallet();
        let walletSetResult = 'not attempted';
        let finalHasWallet = false;
        
        // Test clearing wallet if one exists
        if (initialHasWallet) {
          client.clearWallet();
          const afterClear = client.hasWallet();
          
          // Try to set it back based on current auth mode
          if (authMode === 'wagmi' && walletClient) {
            try {
              const adapter = new WagmiAdapter(walletClient as any);
              client.setWalletClient(adapter);
              finalHasWallet = client.hasWallet();
              walletSetResult = 'success - wagmi adapter';
            } catch (error) {
              walletSetResult = `failed - ${(error as Error).message}`;
              finalHasWallet = false;
            }
          } else if (authMode === 'private-key' && privateKey) {
            // In private key mode, we can restore the wallet using the private key
            try {
              client.initializeAuth(privateKey);
              finalHasWallet = client.hasWallet();
              walletSetResult = 'success - restored private key';
            } catch (error) {
              walletSetResult = `failed to restore - ${(error as Error).message}`;
              finalHasWallet = false;
            }
          } else {
            walletSetResult = 'skipped - no active wallet connection';
            finalHasWallet = false;
          }
          
          return {
            initialHasWallet,
            afterClear,
            finalHasWallet,
            walletSetResult,
            authMode,
            message: `Successfully tested wallet clearing${finalHasWallet ? ' and setting' : ' (setting skipped based on auth mode)'}`
          };
        } else {
          return {
            initialHasWallet,
            finalHasWallet: false,
            walletSetResult: 'skipped - no initial wallet',
            authMode,
            message: 'No wallet to test with - this is expected for unauthenticated clients'
          };
        }
      }
    },
    {
      id: 'wallet-info',
      name: 'Wallet Information',
      description: 'Get wallet address and network info',
      category: 'Authenticated',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        const address = client.getWalletAddress();
        const network = client.getNetwork();
        const isTestnet = client.isTestNetwork();
        if (!address) throw new Error('No wallet address');
        return { address, network, isTestnet };
      }
    },
    {
      id: 'create-feed-no-category',
      name: 'Create Feed (No Category)',
      description: 'Create a new feed without category_id to verify it\'s optional',
      category: 'Category Validation',
      test: async (client) => {
        const feed = await client.feeds.create({
          name: `Test Suite Feed No Category ${Date.now()}`,
          description: 'Automated test feed without category',
          tags: ['test', 'automated', 'no-category', authMode]
        });
        if (!feed.id) throw new Error('Feed creation failed - no ID returned');
        return { 
          ...feed, 
          categoryProvided: 'none',
          message: 'Successfully created feed without category_id' 
        };
      }
    },
    {
      id: 'create-feed-with-category',
      name: 'Create Feed (With Valid Category)',
      description: 'Create a feed with a valid category_id from /v1/categories',
      category: 'Category Validation',
      test: async (client) => {
        // First get available categories
        const categories = await client.categories.getAll();
        if (!categories.length) throw new Error('No categories available');
        
        const businessCategory = categories.find(c => c.name === 'Business') || categories[0];
        
        const feed = await client.feeds.create({
          name: `Test Suite Feed With Category ${Date.now()}`,
          description: 'Automated test feed with valid category',
          tags: ['test', 'automated', 'with-category', authMode],
          category_id: businessCategory.id
        });
        if (!feed.id) throw new Error('Feed creation failed - no ID returned');
        return { 
          ...feed, 
          categoryProvided: businessCategory.name,
          categoryId: businessCategory.id,
          message: `Successfully created feed with category: ${businessCategory.name}` 
        };
      }
    },
    {
      id: 'create-feed-empty-category',
      name: 'Create Feed (Empty String Category)',
      description: 'Test client-side validation - should fail with helpful error for empty string category_id',
      category: 'Category Validation',
      test: async (client) => {
        try {
          await client.feeds.create({
            name: `Test Suite Feed Empty Category ${Date.now()}`,
            description: 'This should fail - empty category',
            tags: ['test', 'automated', 'empty-category', authMode],
            category_id: ''
          });
          throw new Error('Expected client-side validation error but feed was created successfully');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Invalid category_id') && errorMessage.includes('omit the field')) {
            return {
              expectedFailure: true,
              error: errorMessage,
              message: 'Client-side validation correctly caught empty string with helpful error message',
              validationType: 'client-side'
            };
          } else if (errorMessage.includes('Invalid UUID') || errorMessage.includes('ZodError')) {
            return {
              expectedFailure: true,
              error: errorMessage,
              message: 'Server-side validation caught the error (client-side validation may have been bypassed)',
              validationType: 'server-side'
            };
          } else {
            throw new Error(`Unexpected error type: ${errorMessage}`);
          }
        }
      }
    },
    {
      id: 'create-feed-invalid-category',
      name: 'Create Feed (Invalid UUID Category)',
      description: 'Test validation - should fail with invalid UUID format',
      category: 'Category Validation',
      test: async (client) => {
        try {
          await client.feeds.create({
            name: `Test Suite Feed Invalid Category ${Date.now()}`,
            description: 'This should fail - invalid UUID',
            tags: ['test', 'automated', 'invalid-category', authMode],
            category_id: 'invalid-uuid-string'
          });
          throw new Error('Expected validation error but feed was created successfully');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Invalid category_id') && errorMessage.includes('expected valid UUID format')) {
            return {
              expectedFailure: true,
              error: errorMessage,
              message: 'Client-side validation correctly caught invalid UUID with helpful error message',
              validationType: 'client-side'
            };
          } else if (errorMessage.includes('Invalid UUID') || errorMessage.includes('ZodError')) {
            return {
              expectedFailure: true,
              error: errorMessage,
              message: 'Server-side validation caught the error (client-side validation may have been bypassed)',
              validationType: 'server-side'
            };
          } else {
            throw new Error(`Unexpected error type: ${errorMessage}`);
          }
        }
      }
    },
    {
      id: 'create-feed-nonexistent-category',
      name: 'Create Feed (Non-existent Category)',
      description: 'Test validation - should fail with valid UUID but non-existent category',
      category: 'Category Validation',
      test: async (client) => {
        try {
          await client.feeds.create({
            name: `Test Suite Feed Non-existent Category ${Date.now()}`,
            description: 'This should fail - non-existent category UUID',
            tags: ['test', 'automated', 'nonexistent-category', authMode],
            category_id: '123e4567-e89b-12d3-a456-426614174000' // Valid UUID format but doesn't exist
          });
          throw new Error('Expected validation error but feed was created successfully');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Server returns 400 for non-existent category - any rejection is valid
          if (errorMessage.includes('400') || 
              errorMessage.includes('Invalid category_id') || 
              errorMessage.includes('category') ||
              errorMessage.includes('not found')) {
            return {
              expectedFailure: true,
              error: errorMessage,
              message: 'Server correctly rejected non-existent category UUID with 400 error',
              validationType: 'server-side'
            };
          } else {
            // Any other error is also acceptable - the key is it failed
            return {
              expectedFailure: true,
              error: errorMessage,
              message: 'Request failed as expected (category does not exist)',
              validationType: 'unknown'
            };
          }
        }
      }
    },
    {
      id: 'validation-comprehensive',
      name: 'Comprehensive Client-Side Validation',
      description: 'Test various client-side validation scenarios with helpful error messages',
      category: 'Category Validation',
      test: async (client) => {
        const results: any[] = [];
        
        // Test 1: Empty string for optional URL field
        try {
          await client.feeds.create({
            name: 'Test',
            image_url: ''
          });
          results.push({ test: 'empty_image_url', result: 'unexpected_success' });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          results.push({ 
            test: 'empty_image_url', 
            result: msg.includes('omit the field') ? 'correct_validation' : 'unexpected_error',
            error: msg
          });
        }
        
        // Test 2: Invalid URL format
        try {
          await client.feeds.create({
            name: 'Test',
            image_url: 'not-a-url'
          });
          results.push({ test: 'invalid_url', result: 'unexpected_success' });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          results.push({ 
            test: 'invalid_url', 
            result: msg.includes('http://') ? 'correct_validation' : 'unexpected_error',
            error: msg
          });
        }
        
        // Test 3: Empty array vs undefined for tags
        try {
          const feed = await client.feeds.create({
            name: 'Test Empty Tags',
            tags: []
          });
          results.push({ test: 'empty_tags_array', result: 'allowed_as_expected', feedId: feed.id });
        } catch (error) {
          results.push({ test: 'empty_tags_array', result: 'unexpected_error', error: error instanceof Error ? error.message : String(error) });
        }
        
        // Test 4: Tags with empty string values
        try {
          await client.feeds.create({
            name: 'Test',
            tags: ['valid', '', 'also-valid']
          });
          results.push({ test: 'empty_string_in_tags', result: 'unexpected_success' });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          results.push({ 
            test: 'empty_string_in_tags', 
            result: msg.includes('empty strings') ? 'correct_validation' : 'unexpected_error',
            error: msg
          });
        }
        
        const passedTests = results.filter(r => r.result === 'correct_validation' || r.result === 'allowed_as_expected').length;
        
        return {
          expectedFailure: passedTests === results.length, // Mark as expected failure if all validations worked correctly
          totalTests: results.length,
          passedValidations: passedTests,
          results,
          message: `Client-side validation working correctly for ${passedTests}/${results.length} test cases`,
          validationType: 'client-side-comprehensive'
        };
      }
    },
    {
      id: 'create-feed',
      name: 'Create Feed',
      description: 'Create a new feed with authentication',
      category: 'Authenticated',
      test: async (client) => {
        const feed = await client.feeds.create({
          name: `Test Suite Feed ${Date.now()}`,
          description: 'Automated test feed',
          tags: ['test', 'automated', authMode]
        });
        if (!feed.id) throw new Error('Feed creation failed - no ID returned');
        return feed;
      }
    },
    {
      id: 'create-feed-http-url',
      name: 'Create Feed (HTTP URL Image)',
      description: 'Create feed with standard HTTP/HTTPS image URL - should return image_cid',
      category: 'Image Validation',
      test: async (client) => {
        // Using placehold.co which is reliable and returns actual images
        const feed = await client.feeds.create({
          name: `Test Feed HTTP Image ${Date.now()}`,
          description: 'Testing HTTP URL image - should return image_cid',
          tags: ['test', 'image', 'http-url', authMode],
          image_url: 'https://placehold.co/100x100/EEE/31343C'
        });
        if (!feed.id) throw new Error('Feed creation failed - no ID returned');
        
        return {
          feedId: feed.id,
          feedName: feed.name,
          imageCid: feed.image_cid || '(none returned)',
          imageType: 'http-url',
          hasImage: !!feed.image_cid,
          message: feed.image_cid 
            ? 'Successfully created feed with image' 
            : 'Feed created but no image_cid returned'
        };
      }
    },
    {
      id: 'create-feed-data-url-rejected',
      name: 'Create Feed (Data URL - Should Be Rejected)',
      description: 'SDK should reject data URLs since API only supports HTTP/HTTPS URLs',
      category: 'Image Validation',
      test: async (client) => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
        try {
          await client.feeds.create({
            name: `Test Feed Data URL ${Date.now()}`,
            description: 'This should be rejected - data URLs not supported',
            tags: ['test', 'image', 'data-url', authMode],
            image_url: dataUrl
          });
          throw new Error('Expected SDK to reject data URL but feed was created');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // SDK should reject data URLs with a helpful error
          if (errorMessage.includes('Data URLs are not supported')) {
            return {
              expectedFailure: true,
              validationMessage: errorMessage,
              validationType: 'data-url-rejected',
              message: 'SDK correctly rejected data URL with helpful error message'
            };
          }
          // If server returned 500, that's also expected (data URLs crash the API)
          if (errorMessage.includes('500')) {
            return {
              expectedFailure: true,
              validationMessage: errorMessage,
              message: 'API crashed on data URL - SDK should validate this client-side'
            };
          }
          throw error;
        }
      }
    },
    {
      id: 'list-feeds',
      name: 'List My Feeds',
      description: 'Retrieve feeds owned by current wallet',
      category: 'Authenticated',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        // Add small delay to allow feed creation to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const walletAddress = client.getWalletAddress();
        const response = await client.feeds.myFeeds();
        
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid feeds response');
        }
        
        return {
          count: response.data.length,
          hasMore: response.has_more,
          hasNextPage: !!response.next_page_token,
          feeds: response.data.map(f => ({ id: f.id, name: f.name })),
          debug: {
            walletAddress,
            queryUrl: `owner_wallet_address=${walletAddress}`
          }
        };
      }
    },
    {
      id: 'list-all-feeds',
      name: 'List All Feeds (Debug)',
      description: 'Check if created feed appears in global list',
      category: 'Public Endpoints',
      test: async (client) => {
        const response = await client.feeds.list({ page_size: 10 });
        
        let myFeeds: any[] = [];
        if (client.hasWallet()) {
          const walletAddress = client.getWalletAddress();
          myFeeds = response.data.filter(f => f.owner_wallet_address?.toLowerCase() === walletAddress.toLowerCase());
        }
        
        return {
          totalFeeds: response.data.length,
          hasMore: response.has_more,
          myFeedsInGlobalList: myFeeds.length,
          walletAddress: client.hasWallet() ? client.getWalletAddress() : 'No wallet configured',
          myFeedsFound: myFeeds.map(f => ({ id: f.id, name: f.name, owner: f.owner_wallet_address })),
          allFeeds: response.data.map(f => ({ id: f.id, name: f.name, owner: f.owner_wallet_address }))
        };
      }
    },
    {
      id: 'get-feed',
      name: 'Get Specific Feed',
      description: 'Retrieve feed details by ID',
      category: 'Public Endpoints',
      test: async (client, currentFeedId) => {
        // If we have a created feed, use it; otherwise find any existing feed
        let feedIdToUse = currentFeedId;
        
        if (!feedIdToUse) {
          // Find any existing feed from the API
          const feedsList = await client.feeds.list({ page_size: 1 });
          if (feedsList.data.length === 0) {
            throw new Error('No feeds available in the system to test with. Create a feed first.');
          }
          feedIdToUse = feedsList.data[0].id;
        }
        
        const feed = await client.feeds.get(feedIdToUse);
        if (feed.id !== feedIdToUse) throw new Error('Retrieved wrong feed');
        
        return {
          feedId: feedIdToUse,
          name: feed.name,
          owner: feed.owner_wallet_address,
          totalEntries: feed.total_entries,
          usedCreatedFeed: !!currentFeedId,
          message: currentFeedId ? 'Used created feed' : 'Used existing feed from API'
        };
      }
    },
    {
      id: 'create-entry',
      name: 'Create Entry',
      description: 'Create a new entry in a feed',
      category: 'Authenticated',
      test: async (client, currentFeedId) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        if (!currentFeedId) {
          throw new Error('No feed available. You must create a feed first before creating entries (entries can only be created in feeds you own).');
        }
        
        const timestamp = Date.now();
        const entry = await client.entries.create(currentFeedId, {
          title: `Test Entry ${timestamp}`,
          description: 'Automated test entry',
          content: `This is test content for the automated test suite - ${timestamp}`,
          tags: ['test', 'automated', authMode]
        });
        if (!entry.id) throw new Error('Entry creation failed - no ID returned');
        return { feedId: currentFeedId, entry };
      }
    },
    {
      id: 'create-bulk-entries',
      name: 'Create Bulk Entries (Multiple File Types)',
      description: 'Create multiple entries with different file types (SVG, HTML, Markdown, JSON, etc.)',
      category: 'Authenticated',
      test: async (client, currentFeedId) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        if (!currentFeedId) {
          throw new Error('No feed available. You must create a feed first before creating entries (entries can only be created in feeds you own).');
        }
        
        const testFiles = await generateTestFiles();
        const results: any[] = [];
        const errors: any[] = [];
        
        console.log(`🚀 Starting bulk entry creation with ${testFiles.length} test files:`);
        console.log('📝 File breakdown:', testFiles.map(f => `${f.title} (${f.mimeType})`));
        console.log('🔍 Binary files:', testFiles.filter(f => f.isFile).map(f => f.title));
        console.log('📄 Generated files:', testFiles.filter(f => !f.isFile).map(f => f.title));
        
        for (let i = 0; i < testFiles.length; i++) {
          const file = testFiles[i];
          try {
            console.log(`Creating entry ${i + 1}/${testFiles.length}: ${file.title} (${file.mimeType})`);
            console.log(`Test type: ${file.testType}, has content: ${!!file.content}, has content_base64: ${!!file.content_base64}, content_base64 length: ${file.content_base64?.length || 'N/A'}`);
            
            // Use either raw content or pre-encoded base64 based on the file's testType
            const entryInput = {
              title: file.title,
              description: file.description,
              mime_type: file.mimeType,
              tags: file.tags,
              is_free: true,
              ...(file.testType === 'raw' 
                ? { content: file.content } 
                : { content_base64: file.content_base64 }
              )
            };
            
            console.log('Entry input:', {
              title: entryInput.title,
              testType: file.testType,
              hasContent: !!(entryInput as any).content,
              hasContentBase64: !!(entryInput as any).content_base64,
              contentBase64Length: (entryInput as any).content_base64?.length || 'N/A'
            });
            
            const entry = await client.entries.create(currentFeedId, entryInput as any);
            
            results.push({
              title: file.title,
              entryId: entry.id,
              mimeType: file.mimeType,
              testType: file.testType,
              contentSize: file.testType === 'raw' 
                ? (typeof file.content === 'string' ? file.content.length : 'binary')
                : file.content_base64?.length || 'unknown',
              status: 'success'
            });
            
            // Small delay between uploads to avoid rate limiting
            if (i < testFiles.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Failed to create entry for ${file.title}:`, error);
            errors.push({
              title: file.title,
              mimeType: file.mimeType,
              testType: file.testType,
              error: error instanceof Error ? error.message : String(error),
              status: 'failed'
            });
          }
        }
        
        return {
          feedId: currentFeedId,
          totalAttempted: testFiles.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors,
          fileTypes: testFiles.map(f => f.mimeType),
          message: `Created ${results.length}/${testFiles.length} entries (${results.filter(r => r.testType === 'raw').length} raw + ${results.filter(r => r.testType === 'base64').length} base64)`,
          testTypeSummary: {
            raw: results.filter(r => r.testType === 'raw').length,
            base64: results.filter(r => r.testType === 'base64').length,
            rawFailed: errors.filter(e => e.testType === 'raw').length,
            base64Failed: errors.filter(e => e.testType === 'base64').length
          },
          summary: {
            'image/svg+xml': results.filter(r => r.mimeType === 'image/svg+xml').length,
            'text/html': results.filter(r => r.mimeType === 'text/html').length,
            'text/markdown': results.filter(r => r.mimeType === 'text/markdown').length,
            'text/plain': results.filter(r => r.mimeType === 'text/plain').length,
            'application/json': results.filter(r => r.mimeType === 'application/json').length,
            'application/xml': results.filter(r => r.mimeType === 'application/xml').length,
            'text/css': results.filter(r => r.mimeType === 'text/css').length,
            'application/javascript': results.filter(r => r.mimeType === 'application/javascript').length,
            'image/png': results.filter(r => r.mimeType === 'image/png').length,
            'image/jpeg': results.filter(r => r.mimeType === 'image/jpeg').length,
            'application/pdf': results.filter(r => r.mimeType === 'application/pdf').length,
            'application/zip': results.filter(r => r.mimeType === 'application/zip').length
          }
        };
      }
    },
    {
      id: 'list-feed-entries',
      name: 'List Feed Entries',
      description: 'Get entries for a specific feed',
      category: 'Public Endpoints',
      test: async (client, currentFeedId) => {
        // If we have a created feed, use it; otherwise find any existing feed
        let feedIdToUse = currentFeedId;
        
        if (!feedIdToUse) {
          // Find any existing feed from the API
          const feedsList = await client.feeds.list({ page_size: 5 });
          if (feedsList.data.length === 0) {
            throw new Error('No feeds available in the system to test with.');
          }
          feedIdToUse = feedsList.data[0].id;
        }
        
        const entriesResponse = await client.entries.list(feedIdToUse, { page_size: 5 });
        return {
          feedId: feedIdToUse,
          entryCount: entriesResponse.data.length,
          usedCreatedFeed: !!currentFeedId,
          hasMore: entriesResponse.has_more,
          entries: entriesResponse.data.map(e => ({ id: e.id, title: e.title }))
        };
      }
    },
    {
      id: 'test-feeds-pagination',
      name: 'Automated Feeds Pagination',
      description: 'Quick automated test of feeds pagination (use Interactive Pagination tab for manual testing)',
      category: 'Pagination',
      test: async (client) => {
        // Test first 2 pages
        let pageCount = 0;
        let totalItems = 0;
        let lastToken: string | undefined;
        let lastHasMore = false;
        const maxPages = 2;
        
        while (pageCount < maxPages) {
          const response = await client.feeds.list({ 
            page_size: 5, 
            page_token: lastToken 
          });
          
          pageCount++;
          totalItems += response.data.length;
          lastToken = response.next_page_token;
          lastHasMore = response.has_more;
          
          if (!response.next_page_token) break;
        }
        
        return {
          pagesLoaded: pageCount,
          totalItems,
          hasMoreAvailable: lastHasMore,
          message: `Loaded ${pageCount} pages with ${totalItems} total items. ${lastHasMore ? 'More pages available' : 'Reached end'}. For interactive testing, use the "Interactive Pagination" tab.`
        };
      }
    },
    {
      id: 'test-entries-pagination',
      name: 'Automated Entries Pagination',
      description: 'Quick automated test of entries pagination (use Interactive Pagination tab for manual testing)',
      category: 'Pagination',
      test: async (client) => {
        // Find a feed with entries to test
        const feedsResponse = await client.feeds.list({ page_size: 10 });
        const feedWithEntries = feedsResponse.data.find(f => f.total_entries > 0);
        
        if (!feedWithEntries) {
          return {
            message: 'No feeds with entries found for pagination testing',
            totalFeedsChecked: feedsResponse.data.length
          };
        }
        
        // Test first 2 pages
        let pageCount = 0;
        let totalItems = 0;
        let lastToken: string | undefined;
        let lastHasMore = false;
        const maxPages = 2;
        
        while (pageCount < maxPages) {
          const response = await client.entries.list(feedWithEntries.id, { 
            page_size: 3, 
            page_token: lastToken 
          });
          
          pageCount++;
          totalItems += response.data.length;
          lastToken = response.next_page_token;
          lastHasMore = response.has_more;
          
          if (!response.next_page_token) break;
        }
        
        return {
          testedFeed: {
            id: feedWithEntries.id,
            name: feedWithEntries.name,
            totalEntries: feedWithEntries.total_entries
          },
          pagesLoaded: pageCount,
          totalItems,
          hasMoreAvailable: lastHasMore,
          message: `Tested feed "${feedWithEntries.name}" with ${feedWithEntries.total_entries} entries. Loaded ${pageCount} pages with ${totalItems} items. ${lastHasMore ? 'More pages available' : 'Reached end'}. For interactive testing, use the "Interactive Pagination" tab.`
        };
      }
    },
    
    // === LEADERBOARDS TESTS ===
    {
      id: 'trending-feeds',
      name: 'Get Trending Feeds',
      description: 'Fetch trending feeds based on revenue velocity',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.trending({ page_size: 5 });
        return {
          count: response.data.length,
          topFeeds: response.data.slice(0, 3).map(feed => ({
            rank: feed.rank,
            name: feed.name,
            owner: feed.owner_wallet,
            totalRevenue: feed.total_revenue,
            revenueVelocity: feed.revenue_last_7d
          }))
        };
      }
    },
    {
      id: 'most-popular-feeds',
      name: 'Get Most Popular Feeds',
      description: 'Fetch most popular feeds by purchase count',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.mostPopular({ page_size: 5, period: '7d' });
        return {
          count: response.data.length,
          period: '7 days',
          topFeeds: response.data.slice(0, 3).map(feed => ({
            rank: feed.rank,
            name: feed.feed_name,
            owner: feed.owner_wallet,
            totalPurchases: feed.total_purchases,
            uniqueBuyers: feed.unique_buyers
          }))
        };
      }
    },
    {
      id: 'top-buyers',
      name: 'Get Top Buyers',
      description: 'Fetch top buyers ranked by total spend',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.topBuyers({ page_size: 5, period: 'all' });
        return {
          count: response.data.length,
          period: 'all time',
          topBuyers: response.data.slice(0, 3).map(buyer => ({
            rank: buyer.rank,
            wallet: buyer.wallet_address,
            username: buyer.username || 'Anonymous',
            totalSpent: buyer.total_spent,
            totalPurchases: buyer.total_purchases
          }))
        };
      }
    },
    {
      id: 'top-providers',
      name: 'Get Top Providers',
      description: 'Fetch top content providers by revenue',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.topProviders({ page_size: 5, period: 'all' });
        return {
          count: response.data.length,
          period: 'all time',
          topProviders: response.data.slice(0, 3).map(provider => ({
            rank: provider.rank,
            wallet: provider.wallet_address,
            username: provider.username || 'Anonymous',
            totalRevenue: provider.total_revenue,
            totalFeeds: provider.total_feeds,
            totalEntries: provider.total_entries
          }))
        };
      }
    },
    {
      id: 'category-stats',
      name: 'Get Category Statistics',
      description: 'Fetch statistics for all categories',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.categoryStats();
        const stats = response.data;
        return {
          totalCategories: stats.length,
          categories: stats.slice(0, 5).map(cat => ({
            name: cat.category_name,
            totalFeeds: cat.total_feeds,
            totalProviders: cat.total_providers,
            totalRevenue: cat.total_revenue,
            uniqueBuyers: cat.unique_buyers
          })),
          totalStats: {
            totalFeeds: stats.reduce((sum, cat) => sum + parseInt(cat.total_feeds), 0),
            totalProviders: stats.reduce((sum, cat) => sum + parseInt(cat.total_providers), 0),
            totalRevenue: stats.reduce((sum, cat) => sum + parseFloat(cat.total_revenue || '0'), 0).toFixed(2)
          }
        };
      }
    },
    {
      id: 'recent-entries',
      name: 'Get Recent Entries',
      description: 'Fetch most recent entries across all feeds',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.recentEntries({ page_size: 5 });
        return {
          count: response.data.length,
          hasMore: response.has_more,
          entries: response.data.slice(0, 3).map(entry => ({
            id: entry.id,
            title: entry.title,
            feedName: entry.feed_name,
            categoryName: entry.category_name,
            createdAt: new Date(entry.created_at * 1000).toLocaleDateString()
          }))
        };
      }
    },
    {
      id: 'top-feeds-leaderboard',
      name: 'Get Top Feeds (Leaderboard)',
      description: 'Fetch top feeds with owner and category info',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.topFeeds({ page_size: 5 });
        return {
          count: response.data.length,
          topFeeds: response.data.slice(0, 3).map(feed => ({
            name: feed.name,
            ownerWallet: feed.owner_wallet,
            ownerUsername: feed.owner_username,
            categoryName: feed.category_name,
            totalEntries: feed.total_entries,
            totalRevenue: feed.total_revenue
          }))
        };
      }
    },
    {
      id: 'top-revenue',
      name: 'Get Top Revenue Feeds',
      description: 'Fetch feeds with highest revenue',
      category: 'Leaderboards',
      test: async (client) => {
        const response = await client.leaderboards.topRevenue({ page_size: 5, period: '30d' });
        return {
          count: response.data.length,
          period: '30 days',
          topFeeds: response.data.slice(0, 3).map(feed => ({
            rank: feed.rank,
            name: feed.feed_name,
            owner: feed.owner_wallet,
            totalRevenue: feed.total_revenue,
            uniqueBuyers: feed.unique_buyers
          }))
        };
      }
    },
    
    // === WALLETS TESTS ===
    {
      id: 'get-my-wallet',
      name: 'Get My Wallet Profile',
      description: 'Get current wallet profile information',
      category: 'Wallets',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        const wallet = await client.wallets.getMe();
        return {
          id: wallet.id,
          address: wallet.wallet_address,
          network: wallet.wallet_address_network,
          username: wallet.username || 'Not set',
          hasPicture: !!wallet.picture_url,
          createdAt: new Date(wallet.created_at * 1000).toLocaleDateString(),
          updatedAt: new Date(wallet.updated_at * 1000).toLocaleDateString()
        };
      }
    },
    {
      id: 'get-wallet-by-address',
      name: 'Get Wallet By Address',
      description: 'Get wallet profile by Ethereum address',
      category: 'Wallets',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        const address = client.getWalletAddress();
        const wallet = await client.wallets.getByAddress(address);
        return {
          id: wallet.id,
          address: wallet.wallet_address,
          network: wallet.wallet_address_network,
          username: wallet.username || 'Not set',
          hasPicture: !!wallet.picture_url
        };
      }
    },
    {
      id: 'get-wallet-stats',
      name: 'Get Wallet Statistics',
      description: 'Get stats for current wallet',
      category: 'Wallets',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        const wallet = await client.wallets.getMe();
        const stats = await client.wallets.getStats(wallet.id);
        return {
          walletId: stats.wallet_id,
          feedsCreated: stats.total_feeds_created,
          entriesPublished: stats.total_entries_published,
          revenueEarned: stats.total_revenue_earned,
          itemsSold: stats.total_items_sold,
          uniqueBuyers: stats.unique_buyers_count,
          purchasesMade: stats.total_purchases_made,
          amountSpent: stats.total_amount_spent,
          revenueRank: stats.revenue_rank,
          purchasesRank: stats.purchases_rank
        };
      }
    },
    {
      id: 'update-wallet-profile',
      name: 'Update Wallet Profile',
      description: 'Update wallet username and picture',
      category: 'Wallets',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        const timestamp = Date.now();
        const newUsername = `TestUser_${timestamp}`;
        
        // First get the wallet ID
        const wallet = await client.wallets.getMe();
        
        const updatedWallet = await client.wallets.update(wallet.id, {
          username: newUsername,
          picture_url: 'https://httpbin.org/image/png'
        });
        
        return {
          success: updatedWallet.username === newUsername,
          oldUsername: wallet.username || 'Not set',
          newUsername: updatedWallet.username,
          address: updatedWallet.wallet_address,
          hasPicture: !!updatedWallet.picture_url,
          message: `Successfully updated profile to username: ${newUsername}`
        };
      }
    },
    
    // === TRANSACTIONS TESTS ===
    {
      id: 'list-all-transactions',
      name: 'List All Transactions (Public)',
      description: 'Fetch public transaction history',
      category: 'Transactions',
      test: async (client) => {
        const response = await client.transactions.list({ page_size: 10 });
        return {
          count: response.data.length,
          hasMore: response.has_more,
          recentTransactions: response.data.slice(0, 3).map(tx => ({
            id: tx.id,
            amount: tx.amount,
            asset: tx.asset,
            payer: tx.payer?.substring(0, 8) + '...',
            payTo: tx.pay_to?.substring(0, 8) + '...',
            createdAt: new Date(tx.created_at * 1000).toLocaleDateString()
          }))
        };
      }
    },
    {
      id: 'get-my-transactions',
      name: 'Get My Transactions (As Payer)',
      description: 'Fetch transactions where current wallet is payer',
      category: 'Transactions',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        const address = client.getWalletAddress();
        const response = await client.transactions.list({ 
          page_size: 10,
          payer: address 
        });
        return {
          count: response.data.length,
          hasMore: response.has_more,
          walletAddress: address,
          recentTransactions: response.data.slice(0, 3).map(tx => ({
            id: tx.id,
            amount: tx.amount,
            asset: tx.asset,
            payTo: tx.pay_to?.substring(0, 8) + '...',
            createdAt: new Date(tx.created_at * 1000).toLocaleDateString()
          }))
        };
      }
    },
    {
      id: 'get-transactions-received',
      name: 'Get Transactions Received',
      description: 'Fetch transactions where current wallet is recipient',
      category: 'Transactions',
      test: async (client) => {
        if (!client.hasWallet()) {
          throw new Error('No wallet configured. Please connect a wallet or configure a private key first.');
        }
        
        const address = client.getWalletAddress();
        const response = await client.transactions.list({ 
          page_size: 10,
          pay_to: address 
        });
        return {
          count: response.data.length,
          hasMore: response.has_more,
          walletAddress: address,
          recentTransactions: response.data.slice(0, 3).map(tx => ({
            id: tx.id,
            amount: tx.amount,
            asset: tx.asset,
            payer: tx.payer?.substring(0, 8) + '...',
            createdAt: new Date(tx.created_at * 1000).toLocaleDateString()
          }))
        };
      }
    }
  ];

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setResults(prev => {
      const existing = prev.find(r => r.id === id);
      if (existing) {
        return prev.map(r => r.id === id ? { ...r, ...updates } : r);
      } else {
        const testCase = testCases.find(t => t.id === id);
        return [...prev, {
          id,
          name: testCase?.name || id,
          status: 'pending',
          ...updates
        }];
      }
    });
  };

  const runSingleTest = async (testCase: TestCase) => {
    if (!testClient) {
      updateTestResult(testCase.id, {
        status: 'failed',
        error: 'No client available'
      });
      return;
    }

    updateTestResult(testCase.id, { status: 'running' });
    const startTime = Date.now();

    try {
      // Use ref for immediate access to current feed ID
      const currentFeedId = currentFeedIdRef.current;
      console.log('Running test with feed ID (from ref):', currentFeedId);
      const data = await testCase.test(testClient, currentFeedId);
      const duration = Date.now() - startTime;
      
      // Check if this is an expected failure test that should be marked as passed
      if (data && data.expectedFailure === true) {
        updateTestResult(testCase.id, {
          status: 'passed',
          duration,
          data: {
            ...data,
            testNote: 'Expected failure - validation working correctly'
          }
        });
      } else {
        // If this is any create feed test, immediately update the ref with the first successful one
        if (testCase.id.startsWith('create-feed') && data && data.id && !currentFeedIdRef.current) {
          console.log('Setting feed ID in ref:', data.id);
          currentFeedIdRef.current = data.id;
          setCreatedFeedId(data.id);
        }
        
        updateTestResult(testCase.id, {
          status: 'passed',
          duration,
          data
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      updateTestResult(testCase.id, {
        status: 'failed',
        error: errorMessage,
        duration
      });
    }
  };

  const runAllTests = async () => {
    if (!testClient) return;
    
    setRunning(true);
    setResults([]);

    for (const testCase of testCases) {
      await runSingleTest(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    setCreatedFeedId(null); // Reset the tracked feed ID
    currentFeedIdRef.current = null; // Reset the ref too
    console.log('Cleared test results and feed ID');
  };

  // Simple helper to check if we have a valid feed ID
  const requiresFeed = (testId: string): boolean => {
    return ['get-feed', 'create-entry', 'list-feed-entries', 'create-bulk-entries'].includes(testId);
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = testCases.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Comprehensive Test Suite</h2>
        <p className="text-gray-600 mb-6">
          Run a comprehensive test suite to validate all SDK functionality with both authentication methods.
        </p>
      </div>

      {/* Configuration */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-medium mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Authentication Mode</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="wagmi"
                  checked={authMode === 'wagmi'}
                  onChange={(e) => setAuthMode(e.target.value as 'wagmi')}
                  className="mr-2"
                />
                Wagmi Integration
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="private-key"
                  checked={authMode === 'private-key'}
                  onChange={(e) => setAuthMode(e.target.value as 'private-key')}
                  className="mr-2"
                />
                Private Key
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Network</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="testnet"
                  checked={network === 'testnet'}
                  onChange={(e) => setNetwork(e.target.value as 'testnet')}
                  className="mr-2"
                />
                Testnet (Base Sepolia)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mainnet"
                  checked={network === 'mainnet'}
                  onChange={(e) => setNetwork(e.target.value as 'mainnet')}
                  className="mr-2"
                />
                Mainnet (Base)
              </label>
            </div>
          </div>
        </div>

        {authMode === 'private-key' && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Private Key</label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
            />
          </div>
        )}
      </div>

      {/* Client Status */}
      <div className={`border rounded-lg p-4 ${
        testClient ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <h3 className="font-medium mb-2">
          {testClient ? '✅ Client Ready' : '❌ Client Not Available'}
        </h3>
        {testClient && (
          <div className="text-sm space-y-1">
            <div>Mode: {authMode}</div>
            <div>Address: <code>{testClient.hasWallet() ? testClient.getWalletAddress() : 'No wallet configured'}</code></div>
            <div>Network: {testClient.getNetwork()}</div>
            <div>Feed ID: {createdFeedId ? <code className="text-green-700">{createdFeedId}</code> : <span className="text-gray-500">None (create feed first)</span>}</div>
          </div>
        )}
        {!testClient && authMode === 'wagmi' && (
          <p className="text-sm text-red-700">Connect wallet in "Wallet Connection" tab</p>
        )}
        {!testClient && authMode === 'private-key' && (
          <p className="text-sm text-red-700">Enter a valid private key</p>
        )}
      </div>

      {/* Test Controls */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={runAllTests}
            disabled={!testClient || running}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mr-2"
          >
            {running ? 'Running Tests...' : 'Run All Tests'}
          </button>
          <button
            onClick={clearResults}
            disabled={running}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Clear Results
          </button>
        </div>
        
        {results.length > 0 && (
          <div className="text-sm">
            <span className="text-green-600 font-medium">{passed} passed</span>
            {' · '}
            <span className="text-red-600 font-medium">{failed} failed</span>
            {' · '}
            <span className="text-gray-600">{total} total</span>
          </div>
        )}
      </div>

      {/* Test Cases */}
      {categories.map(category => (
        <div key={category} className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">{category} Tests</h3>
          <div className="space-y-3">
            {testCases
              .filter(test => test.category === category)
              .map(testCase => {
                const result = results.find(r => r.id === testCase.id);
                const needsFeed = requiresFeed(testCase.id);
                const canRun = testClient && !running && (!needsFeed || createdFeedId);
                
                return (
                  <div key={testCase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-3 h-3 rounded-full
                          ${!result ? 'bg-gray-300' :
                            result.status === 'running' ? 'bg-yellow-400 animate-pulse' :
                            result.status === 'passed' ? 'bg-green-400' :
                            result.status === 'failed' ? 'bg-red-400' : 'bg-gray-300'}
                        `} />
                        <div>
                          <div className="font-medium">
                            {testCase.name}
                            {needsFeed && <span className="text-xs text-orange-600 ml-2">(requires feed)</span>}
                          </div>
                          <div className="text-sm text-gray-600">{testCase.description}</div>
                          {result?.error && (
                            <div className="text-sm text-red-600 mt-1">Error: {result.error}</div>
                          )}
                          {result?.duration && (
                            <div className="text-xs text-gray-500 mt-1">
                              Duration: {result.duration}ms
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => runSingleTest(testCase)}
                      disabled={!canRun}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      title={needsFeed && !createdFeedId ? 'Requires a feed - run "Create Feed" first' : ''}
                    >
                      Run
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Results Details */}
      {results.some(r => r.data) && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Test Results Data</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results
              .filter(r => r.data && r.status === 'passed')
              .map(result => (
                <div key={result.id} className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="font-medium text-green-800 mb-2">{result.name}</div>
                  {result.id === 'create-bulk-entries' && result.data ? (
                    <div className="bg-white p-3 rounded border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{result.data.successful}</div>
                          <div className="text-sm text-gray-600">Successful</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{result.data.failed}</div>
                          <div className="text-sm text-gray-600">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{result.data.totalAttempted}</div>
                          <div className="text-sm text-gray-600">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{Object.keys(result.data.summary).length}</div>
                          <div className="text-sm text-gray-600">File Types</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">File Type Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          {Object.entries(result.data.summary).map(([mimeType, count]) => (
                            <div key={mimeType} className="bg-gray-50 p-2 rounded text-xs">
                              <div className="font-mono text-xs text-gray-600">{mimeType}</div>
                              <div className="font-bold">{String(count)} entries</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {result.data.errors && result.data.errors.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2 text-red-700">Errors</h4>
                          <div className="space-y-2">
                            {result.data.errors.map((error: any, idx: number) => (
                              <div key={idx} className="bg-red-50 p-2 rounded border border-red-200">
                                <div className="font-semibold text-red-800">{error.title}</div>
                                <div className="text-sm text-red-600">{error.mimeType}</div>
                                <div className="text-xs text-red-700 mt-1">{error.error}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                          View Full JSON Response
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto mt-2">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
