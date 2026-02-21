/**
 * Player Config Hash Utilities
 *
 * Shared helpers for quantizing spawn positions and computing player_config_hash.
 * Used by both Matrix Worker (to compute hash) and Engine Runner (to verify hash).
 *
 * IMPORTANT: These functions must produce identical results across all environments.
 * Any changes here require coordinated updates to Matrix Worker and Engine Runner.
 */
export declare const PLAYER_CONFIG_HASH_VERSION = 1;
export declare const PLAYER_CONFIG_PREIMAGE_SIZE = 53;
/**
 * Quantized spawn position (integers, no floats)
 */
export interface QuantizedSpawn {
    x_q: number;
    y_q: number;
    rot_q: number;
}
/**
 * Dequantized spawn position (floats)
 */
export interface DequantizedSpawn {
    x: number;
    y: number;
    rot: number;
}
/**
 * Skill allocation (u8 values)
 */
export interface SkillAllocation {
    splitAggro: number;
    tetherRes: number;
    orbPower: number;
}
/**
 * Parameters for computing player_config_hash
 */
export interface PlayerConfigHashParams {
    roundId: number;
    tierId: number;
    playerPubkey: Uint8Array;
    tpPreset: number;
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
export declare function quantizeSpawn(x: number, y: number, rot: number): QuantizedSpawn;
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
export declare function dequantizeSpawn(x_q: number, y_q: number, rot_q: number): DequantizedSpawn;
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
export declare function buildPlayerConfigPreimage(params: PlayerConfigHashParams): Uint8Array;
/**
 * Compute player_config_hash from parameters.
 *
 * @param params - Hash parameters
 * @returns 32-byte SHA-256 hash as Uint8Array
 */
export declare function computePlayerConfigHash(params: PlayerConfigHashParams): Promise<Uint8Array>;
/**
 * Compute player_config_hash and return as hex string.
 *
 * @param params - Hash parameters
 * @returns 64-character hex string
 */
export declare function computePlayerConfigHashHex(params: PlayerConfigHashParams): Promise<string>;
/**
 * Convert hex string to Uint8Array.
 *
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array
 */
export declare function hexToUint8Array(hex: string): Uint8Array;
/**
 * Convert Uint8Array to hex string.
 *
 * @param bytes - Uint8Array
 * @returns Hex string (lowercase, no prefix)
 */
export declare function uint8ArrayToHex(bytes: Uint8Array): string;
//# sourceMappingURL=player-config.d.ts.map