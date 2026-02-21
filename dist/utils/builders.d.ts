/**
 * Builder utilities for constructing settlement and stats data structures
 * Provides helpers for creating properly formatted instruction parameters
 */
import { PublicKey } from "@solana/web3.js";
import { PlayerResult, PlayerStatsUpdate, PayoutData, StatsData } from "../types";
/**
 * Create a balanced settlement data structure
 * Distributes a prize pool among winners with placements and kills
 */
export declare function createSettlementData(params: {
    players: PublicKey[];
    totalPrizePool: number;
    placements: number[];
    kills: number[];
    payoutPercentages?: number[];
}): {
    payouts: PlayerResult[];
    stats: PlayerStatsUpdate[];
};
/**
 * Create PayoutData structure for roundPayout instruction
 */
export declare function createPayoutData(payouts: PlayerResult[]): PayoutData;
/**
 * Create StatsData structure for updatePlayerStats instruction
 */
export declare function createStatsData(updates: PlayerStatsUpdate[]): StatsData;
/**
 * Remap payout data for batched operations
 * Adjusts accountIndex to be relative to the batch
 */
export declare function remapPayoutBatch(payouts: PlayerResult[], batchStart: number, batchSize: number): PlayerResult[];
/**
 * Remap stats data for batched operations
 * Adjusts accountIndex to be relative to the batch
 */
export declare function remapStatsBatch(stats: PlayerStatsUpdate[], batchStart: number, batchSize: number): PlayerStatsUpdate[];
//# sourceMappingURL=builders.d.ts.map