/**
 * Calculation utilities for fees and points
 * Matches the logic from the test helpers and program
 */
import { FeeBreakdown, PointsBreakdown } from "../types";
/**
 * Calculate fee distribution
 * Logic: Combine entry + TP, split 80% to pot and 20% to fees
 * Fee split: 10% to LP, 10% to dev (of total payment)
 * LP accumulation happens always (pre and post genesis)
 */
export declare function calculateFees(entryLamports: number, devFeeBps: number, takeProfitLamports?: number): FeeBreakdown;
/**
 * Calculate points awarded based on placement and kills
 * Matches calculateExpectedPoints from tests/helpers/test-utils.ts
 *
 * Point distribution:
 * - 1st place: 500 points
 * - 2nd place: 350 points
 * - 3rd place: 250 points
 * - Participation floor: 50 points (if not in top 3)
 * - Kill bonus: 100 points per kill
 * - Capped at pointsCap (default 500)
 */
export declare function calculatePoints(placement: number, kills: number, cap?: number): PointsBreakdown;
/**
 * Calculate the total prize pool from entry fees and player count
 */
export declare function calculatePrizePool(entryLamports: number, playerCount: number, devFeeBps: number, takeProfitLamports?: number): number;
/**
 * Calculate proportional payout from a total prize pool
 */
export declare function calculatePayout(totalPrizePool: number, percentage: number): number;
/**
 * Calculate ORB tokens from points based on conversion ratio
 * Used for Season 0 point conversion
 */
export declare function calculateOrbFromPoints(points: number, pointsPerOrb: number): number;
/**
 * Calculate ORB tokens from season pool based on player's point share
 * Used for Season 1+ pool claims
 */
export declare function calculateOrbFromPool(playerPoints: bigint, totalPoints: bigint, poolOrbAtoms: bigint): bigint;
/**
 * Calculate expected prize pool from entries (what players contributed)
 */
export declare function calculateExpectedPrizeFromEntries(entryLamports: number, playerCount: number, devFeeBps: number, takeProfitLamports?: number): number;
/**
 * Calculate bonus amount in pot (extra funds beyond player entries)
 * Returns: actualVaultBalance - expectedFromEntries
 */
export declare function calculatePotBonus(actualVaultBalance: number, entryLamports: number, playerCount: number, devFeeBps: number, takeProfitLamports?: number): number;
//# sourceMappingURL=calculations.d.ts.map