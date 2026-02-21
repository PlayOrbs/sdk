"use strict";
/**
 * Roster utilities for merging Solana roster with ICP player config.
 *
 * Solana is the source of truth for who is in the game (RoundPlayerV2 PDAs).
 * ICP provides player config (spawn position, skill allocation) keyed by player_config_hash.
 * Players are matched by player_config_hash commitment, not player pubkey.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rosterToHex = rosterToHex;
exports.mergeRosterWithConfig = mergeRosterWithConfig;
const web3_js_1 = require("@solana/web3.js");
const player_config_1 = require("./player-config");
/**
 * Convert Uint8Array to hex string.
 */
function toHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
/**
 * Convert base58 pubkey to hex string.
 */
function base58ToHex(base58) {
    const pubkey = new web3_js_1.PublicKey(base58);
    return toHex(pubkey.toBytes());
}
/**
 * Convert roster from base58 to hex format.
 */
function rosterToHex(rosterBase58) {
    return rosterBase58.map(base58ToHex);
}
/**
 * Compute SHA-256 hash of preimage.
 */
async function sha256(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
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
async function mergeRosterWithConfig(solanaPlayers, icpConfigs, roundId, tierId) {
    // Build map of ICP configs by player_config_hash hex
    const icpConfigByHashHex = new Map();
    for (const config of icpConfigs) {
        const hashHex = toHex(config.playerConfigHash);
        icpConfigByHashHex.set(hashHex, config);
    }
    const entries = [];
    const joinDataByOwnerHex = {};
    const skippedNoConfig = [];
    const skippedHashMismatch = [];
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
        const preimage = (0, player_config_1.buildPlayerConfigPreimage)({
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
        const dequantized = (0, player_config_1.dequantizeSpawn)(icpConfig.spawnXQ, icpConfig.spawnYQ, icpConfig.spawnRotQ);
        const joinData = {
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
