/**
 * Checkpoint helpers for decoding and checking checkpoint bitmaps
 */

import BN from "bn.js";

/** Global checkpoint bit indices */
export const GlobalCheckpoint = {
  /** Nickname Pioneer: first successful nickname set ever (1000 pts) */
  NICKNAME_PIONEER: 0,
  /** Referrer Rookie: first referral (500 pts) */
  REFERRER_ROOKIE: 1,
  /** Referrer Pro: 50 referrals (5000 pts) */
  REFERRER_PRO: 2,
  /** Referrer Legend: 250 referrals (10000 pts) */
  REFERRER_LEGEND: 3,
} as const;

/** Seasonal checkpoint bit indices */
export const SeasonalCheckpoint = {
  /** First Blood: first paid round of season (100 pts) */
  FIRST_BLOOD: 0,
  /** Getting Warm: 5 paid rounds played (150 pts) */
  GETTING_WARM: 1,
  /** Committed: 25 paid rounds played (300 pts) */
  COMMITTED: 2,
  /** Dedicated: 50 paid rounds played (500 pts) */
  DEDICATED: 8,
  /** Veteran: 100 paid rounds played (1000 pts) */
  VETERAN: 9,
  /** Miner: first time earning ORB emissions (250 pts) */
  MINER: 3,
  /** Champion: first win of season (400 pts) */
  CHAMPION: 4,
  /** Killing Spree: 3 kills in one paid round (500 pts) */
  KILLING_SPREE: 5,
  /** Hot Streak: 2 consecutive paid-round wins (800 pts) */
  HOT_STREAK: 6,
  /** Legendary: 10 consecutive paid-round wins (3000 pts) */
  LEGENDARY: 7,
} as const;

/** Points awarded for each checkpoint */
export const CheckpointPoints = {
  // Global
  NICKNAME_PIONEER: 500,
  REFERRER_ROOKIE: 200,
  REFERRER_PRO: 800,
  REFERRER_LEGEND: 2000,
  // Seasonal
  FIRST_BLOOD: 50,
  GETTING_WARM: 75,
  COMMITTED: 120,
  DEDICATED: 180,
  VETERAN: 250,
  MINER: 90,
  CHAMPION: 220,
  KILLING_SPREE: 300,
  HOT_STREAK: 450,
  LEGENDARY: 1800,
} as const;

/** Checkpoint info with name, description, and points */
export interface CheckpointInfo {
  id: string;
  name: string;
  description: string;
  points: number;
  type: 'global' | 'seasonal';
  bit: number;
}

/** All checkpoint definitions */
export const CHECKPOINTS: CheckpointInfo[] = [
  // Global
  {
    id: 'NICKNAME_PIONEER',
    name: 'Nickname Pioneer',
    description: 'Set your nickname for the first time',
    points: CheckpointPoints.NICKNAME_PIONEER,
    type: 'global',
    bit: GlobalCheckpoint.NICKNAME_PIONEER,
  },
  {
    id: 'REFERRER_ROOKIE',
    name: 'Referrer Rookie',
    description: 'Refer your first player',
    points: CheckpointPoints.REFERRER_ROOKIE,
    type: 'global',
    bit: GlobalCheckpoint.REFERRER_ROOKIE,
  },
  {
    id: 'REFERRER_PRO',
    name: 'Referrer Pro',
    description: 'Refer 50 players',
    points: CheckpointPoints.REFERRER_PRO,
    type: 'global',
    bit: GlobalCheckpoint.REFERRER_PRO,
  },
  {
    id: 'REFERRER_LEGEND',
    name: 'Referrer Legend',
    description: 'Refer 250 players',
    points: CheckpointPoints.REFERRER_LEGEND,
    type: 'global',
    bit: GlobalCheckpoint.REFERRER_LEGEND,
  },
  // Seasonal
  {
    id: 'FIRST_BLOOD',
    name: 'First Blood',
    description: 'Play your first round of the season',
    points: CheckpointPoints.FIRST_BLOOD,
    type: 'seasonal',
    bit: SeasonalCheckpoint.FIRST_BLOOD,
  },
  {
    id: 'GETTING_WARM',
    name: 'Getting Warm',
    description: 'Play 5 rounds in a season',
    points: CheckpointPoints.GETTING_WARM,
    type: 'seasonal',
    bit: SeasonalCheckpoint.GETTING_WARM,
  },
  {
    id: 'COMMITTED',
    name: 'Committed',
    description: 'Play 25 rounds in a season',
    points: CheckpointPoints.COMMITTED,
    type: 'seasonal',
    bit: SeasonalCheckpoint.COMMITTED,
  },
  {
    id: 'DEDICATED',
    name: 'Dedicated',
    description: 'Play 50 rounds in a season',
    points: CheckpointPoints.DEDICATED,
    type: 'seasonal',
    bit: SeasonalCheckpoint.DEDICATED,
  },
  {
    id: 'VETERAN',
    name: 'Veteran',
    description: 'Play 100 rounds in a season',
    points: CheckpointPoints.VETERAN,
    type: 'seasonal',
    bit: SeasonalCheckpoint.VETERAN,
  },
  {
    id: 'MINER',
    name: 'Miner',
    description: 'Earn ORB emissions for the first time',
    points: CheckpointPoints.MINER,
    type: 'seasonal',
    bit: SeasonalCheckpoint.MINER,
  },
  {
    id: 'CHAMPION',
    name: 'Champion',
    description: 'Win your first round of the season',
    points: CheckpointPoints.CHAMPION,
    type: 'seasonal',
    bit: SeasonalCheckpoint.CHAMPION,
  },
  {
    id: 'KILLING_SPREE',
    name: 'Killing Spree',
    description: 'Get 3 kills in a single round',
    points: CheckpointPoints.KILLING_SPREE,
    type: 'seasonal',
    bit: SeasonalCheckpoint.KILLING_SPREE,
  },
  {
    id: 'HOT_STREAK',
    name: 'Hot Streak',
    description: 'Win 2 consecutive rounds',
    points: CheckpointPoints.HOT_STREAK,
    type: 'seasonal',
    bit: SeasonalCheckpoint.HOT_STREAK,
  },
  {
    id: 'LEGENDARY',
    name: 'Legendary',
    description: 'Win 10 consecutive rounds',
    points: CheckpointPoints.LEGENDARY,
    type: 'seasonal',
    bit: SeasonalCheckpoint.LEGENDARY,
  },
];

