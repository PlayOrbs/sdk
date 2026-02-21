"use strict";
/**
 * Seed utilities for working with ICP-generated seeds
 * Provides helpers for seed verification and conversion
 * Browser-compatible (no Node.js crypto dependency)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructSeedMessage = constructSeedMessage;
exports.hashSeedMessage = hashSeedMessage;
exports.hexToBytes = hexToBytes;
exports.bytesToHex = bytesToHex;
exports.hexToSeed = hexToSeed;
exports.hexToSignature = hexToSignature;
exports.isValidSeedHex = isValidSeedHex;
exports.isValidSignatureHex = isValidSignatureHex;
exports.generateTestSeed = generateTestSeed;
exports.parseSeedResponse = parseSeedResponse;
const hash_1 = require("./hash");
/**
 * Construct the message that ICP canister signs
 * Format: "OrbsSeed\nRound:{round}\nSeed:{seed_hex}"
 *
 * @param roundId - Round ID (can be string/bigint for composite keys that exceed Number.MAX_SAFE_INTEGER)
 * @param seedHex - Hex-encoded seed (64 characters)
 * @returns Message string that was signed
 */
function constructSeedMessage(roundId, seedHex) {
    return `OrbsSeed\nRound:${roundId}\nSeed:${seedHex}`;
}
/**
 * Hash a seed message using SHA-256
 * Used for signature verification
 * Browser-compatible using Web Crypto API
 *
 * @param message - Message to hash
 * @returns 32-byte hash as Uint8Array
 */
async function hashSeedMessage(message) {
    const hex = await (0, hash_1.sha256)(message);
    return hexToBytes(hex, 32);
}
/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hex string (without 0x prefix)
 * @param expectedLength - Expected byte length (optional)
 * @returns Uint8Array
 * @throws Error if hex is invalid or wrong length
 */
function hexToBytes(hex, expectedLength) {
    // Remove 0x prefix if present
    if (hex.startsWith("0x")) {
        hex = hex.slice(2);
    }
    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
        throw new Error("Invalid hex string");
    }
    // Validate length
    if (hex.length % 2 !== 0) {
        throw new Error("Hex string must have even length");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    if (expectedLength !== undefined && bytes.length !== expectedLength) {
        throw new Error(`Expected ${expectedLength} bytes, got ${bytes.length}`);
    }
    return bytes;
}
/**
 * Convert Uint8Array to hex string
 *
 * @param bytes - Byte array
 * @param prefix - Whether to add 0x prefix (default: false)
 * @returns Hex string
 */
function bytesToHex(bytes, prefix = false) {
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return prefix ? `0x${hex}` : hex;
}
/**
 * Convert hex seed to 32-byte Uint8Array
 *
 * @param hexSeed - Hex-encoded seed (64 characters)
 * @returns 32-byte Uint8Array
 * @throws Error if seed is invalid
 */
function hexToSeed(hexSeed) {
    return hexToBytes(hexSeed, 32);
}
/**
 * Convert hex signature to 64-byte Uint8Array (compact ECDSA)
 *
 * @param hexSignature - Hex-encoded signature (128 characters)
 * @returns 64-byte Uint8Array
 * @throws Error if signature is invalid
 */
function hexToSignature(hexSignature) {
    return hexToBytes(hexSignature, 64);
}
/**
 * Verify seed format
 *
 * @param seedHex - Hex-encoded seed
 * @returns true if valid, false otherwise
 */
function isValidSeedHex(seedHex) {
    try {
        hexToSeed(seedHex);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Verify signature format
 *
 * @param signatureHex - Hex-encoded signature
 * @returns true if valid, false otherwise
 */
function isValidSignatureHex(signatureHex) {
    try {
        hexToSignature(signatureHex);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Generate a deterministic seed from round ID (for testing only)
 * DO NOT USE IN PRODUCTION - this is not cryptographically secure
 * Browser-compatible using Web Crypto API
 *
 * @param roundId - Round ID
 * @returns 32-byte seed
 */
async function generateTestSeed(roundId) {
    const hex = await (0, hash_1.sha256)(`test_seed_${roundId}`);
    return hexToBytes(hex, 32);
}
/**
 * Parse seed and signature from ICP response
 *
 * @param seedHex - Hex-encoded seed
 * @param signatureHex - Hex-encoded signature
 * @returns Object with parsed seed and signature as Uint8Arrays
 * @throws Error if parsing fails
 */
function parseSeedResponse(seedHex, signatureHex) {
    return {
        seed: hexToSeed(seedHex),
        signature: hexToSignature(signatureHex),
    };
}
