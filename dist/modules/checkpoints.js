"use strict";
/**
 * Checkpoint helpers for decoding and checking checkpoint bitmaps
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHECKPOINTS = exports.CheckpointPoints = exports.SeasonalCheckpoint = exports.GlobalCheckpoint = void 0;
exports.hasSeasonalCheckpoint = hasSeasonalCheckpoint;
exports.hasGlobalCheckpoint = hasGlobalCheckpoint;
exports.getClaimedSeasonalCheckpoints = getClaimedSeasonalCheckpoints;
exports.getClaimedGlobalCheckpoints = getClaimedGlobalCheckpoints;
exports.getUnclaimedSeasonalCheckpoints = getUnclaimedSeasonalCheckpoints;
exports.getUnclaimedGlobalCheckpoints = getUnclaimedGlobalCheckpoints;
exports.calculateCheckpointPoints = calculateCheckpointPoints;
exports.getCheckpointSummary = getCheckpointSummary;
const bn_js_1 = __importDefault(require("bn.js"));
/** Global checkpoint bit indices */
exports.GlobalCheckpoint = {
    /** Nickname Pioneer: first successful nickname set ever (1000 pts) */
    NICKNAME_PIONEER: 0,
    /** Referrer Rookie: first referral (500 pts) */
    REFERRER_ROOKIE: 1,
    /** Referrer Pro: 50 referrals (5000 pts) */
    REFERRER_PRO: 2,
    /** Referrer Legend: 250 referrals (10000 pts) */
    REFERRER_LEGEND: 3,
};
/** Seasonal checkpoint bit indices */
exports.SeasonalCheckpoint = {
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
};
/** Points awarded for each checkpoint */
exports.CheckpointPoints = {
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
};
/** All checkpoint definitions */
exports.CHECKPOINTS = [
    // Global
    {
        id: 'NICKNAME_PIONEER',
        name: 'Nickname Pioneer',
        description: 'Set your nickname for the first time',
        points: exports.CheckpointPoints.NICKNAME_PIONEER,
        type: 'global',
        bit: exports.GlobalCheckpoint.NICKNAME_PIONEER,
    },
    {
        id: 'REFERRER_ROOKIE',
        name: 'Referrer Rookie',
        description: 'Refer your first player',
        points: exports.CheckpointPoints.REFERRER_ROOKIE,
        type: 'global',
        bit: exports.GlobalCheckpoint.REFERRER_ROOKIE,
    },
    {
        id: 'REFERRER_PRO',
        name: 'Referrer Pro',
        description: 'Refer 50 players',
        points: exports.CheckpointPoints.REFERRER_PRO,
        type: 'global',
        bit: exports.GlobalCheckpoint.REFERRER_PRO,
    },
    {
        id: 'REFERRER_LEGEND',
        name: 'Referrer Legend',
        description: 'Refer 250 players',
        points: exports.CheckpointPoints.REFERRER_LEGEND,
        type: 'global',
        bit: exports.GlobalCheckpoint.REFERRER_LEGEND,
    },
    // Seasonal
    {
        id: 'FIRST_BLOOD',
        name: 'First Blood',
        description: 'Play your first round of the season',
        points: exports.CheckpointPoints.FIRST_BLOOD,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.FIRST_BLOOD,
    },
    {
        id: 'GETTING_WARM',
        name: 'Getting Warm',
        description: 'Play 5 rounds in a season',
        points: exports.CheckpointPoints.GETTING_WARM,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.GETTING_WARM,
    },
    {
        id: 'COMMITTED',
        name: 'Committed',
        description: 'Play 25 rounds in a season',
        points: exports.CheckpointPoints.COMMITTED,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.COMMITTED,
    },
    {
        id: 'DEDICATED',
        name: 'Dedicated',
        description: 'Play 50 rounds in a season',
        points: exports.CheckpointPoints.DEDICATED,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.DEDICATED,
    },
    {
        id: 'VETERAN',
        name: 'Veteran',
        description: 'Play 100 rounds in a season',
        points: exports.CheckpointPoints.VETERAN,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.VETERAN,
    },
    {
        id: 'MINER',
        name: 'Miner',
        description: 'Earn ORB emissions for the first time',
        points: exports.CheckpointPoints.MINER,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.MINER,
    },
    {
        id: 'CHAMPION',
        name: 'Champion',
        description: 'Win your first round of the season',
        points: exports.CheckpointPoints.CHAMPION,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.CHAMPION,
    },
    {
        id: 'KILLING_SPREE',
        name: 'Killing Spree',
        description: 'Get 3 kills in a single round',
        points: exports.CheckpointPoints.KILLING_SPREE,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.KILLING_SPREE,
    },
    {
        id: 'HOT_STREAK',
        name: 'Hot Streak',
        description: 'Win 2 consecutive rounds',
        points: exports.CheckpointPoints.HOT_STREAK,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.HOT_STREAK,
    },
    {
        id: 'LEGENDARY',
        name: 'Legendary',
        description: 'Win 10 consecutive rounds',
        points: exports.CheckpointPoints.LEGENDARY,
        type: 'seasonal',
        bit: exports.SeasonalCheckpoint.LEGENDARY,
    },
];
/**
 * Check if a bit is set in a multi-word bitmap (seasonal checkpoints)
 * @param words - Array of BN values representing the bitmap (4 x u64 = 256 bits)
 * @param bit - Bit index to check (0-255)
 */
