/**
 * ICP module for interacting with Internet Computer canister
 * Handles seed generation and retrieval from ICP backend
 *
 * Note: Requires @dfinity packages to be installed in your project:
 * - @dfinity/agent
 * - @dfinity/identity
 * - @dfinity/principal
 * - @dfinity/candid
 */
declare let Ed25519KeyIdentity: any;
/**
 * ICP Canister response types
 */
/**
 * Seed proof for Merkle-based verification
 * Contains the seed, Merkle proof, and chunk signature
 */
export interface SeedProof {
    /** The seed value (32 bytes) */
    seed: Uint8Array;
    /** Chunk ID this seed belongs to */
    chunk_id: bigint;
    /** Merkle root of the chunk (32 bytes) */
    merkle_root: Uint8Array;
    /** ECDSA signature over the chunk root message (64 bytes) */
    root_signature: Uint8Array;
    /** Sibling hashes for Merkle proof (from leaf to root) */
    proof_siblings: Uint8Array[];
    /** Position flags: false = left child, true = right child */
    proof_positions: boolean[];
}
export interface PlayerPage {
    total: bigint;
    players: Uint8Array[];
}
export interface RoundPlayerSnapshotInput {
    player: string;
    join_ts: bigint;
    tp_preset: number;
    payout_lamports: bigint;
    placement: number;
    kills: number;
    orb_earned_atoms: bigint;
    player_config_hash?: string;
}
export interface RoundPlayerSnapshotData {
    player: string;
    joinTs: bigint;
    tpPreset: number;
    payoutLamports: bigint;
    placement: number;
    kills: number;
    orbEarnedAtoms: bigint;
    playerConfigHash?: string;
}
export interface RoundPlayerSnapshot {
    player: Uint8Array;
    join_ts: bigint;
    tp_preset: number;
    payout_lamports: bigint;
    placement: number;
    kills: number;
    orb_earned_atoms: bigint;
    player_config_hash?: Uint8Array;
}
export interface RoundSnapshot {
    tier_id: number;
    round_id: bigint;
    season_id: number;
    players: RoundPlayerSnapshot[];
    did_emit: boolean;
    config_version: string;
}
export interface RoundSnapshotPage {
    total: bigint;
    snapshots: RoundSnapshot[];
}
export interface RoundHistoryEntry {
    tier_id: number;
    round_id: bigint;
    season_id: number;
}
export interface PlayerRoundRef {
    round_key: bigint;
    join_ts: bigint;
    placement: number;
    kills: number;
    sol_earned_lamports: bigint;
}
export interface PlayerRoundHistoryEntry {
    tier_id: number;
    round_id: bigint;
    season_id: number;
    join_ts: bigint;
    placement: number;
    kills: number;
    sol_earned_lamports: bigint;
    orb_earned_atoms: bigint;
}
export interface PlayerRoundHistoryPage {
    total: bigint;
    rounds: PlayerRoundHistoryEntry[];
}
export interface EngineConfig {
    version: string;
    config_json: string;
    created_at: bigint;
}
export interface PlayerJoinDataInput {
    player: Uint8Array;
    tier_id: number;
    round_id: bigint;
    spawn_x_norm: number;
    spawn_y_norm: number;
    spawn_rot_rad: number;
    earned_sp: number;
    alloc_split_aggro: number;
    alloc_tether_res: number;
    alloc_orb_power: number;
}
export interface PlayerJoinData {
    spawn_x_norm: number;
    spawn_y_norm: number;
    spawn_rot_rad: number;
    earned_sp: number;
    alloc_split_aggro: number;
    alloc_tether_res: number;
    alloc_orb_power: number;
    stored_at: bigint;
}
export interface PlayerJoinDataOutput {
    player: Uint8Array;
    spawn_x_norm: number;
    spawn_y_norm: number;
    spawn_rot_rad: number;
    earned_sp: number;
    alloc_split_aggro: number;
    alloc_tether_res: number;
    alloc_orb_power: number;
    stored_at: bigint;
}
/**
 * Configuration for ICP module
 */
export interface ICPModuleConfig {
    canisterId: string;
    host?: string;
    identity?: any;
    secretKey?: Uint8Array;
}
/**
 * ICP Module for canister interactions
 */
