/**
 * Checkpoint helpers for decoding and checking checkpoint bitmaps
 */
import BN from "bn.js";
/** Global checkpoint bit indices */
export declare const GlobalCheckpoint: {
    /** Nickname Pioneer: first successful nickname set ever (1000 pts) */
    readonly NICKNAME_PIONEER: 0;
    /** Referrer Rookie: first referral (500 pts) */
    readonly REFERRER_ROOKIE: 1;
    /** Referrer Pro: 50 referrals (5000 pts) */
    readonly REFERRER_PRO: 2;
    /** Referrer Legend: 250 referrals (10000 pts) */
    readonly REFERRER_LEGEND: 3;
};
/** Seasonal checkpoint bit indices */
export declare const SeasonalCheckpoint: {
    /** First Blood: first paid round of season (100 pts) */
    readonly FIRST_BLOOD: 0;
    /** Getting Warm: 5 paid rounds played (150 pts) */
    readonly GETTING_WARM: 1;
    /** Committed: 25 paid rounds played (300 pts) */
    readonly COMMITTED: 2;
    /** Dedicated: 50 paid rounds played (500 pts) */
    readonly DEDICATED: 8;
    /** Veteran: 100 paid rounds played (1000 pts) */
    readonly VETERAN: 9;
    /** Miner: first time earning ORB emissions (250 pts) */
    readonly MINER: 3;
    /** Champion: first win of season (400 pts) */
    readonly CHAMPION: 4;
    /** Killing Spree: 3 kills in one paid round (500 pts) */
    readonly KILLING_SPREE: 5;
    /** Hot Streak: 2 consecutive paid-round wins (800 pts) */
    readonly HOT_STREAK: 6;
    /** Legendary: 10 consecutive paid-round wins (3000 pts) */
    readonly LEGENDARY: 7;
};
/** Points awarded for each checkpoint */
export declare const CheckpointPoints: {
    readonly NICKNAME_PIONEER: 500;
    readonly REFERRER_ROOKIE: 200;
    readonly REFERRER_PRO: 800;
    readonly REFERRER_LEGEND: 2000;
    readonly FIRST_BLOOD: 50;
    readonly GETTING_WARM: 75;
    readonly COMMITTED: 120;
    readonly DEDICATED: 180;
    readonly VETERAN: 250;
    readonly MINER: 90;
    readonly CHAMPION: 220;
    readonly KILLING_SPREE: 300;
    readonly HOT_STREAK: 450;
    readonly LEGENDARY: 1800;
};
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
export declare const CHECKPOINTS: CheckpointInfo[];
/**
 * Check if a bit is set in a multi-word bitmap (seasonal checkpoints)
 * @param words - Array of BN values representing the bitmap (4 x u64 = 256 bits)
 * @param bit - Bit index to check (0-255)
 */
export declare function hasSeasonalCheckpoint(words: (BN | number | bigint)[], bit: number): boolean;
/**
 * Check if a bit is set in a single u64 bitmap (global checkpoints)
 * @param bitmap - BN value representing the bitmap (u64 = 64 bits)
 * @param bit - Bit index to check (0-63)
 */
export declare function hasGlobalCheckpoint(bitmap: BN | number | bigint, bit: number): boolean;
/**
 * Get all claimed seasonal checkpoints from a bitmap
 * @param words - Array of BN values representing the bitmap
 * @returns Array of checkpoint info for claimed checkpoints
 */
export declare function getClaimedSeasonalCheckpoints(words: BN[]): CheckpointInfo[];
/**
 * Get all claimed global checkpoints from a bitmap
 * @param bitmap - BN value representing the bitmap
 * @returns Array of checkpoint info for claimed checkpoints
 */
export declare function getClaimedGlobalCheckpoints(bitmap: BN): CheckpointInfo[];
/**
 * Get all unclaimed seasonal checkpoints from a bitmap
 * @param words - Array of BN values representing the bitmap
 * @returns Array of checkpoint info for unclaimed checkpoints
 */
export declare function getUnclaimedSeasonalCheckpoints(words: BN[]): CheckpointInfo[];
/**
 * Get all unclaimed global checkpoints from a bitmap
 * @param bitmap - BN value representing the bitmap
 * @returns Array of checkpoint info for unclaimed checkpoints
 */
export declare function getUnclaimedGlobalCheckpoints(bitmap: BN): CheckpointInfo[];
/**
 * Calculate total points from claimed checkpoints
 * @param seasonalWords - Seasonal checkpoint bitmap
 * @param globalBitmap - Global checkpoint bitmap
 * @returns Total points from all claimed checkpoints
 */
export declare function calculateCheckpointPoints(seasonalWords: BN[], globalBitmap: BN): number;
/**
 * Get a summary of all checkpoints with their claimed status
 * @param seasonalWords - Seasonal checkpoint bitmap
 * @param globalBitmap - Global checkpoint bitmap
 * @returns Array of checkpoints with claimed status
 */
export declare function getCheckpointSummary(seasonalWords: (BN | number | bigint)[], globalBitmap: BN | number | bigint): Array<CheckpointInfo & {
    claimed: boolean;
}>;
//# sourceMappingURL=checkpoints.d.ts.map