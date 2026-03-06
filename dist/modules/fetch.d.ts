/**
 * Fetch module for retrieving account data
 * Handles account fetching with type safety and error handling
 */
import { PublicKey } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { AccountsModule } from "./accounts";
import { RootAccount, Round, RoundPage, RoundPlayer, RoundPlayerV2, PlayerStats, SeasonSnapshot } from "../types";
import type { ICPModule } from "./icp";
/**
 * Unified roster entry - normalized from either Solana or ICP
 */
export interface RosterEntry {
    player: PublicKey;
    joinTs: number;
    tpPreset: number;
    payoutLamports: number;
    placement: number;
    kills: number;
    source: "solana" | "icp";
}
/**
 * Fetch module for account data retrieval
 */
export declare class FetchModule {
    private program;
    private accounts;
    constructor(program: Program, accounts: AccountsModule);
    /**
     * Fetch Root Account
     * @throws AccountNotFoundError if account doesn't exist
     */
    root(namespace?: string): Promise<RootAccount>;
    /**
     * Fetch Round from RoundPage
     * @throws AccountNotFoundError if round page doesn't exist
     */
    round(roundId: number, tierId: number): Promise<Round>;
    /**
     * Transform raw round data to proper Round type with enum status
     */
    private transformRound;
    /**
     * Fetch RoundPage Account
     * @throws AccountNotFoundError if page doesn't exist
     */
    roundPage(tierId: number, pageIndex: number): Promise<RoundPage>;
    /**
     * Check if a RoundPage exists
     */
    roundPageExists(tierId: number, pageIndex: number): Promise<boolean>;
    /**
     * Fetch Round Roster
     * Returns all RoundPlayer accounts for a specific round
     *
     * Uses a 2-step approach to avoid RPC 429 rate limits:
     * 1. getProgramAccounts with dataSlice (pubkeys only, no data)
     * 2. fetchMultiple in chunks to get full account data
     *
     * @param tierId - Tier ID
     * @param roundId - Round ID
     */
    fetchRoundRoster(tierId: number, roundId: BN | number): Promise<RoundPlayer[]>;
    /**
     * Fetch RoundPlayer pubkeys only (no account data)
     * Uses dataSlice to minimize RPC payload and avoid 429s
     * Includes exponential backoff retry for rate limit errors
     */
    private fetchRoundRosterPubkeys;
    /**
     * Fetch RoundPlayer Account (v1 - deprecated)
     * Returns null if player hasn't joined this round
     */
    roundPlayer(tierId: number, roundId: number, player: PublicKey): Promise<RoundPlayer | null>;
    /**
     * Fetch Round Roster V2
     * Returns all RoundPlayerV2 accounts for a specific round.
     * RoundPlayerV2 includes player_config_hash for config verification.
     *
     * @param tierId - Tier ID
     * @param roundId - Round ID
     */
    fetchRoundRosterV2(tierId: number, roundId: BN | number): Promise<RoundPlayerV2[]>;
    /**
     * Fetch RoundPlayerV2 pubkeys only (no account data)
     */
    private fetchRoundRosterV2Pubkeys;
    /**
     * Fetch Player Stats
     * Returns null if player stats don't exist (player hasn't played in this season)
     */
    playerStats(player: PublicKey, seasonId: number): Promise<PlayerStats | null>;
    /**
     * Fetch Season Snapshot
     * Returns null if season hasn't been finalized yet
     */
    seasonSnapshot(seasonId: number): Promise<SeasonSnapshot | null>;
    /**
     * Fetch multiple rounds in parallel
     * Filters out rounds that don't exist
     */
    rounds(roundIds: number[], tierId: number): Promise<Map<number, Round>>;
    /**
     * Fetch multiple player stats using batch RPC call
     * Uses getMultipleAccountsInfo for efficiency (1 RPC call instead of N)
     */
    playerStatsMultiple(players: PublicKey[], seasonId: number): Promise<Map<string, PlayerStats>>;
    /**
     * Fetch PlayerProfile (nickname and referral data)
     * @param player - The player's public key
     * @returns PlayerProfile data or null if not found
     */
    playerProfile(player: PublicKey): Promise<{
        player: PublicKey;
        currentNickname: string;
        createdAt: number;
        updatedAt: number;
        pendingReferralRewards: BN;
        totalReferralClaimed: BN;
        referralCount: BN;
        referralPointsEarned: BN;
    } | null>;
    /**
     * Fetch nicknames for multiple players using batch RPC call
     * Uses getMultipleAccountsInfo for efficiency (1 RPC call instead of N)
     * @param players - Array of player public keys
     * @returns Map of player pubkey (base58) to nickname (empty string if no nickname set)
     */
    nicknames(players: PublicKey[]): Promise<Map<string, string>>;
    /**
     * Fetch nickname for a single player
     * @param player - The player's public key
     * @returns The nickname or empty string if not set
     */
    nickname(player: PublicKey): Promise<string>;
    /**
     * Check if a nickname is available
     * @param nickname - The nickname to check
     * @returns true if available, false if taken
     */
    isNicknameAvailable(nickname: string): Promise<boolean>;
    /**
     * Resolve a nickname to its owner's public key
     * @param nickname - The nickname to resolve
     * @returns Owner's PublicKey if found, null otherwise
     */
    nicknameOwner(nickname: string): Promise<PublicKey | null>;
    /**
     * Check if an account exists
     */
    exists(address: PublicKey): Promise<boolean>;
    /**
     * Get SOL balance for an account
     */
    balance(address: PublicKey): Promise<number>;
    /**
     * Get token account balance
     */
    tokenBalance(tokenAccount: PublicKey): Promise<bigint>;
    /**
     * Unified roster fetch - automatically routes to Solana or ICP based on round status.
     *
     * - Open/countdown rounds: fetch from Solana (getProgramAccounts)
     * - Settled rounds: skip expensive getProgramAccounts, go directly to ICP archive
     *
     * Includes retry logic for race condition when round just settled but ICP not yet synced.
     *
     * @param tierId - Tier ID
     * @param roundId - Round ID
     * @param icpModule - Optional ICP module for archived data (required for settled rounds)
     * @returns Normalized roster entries with source indicator
     */
    fetchRoster(tierId: number, roundId: number, icpModule?: ICPModule, knownSettled?: boolean): Promise<RosterEntry[]>;
    /**
     * Fetch roster from ICP archive with retry logic for race conditions.
     * Retries up to 3 times with exponential backoff if ICP doesn't have data yet.
     */
    private fetchRosterFromICP;
}
//# sourceMappingURL=fetch.d.ts.map