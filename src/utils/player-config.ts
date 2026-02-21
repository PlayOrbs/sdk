/**
 * Player Config Hash Utilities
 * 
 * Shared helpers for quantizing spawn positions and computing player_config_hash.
 * Used by both Matrix Worker (to compute hash) and Engine Runner (to verify hash).
 * 
 * IMPORTANT: These functions must produce identical results across all environments.
 * Any changes here require coordinated updates to Matrix Worker and Engine Runner.
 */

// Current version of the preimage format
export const PLAYER_CONFIG_HASH_VERSION = 1;

// Preimage size in bytes (fixed layout)
export const PLAYER_CONFIG_PREIMAGE_SIZE = 53;

/**
 * Quantized spawn position (integers, no floats)
 */
export interface QuantizedSpawn {
  x_q: number;   // i16: [-32767, 32767]
  y_q: number;   // i16: [-32767, 32767]
  rot_q: number; // u16: [0, 65535]
}

/**
 * Dequantized spawn position (floats)
 */
export interface DequantizedSpawn {
  x: number;   // [-1, 1]
  y: number;   // [-1, 1]
  rot: number; // [0, 2*PI)
}

/**
 * Skill allocation (u8 values)
 */
export interface SkillAllocation {
  splitAggro: number; // u8
  tetherRes: number;  // u8
  orbPower: number;   // u8
}

/**
 * Parameters for computing player_config_hash
 */
export interface PlayerConfigHashParams {
  roundId: number;
  tierId: number;
  playerPubkey: Uint8Array; // 32 bytes
  tpPreset: number; // u16
  spawn: QuantizedSpawn;
  allocation: SkillAllocation;
}

/**
 * Quantize spawn position from floats to integers.
 * 
 * Encoding:
 * - x, y in [-1, 1] -> i16 in [-32767, 32767]
 * - rot in [0, 2*PI) -> u16 in [0, 65535]
 * 
 * @param x - Normalized X position [-1, 1]
 * @param y - Normalized Y position [-1, 1]
 * @param rot - Rotation in radians [0, 2*PI)
 * @returns Quantized spawn values
 */
export function quantizeSpawn(x: number, y: number, rot: number): QuantizedSpawn {
  // Validate spawn is inside unit circle (arena bounds, small epsilon for floating point)
  const distSq = x * x + y * y;
  if (distSq > 1.001) {
    throw new Error(`Spawn position outside arena circle: distSq=${distSq.toFixed(6)}`);
  }
  
  // Clamp inputs to valid ranges (defensive, should already be valid)
  const clampedX = Math.max(-1, Math.min(1, x));
  const clampedY = Math.max(-1, Math.min(1, y));
  
  // Normalize rotation to [0, 2*PI)
  const TWO_PI = 2 * Math.PI;
  let normalizedRot = rot % TWO_PI;
  if (normalizedRot < 0) normalizedRot += TWO_PI;
  
  // Quantize
  const x_q = Math.round(clampedX * 32767);
  const y_q = Math.round(clampedY * 32767);
  const rot_q = Math.round((normalizedRot / TWO_PI) * 65535) % 65536;
  
  return { x_q, y_q, rot_q };
}

/**
 * Dequantize spawn position from integers to floats.
 * 
 * Decoding:
 * - i16 in [-32767, 32767] -> x, y in [-1, 1]
 * - u16 in [0, 65535] -> rot in [0, 2*PI)
 * 
 * @param x_q - Quantized X position (i16)
 * @param y_q - Quantized Y position (i16)
 * @param rot_q - Quantized rotation (u16)
 * @returns Dequantized spawn values
 */
export function dequantizeSpawn(x_q: number, y_q: number, rot_q: number): DequantizedSpawn {
  const x = x_q / 32767;
  const y = y_q / 32767;
  const rot = (rot_q / 65535) * 2 * Math.PI;
  
  return { x, y, rot };
}

