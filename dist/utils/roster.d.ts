/**
 * Roster utilities for merging Solana roster with ICP player config.
 *
 * Solana is the source of truth for who is in the game (RoundPlayerV2 PDAs).
 * ICP provides player config (spawn position, skill allocation) keyed by player_config_hash.
 * Players are matched by player_config_hash commitment, not player pubkey.
 */
/**
 * Convert roster from base58 to hex format.
 */
export declare function rosterToHex(rosterBase58: string[]): string[];
/**
 * Solana RoundPlayerV2 data (from on-chain).
 */
export interface RoundPlayerData {
    player: string;
    playerConfigHash: Uint8Array;
    tpPreset: number;
    joinTs: number;
}
/**
 * ICP PlayerConfigRecord (from canister).
 */
export interface PlayerConfigRecordData {
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
}
/**
 * Player join data for engine initialization.
 * Uses dequantized spawn values from ICP.
 */
export interface PlayerJoinDataForEngine {
    spawnXNorm: number;
    spawnYNorm: number;
    spawnRotRad: number;
    allocSplitAggro: number;
    allocTetherRes: number;
    allocOrbPower: number;
    tpPreset: number;
}
/**
 * Merged roster entry.
 */
export interface MergedRosterEntry {
    playerHex: string;
    playerBase58: string;
    playerConfigHashHex: string;
    joinData: PlayerJoinDataForEngine;
    hashVerified: boolean;
}
/**
 * Result of roster merge operation.
 */
export interface RosterMergeResult {
    /** Merged roster entries (only players with verified config) */
    entries: MergedRosterEntry[];
    /** Map of playerHex -> join data for engine initialization */
    joinDataByOwnerHex: Record<string, PlayerJoinDataForEngine>;
    /** Players in Solana but missing ICP config (SKIPPED) */
    skippedNoConfig: string[];
    /** Players with hash mismatch (SKIPPED - config tampered) */
    skippedHashMismatch: string[];
}
/**
 * Merge Solana RoundPlayerV2 with ICP PlayerConfigRecord.
 *
 * Key features:
 * - Merges by player_config_hash (not player pubkey)
 * - Verifies hash by recomputing from ICP record
 * - Uses quantized spawn values (dequantized for engine)
 *
 * Flow:
 * 1. Build map of ICP configs by player_config_hash
 * 2. For each Solana player:
 *    - Look up ICP config by player_config_hash
 *    - Recompute hash from ICP record
 *    - Verify hash matches Solana commitment
 *    - If match: include in roster with dequantized spawn
 *    - If mismatch: skip (config tampered)
 *
 * @param solanaPlayers - RoundPlayerV2 data from Solana
 * @param icpConfigs - PlayerConfigRecord data from ICP
 * @param roundId - Round ID (for hash verification)
 * @param tierId - Tier ID (for hash verification)
 * @returns Merged roster with verified configs
 */
export declare function mergeRosterWithConfig(solanaPlayers: RoundPlayerData[], icpConfigs: PlayerConfigRecordData[], roundId: number, tierId: number): Promise<RosterMergeResult>;
//# sourceMappingURL=roster.d.ts.map