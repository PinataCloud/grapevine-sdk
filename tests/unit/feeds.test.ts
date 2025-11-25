/**
 * Feeds Resource Tests
 * 
 * Note: Full resource tests require x402 dependencies which need network install.
 * These tests validate the types and validation logic.
 * 
 * For complete integration testing, use: bun run test:integration
 */
import { describe, expect, test } from 'bun:test';
import type { Feed, CreateFeedInput, UpdateFeedInput, ListFeedsQuery } from '../../src/types.js';
import { 
  validateRequiredString, 
  validateOptionalString,
  validateOptionalUUID,
  validateOptionalURL,
  validateOptionalStringArray 
} from '../../src/validation.js';

describe('Feeds Resource', () => {
  describe('Feed Type', () => {
    test('Feed has required fields', () => {
      const feed: Feed = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: '123e4567-e89b-12d3-a456-426614174001',
        owner_wallet_address: '0x1234567890123456789012345678901234567890',
        name: 'Test Feed',
        is_active: true,
        total_entries: 0,
        total_purchases: 0,
        total_revenue: '0',
        tags: null,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(feed.id).toBeDefined();
      expect(feed.owner_id).toBeDefined();
      expect(feed.name).toBeDefined();
    });
  });

  describe('CreateFeedInput validation', () => {
    test('name is required', () => {
      expect(() => validateRequiredString('name', '')).toThrow();
      expect(() => validateRequiredString('name', null)).toThrow();
      expect(() => validateRequiredString('name', undefined)).toThrow();
    });

    test('name accepts valid string', () => {
      expect(validateRequiredString('name', 'Test Feed')).toBe('Test Feed');
    });

    test('category_id must be valid UUID format', () => {
      expect(() => validateOptionalUUID('category_id', 'invalid')).toThrow();
      expect(() => validateOptionalUUID('category_id', '')).toThrow();
    });

    test('category_id accepts valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateOptionalUUID('category_id', uuid)).toBe(uuid);
    });

    test('category_id is optional', () => {
      expect(validateOptionalUUID('category_id', undefined)).toBeUndefined();
      expect(validateOptionalUUID('category_id', null)).toBeUndefined();
    });

    test('image_url must be valid URL format', () => {
      expect(() => validateOptionalURL('image_url', 'not-a-url')).toThrow();
      expect(() => validateOptionalURL('image_url', '')).toThrow();
    });

    test('image_url accepts http URLs', () => {
      expect(validateOptionalURL('image_url', 'https://example.com/image.png')).toBe('https://example.com/image.png');
    });

    test('image_url validator accepts data URLs (but SDK rejects them)', () => {
      // Note: The URL validator accepts data URLs as valid URL format,
      // but the SDK's feeds.create() method rejects them because
      // the API only supports HTTP/HTTPS URLs for fetching images.
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      expect(validateOptionalURL('image_url', dataUrl)).toBe(dataUrl);
    });

    test('tags must be array of strings', () => {
      expect(() => validateOptionalStringArray('tags', 'string')).toThrow();
      expect(() => validateOptionalStringArray('tags', ['valid', 123])).toThrow();
    });

    test('tags rejects empty strings in array', () => {
      expect(() => validateOptionalStringArray('tags', ['valid', ''])).toThrow();
    });

    test('tags accepts valid array', () => {
      const tags = ['tag1', 'tag2'];
      expect(validateOptionalStringArray('tags', tags)).toEqual(tags);
    });

    test('tags accepts empty array', () => {
      expect(validateOptionalStringArray('tags', [])).toEqual([]);
    });
  });

  describe('ListFeedsQuery validation', () => {
    test('owner_id must be valid UUID', () => {
      expect(() => validateOptionalUUID('owner_id', 'invalid')).toThrow();
    });

    test('category must be valid UUID', () => {
      expect(() => validateOptionalUUID('category', 'invalid')).toThrow();
    });

    test('page_token is optional string', () => {
      expect(validateOptionalString('page_token', undefined)).toBeUndefined();
      expect(validateOptionalString('page_token', 'token123')).toBe('token123');
    });
  });
});
