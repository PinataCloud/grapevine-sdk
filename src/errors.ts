/**
 * Custom error classes for the Grapevine SDK
 * Provides structured, actionable error messages with context and suggestions
 */

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONTENT_REQUIRED = 'CONTENT_REQUIRED',
  CONTENT_INVALID = 'CONTENT_INVALID',
  CONTENT_EMPTY = 'CONTENT_EMPTY',
  CONTENT_BOTH_PROVIDED = 'CONTENT_BOTH_PROVIDED',
  BASE64_INVALID = 'BASE64_INVALID',
  
  // Authentication errors
  AUTH_NO_WALLET = 'AUTH_NO_WALLET',
  AUTH_INVALID_KEY = 'AUTH_INVALID_KEY',
  AUTH_FAILED = 'AUTH_FAILED',
  
  // API errors
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  
  // Configuration errors
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_CONFLICTING = 'CONFIG_CONFLICTING'
}

/**
 * Base class for all Grapevine SDK errors
 */
export class GrapevineError extends Error {
  public readonly code: ErrorCode;
  public readonly suggestion?: string;
  public readonly example?: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      suggestion?: string;
      example?: string;
      context?: Record<string, any>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'GrapevineError';
    this.code = code;
    this.suggestion = options?.suggestion;
    this.example = options?.example;
    this.context = options?.context;
    
    if (options?.cause) {
      this.cause = options.cause;
    }
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GrapevineError);
    }
  }

  /**
   * Get a user-friendly error message with suggestion
   */
  getDetailedMessage(): string {
    let detailed = this.message;
    
    if (this.suggestion) {
      detailed += `\n\nSuggestion: ${this.suggestion}`;
    }
    
    if (this.example) {
      detailed += `\n\nExample:\n${this.example}`;
    }
    
    return detailed;
  }

  /**
   * Convert to JSON for structured error handling
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      suggestion: this.suggestion,
      example: this.example,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Content validation and processing errors
 */
export class ContentError extends GrapevineError {
  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      suggestion?: string;
      example?: string;
      context?: Record<string, any>;
      cause?: Error;
    }
  ) {
    super(message, code, options);
    this.name = 'ContentError';
  }

  /**
   * Create error for missing content
   */
  static contentRequired(): ContentError {
    return new ContentError(
      'Content is required but was not provided',
      ErrorCode.CONTENT_REQUIRED,
      {
        suggestion: 'Provide either raw content using the "content" field or pre-encoded base64 using "content_base64"',
        example: `// Option 1: Raw content (SDK handles encoding)
await grapevine.entries.create('feed-id', {
  content: 'Hello world',
  title: 'My Entry'
});

// Option 2: Pre-encoded base64
await grapevine.entries.create('feed-id', {
  content_base64: 'SGVsbG8gd29ybGQ=',
  title: 'My Entry'
});`
      }
    );
  }

  /**
   * Create error for both content fields provided
   */
  static bothContentProvided(): ContentError {
    return new ContentError(
      'Cannot provide both "content" and "content_base64" fields',
      ErrorCode.CONTENT_BOTH_PROVIDED,
      {
        suggestion: 'Choose either raw content (content) or pre-encoded base64 (content_base64), not both',
        example: `// ❌ Wrong - both fields provided
{
  content: myFile,
  content_base64: 'SGVsbG8='  // Remove this
}

// ✅ Correct - use one or the other
{
  content: myFile  // SDK will encode this
}

// OR

{
  content_base64: 'SGVsbG8='  // Already encoded
}`
      }
    );
  }

  /**
   * Create error for empty content
   */
  static contentEmpty(field: 'content' | 'content_base64'): ContentError {
    const isBase64 = field === 'content_base64';
    
    return new ContentError(
      `${field} cannot be empty, null, or undefined`,
      ErrorCode.CONTENT_EMPTY,
      {
        suggestion: isBase64 
          ? 'Ensure your base64 conversion succeeded and returned a valid string'
          : 'Provide valid content (string, Blob, File, ArrayBuffer, or object)',
        example: isBase64 
          ? `// Check your base64 conversion
const base64Data = await convertToBase64(file);
if (!base64Data) {
  throw new Error('Failed to convert file to base64');
}

await grapevine.entries.create('feed-id', {
  content_base64: base64Data,  // Must be non-empty string
  title: 'My File'
});`
          : `// Provide valid content
await grapevine.entries.create('feed-id', {
  content: 'Valid text content',  // Non-empty string
  title: 'My Entry'
});`
      }
    );
  }

  /**
   * Create error for invalid base64 format
   */
  static invalidBase64(originalError?: Error): ContentError {
    return new ContentError(
      'Invalid base64 content format',
      ErrorCode.BASE64_INVALID,
      {
        suggestion: 'Ensure content_base64 contains valid base64-encoded data without data URL prefixes',
        example: `// ❌ Wrong - includes data URL prefix
content_base64: 'data:image/png;base64,iVBORw0KGgo...'

// ✅ Correct - base64 data only  
content_base64: 'iVBORw0KGgoAAAANSUhEUgAA...'

// To fix data URLs:
const base64Data = dataUrl.split(',')[1]; // Remove prefix
content_base64: base64Data`,
        cause: originalError,
        context: originalError ? { originalError: originalError.message } : undefined
      }
    );
  }

  /**
   * Create error for content processing failure
   */
  static processingFailed(operation: string, originalError: Error): ContentError {
    return new ContentError(
      `Content processing failed during ${operation}`,
      ErrorCode.CONTENT_INVALID,
      {
        suggestion: 'Check that your content is in the expected format and try again',
        context: {
          operation,
          originalError: originalError.message
        },
        cause: originalError
      }
    );
  }
}

