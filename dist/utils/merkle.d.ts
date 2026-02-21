/**
 * Merkle tree utilities for seed verification.
 * Matches the Solana program's merkle.rs implementation.
 */
/** Number of seeds per chunk (must match Solana program's CHUNK_SIZE) */
export declare const CHUNK_SIZE = 50;
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
export declare function computeLeafHash(tierId: number, roundId: number | bigint, seed: Uint8Array): Uint8Array;
/**
 * Compute round_id from chunk_id and offset within chunk.
 * round_id = chunk_id * CHUNK_SIZE + offset + 1 (rounds are 1-indexed)
 */
export declare function computeRoundId(chunkId: number | bigint, offset: number | bigint): bigint;
/**
 * Compute internal node hash for Merkle tree.
 * node = sha256(left || right)
 *
 * @param left - 32-byte left child hash
 * @param right - 32-byte right child hash
 * @returns 32-byte node hash
 */
export declare function computeNodeHash(left: Uint8Array, right: Uint8Array): Uint8Array;
/**
 * Verify a Merkle proof for a leaf hash against a root.
 *
 * @param leafHash - 32-byte leaf hash
 * @param proofSiblings - Array of 32-byte sibling hashes (from leaf to root)
 * @param proofPositions - Position flags: false = current is left child, true = current is right child
 * @param merkleRoot - 32-byte expected Merkle root
 * @returns true if proof is valid
 */
export declare function merkleVerify(leafHash: Uint8Array, proofSiblings: Uint8Array[], proofPositions: boolean[], merkleRoot: Uint8Array): boolean;
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
export declare function verifySeedProof(tierId: number, roundId: number | bigint, seed: Uint8Array, chunkId: number | bigint, merkleRoot: Uint8Array, proofSiblings: Uint8Array[], proofPositions: boolean[]): boolean;
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
export declare function constructChunkRootMessage(tierId: number, chunkId: number | bigint, merkleRoot: Uint8Array): string;
/**
 * Convert Uint8Array to hex string
 */
export declare function bytesToHex(bytes: Uint8Array): string;
/**
 * Convert hex string to Uint8Array
 */
export declare function hexToBytes(hex: string): Uint8Array;
//# sourceMappingURL=merkle.d.ts.map