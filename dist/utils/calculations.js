"use strict";
/**
 * Calculation utilities for fees and points
 * Matches the logic from the test helpers and program
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFees = calculateFees;
exports.calculatePoints = calculatePoints;
exports.calculatePrizePool = calculatePrizePool;
exports.calculatePayout = calculatePayout;
exports.calculateOrbFromPoints = calculateOrbFromPoints;
exports.calculateOrbFromPool = calculateOrbFromPool;
exports.calculateExpectedPrizeFromEntries = calculateExpectedPrizeFromEntries;
exports.calculatePotBonus = calculatePotBonus;
const constants_1 = require("../constants");
/**
 * Calculate fee distribution
 * Logic: Combine entry + TP, split 80% to pot and 20% to fees
 * Fee split: 10% to LP, 10% to dev (of total payment)
 * LP accumulation happens always (pre and post genesis)
 */
function calculateFees(entryLamports, devFeeBps, takeProfitLamports = 0) {
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
function calculatePoints(placement, kills, cap = constants_1.POINTS.DEFAULT_CAP) {
    let placementPoints = constants_1.POINTS.PARTICIPATION_FLOOR; // Default participation floor
    // Calculate placement points
    if (placement === 1) {
        placementPoints = constants_1.POINTS.FIRST_PLACE;
    }
    else if (placement === 2) {
        placementPoints = constants_1.POINTS.SECOND_PLACE;
    }
    else if (placement === 3) {
        placementPoints = constants_1.POINTS.THIRD_PLACE;
    }
    // Calculate kill points
    const killPoints = kills * constants_1.POINTS.PER_KILL;
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
function calculatePrizePool(entryLamports, playerCount, devFeeBps, takeProfitLamports = 0) {
    const fees = calculateFees(entryLamports, devFeeBps, takeProfitLamports);
    return fees.netToVault * playerCount;
}
/**
 * Calculate proportional payout from a total prize pool
 */
function calculatePayout(totalPrizePool, percentage) {
    return Math.floor((totalPrizePool * percentage) / 100);
}
/**
 * Calculate ORB tokens from points based on conversion ratio
 * Used for Season 0 point conversion
 */
function calculateOrbFromPoints(points, pointsPerOrb) {
    return Math.floor(points / pointsPerOrb);
}
/**
 * Calculate ORB tokens from season pool based on player's point share
 * Used for Season 1+ pool claims
 */
function calculateOrbFromPool(playerPoints, totalPoints, poolOrbAtoms) {
    if (totalPoints === BigInt(0)) {
        return BigInt(0);
    }
    // Formula: (playerPoints * poolOrbAtoms) / totalPoints
    return (playerPoints * poolOrbAtoms) / totalPoints;
}
/**
 * Calculate expected prize pool from entries (what players contributed)
 */
function calculateExpectedPrizeFromEntries(entryLamports, playerCount, devFeeBps, takeProfitLamports = 0) {
    const fees = calculateFees(entryLamports, devFeeBps, takeProfitLamports);
    return fees.netToVault * playerCount;
}
/**
 * Calculate bonus amount in pot (extra funds beyond player entries)
 * Returns: actualVaultBalance - expectedFromEntries
 */
function calculatePotBonus(actualVaultBalance, entryLamports, playerCount, devFeeBps, takeProfitLamports = 0) {
    const expectedFromEntries = calculateExpectedPrizeFromEntries(entryLamports, playerCount, devFeeBps, takeProfitLamports);
    return Math.max(0, actualVaultBalance - expectedFromEntries);
}