/**
 * Authentication and wallet errors  
 */
export class AuthError extends GrapevineError {
  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      suggestion?: string;
      example?: string;
      context?: Record<string, any>;
      cause?: Error;
    }
  ) {
    super(message, code, options);
    this.name = 'AuthError';
  }

  /**
   * Create error for missing wallet configuration
   */
  static noWallet(): AuthError {
    return new AuthError(
      'No wallet configured for authentication',
      ErrorCode.AUTH_NO_WALLET,
      {
        suggestion: 'Configure a wallet using setWalletClient() or provide a private key',
        example: `// Option 1: Use wagmi wallet client
const grapevine = new GrapevineClient({
  walletAdapter: new WagmiAdapter(walletClient),
  network: 'testnet'
});

// Option 2: Use private key
const grapevine = new GrapevineClient({
  privateKey: '0x...',
  network: 'testnet'
});`
      }
    );
  }

  /**
   * Create error for missing wallet when payment is required
   */
  static noWalletForPayment(): AuthError {
    return new AuthError(
      'No wallet configured - a wallet is required to pay for this operation',
      ErrorCode.AUTH_NO_WALLET,
      {
        suggestion: 'Configure a wallet to enable payments for feed/entry creation',
        example: `// Configure a wallet before creating feeds or entries
const grapevine = new GrapevineClient({
  privateKey: '0x...',
  network: 'testnet'
});

// Now you can create feeds (payment will be handled automatically)
await grapevine.feeds.create({ name: 'My Feed' });`
      }
    );
  }

  /**
   * Create error for invalid private key
   */
  static invalidPrivateKey(key?: string): AuthError {
    return new AuthError(
      'Invalid private key format',
      ErrorCode.AUTH_INVALID_KEY,
      {
        suggestion: 'Private key must be 66 characters starting with 0x',
        example: `// ✅ Correct format
privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

// ❌ Wrong formats
privateKey: '1234...'     // Missing 0x prefix
privateKey: '0x1234'      // Too short
privateKey: ''            // Empty`,
        context: key ? { providedKey: key.length > 10 ? `${key.slice(0, 10)}...` : key } : undefined
      }
    );
  }
}

/**
 * Configuration and setup errors
 */
export class ConfigError extends GrapevineError {
  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      suggestion?: string;
      example?: string;
      context?: Record<string, any>;
      cause?: Error;
    }
  ) {
    super(message, code, options);
    this.name = 'ConfigError';
  }

  /**
   * Create error for conflicting configuration
   */
  static conflictingConfig(field1: string, field2: string): ConfigError {
    return new ConfigError(
      `Cannot provide both ${field1} and ${field2}`,
      ErrorCode.CONFIG_CONFLICTING,
      {
        suggestion: `Choose either ${field1} or ${field2}, but not both`,
        example: `// ❌ Wrong - conflicting options
{
  ${field1}: value1,
  ${field2}: value2  // Remove this
}

// ✅ Correct - use one option
{
  ${field1}: value1
}`
      }
    );
  }
}

/**
 * API and network errors
 */
export class ApiError extends GrapevineError {
  public readonly status?: number;
  public readonly response?: string;

  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      suggestion?: string;
      example?: string;
      context?: Record<string, any>;
      cause?: Error;
      status?: number;
      response?: string;
    }
  ) {
    super(message, code, options);
    this.name = 'ApiError';
    this.status = options?.status;
    this.response = options?.response;
  }

  /**
   * Create error for API request failures
   */
  static requestFailed(status: number, responseText: string, url?: string): ApiError {
    return new ApiError(
      `API request failed with status ${status}`,
      ErrorCode.API_REQUEST_FAILED,
      {
        suggestion: status >= 500 
          ? 'This is a server error. Please try again later or contact support if the issue persists'
          : status === 401
            ? 'Authentication failed. Check your wallet connection or private key'
            : status === 402
              ? 'Payment required for this operation'
              : status === 404
                ? 'The requested resource was not found. Check your feed/entry IDs'
                : 'Check your request parameters and try again',
        status,
        response: responseText,
        context: {
          status,
          url: url || 'unknown',
          response: responseText.length > 200 ? responseText.slice(0, 200) + '...' : responseText
        }
      }
    );
  }
}

// Re-export ValidationError from validation.ts for backward compatibility
export { ValidationError } from './validation.js';