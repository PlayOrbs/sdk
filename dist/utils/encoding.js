"use strict";
/**
 * Encoding utilities for the Orbs Game SDK
 * Handles buffer encoding for PDA derivation and data serialization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeU64BE = encodeU64BE;
exports.encodeU16BE = encodeU16BE;
exports.encodeU8BE = encodeU8BE;
exports.encodeU32BE = encodeU32BE;
exports.encodeU32LE = encodeU32LE;
exports.encodeU64LE = encodeU64LE;
exports.decodeU64BE = decodeU64BE;
exports.decodeU64LE = decodeU64LE;
const bn_js_1 = __importDefault(require("bn.js"));
/**
 * Encode a u64 value as Big Endian bytes (8 bytes)
 * Used for round IDs in PDA derivation
 */
function encodeU64BE(value) {
    const bn = typeof value === "number" ? new bn_js_1.default(value) : value;
    return bn.toArrayLike(Buffer, "be", 8);
}
/**
 * Encode a u16 value as Big Endian bytes (2 bytes)
 * Used for season IDs in PDA derivation
 */
function encodeU16BE(value) {
    const bn = typeof value === "number" ? new bn_js_1.default(value) : value;
    return bn.toArrayLike(Buffer, "be", 2);
}
/**
 * Encode a u8 value as Big Endian bytes (1 byte)
 * Used for tier IDs in PDA derivation
 */
function encodeU8BE(value) {
    return Buffer.from([value & 0xff]);
}
/**
 * Encode a u32 value as Big Endian bytes (4 bytes)
 * Used for page indices in PDA derivation
 */
function encodeU32BE(value) {
    const bn = typeof value === "number" ? new bn_js_1.default(value) : value;
    return bn.toArrayLike(Buffer, "be", 4);
}
/**
 * Encode a u32 value as Little Endian bytes (4 bytes)
 * Used for some instruction parameters
 */
function encodeU32LE(value) {
    const bn = typeof value === "number" ? new bn_js_1.default(value) : value;
    return bn.toArrayLike(Buffer, "le", 4);
}
/**
 * Encode a u64 value as Little Endian bytes (8 bytes)
 * Used for instruction parameters like lamports
 */
function encodeU64LE(value) {
    const bn = typeof value === "number" ? new bn_js_1.default(value) : value;
    return bn.toArrayLike(Buffer, "le", 8);
}
/**
 * Decode a Buffer to BN (Big Endian)
 */
function decodeU64BE(buffer) {
    return new bn_js_1.default(buffer, "be");
}
/**
 * Decode a Buffer to BN (Little Endian)
 */
function decodeU64LE(buffer) {
    return new bn_js_1.default(buffer, "le");
}
