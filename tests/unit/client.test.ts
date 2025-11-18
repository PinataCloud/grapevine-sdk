import { describe, expect, test, beforeEach } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';

describe('GrapevineClient', () => {
  describe('initialization', () => {
    test('creates client with default testnet config', () => {
      const client = new GrapevineClient();
      expect(client.isTestNetwork()).toBe(true);
      expect(client.getNetwork()).toBe('base-sepolia');
    });

    test('creates client with mainnet config', () => {
      const client = new GrapevineClient({ network: 'mainnet' });
      expect(client.isTestNetwork()).toBe(false);
      expect(client.getNetwork()).toBe('base');
    });

    test('validates private key format', () => {
      expect(() => {
        new GrapevineClient({ privateKey: 'invalid' });
      }).toThrow('Invalid private key format');
    });

    test('accepts valid private key', () => {
      const validKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const client = new GrapevineClient({ privateKey: validKey });
      expect(client.getWalletAddress()).toBeDefined();
    });

    test('throws when both privateKey and walletAdapter provided', () => {
      const validKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const mockAdapter = { getAddress: () => '0x123' };
      
      expect(() => {
        new GrapevineClient({ 
          privateKey: validKey, 
          walletAdapter: mockAdapter as any 
        });
      }).toThrow('Cannot provide both privateKey and walletAdapter');
    });
  });

  describe('network configuration', () => {
    test('uses correct API URL for testnet', () => {
      const client = new GrapevineClient({ network: 'testnet' });
      // Access private property for testing
      expect((client as any).apiUrl).toBe('https://api.grapevine.markets');
    });

    test('uses correct API URL for mainnet', () => {
      const client = new GrapevineClient({ network: 'mainnet' });
      // Access private property for testing
      expect((client as any).apiUrl).toBe('https://api.grapevine.fyi');
    });
  });

  describe('debug mode', () => {
    test('enables debug mode when specified', () => {
      const client = new GrapevineClient({ debug: true });
      expect((client as any).debug).toBe(true);
    });

    test('disables debug mode by default', () => {
      const client = new GrapevineClient();
      expect((client as any).debug).toBe(false);
    });
  });

  describe('resource initialization', () => {
    test('initializes feeds resource', () => {
      const client = new GrapevineClient();
      expect(client.feeds).toBeDefined();
      expect(typeof client.feeds.create).toBe('function');
      expect(typeof client.feeds.list).toBe('function');
      expect(typeof client.feeds.get).toBe('function');
    });

    test('initializes entries resource', () => {
      const client = new GrapevineClient();
      expect(client.entries).toBeDefined();
      expect(typeof client.entries.create).toBe('function');
      expect(typeof client.entries.list).toBe('function');
    });
  });
});