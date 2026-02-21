/**
 * Calculation utilities for fees and points
 * Matches the logic from the test helpers and program
 */

import { POINTS, FEES } from "../constants";
import { FeeBreakdown, PointsBreakdown } from "../types";

/**
 * Calculate fee distribution
 * Logic: Combine entry + TP, split 80% to pot and 20% to fees
 * Fee split: 10% to LP, 10% to dev (of total payment)
 * LP accumulation happens always (pre and post genesis)
 */
export function calculateFees(
  entryLamports: number,
  devFeeBps: number,
  takeProfitLamports: number = 0,
): FeeBreakdown {
  // Combine entry + TP fee for unified calculation
  const totalPayment = entryLamports + takeProfitLamports;
  
  // Split total: 80% to pot, 20% to fees
  const toPot = Math.floor(totalPayment * 0.8);
  const toFees = totalPayment - toPot;
  
  // Fee split: 50% to LP, 50% to dev (of the 20% fee portion)
  // This means: 10% of total goes to LP, 10% of total goes to dev
  const lpAccum = Math.floor(toFees / 2);
  const devFee = toFees - lpAccum;
  const actualDev = devFee; // Dev gets full portion (referral comes from this if applicable)
  const takeProfit = takeProfitLamports;
  const netToVault = toPot;

  return {
    devFee,
    lpAccum,
    actualDev,
    takeProfit,
    netToVault,
  };
}

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
export function calculatePoints(
  placement: number,
  kills: number,
  cap: number = POINTS.DEFAULT_CAP,
): PointsBreakdown {
  let placementPoints: number = POINTS.PARTICIPATION_FLOOR; // Default participation floor

  // Calculate placement points
  if (placement === 1) {
    placementPoints = POINTS.FIRST_PLACE;
  } else if (placement === 2) {
    placementPoints = POINTS.SECOND_PLACE;
  } else if (placement === 3) {
    placementPoints = POINTS.THIRD_PLACE;
  }

  // Calculate kill points
  const killPoints = kills * POINTS.PER_KILL;

  // Total before cap
  const totalBeforeCap = placementPoints + killPoints;

  // Apply cap
  const totalAfterCap = Math.min(totalBeforeCap, cap);

  return {
    placementPoints,
    killPoints,
    totalBeforeCap,
    totalAfterCap,
  };
}

/**
 * Calculate the total prize pool from entry fees and player count
 */
export function calculatePrizePool(
  entryLamports: number,
  playerCount: number,
  devFeeBps: number,
  takeProfitLamports: number = 0,
): number {
  const fees = calculateFees(entryLamports, devFeeBps, takeProfitLamports);
  return fees.netToVault * playerCount;
}

/**
 * Calculate proportional payout from a total prize pool
 */
export function calculatePayout(
  totalPrizePool: number,
  percentage: number,
): number {
  return Math.floor((totalPrizePool * percentage) / 100);
}

/**
 * Calculate ORB tokens from points based on conversion ratio
 * Used for Season 0 point conversion
 */
export function calculateOrbFromPoints(
  points: number,
  pointsPerOrb: number,
): number {
  return Math.floor(points / pointsPerOrb);
}

/**
 * Calculate ORB tokens from season pool based on player's point share
 * Used for Season 1+ pool claims
 */
export function calculateOrbFromPool(
  playerPoints: bigint,
  totalPoints: bigint,
  poolOrbAtoms: bigint,
): bigint {
  if (totalPoints === BigInt(0)) {
    return BigInt(0);
  }
  // Formula: (playerPoints * poolOrbAtoms) / totalPoints
  return (playerPoints * poolOrbAtoms) / totalPoints;
}

/**
 * Calculate expected prize pool from entries (what players contributed)
 */
export function calculateExpectedPrizeFromEntries(
  entryLamports: number,
  playerCount: number,
  devFeeBps: number,
  takeProfitLamports: number = 0,
): number {
  const fees = calculateFees(entryLamports, devFeeBps, takeProfitLamports);
  return fees.netToVault * playerCount;
}

/**
 * Calculate bonus amount in pot (extra funds beyond player entries)
 * Returns: actualVaultBalance - expectedFromEntries
 */
export function calculatePotBonus(
  actualVaultBalance: number,
  entryLamports: number,
  playerCount: number,
  devFeeBps: number,
  takeProfitLamports: number = 0,
): number {
  const expectedFromEntries = calculateExpectedPrizeFromEntries(
    entryLamports,
    playerCount,
    devFeeBps,
    takeProfitLamports,
  );
  return Math.max(0, actualVaultBalance - expectedFromEntries);
}
