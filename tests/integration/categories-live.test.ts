import { describe, it, expect, beforeAll } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';
import type { Category } from '../../src/types.js';

describe('Categories API Integration (Live)', () => {
  let client: GrapevineClient;
  let testCategory: Category | null = null;

  beforeAll(async () => {
    client = new GrapevineClient({ 
      network: 'testnet',
      debug: false 
    });

    // Get a category for testing
    const response = await client.categories.list({ page_size: 1 });
    if (response.data.length > 0) {
      testCategory = response.data[0];
    }
  });

  describe('categories.list() - Live API', () => {
    it('should list categories from live API', async () => {
      const response = await client.categories.list();
      
      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(typeof response.has_more).toBe('boolean');
      
      if (response.data.length > 0) {
        const category = response.data[0];
        expect(typeof category.id).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(typeof category.is_active).toBe('boolean');
      }
    });

    it('should handle pagination with page_size', async () => {
      const response = await client.categories.list({ page_size: 5 });
      
      expect(response.data.length).toBeLessThanOrEqual(5);
      expect(typeof response.has_more).toBe('boolean');
    });

    it('should filter by is_active', async () => {
      const response = await client.categories.list({ is_active: true });
      
      expect(response.data).toBeInstanceOf(Array);
      response.data.forEach(category => {
        expect(category.is_active).toBe(true);
      });
    });

    it('should work with pagination generator', async () => {
      let pageCount = 0;
      let totalCategories = 0;
      
      for await (const batch of client.categories.paginate({ page_size: 5 })) {
        pageCount++;
        totalCategories += batch.length;
        expect(batch).toBeInstanceOf(Array);
        
        if (pageCount >= 2) break;
      }
      
      expect(pageCount).toBeGreaterThan(0);
    });

    it('should get all categories', async () => {
      const allCategories = await client.categories.getAll();
      
      expect(allCategories).toBeInstanceOf(Array);
      expect(allCategories.length).toBeGreaterThan(0);
    });
  });

  describe('categories.get() - Live API', () => {
    it('should get specific category by ID', async () => {
      if (!testCategory) {
        console.log('⚠️ Skipping - no categories found');
        return;
      }

      const category = await client.categories.get(testCategory.id);
      
      expect(category.id).toBe(testCategory.id);
      expect(typeof category.name).toBe('string');
      expect(typeof category.is_active).toBe('boolean');
    });
  });
});

