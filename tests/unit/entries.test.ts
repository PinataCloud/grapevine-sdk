import { describe, expect, test } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';

describe('Entries Resource', () => {
  test('entries resource exists on client', () => {
    const client = new GrapevineClient();
    expect(client.entries).toBeDefined();
  });

  test('entries resource has required methods', () => {
    const client = new GrapevineClient();
    expect(typeof client.entries.create).toBe('function');
    expect(typeof client.entries.list).toBe('function');
  });
});