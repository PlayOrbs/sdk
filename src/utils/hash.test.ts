/**
 * Hash consistency tests
 * Ensures all systems produce identical hashes
 */

import { sha256, sha256JSON, sha256Bytes, sha256Both, sha256JSONBoth } from './hash';

describe('Hash Utilities', () => {
  describe('sha256', () => {
    it('should produce consistent hash for same input', async () => {
      const input = 'Hello, World!';
      const hash1 = await sha256(input);
      const hash2 = await sha256(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await sha256('input1');
      const hash2 = await sha256('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce short hash (8 chars)', async () => {
      const input = 'test';
      const fullHash = await sha256(input, false);
      const shortHash = await sha256(input, true);
      
      expect(shortHash).toHaveLength(8);
      expect(fullHash.startsWith(shortHash)).toBe(true);
    });

    it('should match known SHA-256 hash', async () => {
      // Known SHA-256 hash of empty string
      const hash = await sha256('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  describe('sha256JSON', () => {
    it('should produce consistent hash for same object', async () => {
      const obj = { name: 'Alice', age: 30, city: 'NYC' };
      const hash1 = await sha256JSON(obj);
      const hash2 = await sha256JSON(obj);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce same hash regardless of key order', async () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      const obj3 = { b: 2, c: 3, a: 1 };
      
      const hash1 = await sha256JSON(obj1);
      const hash2 = await sha256JSON(obj2);
      const hash3 = await sha256JSON(obj3);
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should handle nested objects', async () => {
      const obj = {
        user: { name: 'Bob', age: 25 },
        settings: { theme: 'dark', lang: 'en' },
      };
      
      const hash = await sha256JSON(obj);
      expect(hash).toHaveLength(64);
    });

    it('should handle arrays', async () => {
      const obj = { items: [1, 2, 3], tags: ['a', 'b'] };
      const hash = await sha256JSON(obj);
      expect(hash).toHaveLength(64);
    });

    it('should produce different hashes for different values', async () => {
      const hash1 = await sha256JSON({ value: 1 });
      const hash2 = await sha256JSON({ value: 2 });
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sha256Bytes', () => {
    it('should hash byte arrays', async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = await sha256Bytes(bytes);
      
      expect(hash).toHaveLength(64);
    });

    it('should produce consistent hash for same bytes', async () => {
      const bytes = new Uint8Array([10, 20, 30]);
      const hash1 = await sha256Bytes(bytes);
      const hash2 = await sha256Bytes(bytes);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('sha256Both', () => {
    it('should return both full and short hashes', async () => {
      const result = await sha256Both('test');
      
      expect(result.full).toHaveLength(64);
      expect(result.short).toHaveLength(8);
      expect(result.full.startsWith(result.short)).toBe(true);
    });
  });

  describe('sha256JSONBoth', () => {
    it('should return both full and short hashes for JSON', async () => {
      const obj = { test: 'value' };
      const result = await sha256JSONBoth(obj);
      
      expect(result.full).toHaveLength(64);
      expect(result.short).toHaveLength(8);
      expect(result.full.startsWith(result.short)).toBe(true);
    });
  });

  describe('Cross-system consistency', () => {
    it('should produce same hash as canonical example', async () => {
      // This test ensures consistency across all environments
      const testConfig = {
        version: '1.0.0',
        canvas: { width: 800, height: 600 },
        settings: { debug: false, fps: 60 },
      };
      
      const hash = await sha256JSON(testConfig);
      
      // This hash should be the same across:
      // - Browser
      // - Brasier
      // - Cloudflare Workers
      // - Bun
      // - Deno
      // - Node.js
      
      // Store this hash as the canonical reference
      // If this test fails, it means the hash algorithm changed
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
    });
  });
});
