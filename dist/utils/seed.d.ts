/**
 * Seed utilities for working with ICP-generated seeds
 * Provides helpers for seed verification and conversion
 * Browser-compatible (no Node.js crypto dependency)
 */
/**
 * Construct the message that ICP canister signs
 * Format: "OrbsSeed\nRound:{round}\nSeed:{seed_hex}"
 *
 * @param roundId - Round ID (can be string/bigint for composite keys that exceed Number.MAX_SAFE_INTEGER)
 * @param seedHex - Hex-encoded seed (64 characters)
 * @returns Message string that was signed
 */
export declare function constructSeedMessage(roundId: string | number | bigint, seedHex: string): string;
/**
 * Hash a seed message using SHA-256
 * Used for signature verification
 * Browser-compatible using Web Crypto API
 *
 * @param message - Message to hash
 * @returns 32-byte hash as Uint8Array
 */
export declare function hashSeedMessage(message: string): Promise<Uint8Array>;
/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hex string (without 0x prefix)
 * @param expectedLength - Expected byte length (optional)
 * @returns Uint8Array
 * @throws Error if hex is invalid or wrong length
 */
export declare function hexToBytes(hex: string, expectedLength?: number): Uint8Array;
/**
 * Convert Uint8Array to hex string
 *
 * @param bytes - Byte array
 * @param prefix - Whether to add 0x prefix (default: false)
 * @returns Hex string
 */
export declare function bytesToHex(bytes: Uint8Array, prefix?: boolean): string;
/**
 * Convert hex seed to 32-byte Uint8Array
 *
 * @param hexSeed - Hex-encoded seed (64 characters)
 * @returns 32-byte Uint8Array
 * @throws Error if seed is invalid
 */
export declare function hexToSeed(hexSeed: string): Uint8Array;
/**
 * Convert hex signature to 64-byte Uint8Array (compact ECDSA)
 *
 * @param hexSignature - Hex-encoded signature (128 characters)
 * @returns 64-byte Uint8Array
 * @throws Error if signature is invalid
 */
export declare function hexToSignature(hexSignature: string): Uint8Array;
/**
 * Verify seed format
 *
 * @param seedHex - Hex-encoded seed
 * @returns true if valid, false otherwise
 */
export declare function isValidSeedHex(seedHex: string): boolean;
/**
 * Verify signature format
 *
 * @param signatureHex - Hex-encoded signature
 * @returns true if valid, false otherwise
 */
export declare function isValidSignatureHex(signatureHex: string): boolean;
/**
 * Generate a deterministic seed from round ID (for testing only)
 * DO NOT USE IN PRODUCTION - this is not cryptographically secure
 * Browser-compatible using Web Crypto API
 *
 * @param roundId - Round ID
 * @returns 32-byte seed
 */
export declare function generateTestSeed(roundId: number): Promise<Uint8Array>;
/**
 * Parse seed and signature from ICP response
 *
 * @param seedHex - Hex-encoded seed
 * @param signatureHex - Hex-encoded signature
 * @returns Object with parsed seed and signature as Uint8Arrays
 * @throws Error if parsing fails
 */
export declare function parseSeedResponse(seedHex: string, signatureHex: string): {
    seed: Uint8Array;
    signature: Uint8Array;
};
//# sourceMappingURL=seed.d.ts.map