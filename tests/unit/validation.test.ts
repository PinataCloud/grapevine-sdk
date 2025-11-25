import { describe, expect, test } from 'bun:test';
import {
  validateRequiredString,
  validateOptionalString,
  validateOptionalUUID,
  validateOptionalURL,
  validateOptionalStringArray,
  validateOptionalTimestamp,
  validateOptionalBoolean,
  ValidationError
} from '../../src/validation.js';

describe('Validation Utilities', () => {
  describe('validateRequiredString', () => {
    test('returns valid string', () => {
      expect(validateRequiredString('field', 'value')).toBe('value');
    });

    test('throws on empty string', () => {
      expect(() => validateRequiredString('field', '')).toThrow(ValidationError);
    });

    test('throws on null', () => {
      expect(() => validateRequiredString('field', null)).toThrow(ValidationError);
    });

    test('throws on undefined', () => {
      expect(() => validateRequiredString('field', undefined)).toThrow(ValidationError);
    });

    test('throws on non-string', () => {
      expect(() => validateRequiredString('field', 123)).toThrow(ValidationError);
    });
  });

  describe('validateOptionalString', () => {
    test('returns valid string', () => {
      expect(validateOptionalString('field', 'value')).toBe('value');
    });

    test('returns undefined for null', () => {
      expect(validateOptionalString('field', null)).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
      expect(validateOptionalString('field', undefined)).toBeUndefined();
    });

    test('throws on empty string', () => {
      expect(() => validateOptionalString('field', '')).toThrow(ValidationError);
    });

    test('throws on non-string', () => {
      expect(() => validateOptionalString('field', 123)).toThrow(ValidationError);
    });

    test('error message suggests omitting field', () => {
      try {
        validateOptionalString('field', '');
      } catch (e) {
        expect((e as Error).message).toContain('omit the field');
      }
    });
  });

  describe('validateOptionalUUID', () => {
    test('returns valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateOptionalUUID('field', uuid)).toBe(uuid);
    });

    test('returns undefined for null', () => {
      expect(validateOptionalUUID('field', null)).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
      expect(validateOptionalUUID('field', undefined)).toBeUndefined();
    });

    test('throws on empty string', () => {
      expect(() => validateOptionalUUID('field', '')).toThrow(ValidationError);
    });

    test('throws on invalid UUID format', () => {
      expect(() => validateOptionalUUID('field', 'not-a-uuid')).toThrow(ValidationError);
    });

    test('throws on UUID-like but invalid', () => {
      expect(() => validateOptionalUUID('field', '123e4567-xxxx-12d3-a456-426614174000')).toThrow(ValidationError);
    });

    test('accepts nil UUID', () => {
      expect(validateOptionalUUID('field', '00000000-0000-0000-0000-000000000000')).toBe('00000000-0000-0000-0000-000000000000');
    });

    test('includes entity type in error message', () => {
      try {
        validateOptionalUUID('field', 'invalid', 'category');
      } catch (e) {
        expect((e as Error).message).toContain('category');
      }
    });
  });

  describe('validateOptionalURL', () => {
    test('returns valid http URL', () => {
      const url = 'http://example.com';
      expect(validateOptionalURL('field', url)).toBe(url);
    });

    test('returns valid https URL', () => {
      const url = 'https://example.com/path?query=1';
      expect(validateOptionalURL('field', url)).toBe(url);
    });

    test('returns valid data URL', () => {
      const url = 'data:image/png;base64,iVBORw0KGgo=';
      expect(validateOptionalURL('field', url)).toBe(url);
    });

    test('returns undefined for null', () => {
      expect(validateOptionalURL('field', null)).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
      expect(validateOptionalURL('field', undefined)).toBeUndefined();
    });

    test('throws on empty string', () => {
      expect(() => validateOptionalURL('field', '')).toThrow(ValidationError);
    });

    test('throws on invalid URL', () => {
      expect(() => validateOptionalURL('field', 'not-a-url')).toThrow(ValidationError);
    });

    test('throws on ftp URL (unsupported)', () => {
      expect(() => validateOptionalURL('field', 'ftp://example.com')).toThrow(ValidationError);
    });
  });

  describe('validateOptionalStringArray', () => {
    test('returns valid array', () => {
      const arr = ['tag1', 'tag2'];
      expect(validateOptionalStringArray('field', arr)).toEqual(arr);
    });

    test('returns empty array', () => {
      expect(validateOptionalStringArray('field', [])).toEqual([]);
    });

    test('returns undefined for null', () => {
      expect(validateOptionalStringArray('field', null)).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
      expect(validateOptionalStringArray('field', undefined)).toBeUndefined();
    });

    test('throws on non-array', () => {
      expect(() => validateOptionalStringArray('field', 'string')).toThrow(ValidationError);
    });

    test('throws on array with non-string items', () => {
      expect(() => validateOptionalStringArray('field', ['valid', 123])).toThrow(ValidationError);
    });

    test('throws on array with empty string', () => {
      expect(() => validateOptionalStringArray('field', ['valid', ''])).toThrow(ValidationError);
    });

    test('error message includes array index', () => {
      try {
        validateOptionalStringArray('tags', ['valid', '']);
      } catch (e) {
        expect((e as Error).message).toContain('[1]');
      }
    });
  });

  describe('validateOptionalTimestamp', () => {
    test('returns valid timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateOptionalTimestamp('field', now)).toBe(now);
    });

    test('returns undefined for null', () => {
      expect(validateOptionalTimestamp('field', null)).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
      expect(validateOptionalTimestamp('field', undefined)).toBeUndefined();
    });

    test('throws on non-number', () => {
      expect(() => validateOptionalTimestamp('field', '123')).toThrow(ValidationError);
    });

    test('throws on negative timestamp', () => {
      expect(() => validateOptionalTimestamp('field', -1)).toThrow(ValidationError);
    });

    test('throws on zero', () => {
      expect(() => validateOptionalTimestamp('field', 0)).toThrow(ValidationError);
    });

    test('throws on far future timestamp', () => {
      const farFuture = Math.floor(Date.now() / 1000) + (400 * 24 * 60 * 60); // 400 days from now
      expect(() => validateOptionalTimestamp('field', farFuture)).toThrow(ValidationError);
    });

    test('error suggests using seconds not milliseconds', () => {
      const farFuture = Date.now() + (2 * 365 * 24 * 60 * 60 * 1000); // 2 years in ms
      try {
        validateOptionalTimestamp('field', farFuture);
      } catch (e) {
        expect((e as Error).message).toContain('milliseconds');
      }
    });
  });

  describe('validateOptionalBoolean', () => {
    test('returns true', () => {
      expect(validateOptionalBoolean('field', true)).toBe(true);
    });

    test('returns false', () => {
      expect(validateOptionalBoolean('field', false)).toBe(false);
    });

    test('returns undefined for null', () => {
      expect(validateOptionalBoolean('field', null)).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
      expect(validateOptionalBoolean('field', undefined)).toBeUndefined();
    });

    test('throws on string "true"', () => {
      expect(() => validateOptionalBoolean('field', 'true')).toThrow(ValidationError);
    });

    test('throws on number 1', () => {
      expect(() => validateOptionalBoolean('field', 1)).toThrow(ValidationError);
    });

    test('throws on number 0', () => {
      expect(() => validateOptionalBoolean('field', 0)).toThrow(ValidationError);
    });
  });

  describe('ValidationError', () => {
    test('has correct name', () => {
      const error = new ValidationError('field', 'value', 'string');
      expect(error.name).toBe('ValidationError');
    });

    test('message includes field name', () => {
      const error = new ValidationError('myField', 'value', 'string');
      expect(error.message).toContain('myField');
    });

    test('message includes value', () => {
      const error = new ValidationError('field', 'testValue', 'string');
      expect(error.message).toContain('testValue');
    });

    test('message includes expected type', () => {
      const error = new ValidationError('field', 'value', 'UUID');
      expect(error.message).toContain('UUID');
    });

    test('message includes suggestion when provided', () => {
      const error = new ValidationError('field', 'value', 'string', 'Try something else');
      expect(error.message).toContain('Try something else');
    });
  });
});

