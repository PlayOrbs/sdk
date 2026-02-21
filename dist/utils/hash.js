"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.sha256JSON = sha256JSON;
exports.sha256Bytes = sha256Bytes;
exports.sha256Both = sha256Both;
exports.sha256JSONBoth = sha256JSONBoth;
/**
 * Canonicalize JSON by sorting keys recursively
 * Ensures deterministic output regardless of key insertion order
 */
function canonicalizeJSON(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalizeJSON).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `"${key}":${canonicalizeJSON(obj[key])}`);
    return '{' + pairs.join(',') + '}';
}
/**
 * Compute SHA-256 hash of a string
 *
 * @param input - String to hash
 * @param short - If true, return first 8 hex chars (4 bytes)
 * @returns Hex-encoded SHA-256 hash
 */
async function sha256(input, short = false) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return short ? hex.slice(0, 8) : hex;
}
/**
 * Compute SHA-256 hash of a JSON object
 * Uses canonical JSON (sorted keys) for deterministic hashing
 *
 * @param obj - Object to hash
 * @param short - If true, return first 8 hex chars (4 bytes)
 * @returns Hex-encoded SHA-256 hash
 */
async function sha256JSON(obj, short = false) {
    const canonical = canonicalizeJSON(obj);
    return sha256(canonical, short);
}
/**
 * Compute SHA-256 hash of bytes
 *
 * @param bytes - Uint8Array to hash
 * @param short - If true, return first 8 hex chars (4 bytes)
 * @returns Hex-encoded SHA-256 hash
 */
async function sha256Bytes(bytes, short = false) {
    // @ts-ignore - Web Crypto API accepts Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    const hex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return short ? hex.slice(0, 8) : hex;
}
/**
 * Get both full and short hash versions
 *
 * @param input - String to hash
 * @returns Object with full (64 chars) and short (8 chars) hashes
 */
async function sha256Both(input) {
    const full = await sha256(input, false);
    return {
        full,
        short: full.slice(0, 8),
    };
}
/**
 * Get both full and short hash versions for JSON
 *
 * @param obj - Object to hash
 * @returns Object with full (64 chars) and short (8 chars) hashes
 */
async function sha256JSONBoth(obj) {
    const canonical = canonicalizeJSON(obj);
    return sha256Both(canonical);
}
