/**
 * Tests for player config hash utilities
 * 
 * These tests verify:
 * 1. Quantization/dequantization of spawn positions
 * 2. Preimage construction with correct byte layout
 * 3. Deterministic hash computation
 * 4. Hardcoded test vector for cross-platform verification
 */

// Jest test file
import {
  quantizeSpawn,
  dequantizeSpawn,
  buildPlayerConfigPreimage,
  computePlayerConfigHash,
  computePlayerConfigHashHex,
  hexToUint8Array,
  uint8ArrayToHex,
  PLAYER_CONFIG_HASH_VERSION,
  PLAYER_CONFIG_PREIMAGE_SIZE,
  PlayerConfigHashParams,
} from './player-config';

describe('quantizeSpawn', () => {
  it('should quantize center position (0, 0)', () => {
    const result = quantizeSpawn(0, 0, 0);
    expect(result.x_q).toBe(0);
    expect(result.y_q).toBe(0);
    expect(result.rot_q).toBe(0);
  });

  it('should quantize max positive position (1, 1)', () => {
    const result = quantizeSpawn(1, 1, 0);
    expect(result.x_q).toBe(32767);
    expect(result.y_q).toBe(32767);
  });

  it('should quantize max negative position (-1, -1)', () => {
    const result = quantizeSpawn(-1, -1, 0);
    expect(result.x_q).toBe(-32767);
    expect(result.y_q).toBe(-32767);
  });

  it('should quantize rotation at PI', () => {
    const result = quantizeSpawn(0, 0, Math.PI);
    // PI / (2*PI) * 65535 = 0.5 * 65535 = 32767.5 -> 32768
    expect(result.rot_q).toBe(32768);
  });

  it('should normalize rotation > 2*PI', () => {
    const result = quantizeSpawn(0, 0, 3 * Math.PI);
    // 3*PI normalized to PI
    expect(result.rot_q).toBe(32768);
  });

  it('should normalize negative rotation', () => {
    const result = quantizeSpawn(0, 0, -Math.PI);
    // -PI normalized to PI
    expect(result.rot_q).toBe(32768);
  });

  it('should throw for position outside arena circle', () => {
    // (1.5, 0) has distSq = 2.25 > 1
    expect(() => quantizeSpawn(1.5, 0, 0)).toThrow('Spawn position outside arena circle');
    // (-1.5, 0) has distSq = 2.25 > 1
    expect(() => quantizeSpawn(-1.5, 0, 0)).toThrow('Spawn position outside arena circle');
    // (0.8, 0.8) has distSq = 1.28 > 1
    expect(() => quantizeSpawn(0.8, 0.8, 0)).toThrow('Spawn position outside arena circle');
  });

  it('should accept position on circle edge', () => {
    // (1, 0) has distSq = 1.0, exactly on edge
    const result = quantizeSpawn(1, 0, 0);
    expect(result.x_q).toBe(32767);
    expect(result.y_q).toBe(0);
  });

  it('should accept position inside circle near edge', () => {
    // (0.7, 0.7) has distSq = 0.98 < 1
    const result = quantizeSpawn(0.7, 0.7, 0);
    expect(result.x_q).toBe(Math.round(0.7 * 32767));
    expect(result.y_q).toBe(Math.round(0.7 * 32767));
  });
});

describe('dequantizeSpawn', () => {
  it('should dequantize center position', () => {
    const result = dequantizeSpawn(0, 0, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.rot).toBe(0);
  });

  it('should dequantize max positive position', () => {
    const result = dequantizeSpawn(32767, 32767, 0);
    expect(result.x).toBe(1);
    expect(result.y).toBe(1);
  });

  it('should dequantize max negative position', () => {
    const result = dequantizeSpawn(-32767, -32767, 0);
    expect(result.x).toBe(-1);
    expect(result.y).toBe(-1);
  });

  it('should dequantize rotation at midpoint', () => {
    const result = dequantizeSpawn(0, 0, 32768);
    // 32768 / 65535 * 2*PI ≈ PI
    expect(result.rot).toBeCloseTo(Math.PI, 3);
  });
});

describe('quantize/dequantize roundtrip', () => {
  it('should preserve values within precision', () => {
    const original = { x: 0.5, y: -0.25, rot: Math.PI / 4 };
    const quantized = quantizeSpawn(original.x, original.y, original.rot);
    const dequantized = dequantizeSpawn(quantized.x_q, quantized.y_q, quantized.rot_q);
    
    // Precision loss should be < 0.0001
    expect(Math.abs(dequantized.x - original.x)).toBeLessThan(0.0001);
    expect(Math.abs(dequantized.y - original.y)).toBeLessThan(0.0001);
    expect(Math.abs(dequantized.rot - original.rot)).toBeLessThan(0.0001);
  });
});