/**
 * Build the preimage bytes for player_config_hash.
 * 
 * Layout (53 bytes total):
 *   version:u8           (1 byte)
 *   round_id:u64_le      (8 bytes)
 *   tier_id:u8           (1 byte)
 *   player_pubkey:bytes  (32 bytes)
 *   tp_preset:u16_le     (2 bytes)
 *   x_q:i16_le           (2 bytes)
 *   y_q:i16_le           (2 bytes)
 *   rot_q:u16_le         (2 bytes)
 *   alloc_split:u8       (1 byte)
 *   alloc_tether:u8      (1 byte)
 *   alloc_power:u8       (1 byte)
 * 
 * @param params - Hash parameters
 * @returns 53-byte preimage
 */
export function buildPlayerConfigPreimage(params: PlayerConfigHashParams): Uint8Array {
  const {
    roundId,
    tierId,
    playerPubkey,
    tpPreset,
    spawn,
    allocation,
  } = params;
  
  // Validate inputs
  if (playerPubkey.length !== 32) {
    throw new Error(`playerPubkey must be 32 bytes, got ${playerPubkey.length}`);
  }
  
  const preimage = new Uint8Array(PLAYER_CONFIG_PREIMAGE_SIZE);
  const view = new DataView(preimage.buffer);
  let offset = 0;
  
  // version:u8 (1 byte)
  preimage[offset] = PLAYER_CONFIG_HASH_VERSION;
  offset += 1;
  
  // round_id:u64_le (8 bytes)
  // JavaScript numbers are safe up to 2^53, use BigInt for full u64 range
  view.setBigUint64(offset, BigInt(roundId), true); // little-endian
  offset += 8;
  
  // tier_id:u8 (1 byte)
  preimage[offset] = tierId;
  offset += 1;
  
  // player_pubkey:bytes (32 bytes)
  preimage.set(playerPubkey, offset);
  offset += 32;
  
  // tp_preset:u16_le (2 bytes)
  view.setUint16(offset, tpPreset, true); // little-endian
  offset += 2;
  
  // x_q:i16_le (2 bytes)
  view.setInt16(offset, spawn.x_q, true); // little-endian, signed
  offset += 2;
  
  // y_q:i16_le (2 bytes)
  view.setInt16(offset, spawn.y_q, true); // little-endian, signed
  offset += 2;
  
  // rot_q:u16_le (2 bytes)
  view.setUint16(offset, spawn.rot_q, true); // little-endian
  offset += 2;
  
  // alloc_split:u8 (1 byte)
  preimage[offset] = allocation.splitAggro;
  offset += 1;
  
  // alloc_tether:u8 (1 byte)
  preimage[offset] = allocation.tetherRes;
  offset += 1;
  
  // alloc_power:u8 (1 byte)
  preimage[offset] = allocation.orbPower;
  offset += 1;
  
  // Sanity check
  if (offset !== PLAYER_CONFIG_PREIMAGE_SIZE) {
    throw new Error(`Preimage size mismatch: expected ${PLAYER_CONFIG_PREIMAGE_SIZE}, got ${offset}`);
  }
  
  return preimage;
}

/**
 * Compute player_config_hash from parameters.
 * 
 * @param params - Hash parameters
 * @returns 32-byte SHA-256 hash as Uint8Array
 */
export async function computePlayerConfigHash(params: PlayerConfigHashParams): Promise<Uint8Array> {
  const preimage = buildPlayerConfigPreimage(params);
  const hashBuffer = await crypto.subtle.digest('SHA-256', preimage);
  return new Uint8Array(hashBuffer);
}

/**
 * Compute player_config_hash and return as hex string.
 * 
 * @param params - Hash parameters
 * @returns 64-character hex string
 */
export async function computePlayerConfigHashHex(params: PlayerConfigHashParams): Promise<string> {
  const hash = await computePlayerConfigHash(params);
  return Array.from(hash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array.
 * 
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string.
 * 
 * @param bytes - Uint8Array
 * @returns Hex string (lowercase, no prefix)
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
