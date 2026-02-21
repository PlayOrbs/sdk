"use strict";
/**
 * Constants for the Orbs Game SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_SPACE = exports.FEES = exports.POINTS = exports.DEFAULTS = exports.PROGRAM_ADDRESSES = exports.PAGE_SIZE = exports.SEEDS = exports.PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
/**
 * Program ID for Orbs Game
 */
exports.PROGRAM_ID = new web3_js_1.PublicKey("CZGSRyEqc9RkCsGbknF92FQQJqPF7SzQDH7avmfRUaqd");
/**
 * PDA Seeds used for account derivation
 */
exports.SEEDS = {
    ROOT: Buffer.from("root"),
    ROUND: Buffer.from("round"),
    ROUND_PAGE: Buffer.from("round_page"),
    ROUND_PLAYER: Buffer.from("rp"),
    ROUND_PLAYER_V2: Buffer.from("round_player_v2"),
    VAULT: Buffer.from("vault"),
    PLAYER_STATS: Buffer.from("ps"),
    PLAYER_PROFILE: Buffer.from("player_profile"),
    REFERRAL: Buffer.from("referral"),
    NICKNAME: Buffer.from("nickname"),
    SEASON_SNAPSHOT: Buffer.from("season_snapshot"),
    SEASON_POOL_VAULT: Buffer.from("season_pool_vault"),
    PROGRAM_VAULT: Buffer.from("program_vault"),
    MINT_AUTHORITY: Buffer.from("mint_authority"),
    VAULT_AUTHORITY: Buffer.from("vault_authority"),
    LP_VAULT: Buffer.from("lp_vault"),
    ORB_LP_VAULT: Buffer.from("orb_lp_vault"),
};
/**
 * Paged storage constants
 */
exports.PAGE_SIZE = 120;
/**
 * Well-known program addresses
 */
exports.PROGRAM_ADDRESSES = {
    TOKEN_PROGRAM: new web3_js_1.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    ASSOCIATED_TOKEN_PROGRAM: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    SYSTEM_PROGRAM: new web3_js_1.PublicKey("11111111111111111111111111111111"),
    WSOL_MINT: new web3_js_1.PublicKey("So11111111111111111111111111111111111111112"),
    METADATA_PROGRAM: new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
};
/**
 * Default SDK configuration values
 */
exports.DEFAULTS = {
    /** Default max retries for transactions */
    MAX_RETRIES: 3,
    /** Default batch size for batched operations */
    BATCH_SIZE: 10,
    /** Default transaction confirmation commitment */
    COMMITMENT: "confirmed",
};
/**
 * Points system constants (matching program logic)
 */
exports.POINTS = {
    /** Points for 1st place */
    FIRST_PLACE: 500,
    /** Points for 2nd place */
    SECOND_PLACE: 350,
    /** Points for 3rd place */
    THIRD_PLACE: 250,
    /** Points per kill */
    PER_KILL: 100,
    /** Minimum participation points */
    PARTICIPATION_FLOOR: 50,
    /** Default points cap per round */
    DEFAULT_CAP: 500,
};
/**
 * Fee calculation constants
 */
exports.FEES = {
    /** Basis points divisor (10,000 = 100%) */
    BPS_DIVISOR: 10000,
};
/**
 * Account space calculations (in bytes)
 */
exports.ACCOUNT_SPACE = {
    /** Discriminator size for all Anchor accounts */
    DISCRIMINATOR: 8,
    /** RootAccount size (approximate, vector capacities vary) */
    ROOT_ACCOUNT: 8 + 1024, // Discriminator + estimated space
    /** Round account base size */
    ROUND_BASE: 8 + 256,
    /** PlayerStats account size */
    PLAYER_STATS: 8 + 78, // Discriminator + fixed fields
    /** SeasonSnapshot account size */
    SEASON_SNAPSHOT: 8 + 51,
};