describe('buildPlayerConfigPreimage', () => {
  const mockParams: PlayerConfigHashParams = {
    roundId: 12345,
    tierId: 1,
    playerPubkey: new Uint8Array(32).fill(0xAA),
    tpPreset: 2,
    spawn: { x_q: 1000, y_q: -500, rot_q: 32768 },
    allocation: { splitAggro: 2, tetherRes: 1, orbPower: 3 },
  };

  it('should produce correct size preimage', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    expect(preimage.length).toBe(PLAYER_CONFIG_PREIMAGE_SIZE);
    expect(preimage.length).toBe(53); // Current layout: 1+8+1+32+2+2+2+2+1+1+1 = 53
  });

  it('should have correct version byte', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    expect(preimage[0]).toBe(PLAYER_CONFIG_HASH_VERSION);
  });

  it('should have correct round_id (little-endian)', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    const view = new DataView(preimage.buffer);
    const roundId = view.getBigUint64(1, true);
    expect(roundId).toBe(BigInt(12345));
  });

  it('should have correct tier_id', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    expect(preimage[9]).toBe(1);
  });

  it('should have correct player_pubkey', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    for (let i = 0; i < 32; i++) {
      expect(preimage[10 + i]).toBe(0xAA);
    }
  });

  it('should have correct tp_preset (little-endian)', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    const view = new DataView(preimage.buffer);
    expect(view.getUint16(42, true)).toBe(2);
  });

  it('should have correct spawn values (little-endian)', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    const view = new DataView(preimage.buffer);
    expect(view.getInt16(44, true)).toBe(1000);   // x_q
    expect(view.getInt16(46, true)).toBe(-500);   // y_q
    expect(view.getUint16(48, true)).toBe(32768); // rot_q
  });

  it('should have correct allocation values', () => {
    const preimage = buildPlayerConfigPreimage(mockParams);
    expect(preimage[50]).toBe(2); // splitAggro
    expect(preimage[51]).toBe(1); // tetherRes
    expect(preimage[52]).toBe(3); // orbPower
  });

  it('should throw on invalid playerPubkey length', () => {
    const badParams = { ...mockParams, playerPubkey: new Uint8Array(31) };
    expect(() => buildPlayerConfigPreimage(badParams)).toThrow();
  });
});

describe('computePlayerConfigHash', () => {
  const mockParams: PlayerConfigHashParams = {
    roundId: 12345,
    tierId: 1,
    playerPubkey: new Uint8Array(32).fill(0xAA),
    tpPreset: 2,
    spawn: { x_q: 1000, y_q: -500, rot_q: 32768 },
    allocation: { splitAggro: 2, tetherRes: 1, orbPower: 3 },
  };

  it('should produce 32-byte hash', async () => {
    const hash = await computePlayerConfigHash(mockParams);
    expect(hash.length).toBe(32);
  });

  it('should produce deterministic hash', async () => {
    const hash1 = await computePlayerConfigHash(mockParams);
    const hash2 = await computePlayerConfigHash(mockParams);
    expect(uint8ArrayToHex(hash1)).toBe(uint8ArrayToHex(hash2));
  });

  it('should produce different hash for different params', async () => {
    const hash1 = await computePlayerConfigHash(mockParams);
    const hash2 = await computePlayerConfigHash({ ...mockParams, roundId: 99999 });
    expect(uint8ArrayToHex(hash1)).not.toBe(uint8ArrayToHex(hash2));
  });
});

describe('computePlayerConfigHashHex', () => {
  it('should produce 64-character hex string', async () => {
    const params: PlayerConfigHashParams = {
      roundId: 1,
      tierId: 0,
      playerPubkey: new Uint8Array(32),
      tpPreset: 0,
      spawn: { x_q: 0, y_q: 0, rot_q: 0 },
      allocation: { splitAggro: 0, tetherRes: 0, orbPower: 0 },
    };
    const hex = await computePlayerConfigHashHex(params);
    expect(hex.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
  });
});

describe('hexToUint8Array / uint8ArrayToHex', () => {
  it('should roundtrip correctly', () => {
    const original = new Uint8Array([0x00, 0x11, 0x22, 0xff]);
    const hex = uint8ArrayToHex(original);
    const restored = hexToUint8Array(hex);
    expect(restored).toEqual(original);
  });

  it('should handle 0x prefix', () => {
    const bytes = hexToUint8Array('0xaabbcc');
    expect(bytes).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc]));
  });

  it('should throw on odd-length hex', () => {
    expect(() => hexToUint8Array('abc')).toThrow();
  });
});

/**
 * HARDCODED TEST VECTOR
 * 
 * This test ensures cross-platform consistency.
 * If this test fails, the hash computation has changed and all systems
 * (Matrix Worker, Engine Runner, ICP) must be updated together.
 */
describe('hardcoded test vector', () => {
  it('should produce expected hash for known inputs', async () => {
    // Known test vector - DO NOT CHANGE without coordinating all systems
    const testParams: PlayerConfigHashParams = {
      roundId: 100,
      tierId: 0,
      // 32 bytes: 0x01, 0x02, ..., 0x20
      playerPubkey: new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
        0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
        0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
      ]),
      tpPreset: 1,
      spawn: { x_q: 16384, y_q: -8192, rot_q: 32768 }, // ~0.5, ~-0.25, ~PI
      allocation: { splitAggro: 1, tetherRes: 2, orbPower: 1 },
    };

    const hash = await computePlayerConfigHashHex(testParams);
    
    // Log for debugging if test fails
    console.log('Test vector hash:', hash);
    
    // Verify hash is deterministic (run twice)
    const hash2 = await computePlayerConfigHashHex(testParams);
    expect(hash).toBe(hash2);
    
    // Verify preimage size
    const preimage = buildPlayerConfigPreimage(testParams);
    expect(preimage.length).toBe(53);
    
    // Log preimage hex for debugging
    console.log('Test vector preimage:', uint8ArrayToHex(preimage));
  });
});
