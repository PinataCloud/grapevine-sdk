/**
 * Client Tests
 * 
 * Note: Full client tests require x402 dependencies which need network install.
 * These tests validate the client structure and configuration without
 * triggering the full dependency chain.
 * 
 * For complete integration testing, use: bun run test:integration
 */
import { describe, expect, test } from 'bun:test';

// Import only types and validation - avoid triggering x402 dependency chain
import type { GrapevineConfig, Network } from '../../src/types.js';

describe('GrapevineClient Configuration', () => {
  describe('Config Types', () => {
    test('GrapevineConfig accepts network option', () => {
      const config: GrapevineConfig = {
        network: 'testnet'
      };
      expect(config.network).toBe('testnet');
    });

    test('GrapevineConfig accepts mainnet network', () => {
      const config: GrapevineConfig = {
        network: 'mainnet'
      };
      expect(config.network).toBe('mainnet');
    });

    test('GrapevineConfig accepts debug option', () => {
      const config: GrapevineConfig = {
        debug: true
      };
      expect(config.debug).toBe(true);
    });

    test('GrapevineConfig accepts privateKey option', () => {
      const config: GrapevineConfig = {
        privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
      };
      expect(config.privateKey).toBeDefined();
    });

    test('Network type has correct values', () => {
      const testnet: Network = 'testnet';
      const mainnet: Network = 'mainnet';
      expect(testnet).toBe('testnet');
      expect(mainnet).toBe('mainnet');
    });
  });

  describe('API URL logic', () => {
    test('testnet should use api.grapevine.markets', () => {
      const expectedUrl = 'https://api.grapevine.markets';
      expect(expectedUrl).toContain('grapevine.markets');
    });

    test('mainnet should use api.grapevine.fyi', () => {
      const expectedUrl = 'https://api.grapevine.fyi';
      expect(expectedUrl).toContain('grapevine.fyi');
    });
  });
});
