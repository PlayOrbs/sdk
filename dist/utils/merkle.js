"use strict";
/**
 * Merkle tree utilities for seed verification.
 * Matches the Solana program's merkle.rs implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHUNK_SIZE = void 0;
exports.computeLeafHash = computeLeafHash;
exports.computeRoundId = computeRoundId;
exports.computeNodeHash = computeNodeHash;
exports.merkleVerify = merkleVerify;
exports.verifySeedProof = verifySeedProof;
exports.constructChunkRootMessage = constructChunkRootMessage;
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
const sha256_1 = require("@noble/hashes/sha256");
/** Number of seeds per chunk (must match Solana program's CHUNK_SIZE) */
exports.CHUNK_SIZE = 50;
/**
 * Compute the leaf hash for a seed in the Merkle tree.
 * leaf = sha256("orbs-leaf" || tier_id || round_id || seed)
 *
 * The round_id cryptographically binds the seed to a specific round,
 * ensuring the Merkle proof can only verify this seed for that exact round.
 * Note: season_id removed - round IDs are globally unique per tier.
 *
 * @param tierId - Tier ID (u8)
 * @param roundId - Round ID (u64) - cryptographically binds seed to this round
 * @param seed - 32-byte seed
 * @returns 32-byte leaf hash
 */
function computeLeafHash(tierId, roundId, seed) {
    const prefix = new TextEncoder().encode('orbs-leaf');
    // Create buffer for all components: prefix + tier_id(1) + round_id(8) + seed(32)
    const buffer = new Uint8Array(prefix.length + 1 + 8 + 32);
    let pos = 0;
    // "orbs-leaf" prefix
    buffer.set(prefix, pos);
    pos += prefix.length;
    // tier_id (u8)
    buffer[pos] = tierId;
    pos += 1;
    // round_id (u64 little-endian)
    const roundIdBigInt = BigInt(roundId);
    for (let i = 0; i < 8; i++) {
        buffer[pos + i] = Number((roundIdBigInt >> BigInt(i * 8)) & 0xffn);
    }
    pos += 8;
    // seed (32 bytes)
    buffer.set(seed, pos);
    return (0, sha256_1.sha256)(buffer);
}
/**
 * Compute round_id from chunk_id and offset within chunk.
 * round_id = chunk_id * CHUNK_SIZE + offset + 1 (rounds are 1-indexed)
 */
function computeRoundId(chunkId, offset) {
    return BigInt(chunkId) * BigInt(exports.CHUNK_SIZE) + BigInt(offset) + 1n;
}
/**
 * Compute internal node hash for Merkle tree.
 * node = sha256(left || right)
 *
 * @param left - 32-byte left child hash
 * @param right - 32-byte right child hash
 * @returns 32-byte node hash
 */
function computeNodeHash(left, right) {
    const buffer = new Uint8Array(32 + 32);
    buffer.set(left, 0);
    buffer.set(right, 32);
    return (0, sha256_1.sha256)(buffer);
}
/**
 * Verify a Merkle proof for a leaf hash against a root.
 *
 * @param leafHash - 32-byte leaf hash
 * @param proofSiblings - Array of 32-byte sibling hashes (from leaf to root)
 * @param proofPositions - Position flags: false = current is left child, true = current is right child
 * @param merkleRoot - 32-byte expected Merkle root
 * @returns true if proof is valid
 */
function merkleVerify(leafHash, proofSiblings, proofPositions, merkleRoot) {
    if (proofSiblings.length !== proofPositions.length) {
        return false;
    }
    let current = Uint8Array.from(leafHash);
    for (let i = 0; i < proofSiblings.length; i++) {
        const sibling = proofSiblings[i];
        const isRight = proofPositions[i];
        if (isRight) {
            // Current hash is right child, sibling is left
            current = Uint8Array.from(computeNodeHash(sibling, current));
        }
        else {
            // Current hash is left child, sibling is right
            current = Uint8Array.from(computeNodeHash(current, sibling));
        }
    }
    // Compare with expected root
    if (current.length !== merkleRoot.length) {
        return false;
    }
    for (let i = 0; i < current.length; i++) {
        if (current[i] !== merkleRoot[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Verify a seed proof from ICP canister.
 * This performs the same verification as the Solana program.
 * Note: season_id removed - round IDs are globally unique per tier.
 *
 * @param tierId - Tier ID
 * @param roundId - Round ID
 * @param seed - 32-byte seed
 * @param chunkId - Chunk ID
 * @param merkleRoot - 32-byte Merkle root
 * @param proofSiblings - Array of 32-byte sibling hashes
 * @param proofPositions - Position flags
 * @returns true if proof is valid
 */
function verifySeedProof(tierId, roundId, seed, chunkId, merkleRoot, proofSiblings, proofPositions) {
    // Validate chunk_id matches round_id (rounds are 1-indexed)
    // chunk_id = (round_id - 1) / CHUNK_SIZE
    const expectedChunkId = (BigInt(roundId) - 1n) / BigInt(exports.CHUNK_SIZE);
    if (BigInt(chunkId) !== expectedChunkId) {
        console.error(`Invalid chunk_id: expected ${expectedChunkId}, got ${chunkId}`);
        return false;
    }
    // Compute leaf hash with round_id for cryptographic binding
    const leafHash = computeLeafHash(tierId, roundId, seed);
    // Verify Merkle proof
    return merkleVerify(leafHash, proofSiblings, proofPositions, merkleRoot);
}
/**
 * Construct the chunk root message that was signed by ICP canister.
 * Message format: "OrbsChunkRoot\nTier:<tier_id>\nChunk:<chunk_id>\nRoot:<root_hex>"
 * Note: season_id removed - round IDs are globally unique per tier.
 *
 * @param tierId - Tier ID
 * @param chunkId - Chunk ID
 * @param merkleRoot - 32-byte Merkle root
 * @returns Message string that was signed
 */
function constructChunkRootMessage(tierId, chunkId, merkleRoot) {
    const rootHex = Array.from(merkleRoot)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `OrbsChunkRoot\nTier:${tierId}\nChunk:${chunkId}\nRoot:${rootHex}`;
}
/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}