export declare class ICPModule {
    private agent;
    private actor;
    private canisterId;
    private initialized;
    private config;
    constructor(config: ICPModuleConfig);
    private initialize;
    /**
     * Initialize agent and fetch root key if needed
     */
    private initializeAgent;
    /**
     * Ensure agent is initialized before making calls
     */
    private ensureInitialized;
    /**
     * Reveal seed for a specific round (admin only)
     * Ensures the chunk exists (generates if needed) and returns the full proof.
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @returns SeedProof with seed, Merkle proof, and chunk signature
     */
    revealSeedForRound(tierId: number, roundId: number): Promise<SeedProof>;
    /**
     * Get a revealed seed proof for a specific round (public query).
     * Only returns proofs that have been revealed via revealSeedForRound.
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @returns The seed proof or null if not yet revealed
     */
    getRevealedSeed(tierId: number, roundId: number): Promise<SeedProof | null>;
    /**
     * Generate and store a seed chunk for a specific tier (admin only)
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @param chunkId - Chunk ID
     * @returns The chunk_id of the generated chunk
     */
    generateAndStoreChunk(tierId: number, chunkId: number): Promise<bigint>;
    /**
     * Regenerate a specific chunk (removes existing and creates new) (admin only)
     * Use this if a specific chunk may have been compromised.
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @param chunkId - Chunk ID
     * @returns The chunk_id of the regenerated chunk
     */
    regenerateChunk(tierId: number, chunkId: number): Promise<bigint>;
    /**
     * Emergency refresh: Clear all chunks for a tier and regenerate (admin only)
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @param roundId - Round ID to regenerate from
     */
    refreshChunksForTier(tierId: number, roundId: number): Promise<void>;
    /**
     * Check if a chunk exists for the given tier
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @returns true if chunk exists
     */
    chunkExists(tierId: number): Promise<boolean>;
    /**
     * Get round seed as hex string (convenience method for frontend).
     * Uses getRevealedSeed internally.
     * @param roundId - Round ID
     * @param tierId - Tier ID (default: 0)
     * @returns Seed as hex string or null if not revealed
     */
    getRoundSeed(roundId: number, tierId?: number): Promise<string | null>;
    /**
     * Get round seed with signature (convenience method for frontend).
     * Uses getRevealedSeed internally.
     * @param roundId - Round ID
     * @param tierId - Tier ID (default: 0)
     * @returns Object with seed and signature hex strings, or null if not revealed
     */
    getRoundSeedWithSignature(roundId: number, tierId?: number): Promise<{
        seed: string;
        signature: string;
    } | null>;
    /**
     * Get the chunk size constant (number of seeds per chunk)
     * @returns CHUNK_SIZE (50)
     */
    getChunkSize(): Promise<bigint>;
    /**
     * Get ICP canister public key (hex string)
     * @returns Hex-encoded ECDSA public key
     * @throws Error if pubkey not initialized
     */
    getOrbsIcPubkey(): Promise<string>;
    /**
     * Initialize ICP canister public key (admin only)
     * Must be called once before using seed generation
     * @throws Error if already initialized or caller is not admin
     */
    initOrbsIcPubkey(): Promise<void>;
    /**
     * Add players to whitelist (admin only)
     * @param pubkeys - Array of 32-byte public keys
     * @throws Error if invalid pubkey format or caller is not admin
     */
    addPlayers(pubkeys: Uint8Array[]): Promise<void>;
    /**
     * Get the last settled round ID for a tier from ICP
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @returns Last settled round ID (0 if none settled yet)
     */
    getLastSettledRound(tierId: number): Promise<number>;
    /**
     * Get paginated list of players
     * @param offset - Starting index
     * @param limit - Number of players to fetch
     * @returns PlayerPage with total count and player pubkeys
     */
    getPlayers(offset: number, limit: number): Promise<PlayerPage>;
    /**
     * Check if a player exists in the ICP canister registry
     * @param pubkey - 32-byte public key
     * @returns true if the player is already registered
     */
    playerExists(pubkey: Uint8Array): Promise<boolean>;
    /**
     * Set a new admin (admin only)
     * @param principal - Principal ID of new admin
     * @throws Error if caller is not admin
     */
    setAdmin(principal: string): Promise<void>;
    /**
     * Store round snapshot to ICP (admin only)
     * Archives RoundPlayer data before closing accounts on Solana.
     * Uses the current global config version set on the canister.
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @param seasonId - Season ID
     * @param players - Array of player snapshots
     * @param didEmit - Whether ORB emission occurred for this round
     * @throws Error if snapshot already exists or caller is not admin
     */
    storeRoundSnapshot(tierId: number, roundId: number, seasonId: number, players: RoundPlayerSnapshotInput[], didEmit?: boolean, emitTxSig?: string): Promise<void>;
    /**
     * Get the current active config version (public query)
     * All new rounds use this version.
     * @returns Version string (e.g., "1.2.2")
     */
    getCurrentConfigVersion(): Promise<string>;
    /**
     * Set the current active config version (admin only)
     * All new rounds will use this version.
     * The config must already exist (added via addEngineConfig).
     * @param version - Version string (e.g., "1.2.2")
     * @throws Error if version doesn't exist or caller is not admin
     */
    setCurrentConfigVersion(version: string): Promise<void>;
    /**
     * Get round snapshot from ICP
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @returns RoundSnapshot or null if not found
     */
    getRoundSnapshot(tierId: number, roundId: number): Promise<RoundSnapshot | null>;
    /**
     * Get paginated round snapshots by tier
     * @param tierId - Tier ID
     * @param offset - Starting index
     * @param limit - Number of snapshots to fetch
     * @returns RoundSnapshotPage with total count and snapshots
     */
    getRoundSnapshotsByTier(tierId: number, offset: number, limit: number): Promise<RoundSnapshotPage>;
    /**
     * Get player round history from ICP
     * Returns list of rounds the player participated in with their stats
     * @param playerPubkey - 32-byte player public key
     * @param offset - Starting index
     * @param limit - Number of rounds to fetch
     * @returns PlayerRoundHistoryPage with total count and round entries
     */
    getPlayerRoundHistory(playerPubkey: Uint8Array, offset: number, limit: number): Promise<PlayerRoundHistoryPage>;
    /**
     * Get engine config by version string (public query)
     * @param version - Version string (e.g., "1.2.2")
     * @returns EngineConfig or null if not found
     */
    getEngineConfig(version: string): Promise<EngineConfig | null>;
    /**
     * Get the latest engine config (public query)
     * @returns EngineConfig or null if none exist
     */
    getLatestEngineConfig(): Promise<EngineConfig | null>;
    /**
     * Get the latest engine config version string (public query)
     * @returns Version string or null if none exist
     */
    getLatestEngineConfigVersion(): Promise<string | null>;
    /**
     * List all engine config versions (public query)
     * @returns Array of EngineConfig records
     */
    listEngineConfigVersions(): Promise<EngineConfig[]>;
    /**
     * Add a new engine config (admin only)
     * Configs are immutable - once added, they cannot be modified.
     * @param version - Version string (e.g., "1.2.2")
     * @param configJson - JSON string containing the full engine configuration
     * @throws Error if version already exists or caller is not admin
     */
    addEngineConfig(version: string, configJson: string): Promise<void>;
    /**
     * Store player join data (spawn position, skill allocation) - admin only
     * Called by Matrix Worker when player submits matrix results.
     * @param input - Player join data input
     * @throws Error if validation fails or caller is not admin
     */
    storePlayerJoinData(input: {
        player: Uint8Array;
        tierId: number;
        roundId: number;
        spawnXNorm: number;
        spawnYNorm: number;
        spawnRotRad: number;
        earnedSp: number;
        allocSplitAggro: number;
        allocTetherRes: number;
        allocOrbPower: number;
    }): Promise<void>;
    /**
     * Get player join data for a specific player in a round
     * @param player - 32-byte player pubkey
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @returns PlayerJoinData or null if not found
     */
    getPlayerJoinData(player: Uint8Array, tierId: number, roundId: number): Promise<PlayerJoinData | null>;
    /**
     * Get all player join data for a round
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @returns Array of PlayerJoinDataOutput (includes player pubkey)
     */
    getRoundJoinData(tierId: number, roundId: number): Promise<PlayerJoinDataOutput[]>;
    /**
     * Get player-specific matrix seed derived from round seed.
     * Uses INTERNAL seed from SEED_CHUNKS (not publicly revealed yet).
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @param player - 32-byte player pubkey
     * @returns 32-byte player seed as Uint8Array
     * @throws Error if seed not ready for this round
     */
    getPlayerRoundSeed(tierId: number, roundId: number, player: Uint8Array): Promise<Uint8Array>;
    /**
     * Store player config record (v2 - quantized values with commitment hash) - admin only
     * Called by Matrix Worker when player submits matrix results.
     * Immutable - rejects overwrites for same player_config_hash.
     * @param input - Player config data with quantized values
     * @throws Error if validation fails, already exists, or caller is not admin
     */
    setPlayerConfig(input: {
        playerConfigHash: number[];
        roundId: number;
        tierId: number;
        playerPubkey: number[];
        tpPreset: number;
        spawnXQ: number;
        spawnYQ: number;
        spawnRotQ: number;
        allocSplit: number;
        allocTether: number;
        allocPower: number;
    }): Promise<void>;
    /**
     * List all player config records for a round - admin only
     * Used by engine runner to fetch all configs for roster merge.
     * @param roundId - Round ID
     * @param tierId - Tier ID
     * @returns Array of player config records
     */
    listPlayerConfigs(roundId: number, tierId: number): Promise<{
        playerConfigHash: Uint8Array;
        roundId: number;
        tierId: number;
        playerPubkey: Uint8Array;
        tpPreset: number;
        spawnXQ: number;
        spawnYQ: number;
        spawnRotQ: number;
        allocSplit: number;
        allocTether: number;
        allocPower: number;
        createdAt: bigint;
    }[]>;
    /**
     * List player config records for a revealed round - public
     * Only returns configs if the round's seed has been revealed.
     * Used by frontend to load spawn positions for replay.
     * @param roundId - Round ID
     * @param tierId - Tier ID
     * @returns Array of player config records
     */
    listPlayerConfigsIfRevealed(roundId: number, tierId: number): Promise<{
        playerConfigHash: Uint8Array;
        roundId: number;
        tierId: number;
        playerPubkey: Uint8Array;
        tpPreset: number;
        spawnXQ: number;
        spawnYQ: number;
        spawnRotQ: number;
        allocSplit: number;
        allocTether: number;
        allocPower: number;
        createdAt: bigint;
    }[]>;
    /**
     * Encode tier_id and round_id into a composite round key
     * The key is u128: upper 8 bits = tier_id, lower 64 bits = round_id
     * @param tierId - Tier ID (0-255)
     * @param roundId - Round ID
     * @returns Composite key as bigint
     */
    static encodeRoundKey(tierId: number, roundId: number | bigint): bigint;
    /**
     * Decode composite round key into tier_id and round_id
     * The key is u128: upper 8 bits = tier_id, lower 64 bits = round_id
     * @param roundKey - Composite key as bigint
     * @returns Object with tier_id and round_id
     */
    static decodeRoundKey(roundKey: bigint): {
        tierId: number;
        roundId: bigint;
    };
    /**
     * Convert hex seed to Uint8Array (32 bytes)
     * @param hexSeed - Hex-encoded seed string
     * @returns 32-byte Uint8Array
     */
    static hexToSeed(hexSeed: string): Uint8Array;
    /**
     * Convert hex signature to Uint8Array (64 bytes compact ECDSA)
     * @param hexSignature - Hex-encoded signature string
     * @returns 64-byte Uint8Array
     */
    static hexToSignature(hexSignature: string): Uint8Array;
    /**
     * Construct the chunk root message that was signed by ICP canister
     * Note: season_id removed - round IDs are globally unique per tier.
     * @param tierId - Tier ID
     * @param chunkId - Chunk ID
     * @param merkleRootHex - Hex-encoded Merkle root
     * @returns Message string that was signed
     */
    static constructChunkRootMessage(tierId: number, chunkId: number, merkleRootHex: string): string;
    /**
     * Create ICP identity from raw secret key bytes
     * Works with any Ed25519 secret key (e.g., from Solana keypair, raw bytes, etc.)
     *
     * @param secretKey - 32-byte Ed25519 secret key
     * @returns Ed25519KeyIdentity for ICP
     */
    static createIdentityFromSecretKey(secretKey: Uint8Array): typeof Ed25519KeyIdentity;
}
export {};
//# sourceMappingURL=icp.d.ts.map