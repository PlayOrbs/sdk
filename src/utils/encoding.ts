/**
 * Encoding utilities for the Orbs Game SDK
 * Handles buffer encoding for PDA derivation and data serialization
 */

import BN from "bn.js";

/**
 * Encode a u64 value as Big Endian bytes (8 bytes)
 * Used for round IDs in PDA derivation
 */
export function encodeU64BE(value: number | BN): Buffer {
  const bn = typeof value === "number" ? new BN(value) : value;
  return bn.toArrayLike(Buffer, "be", 8);
}

/**
 * Encode a u16 value as Big Endian bytes (2 bytes)
 * Used for season IDs in PDA derivation
 */
export function encodeU16BE(value: number | BN): Buffer {
  const bn = typeof value === "number" ? new BN(value) : value;
  return bn.toArrayLike(Buffer, "be", 2);
}

/**
 * Encode a u8 value as Big Endian bytes (1 byte)
 * Used for tier IDs in PDA derivation
 */
export function encodeU8BE(value: number): Buffer {
  return Buffer.from([value & 0xff]);
}

/**
 * Encode a u32 value as Big Endian bytes (4 bytes)
 * Used for page indices in PDA derivation
 */
export function encodeU32BE(value: number | BN): Buffer {
  const bn = typeof value === "number" ? new BN(value) : value;
  return bn.toArrayLike(Buffer, "be", 4);
}

/**
 * Encode a u32 value as Little Endian bytes (4 bytes)
 * Used for some instruction parameters
 */
export function encodeU32LE(value: number | BN): Buffer {
  const bn = typeof value === "number" ? new BN(value) : value;
  return bn.toArrayLike(Buffer, "le", 4);
}

/**
 * Encode a u64 value as Little Endian bytes (8 bytes)
 * Used for instruction parameters like lamports
 */
export function encodeU64LE(value: number | BN): Buffer {
  const bn = typeof value === "number" ? new BN(value) : value;
  return bn.toArrayLike(Buffer, "le", 8);
}

/**
 * Decode a Buffer to BN (Big Endian)
 */
export function decodeU64BE(buffer: Buffer): BN {
  return new BN(buffer, "be");
}

/**
 * Decode a Buffer to BN (Little Endian)
 */
export function decodeU64LE(buffer: Buffer): BN {
  return new BN(buffer, "le");
}
