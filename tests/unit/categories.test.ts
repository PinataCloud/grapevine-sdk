/**
 * Categories Resource Tests
 * 
 * Note: Full resource tests require x402 dependencies which need network install.
 * These tests validate the types and validation logic.
 * 
 * For complete integration testing, use: bun run test:integration
 */
import { describe, expect, test } from 'bun:test';
import type { Category, ListCategoriesQuery } from '../../src/types.js';
import { 
  validateRequiredString, 
  validateOptionalString,
  validateOptionalBoolean
} from '../../src/validation.js';

describe('Categories Resource', () => {
  describe('Category Type', () => {
    test('Category has all required fields', () => {
      const category: Category = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Business',
        description: 'Business feeds',
        icon_url: 'https://example.com/icon.png',
        is_active: true,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.is_active).toBeDefined();
      expect(category.created_at).toBeDefined();
      expect(category.updated_at).toBeDefined();
    });

    test('Category allows null for optional fields', () => {
      const category: Category = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Business',
        description: null,
        icon_url: null,
        is_active: true,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      
      expect(category.description).toBeNull();
      expect(category.icon_url).toBeNull();
    });
  });

  describe('ListCategoriesQuery validation', () => {
    test('page_token is optional string', () => {
      expect(validateOptionalString('page_token', undefined)).toBeUndefined();
      expect(validateOptionalString('page_token', 'token123')).toBe('token123');
    });

    test('search is optional string', () => {
      expect(validateOptionalString('search', undefined)).toBeUndefined();
      expect(validateOptionalString('search', 'business')).toBe('business');
    });

    test('is_active is optional boolean', () => {
      expect(validateOptionalBoolean('is_active', undefined)).toBeUndefined();
      expect(validateOptionalBoolean('is_active', true)).toBe(true);
      expect(validateOptionalBoolean('is_active', false)).toBe(false);
    });
  });

  describe('Category ID validation', () => {
    test('categoryId is required for get', () => {
      expect(() => validateRequiredString('categoryId', '')).toThrow();
      expect(() => validateRequiredString('categoryId', null)).toThrow();
    });

    test('categoryId accepts valid string', () => {
      expect(validateRequiredString('categoryId', '123e4567-e89b-12d3-a456-426614174000'))
        .toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
