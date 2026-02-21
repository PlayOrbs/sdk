/**
 * Constants for the Orbs Game SDK
 */
import { PublicKey } from "@solana/web3.js";
/**
 * Program ID for Orbs Game
 */
export declare const PROGRAM_ID: PublicKey;
/**
 * PDA Seeds used for account derivation
 */
export declare const SEEDS: {
    readonly ROOT: Buffer<ArrayBuffer>;
    readonly ROUND: Buffer<ArrayBuffer>;
    readonly ROUND_PAGE: Buffer<ArrayBuffer>;
    readonly ROUND_PLAYER: Buffer<ArrayBuffer>;
    readonly ROUND_PLAYER_V2: Buffer<ArrayBuffer>;
    readonly VAULT: Buffer<ArrayBuffer>;
    readonly PLAYER_STATS: Buffer<ArrayBuffer>;
    readonly PLAYER_PROFILE: Buffer<ArrayBuffer>;
    readonly REFERRAL: Buffer<ArrayBuffer>;
    readonly NICKNAME: Buffer<ArrayBuffer>;
    readonly SEASON_SNAPSHOT: Buffer<ArrayBuffer>;
    readonly SEASON_POOL_VAULT: Buffer<ArrayBuffer>;
    readonly PROGRAM_VAULT: Buffer<ArrayBuffer>;
    readonly MINT_AUTHORITY: Buffer<ArrayBuffer>;
    readonly VAULT_AUTHORITY: Buffer<ArrayBuffer>;
    readonly LP_VAULT: Buffer<ArrayBuffer>;
    readonly ORB_LP_VAULT: Buffer<ArrayBuffer>;
};
/**
 * Paged storage constants
 */
export declare const PAGE_SIZE = 120;
/**
 * Well-known program addresses
 */
export declare const PROGRAM_ADDRESSES: {
    readonly TOKEN_PROGRAM: PublicKey;
    readonly ASSOCIATED_TOKEN_PROGRAM: PublicKey;
    readonly SYSTEM_PROGRAM: PublicKey;
    readonly WSOL_MINT: PublicKey;
    readonly METADATA_PROGRAM: PublicKey;
};
/**
 * Default SDK configuration values
 */
export declare const DEFAULTS: {
    /** Default max retries for transactions */
    readonly MAX_RETRIES: 3;
    /** Default batch size for batched operations */
    readonly BATCH_SIZE: 10;
    /** Default transaction confirmation commitment */
    readonly COMMITMENT: "confirmed";
};
/**
 * Points system constants (matching program logic)
 */
export declare const POINTS: {
    /** Points for 1st place */
    readonly FIRST_PLACE: 500;
    /** Points for 2nd place */
    readonly SECOND_PLACE: 350;
    /** Points for 3rd place */
    readonly THIRD_PLACE: 250;
    /** Points per kill */
    readonly PER_KILL: 100;
    /** Minimum participation points */
    readonly PARTICIPATION_FLOOR: 50;
    /** Default points cap per round */
    readonly DEFAULT_CAP: 500;
};
/**
 * Fee calculation constants
 */
export declare const FEES: {
    /** Basis points divisor (10,000 = 100%) */
    readonly BPS_DIVISOR: 10000;
};
/**
 * Account space calculations (in bytes)
 */
export declare const ACCOUNT_SPACE: {
    /** Discriminator size for all Anchor accounts */
    readonly DISCRIMINATOR: 8;
    /** RootAccount size (approximate, vector capacities vary) */
    readonly ROOT_ACCOUNT: number;
    /** Round account base size */
    readonly ROUND_BASE: number;
    /** PlayerStats account size */
    readonly PLAYER_STATS: number;
    /** SeasonSnapshot account size */
    readonly SEASON_SNAPSHOT: number;
};
//# sourceMappingURL=constants.d.ts.map