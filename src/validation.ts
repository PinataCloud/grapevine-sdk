/**
 * Client-side validation utilities for the Grapevine SDK
 * Provides helpful error messages for common validation issues before they reach the API
 */

/**
 * UUID validation regex (matches the pattern from OpenAPI spec)
 */
const UUID_REGEX = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;

/**
 * URL validation regex (basic validation)
 */
const URL_REGEX = /^https?:\/\/.+/;

export class ValidationError extends Error {
  constructor(field: string, value: any, expectedType: string, suggestion?: string) {
    const message = `Invalid ${field}: expected ${expectedType}, got ${JSON.stringify(value)}${suggestion ? `. ${suggestion}` : ''}`;
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates that a value is a non-empty string when provided
 */
export function validateOptionalString(field: string, value: any): string | undefined {
  if (value === null || value === undefined) {
    return undefined; // Allow null/undefined for optional fields
  }
  
  if (value === '') {
    throw new ValidationError(
      field, 
      value, 
      'non-empty string or omit the field entirely',
      'Pass undefined or omit the field instead of empty string'
    );
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(
      field, 
      value, 
      'string',
      'Provide a valid string value'
    );
  }
  
  return value;
}

/**
 * Validates that a value is a valid UUID when provided
 */
export function validateOptionalUUID(field: string, value: any, entityType?: string): string | undefined {
  if (value === null || value === undefined) {
    return undefined; // Allow null/undefined for optional fields
  }
  
  if (value === '') {
    throw new ValidationError(
      field, 
      value, 
      'valid UUID or omit the field entirely',
      `Pass undefined or omit the field instead of empty string. ${entityType ? `Get valid ${entityType} IDs from the appropriate API endpoint.` : ''}`
    );
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(
      field, 
      value, 
      'UUID string',
      `Provide a valid UUID string. ${entityType ? `Get valid ${entityType} IDs from the appropriate API endpoint.` : ''}`
    );
  }
  
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(
      field, 
      value, 
      'valid UUID format (e.g., "123e4567-e89b-12d3-a456-426614174000")',
      `${entityType ? `Get valid ${entityType} IDs from the appropriate API endpoint.` : 'Use a properly formatted UUID.'}`
    );
  }
  
  return value;
}

/**
 * Validates that a value is a valid URL when provided
 */
export function validateOptionalURL(field: string, value: any): string | undefined {
  if (value === null || value === undefined) {
    return undefined; // Allow null/undefined for optional fields
  }
  
  if (value === '') {
    throw new ValidationError(
      field, 
      value, 
      'valid URL or omit the field entirely',
      'Pass undefined or omit the field instead of empty string'
    );
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(
      field, 
      value, 
      'URL string',
      'Provide a valid URL string starting with http:// or https://'
    );
  }
  
  if (!URL_REGEX.test(value)) {
    throw new ValidationError(
      field, 
      value, 
      'valid URL starting with http:// or https://',
      'Ensure the URL is properly formatted with protocol'
    );
  }
  
  return value;
}

/**
 * Validates that a value is an array of strings when provided
 */
export function validateOptionalStringArray(field: string, value: any): string[] | undefined {
  if (value === null || value === undefined) {
    return undefined; // Allow null/undefined for optional fields
  }
  
  if (!Array.isArray(value)) {
    throw new ValidationError(
      field, 
      value, 
      'array of strings',
      'Provide an array of string values, e.g., ["tag1", "tag2"]'
    );
  }
  
  if (value.length === 0) {
    // Allow empty arrays - they're different from undefined
    return value;
  }
  
  // Validate each item in the array
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'string') {
      throw new ValidationError(
        `${field}[${i}]`, 
        item, 
        'string',
        'All array items must be strings'
      );
    }
    if (item === '') {
      throw new ValidationError(
        `${field}[${i}]`, 
        item, 
        'non-empty string',
        'Array items cannot be empty strings'
      );
    }
  }
  
  return value;
}

/**
 * Validates that a value is a valid timestamp when provided
 */
export function validateOptionalTimestamp(field: string, value: any): number | undefined {
  if (value === null || value === undefined) {
    return undefined; // Allow null/undefined for optional fields
  }
  
  if (typeof value !== 'number') {
    throw new ValidationError(
      field, 
      value, 
      'Unix timestamp (number)',
      'Provide a Unix timestamp in seconds, e.g., Math.floor(Date.now() / 1000)'
    );
  }
  
  if (value <= 0) {
    throw new ValidationError(
      field, 
      value, 
      'positive Unix timestamp',
      'Timestamp must be a positive number representing seconds since Unix epoch'
    );
  }
  
  // Check if timestamp is reasonable (not too far in future)
  const now = Math.floor(Date.now() / 1000);
  const maxFuture = now + (365 * 24 * 60 * 60); // 1 year from now
  
  if (value > maxFuture) {
    throw new ValidationError(
      field, 
      value, 
      'reasonable future timestamp',
      'Timestamp appears to be too far in the future. Ensure you\'re using seconds, not milliseconds'
    );
  }
  
  return value;
}

/**
 * Validates a required string field
 */
export function validateRequiredString(field: string, value: any): string {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(
      field, 
      value, 
      'non-empty string',
      'This field is required and cannot be empty'
    );
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(
      field, 
      value, 
      'string',
      'Provide a valid string value'
    );
  }
  
  return value;
}

/**
 * Validates boolean values (allowing explicit false)
 */
export function validateOptionalBoolean(field: string, value: any): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined; // Allow null/undefined for optional fields
  }
  
  if (typeof value !== 'boolean') {
    throw new ValidationError(
      field, 
      value, 
      'boolean (true or false)',
      'Provide true, false, or omit the field'
    );
  }
  
  return value;
}