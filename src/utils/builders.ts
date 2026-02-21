/**
 * Builder utilities for constructing settlement and stats data structures
 * Provides helpers for creating properly formatted instruction parameters
 */

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PlayerResult, PlayerStatsUpdate, PayoutData, StatsData } from "../types";

/**
 * Create a balanced settlement data structure
 * Distributes a prize pool among winners with placements and kills
 */
export function createSettlementData(params: {
  players: PublicKey[];
  totalPrizePool: number;
  placements: number[];
  kills: number[];
  payoutPercentages?: number[];
}): { payouts: PlayerResult[]; stats: PlayerStatsUpdate[] } {
  const { players, totalPrizePool, placements, kills, payoutPercentages } = params;

  // Default payout percentages if not provided
  const defaultPercentages = payoutPercentages || calculateDefaultPayouts(players.length);

  const payouts: PlayerResult[] = [];
  const stats: PlayerStatsUpdate[] = [];

  for (let i = 0; i < players.length; i++) {
    const payout = Math.floor((totalPrizePool * defaultPercentages[i]) / 100);

    payouts.push({
      player: players[i],
      accountIndex: i,
      payout: new BN(payout),
    });

    stats.push({
      player: players[i],
      accountIndex: i,
      prize: new BN(payout),
      placement: placements[i] || 0,
      kills: kills[i] || 0,
      orbEarnedAtoms: new BN(0),
    });
  }

  return { payouts, stats };
}

/**
 * Calculate default payout percentages based on player count
 * Common battle royale distribution
 */
function calculateDefaultPayouts(playerCount: number): number[] {
  if (playerCount === 1) {
    return [100];
  } else if (playerCount === 2) {
    return [70, 30];
  } else if (playerCount === 3) {
    return [50, 30, 20];
  } else {
    // For 4+ players, distribute with decreasing percentages
    const percentages = new Array(playerCount).fill(0);
    let remaining = 100;

    // Top 3 get larger shares
    percentages[0] = 40;
    percentages[1] = 25;
    percentages[2] = 15;
    remaining -= 80;

    // Distribute remaining among others
    const perPlayer = Math.floor(remaining / (playerCount - 3));
    for (let i = 3; i < playerCount; i++) {
      percentages[i] = perPlayer;
    }

    // Give any remainder to first place
    const sum = percentages.reduce((a, b) => a + b, 0);
    percentages[0] += 100 - sum;

    return percentages;
  }
}

/**
 * Create PayoutData structure for roundPayout instruction
 */
export function createPayoutData(payouts: PlayerResult[]): PayoutData {
  return { payouts };
}

/**
 * Create StatsData structure for updatePlayerStats instruction
 */
export function createStatsData(updates: PlayerStatsUpdate[]): StatsData {
  return { updates };
}

/**
 * Remap payout data for batched operations
 * Adjusts accountIndex to be relative to the batch
 */
export function remapPayoutBatch(
  payouts: PlayerResult[],
  batchStart: number,
  batchSize: number,
): PlayerResult[] {
  const batch = payouts.slice(batchStart, batchStart + batchSize);
  return batch.map((payout, idx) => ({
    player: payout.player,
    accountIndex: idx, // Relative to this batch
    payout: payout.payout,
  }));
}

/**
 * Remap stats data for batched operations
 * Adjusts accountIndex to be relative to the batch
 */
export function remapStatsBatch(
  stats: PlayerStatsUpdate[],
  batchStart: number,
  batchSize: number,
): PlayerStatsUpdate[] {
  const batch = stats.slice(batchStart, batchStart + batchSize);
  return batch.map((stat, idx) => ({
    player: stat.player,
    accountIndex: idx, // Relative to this batch
    prize: stat.prize,
    placement: stat.placement,
    kills: stat.kills,
    orbEarnedAtoms: stat.orbEarnedAtoms,
  }));
}
