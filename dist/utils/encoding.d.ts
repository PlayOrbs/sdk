/**
 * Encoding utilities for the Orbs Game SDK
 * Handles buffer encoding for PDA derivation and data serialization
 */
import BN from "bn.js";
/**
 * Encode a u64 value as Big Endian bytes (8 bytes)
 * Used for round IDs in PDA derivation
 */
export declare function encodeU64BE(value: number | BN): Buffer;
/**
 * Encode a u16 value as Big Endian bytes (2 bytes)
 * Used for season IDs in PDA derivation
 */
export declare function encodeU16BE(value: number | BN): Buffer;
/**
 * Encode a u8 value as Big Endian bytes (1 byte)
 * Used for tier IDs in PDA derivation
 */
export declare function encodeU8BE(value: number): Buffer;
/**
 * Encode a u32 value as Big Endian bytes (4 bytes)
 * Used for page indices in PDA derivation
 */
export declare function encodeU32BE(value: number | BN): Buffer;
/**
 * Encode a u32 value as Little Endian bytes (4 bytes)
 * Used for some instruction parameters
 */
export declare function encodeU32LE(value: number | BN): Buffer;
/**
 * Encode a u64 value as Little Endian bytes (8 bytes)
 * Used for instruction parameters like lamports
 */
export declare function encodeU64LE(value: number | BN): Buffer;
/**
 * Decode a Buffer to BN (Big Endian)
 */
export declare function decodeU64BE(buffer: Buffer): BN;
/**
 * Decode a Buffer to BN (Little Endian)
 */
export declare function decodeU64LE(buffer: Buffer): BN;
//# sourceMappingURL=encoding.d.ts.map