/**
 * Check if a bit is set in a multi-word bitmap (seasonal checkpoints)
 * @param words - Array of BN values representing the bitmap (4 x u64 = 256 bits)
 * @param bit - Bit index to check (0-255)
 */
export function hasSeasonalCheckpoint(words: (BN | number | bigint)[], bit: number): boolean {
  const wordIdx = Math.floor(bit / 64);
  const bitIdx = bit % 64;
  if (wordIdx >= words.length) {
    return false;
  }
  // Convert to BN if needed (Anchor may return BN, number, or bigint)
  const rawWord = words[wordIdx];
  const word = rawWord instanceof BN ? rawWord : new BN(rawWord.toString());
  const mask = new BN(1).shln(bitIdx);
  return !word.and(mask).isZero();
}

/**
 * Check if a bit is set in a single u64 bitmap (global checkpoints)
 * @param bitmap - BN value representing the bitmap (u64 = 64 bits)
 * @param bit - Bit index to check (0-63)
 */
export function hasGlobalCheckpoint(bitmap: BN | number | bigint, bit: number): boolean {
  // Convert to BN if needed (Anchor may return BN, number, or bigint)
  const bn = bitmap instanceof BN ? bitmap : new BN(bitmap.toString());
  const mask = new BN(1).shln(bit);
  return !bn.and(mask).isZero();
}

/**
 * Get all claimed seasonal checkpoints from a bitmap
 * @param words - Array of BN values representing the bitmap
 * @returns Array of checkpoint info for claimed checkpoints
 */
export function getClaimedSeasonalCheckpoints(words: BN[]): CheckpointInfo[] {
  return CHECKPOINTS.filter(
    (cp) => cp.type === 'seasonal' && hasSeasonalCheckpoint(words, cp.bit)
  );
}

/**
 * Get all claimed global checkpoints from a bitmap
 * @param bitmap - BN value representing the bitmap
 * @returns Array of checkpoint info for claimed checkpoints
 */
export function getClaimedGlobalCheckpoints(bitmap: BN): CheckpointInfo[] {
  return CHECKPOINTS.filter(
    (cp) => cp.type === 'global' && hasGlobalCheckpoint(bitmap, cp.bit)
  );
}

/**
 * Get all unclaimed seasonal checkpoints from a bitmap
 * @param words - Array of BN values representing the bitmap
 * @returns Array of checkpoint info for unclaimed checkpoints
 */
export function getUnclaimedSeasonalCheckpoints(words: BN[]): CheckpointInfo[] {
  return CHECKPOINTS.filter(
    (cp) => cp.type === 'seasonal' && !hasSeasonalCheckpoint(words, cp.bit)
  );
}

/**
 * Get all unclaimed global checkpoints from a bitmap
 * @param bitmap - BN value representing the bitmap
 * @returns Array of checkpoint info for unclaimed checkpoints
 */
export function getUnclaimedGlobalCheckpoints(bitmap: BN): CheckpointInfo[] {
  return CHECKPOINTS.filter(
    (cp) => cp.type === 'global' && !hasGlobalCheckpoint(bitmap, cp.bit)
  );
}

/**
 * Calculate total points from claimed checkpoints
 * @param seasonalWords - Seasonal checkpoint bitmap
 * @param globalBitmap - Global checkpoint bitmap
 * @returns Total points from all claimed checkpoints
 */
export function calculateCheckpointPoints(
  seasonalWords: BN[],
  globalBitmap: BN
): number {
  const seasonalPoints = getClaimedSeasonalCheckpoints(seasonalWords).reduce(
    (sum, cp) => sum + cp.points,
    0
  );
  const globalPoints = getClaimedGlobalCheckpoints(globalBitmap).reduce(
    (sum, cp) => sum + cp.points,
    0
  );
  return seasonalPoints + globalPoints;
}

/**
 * Get a summary of all checkpoints with their claimed status
 * @param seasonalWords - Seasonal checkpoint bitmap
 * @param globalBitmap - Global checkpoint bitmap
 * @returns Array of checkpoints with claimed status
 */
export function getCheckpointSummary(
  seasonalWords: (BN | number | bigint)[],
  globalBitmap: BN | number | bigint
): Array<CheckpointInfo & { claimed: boolean }> {
  return CHECKPOINTS.map((cp) => ({
    ...cp,
    claimed:
      cp.type === 'seasonal'
        ? hasSeasonalCheckpoint(seasonalWords, cp.bit)
        : hasGlobalCheckpoint(globalBitmap, cp.bit),
  }));
}
