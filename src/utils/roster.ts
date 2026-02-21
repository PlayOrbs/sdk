/**
 * Roster utilities for merging Solana roster with ICP player config.
 * 
 * Solana is the source of truth for who is in the game (RoundPlayerV2 PDAs).
 * ICP provides player config (spawn position, skill allocation) keyed by player_config_hash.
 * Players are matched by player_config_hash commitment, not player pubkey.
 */

import { PublicKey } from "@solana/web3.js";
import { dequantizeSpawn, buildPlayerConfigPreimage } from "./player-config";

/**
 * Convert Uint8Array to hex string.
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert base58 pubkey to hex string.
 */
function base58ToHex(base58: string): string {
  const pubkey = new PublicKey(base58);
  return toHex(pubkey.toBytes());
}

/**
 * Convert roster from base58 to hex format.
 */
export function rosterToHex(rosterBase58: string[]): string[] {
  return rosterBase58.map(base58ToHex);
}

/**
 * Compute SHA-256 hash of preimage.
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

// ============================================================================
// ROSTER MERGE (uses player_config_hash as key)
// ============================================================================

/**
 * Solana RoundPlayerV2 data (from on-chain).
 */
export interface RoundPlayerData {
  player: string;              // base58 pubkey
  playerConfigHash: Uint8Array; // 32 bytes - commitment hash
  tpPreset: number;
  joinTs: number;
}

/**
 * ICP PlayerConfigRecord (from canister).
 */
export interface PlayerConfigRecordData {
  playerConfigHash: Uint8Array; // 32 bytes
  roundId: number;
  tierId: number;
  playerPubkey: Uint8Array;    // 32 bytes
  tpPreset: number;
  spawnXQ: number;             // i16 quantized
  spawnYQ: number;             // i16 quantized
  spawnRotQ: number;           // u16 quantized
  allocSplit: number;
  allocTether: number;
  allocPower: number;
}

/**
 * Player join data for engine initialization.
 * Uses dequantized spawn values from ICP.
 */
export interface PlayerJoinDataForEngine {
  spawnXNorm: number;          // dequantized from i16
  spawnYNorm: number;          // dequantized from i16
  spawnRotRad: number;         // dequantized from u16
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
  hashVerified: boolean;       // true if recomputed hash matches
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
export async function mergeRosterWithConfig(
  solanaPlayers: RoundPlayerData[],
  icpConfigs: PlayerConfigRecordData[],
  roundId: number,
  tierId: number,
): Promise<RosterMergeResult> {
  // Build map of ICP configs by player_config_hash hex
  const icpConfigByHashHex = new Map<string, PlayerConfigRecordData>();
  for (const config of icpConfigs) {
    const hashHex = toHex(config.playerConfigHash);
    icpConfigByHashHex.set(hashHex, config);
  }

  const entries: MergedRosterEntry[] = [];
  const joinDataByOwnerHex: Record<string, PlayerJoinDataForEngine> = {};
  const skippedNoConfig: string[] = [];
  const skippedHashMismatch: string[] = [];

  for (const solanaPlayer of solanaPlayers) {
    const playerHex = base58ToHex(solanaPlayer.player);
    const configHashHex = toHex(solanaPlayer.playerConfigHash);

    // Look up ICP config by player_config_hash
    const icpConfig = icpConfigByHashHex.get(configHashHex);

    if (!icpConfig) {
      // No ICP config for this hash - skip
      skippedNoConfig.push(playerHex);
      continue;
    }

    // Verify hash by recomputing from ICP record
    const preimage = buildPlayerConfigPreimage({
      roundId,
      tierId,
      playerPubkey: icpConfig.playerPubkey,
      tpPreset: icpConfig.tpPreset,
      spawn: {
        x_q: icpConfig.spawnXQ,
        y_q: icpConfig.spawnYQ,
        rot_q: icpConfig.spawnRotQ,
      },
      allocation: {
        splitAggro: icpConfig.allocSplit,
        tetherRes: icpConfig.allocTether,
        orbPower: icpConfig.allocPower,
      },
    });

    const recomputedHash = await sha256(preimage);
    const recomputedHashHex = toHex(recomputedHash);

    if (recomputedHashHex !== configHashHex) {
      // Hash mismatch - config tampered, skip
      skippedHashMismatch.push(playerHex);
      continue;
    }

    // Hash verified - dequantize spawn and include in roster
    const dequantized = dequantizeSpawn(
      icpConfig.spawnXQ,
      icpConfig.spawnYQ,
      icpConfig.spawnRotQ,
    );

    const joinData: PlayerJoinDataForEngine = {
      spawnXNorm: dequantized.x,
      spawnYNorm: dequantized.y,
      spawnRotRad: dequantized.rot,
      allocSplitAggro: icpConfig.allocSplit,
      allocTetherRes: icpConfig.allocTether,
      allocOrbPower: icpConfig.allocPower,
      tpPreset: icpConfig.tpPreset,
    };

    entries.push({
      playerHex,
      playerBase58: solanaPlayer.player,
      playerConfigHashHex: configHashHex,
      joinData,
      hashVerified: true,
    });

    joinDataByOwnerHex[playerHex] = joinData;
  }

  return {
    entries,
    joinDataByOwnerHex,
    skippedNoConfig,
    skippedHashMismatch,
  };
}
