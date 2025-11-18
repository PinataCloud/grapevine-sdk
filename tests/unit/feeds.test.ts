import { describe, expect, test } from 'bun:test';
import { GrapevineClient } from '../../src/client.js';

describe('Feeds Resource', () => {
  test('feeds resource exists on client', () => {
    const client = new GrapevineClient();
    expect(client.feeds).toBeDefined();
  });

  test('feeds resource has required methods', () => {
    const client = new GrapevineClient();
    expect(typeof client.feeds.create).toBe('function');
    expect(typeof client.feeds.list).toBe('function');
    expect(typeof client.feeds.get).toBe('function');
    expect(typeof client.feeds.update).toBe('function');
  });
});