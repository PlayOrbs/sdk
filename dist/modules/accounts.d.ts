/**
 * Accounts module for PDA derivation with memoization
 * Handles all account address derivation for the Orbs Game program
 */
import { PublicKey } from "@solana/web3.js";
/**
 * Accounts module for PDA derivation
 */
export declare class AccountsModule {
    private programId;
    private cache;
    constructor(programId: PublicKey);
    /**
     * Clear the PDA cache
     * Call this if you need to re-derive PDAs (e.g., after program upgrade)
     */
    clearCache(): void;
    /**
     * Get or derive a PDA with caching
     */
    private getOrDerive;
    /**
     * Get Root Account PDA
     * PDA: ["root"]
     */
    root(namespace?: string): PublicKey;
    /**
     * Get Round Account PDA (legacy - kept for backwards compatibility)
     * PDA: ["round", round_id.to_be_bytes()]
     * @deprecated Use roundPage() for new code
     */
    round(roundId: number): PublicKey;
    /**
     * Get RoundPage Account PDA
     * PDA: ["round_page", tier_id.to_be_bytes(), page_index.to_be_bytes()]
     */
    roundPage(tierId: number, pageIndex: number): PublicKey;
    /**
     * Get page index for a given round ID
     */
    static pageIndexFor(roundId: number): number;
    /**
     * Get slot index within a page for a given round ID
     */
    static slotIndexFor(roundId: number): number;
    /**
     * Get RoundPlayer PDA (V1 - DEPRECATED)
     * PDA: ["rp", tier_id.to_be_bytes(), round_id.to_be_bytes(), player_pubkey]
     *
     * RoundPlayer tracks per-player state for a round:
     * - Proves player joined the round
     * - Tracks payout_processed and stats_applied flags
     * @deprecated Use roundPlayerV2 for new joins
     */
    roundPlayer(tierId: number, roundId: number, player: PublicKey): PublicKey;
    /**
     * Get RoundPlayerV2 PDA
     * PDA: ["round_player_v2", tier_id.to_be_bytes(), round_id.to_be_bytes(), player_pubkey]
     *
     * RoundPlayerV2 includes player_config_hash for verifying pre-round configuration.
     */
    roundPlayerV2(tierId: number, roundId: number, player: PublicKey): PublicKey;
    /**
     * Get Vault Account PDA (round prize pool)
     * PDA: ["vault", tier_id.to_be_bytes(), round_id.to_be_bytes()]
     */
    vault(tierId: number, roundId: number): PublicKey;
    /**
     * Get Referral Vault PDA (holds referral rewards)
     * PDA: ["referral_vault"]
     */
    referralVault(): PublicKey;
    /**
     * Get Player Stats PDA
     * PDA: ["ps", season_id.to_be_bytes(), player_pubkey]
     *
     * Note: Season ID is encoded as Big Endian u16 (2 bytes)
     * @param player - Player's public key (PublicKey or base58 string)
     */
    playerStats(player: PublicKey | string, seasonId: number): PublicKey;
    /**
     * Get Referral PDA
     * PDA: ["referral", player_pubkey]
     *
     * @param player - The player who was referred (PublicKey or base58 string)
     */
    referral(player: PublicKey | string): PublicKey;
    /**
     * Get PlayerProfile PDA
     * PDA: ["player_profile", player_pubkey]
     *
     * @param player - The player's public key (PublicKey or base58 string)
     */
    playerProfile(player: PublicKey | string): PublicKey;
    /**
     * Get Nickname PDA
     * PDA: ["nickname", lowercase_nickname_bytes]
     *
     * @param nickname - The nickname string
     */
    nickname(nickname: string): PublicKey;
    /**
     * Get Season Snapshot PDA
     * PDA: ["season_snapshot", season_id.to_be_bytes()]
     */
    seasonSnapshot(seasonId: number): PublicKey;
    /**
     * Get Season Pool Vault PDA
     * PDA: ["season_pool_vault", season_id.to_be_bytes()]
     *
     * This is a token account that holds ORB tokens for the season prize pool
     */
    seasonPoolVault(seasonId: number): PublicKey;
    /**
     * Get Program Vault PDA
     * PDA: ["program_vault"]
     *
     * This is a token account that holds ORB tokens for Season 0 conversions and genesis minting
     */
    programVault(): PublicKey;
    /**
     * Get Mint Authority PDA
     * PDA: ["mint_authority"]
     */
    mintAuthority(): PublicKey;
    /**
     * Get Vault Authority PDA
     * PDA: ["vault_authority"]
     *
     * This PDA signs CPIs to Raydium CLMM and transfers
     */
    vaultAuthority(): PublicKey;
    /**
     * Get LP Vault PDA
     * PDA: ["lp_vault"]
     *
     * This is a WSOL token account for LP accumulation before genesis
     */
    lpVault(): PublicKey;
    /**
     * Get ORB LP Vault PDA
     * PDA: ["orb_lp_vault"]
     *
     * This is an ORB token account for buyback destination (separate from program vault)
     */
    orbLpVault(): PublicKey;
    /**
     * Get Associated Token Address
     * This is a helper for deriving ATAs, which are owned by the Associated Token Program
     * @param mint - Token mint address (PublicKey or base58 string)
     * @param owner - Token owner address (PublicKey or base58 string)
     */
    static getAssociatedTokenAddress(mint: PublicKey | string, owner: PublicKey | string): Promise<PublicKey>;
    /**
     * Get Metadata PDA (for NFTs)
     * PDA: ["metadata", metadata_program, mint]
     * @param mint - NFT mint address (PublicKey or base58 string)
     */
    static getMetadataPda(mint: PublicKey | string): PublicKey;
    /**
     * Get Master Edition PDA (for NFTs)
     * PDA: ["metadata", metadata_program, mint, "edition"]
     * @param mint - NFT mint address (PublicKey or base58 string)
     */
    static getMasterEditionPda(mint: PublicKey | string): PublicKey;
}
//# sourceMappingURL=accounts.d.ts.map