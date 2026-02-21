"use strict";
/**
 * Accounts module for PDA derivation with memoization
 * Handles all account address derivation for the Orbs Game program
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsModule = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const encoding_1 = require("../utils/encoding");
/**
 * Accounts module for PDA derivation
 */
class AccountsModule {
    constructor(programId) {
        this.programId = programId;
        this.cache = new Map();
    }
    /**
     * Clear the PDA cache
     * Call this if you need to re-derive PDAs (e.g., after program upgrade)
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get or derive a PDA with caching
     */
    getOrDerive(cacheKey, seeds) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const [pda] = web3_js_1.PublicKey.findProgramAddressSync(seeds, this.programId);
        this.cache.set(cacheKey, pda);
        return pda;
    }
    /**
     * Get Root Account PDA
     * PDA: ["root"]
     */
    root(namespace) {
        const cacheKey = `root:${namespace || "default"}`;
        const seeds = namespace
            ? [constants_1.SEEDS.ROOT, Buffer.from(namespace)]
            : [constants_1.SEEDS.ROOT];
        return this.getOrDerive(cacheKey, seeds);
    }
    /**
     * Get Round Account PDA (legacy - kept for backwards compatibility)
     * PDA: ["round", round_id.to_be_bytes()]
     * @deprecated Use roundPage() for new code
     */
    round(roundId) {
        const cacheKey = `round:${roundId}`;
        return this.getOrDerive(cacheKey, [constants_1.SEEDS.ROUND, (0, encoding_1.encodeU64BE)(roundId)]);
    }
    /**
     * Get RoundPage Account PDA
     * PDA: ["round_page", tier_id.to_be_bytes(), page_index.to_be_bytes()]
     */
    roundPage(tierId, pageIndex) {
        const cacheKey = `round_page:${tierId}:${pageIndex}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.ROUND_PAGE,
            (0, encoding_1.encodeU8BE)(tierId),
            (0, encoding_1.encodeU32BE)(pageIndex),
        ]);
    }
    /**
     * Get page index for a given round ID
     */
    static pageIndexFor(roundId) {
        return Math.floor(roundId / constants_1.PAGE_SIZE);
    }
    /**
     * Get slot index within a page for a given round ID
     */
    static slotIndexFor(roundId) {
        return roundId % constants_1.PAGE_SIZE;
    }
    /**
     * Get RoundPlayer PDA (V1 - DEPRECATED)
     * PDA: ["rp", tier_id.to_be_bytes(), round_id.to_be_bytes(), player_pubkey]
     *
     * RoundPlayer tracks per-player state for a round:
     * - Proves player joined the round
     * - Tracks payout_processed and stats_applied flags
     * @deprecated Use roundPlayerV2 for new joins
     */
    roundPlayer(tierId, roundId, player) {
        const cacheKey = `round_player:${tierId}:${roundId}:${player.toBase58()}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.ROUND_PLAYER,
            (0, encoding_1.encodeU8BE)(tierId),
            (0, encoding_1.encodeU64BE)(roundId),
            player.toBuffer(),
        ]);
    }
    /**
     * Get RoundPlayerV2 PDA
     * PDA: ["round_player_v2", tier_id.to_be_bytes(), round_id.to_be_bytes(), player_pubkey]
     *
     * RoundPlayerV2 includes player_config_hash for verifying pre-round configuration.
     */
    roundPlayerV2(tierId, roundId, player) {
        const cacheKey = `round_player_v2:${tierId}:${roundId}:${player.toBase58()}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.ROUND_PLAYER_V2,
            (0, encoding_1.encodeU8BE)(tierId),
            (0, encoding_1.encodeU64BE)(roundId),
            player.toBuffer(),
        ]);
    }
    /**
     * Get Vault Account PDA (round prize pool)
     * PDA: ["vault", tier_id.to_be_bytes(), round_id.to_be_bytes()]
     */
    vault(tierId, roundId) {
        const cacheKey = `vault:${tierId}:${roundId}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.VAULT,
            (0, encoding_1.encodeU8BE)(tierId),
            (0, encoding_1.encodeU64BE)(roundId),
        ]);
    }
    /**
     * Get Referral Vault PDA (holds referral rewards)
     * PDA: ["referral_vault"]
     */
    referralVault() {
        const cacheKey = "referral_vault";
        return this.getOrDerive(cacheKey, [Buffer.from("referral_vault")]);
    }
    /**
     * Get Player Stats PDA
     * PDA: ["ps", season_id.to_be_bytes(), player_pubkey]
     *
     * Note: Season ID is encoded as Big Endian u16 (2 bytes)
     * @param player - Player's public key (PublicKey or base58 string)
     */
    playerStats(player, seasonId) {
        // Convert string to PublicKey if needed
        const playerPubkey = typeof player === 'string' ? new web3_js_1.PublicKey(player) : player;
        const cacheKey = `player_stats:${seasonId}:${playerPubkey.toBase58()}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.PLAYER_STATS,
            (0, encoding_1.encodeU16BE)(seasonId),
            playerPubkey.toBuffer(),
        ]);
    }
    /**
     * Get Referral PDA
     * PDA: ["referral", player_pubkey]
     *
     * @param player - The player who was referred (PublicKey or base58 string)
     */
    referral(player) {
        // Convert string to PublicKey if needed
        const playerPubkey = typeof player === 'string' ? new web3_js_1.PublicKey(player) : player;
        const cacheKey = `referral:${playerPubkey.toBase58()}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.REFERRAL,
            playerPubkey.toBuffer(),
        ]);
    }
    /**
     * Get PlayerProfile PDA
     * PDA: ["player_profile", player_pubkey]
     *
     * @param player - The player's public key (PublicKey or base58 string)
     */
    playerProfile(player) {
        if (!player) {
            throw new Error("playerProfile: player parameter is required");
        }
        const playerPubkey = typeof player === 'string' ? new web3_js_1.PublicKey(player) : player;
        if (!playerPubkey) {
            throw new Error("playerProfile: failed to convert player to PublicKey");
        }
        const cacheKey = `player_profile:${playerPubkey.toBase58()}`;
        return this.getOrDerive(cacheKey, [
            Buffer.from("player_profile"),
            playerPubkey.toBuffer(),
        ]);
    }
    /**
     * Get Nickname PDA
     * PDA: ["nickname", lowercase_nickname_bytes]
     *
     * @param nickname - The nickname string
     */
    nickname(nickname) {
        const lowercaseNickname = nickname.toLowerCase();
        const cacheKey = `nickname:${lowercaseNickname}`;
        return this.getOrDerive(cacheKey, [
            Buffer.from("nickname"),
            Buffer.from(lowercaseNickname),
        ]);
    }
    /**
     * Get Season Snapshot PDA
     * PDA: ["season_snapshot", season_id.to_be_bytes()]
     */
    seasonSnapshot(seasonId) {
        const cacheKey = `season_snapshot:${seasonId}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.SEASON_SNAPSHOT,
            (0, encoding_1.encodeU16BE)(seasonId),
        ]);
    }
    /**
     * Get Season Pool Vault PDA
     * PDA: ["season_pool_vault", season_id.to_be_bytes()]
     *
     * This is a token account that holds ORB tokens for the season prize pool
     */
    seasonPoolVault(seasonId) {
        const cacheKey = `season_pool_vault:${seasonId}`;
        return this.getOrDerive(cacheKey, [
            constants_1.SEEDS.SEASON_POOL_VAULT,
            (0, encoding_1.encodeU16BE)(seasonId),
        ]);
    }
    /**
     * Get Program Vault PDA
     * PDA: ["program_vault"]
     *
     * This is a token account that holds ORB tokens for Season 0 conversions and genesis minting
     */
    programVault() {
        const cacheKey = "program_vault";
        return this.getOrDerive(cacheKey, [constants_1.SEEDS.PROGRAM_VAULT]);
    }
    /**
     * Get Mint Authority PDA
     * PDA: ["mint_authority"]
     */
    mintAuthority() {
        const cacheKey = "mint_authority";
        return this.getOrDerive(cacheKey, [constants_1.SEEDS.MINT_AUTHORITY]);
    }
    /**
     * Get Vault Authority PDA
     * PDA: ["vault_authority"]
     *
     * This PDA signs CPIs to Raydium CLMM and transfers
     */
    vaultAuthority() {
        const cacheKey = "vault_authority";
        return this.getOrDerive(cacheKey, [constants_1.SEEDS.VAULT_AUTHORITY]);
    }
    /**
     * Get LP Vault PDA
     * PDA: ["lp_vault"]
     *
     * This is a WSOL token account for LP accumulation before genesis
     */
    lpVault() {
        const cacheKey = "lp_vault";
        return this.getOrDerive(cacheKey, [constants_1.SEEDS.LP_VAULT]);
    }
    /**
     * Get ORB LP Vault PDA
     * PDA: ["orb_lp_vault"]
     *
     * This is an ORB token account for buyback destination (separate from program vault)
     */
    orbLpVault() {
        const cacheKey = "orb_lp_vault";
        return this.getOrDerive(cacheKey, [constants_1.SEEDS.ORB_LP_VAULT]);
    }
    /**
     * Get Associated Token Address
     * This is a helper for deriving ATAs, which are owned by the Associated Token Program
     * @param mint - Token mint address (PublicKey or base58 string)
     * @param owner - Token owner address (PublicKey or base58 string)
     */
    static async getAssociatedTokenAddress(mint, owner) {
        // Convert strings to PublicKey if needed
        const mintPubkey = typeof mint === 'string' ? new web3_js_1.PublicKey(mint) : mint;
        const ownerPubkey = typeof owner === 'string' ? new web3_js_1.PublicKey(owner) : owner;
        const [ata] = web3_js_1.PublicKey.findProgramAddressSync([
            ownerPubkey.toBuffer(),
            constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM.toBuffer(),
            mintPubkey.toBuffer(),
        ], constants_1.PROGRAM_ADDRESSES.ASSOCIATED_TOKEN_PROGRAM);
        return ata;
    }
    /**
     * Get Metadata PDA (for NFTs)
     * PDA: ["metadata", metadata_program, mint]
     * @param mint - NFT mint address (PublicKey or base58 string)
     */
    static getMetadataPda(mint) {
        // Convert string to PublicKey if needed
        const mintPubkey = typeof mint === 'string' ? new web3_js_1.PublicKey(mint) : mint;
        const [metadata] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            constants_1.PROGRAM_ADDRESSES.METADATA_PROGRAM.toBuffer(),
            mintPubkey.toBuffer(),
        ], constants_1.PROGRAM_ADDRESSES.METADATA_PROGRAM);
        return metadata;
    }
    /**
     * Get Master Edition PDA (for NFTs)
     * PDA: ["metadata", metadata_program, mint, "edition"]
     * @param mint - NFT mint address (PublicKey or base58 string)
     */
    static getMasterEditionPda(mint) {
        // Convert string to PublicKey if needed
        const mintPubkey = typeof mint === 'string' ? new web3_js_1.PublicKey(mint) : mint;
        const [masterEdition] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            constants_1.PROGRAM_ADDRESSES.METADATA_PROGRAM.toBuffer(),
            mintPubkey.toBuffer(),
            Buffer.from("edition"),
        ], constants_1.PROGRAM_ADDRESSES.METADATA_PROGRAM);
        return masterEdition;
    }
}
exports.AccountsModule = AccountsModule;