function hasSeasonalCheckpoint(words, bit) {
    const wordIdx = Math.floor(bit / 64);
    const bitIdx = bit % 64;
    if (wordIdx >= words.length) {
        return false;
    }
    // Convert to BN if needed (Anchor may return BN, number, or bigint)
    const rawWord = words[wordIdx];
    const word = rawWord instanceof bn_js_1.default ? rawWord : new bn_js_1.default(rawWord.toString());
    const mask = new bn_js_1.default(1).shln(bitIdx);
    return !word.and(mask).isZero();
}
/**
 * Check if a bit is set in a single u64 bitmap (global checkpoints)
 * @param bitmap - BN value representing the bitmap (u64 = 64 bits)
 * @param bit - Bit index to check (0-63)
 */
function hasGlobalCheckpoint(bitmap, bit) {
    // Convert to BN if needed (Anchor may return BN, number, or bigint)
    const bn = bitmap instanceof bn_js_1.default ? bitmap : new bn_js_1.default(bitmap.toString());
    const mask = new bn_js_1.default(1).shln(bit);
    return !bn.and(mask).isZero();
}
/**
 * Get all claimed seasonal checkpoints from a bitmap
 * @param words - Array of BN values representing the bitmap
 * @returns Array of checkpoint info for claimed checkpoints
 */
function getClaimedSeasonalCheckpoints(words) {
    return exports.CHECKPOINTS.filter((cp) => cp.type === 'seasonal' && hasSeasonalCheckpoint(words, cp.bit));
}
/**
 * Get all claimed global checkpoints from a bitmap
 * @param bitmap - BN value representing the bitmap
 * @returns Array of checkpoint info for claimed checkpoints
 */
function getClaimedGlobalCheckpoints(bitmap) {
    return exports.CHECKPOINTS.filter((cp) => cp.type === 'global' && hasGlobalCheckpoint(bitmap, cp.bit));
}
/**
 * Get all unclaimed seasonal checkpoints from a bitmap
 * @param words - Array of BN values representing the bitmap
 * @returns Array of checkpoint info for unclaimed checkpoints
 */
function getUnclaimedSeasonalCheckpoints(words) {
    return exports.CHECKPOINTS.filter((cp) => cp.type === 'seasonal' && !hasSeasonalCheckpoint(words, cp.bit));
}
/**
 * Get all unclaimed global checkpoints from a bitmap
 * @param bitmap - BN value representing the bitmap
 * @returns Array of checkpoint info for unclaimed checkpoints
 */
function getUnclaimedGlobalCheckpoints(bitmap) {
    return exports.CHECKPOINTS.filter((cp) => cp.type === 'global' && !hasGlobalCheckpoint(bitmap, cp.bit));
}
/**
 * Calculate total points from claimed checkpoints
 * @param seasonalWords - Seasonal checkpoint bitmap
 * @param globalBitmap - Global checkpoint bitmap
 * @returns Total points from all claimed checkpoints
 */
function calculateCheckpointPoints(seasonalWords, globalBitmap) {
    const seasonalPoints = getClaimedSeasonalCheckpoints(seasonalWords).reduce((sum, cp) => sum + cp.points, 0);
    const globalPoints = getClaimedGlobalCheckpoints(globalBitmap).reduce((sum, cp) => sum + cp.points, 0);
    return seasonalPoints + globalPoints;
}
/**
 * Get a summary of all checkpoints with their claimed status
 * @param seasonalWords - Seasonal checkpoint bitmap
 * @param globalBitmap - Global checkpoint bitmap
 * @returns Array of checkpoints with claimed status
 */
function getCheckpointSummary(seasonalWords, globalBitmap) {
    return exports.CHECKPOINTS.map((cp) => ({
        ...cp,
        claimed: cp.type === 'seasonal'
            ? hasSeasonalCheckpoint(seasonalWords, cp.bit)
            : hasGlobalCheckpoint(globalBitmap, cp.bit),
    }));
}
