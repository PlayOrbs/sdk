/**
 * Universal SHA-256 hashing utilities
 * Browser-compatible using Web Crypto API
 * Produces identical hashes across all environments:
 * - Browser
 * - Brasier
 * - Cloudflare Workers
 * - Bun
 * - Deno
 * - Node.js (with Web Crypto)
 */
/**
 * Compute SHA-256 hash of a string
 *
 * @param input - String to hash
 * @param short - If true, return first 8 hex chars (4 bytes)
 * @returns Hex-encoded SHA-256 hash
 */
export declare function sha256(input: string, short?: boolean): Promise<string>;
/**
 * Compute SHA-256 hash of a JSON object
 * Uses canonical JSON (sorted keys) for deterministic hashing
 *
 * @param obj - Object to hash
 * @param short - If true, return first 8 hex chars (4 bytes)
 * @returns Hex-encoded SHA-256 hash
 */
export declare function sha256JSON(obj: any, short?: boolean): Promise<string>;
/**
 * Compute SHA-256 hash of bytes
 *
 * @param bytes - Uint8Array to hash
 * @param short - If true, return first 8 hex chars (4 bytes)
 * @returns Hex-encoded SHA-256 hash
 */
export declare function sha256Bytes(bytes: Uint8Array, short?: boolean): Promise<string>;
/**
 * Get both full and short hash versions
 *
 * @param input - String to hash
 * @returns Object with full (64 chars) and short (8 chars) hashes
 */
export declare function sha256Both(input: string): Promise<{
    full: string;
    short: string;
}>;
/**
 * Get both full and short hash versions for JSON
 *
 * @param obj - Object to hash
 * @returns Object with full (64 chars) and short (8 chars) hashes
 */
export declare function sha256JSONBoth(obj: any): Promise<{
    full: string;
    short: string;
}>;
//# sourceMappingURL=hash.d.ts.map