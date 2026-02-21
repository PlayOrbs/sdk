/**
 * Accounts module for PDA derivation with memoization
 * Handles all account address derivation for the Orbs Game program
 */

import { PublicKey } from "@solana/web3.js";
import { SEEDS, PROGRAM_ADDRESSES, PAGE_SIZE } from "../constants";
import { encodeU64BE, encodeU16BE, encodeU8BE, encodeU32BE } from "../utils/encoding";

/**
 * Accounts module for PDA derivation
 */
export class AccountsModule {
  private cache: Map<string, PublicKey> = new Map();

  constructor(private programId: PublicKey) {}

  /**
   * Clear the PDA cache
   * Call this if you need to re-derive PDAs (e.g., after program upgrade)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get or derive a PDA with caching
   */
  private getOrDerive(cacheKey: string, seeds: Buffer[]): PublicKey {
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [pda] = PublicKey.findProgramAddressSync(seeds, this.programId);
    this.cache.set(cacheKey, pda);
    return pda;
  }

  /**
   * Get Root Account PDA
   * PDA: ["root"]
   */
  root(namespace?: string): PublicKey {
    const cacheKey = `root:${namespace || "default"}`;
    const seeds = namespace
      ? [SEEDS.ROOT, Buffer.from(namespace)]
      : [SEEDS.ROOT];
    return this.getOrDerive(cacheKey, seeds);
  }

  /**
   * Get Round Account PDA (legacy - kept for backwards compatibility)
   * PDA: ["round", round_id.to_be_bytes()]
   * @deprecated Use roundPage() for new code
   */
  round(roundId: number): PublicKey {
    const cacheKey = `round:${roundId}`;
    return this.getOrDerive(cacheKey, [SEEDS.ROUND, encodeU64BE(roundId)]);
  }

  /**
   * Get RoundPage Account PDA
   * PDA: ["round_page", tier_id.to_be_bytes(), page_index.to_be_bytes()]
   */
  roundPage(tierId: number, pageIndex: number): PublicKey {
    const cacheKey = `round_page:${tierId}:${pageIndex}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.ROUND_PAGE,
      encodeU8BE(tierId),
      encodeU32BE(pageIndex),
    ]);
  }

  /**
   * Get page index for a given round ID
   */
  static pageIndexFor(roundId: number): number {
    return Math.floor(roundId / PAGE_SIZE);
  }

  /**
   * Get slot index within a page for a given round ID
   */
  static slotIndexFor(roundId: number): number {
    return roundId % PAGE_SIZE;
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
  roundPlayer(tierId: number, roundId: number, player: PublicKey): PublicKey {
    const cacheKey = `round_player:${tierId}:${roundId}:${player.toBase58()}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.ROUND_PLAYER,
      encodeU8BE(tierId),
      encodeU64BE(roundId),
      player.toBuffer(),
    ]);
  }

  /**
   * Get RoundPlayerV2 PDA
   * PDA: ["round_player_v2", tier_id.to_be_bytes(), round_id.to_be_bytes(), player_pubkey]
   *
   * RoundPlayerV2 includes player_config_hash for verifying pre-round configuration.
   */
  roundPlayerV2(tierId: number, roundId: number, player: PublicKey): PublicKey {
    const cacheKey = `round_player_v2:${tierId}:${roundId}:${player.toBase58()}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.ROUND_PLAYER_V2,
      encodeU8BE(tierId),
      encodeU64BE(roundId),
      player.toBuffer(),
    ]);
  }

  /**
   * Get Vault Account PDA (round prize pool)
   * PDA: ["vault", tier_id.to_be_bytes(), round_id.to_be_bytes()]
   */
  vault(tierId: number, roundId: number): PublicKey {
    const cacheKey = `vault:${tierId}:${roundId}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.VAULT,
      encodeU8BE(tierId),
      encodeU64BE(roundId),
    ]);
  }

  /**
   * Get Referral Vault PDA (holds referral rewards)
   * PDA: ["referral_vault"]
   */
  referralVault(): PublicKey {
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
  playerStats(player: PublicKey | string, seasonId: number): PublicKey {
    // Convert string to PublicKey if needed
    const playerPubkey = typeof player === 'string' ? new PublicKey(player) : player;
    
    const cacheKey = `player_stats:${seasonId}:${playerPubkey.toBase58()}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.PLAYER_STATS,
      encodeU16BE(seasonId),
      playerPubkey.toBuffer(),
    ]);
  }

  /**
   * Get Referral PDA
   * PDA: ["referral", player_pubkey]
   * 
   * @param player - The player who was referred (PublicKey or base58 string)
   */
  referral(player: PublicKey | string): PublicKey {
    // Convert string to PublicKey if needed
    const playerPubkey = typeof player === 'string' ? new PublicKey(player) : player;
    
    const cacheKey = `referral:${playerPubkey.toBase58()}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.REFERRAL,
      playerPubkey.toBuffer(),
    ]);
  }

  /**
   * Get PlayerProfile PDA
   * PDA: ["player_profile", player_pubkey]
   * 
   * @param player - The player's public key (PublicKey or base58 string)
   */
  playerProfile(player: PublicKey | string): PublicKey {
    if (!player) {
      throw new Error("playerProfile: player parameter is required");
    }
    const playerPubkey = typeof player === 'string' ? new PublicKey(player) : player;
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
  nickname(nickname: string): PublicKey {
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
  seasonSnapshot(seasonId: number): PublicKey {
    const cacheKey = `season_snapshot:${seasonId}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.SEASON_SNAPSHOT,
      encodeU16BE(seasonId),
    ]);
  }

  /**
   * Get Season Pool Vault PDA
   * PDA: ["season_pool_vault", season_id.to_be_bytes()]
   *
   * This is a token account that holds ORB tokens for the season prize pool
   */
  seasonPoolVault(seasonId: number): PublicKey {
    const cacheKey = `season_pool_vault:${seasonId}`;
    return this.getOrDerive(cacheKey, [
      SEEDS.SEASON_POOL_VAULT,
      encodeU16BE(seasonId),
    ]);
  }

  /**
   * Get Program Vault PDA
   * PDA: ["program_vault"]
   *
   * This is a token account that holds ORB tokens for Season 0 conversions and genesis minting
   */
  programVault(): PublicKey {
    const cacheKey = "program_vault";
    return this.getOrDerive(cacheKey, [SEEDS.PROGRAM_VAULT]);
  }

  /**
   * Get Mint Authority PDA
   * PDA: ["mint_authority"]
   */
  mintAuthority(): PublicKey {
    const cacheKey = "mint_authority";
    return this.getOrDerive(cacheKey, [SEEDS.MINT_AUTHORITY]);
  }

  /**
   * Get Vault Authority PDA
   * PDA: ["vault_authority"]
   *
   * This PDA signs CPIs to Raydium CLMM and transfers
   */
  vaultAuthority(): PublicKey {
    const cacheKey = "vault_authority";
    return this.getOrDerive(cacheKey, [SEEDS.VAULT_AUTHORITY]);
  }

  /**
   * Get LP Vault PDA
   * PDA: ["lp_vault"]
   *
   * This is a WSOL token account for LP accumulation before genesis
   */
  lpVault(): PublicKey {
    const cacheKey = "lp_vault";
    return this.getOrDerive(cacheKey, [SEEDS.LP_VAULT]);
  }

  /**
   * Get ORB LP Vault PDA
   * PDA: ["orb_lp_vault"]
   *
   * This is an ORB token account for buyback destination (separate from program vault)
   */
  orbLpVault(): PublicKey {
    const cacheKey = "orb_lp_vault";
    return this.getOrDerive(cacheKey, [SEEDS.ORB_LP_VAULT]);
  }

  /**
   * Get Associated Token Address
   * This is a helper for deriving ATAs, which are owned by the Associated Token Program
   * @param mint - Token mint address (PublicKey or base58 string)
   * @param owner - Token owner address (PublicKey or base58 string)
   */
  static async getAssociatedTokenAddress(
    mint: PublicKey | string,
    owner: PublicKey | string,
  ): Promise<PublicKey> {
    // Convert strings to PublicKey if needed
    const mintPubkey = typeof mint === 'string' ? new PublicKey(mint) : mint;
    const ownerPubkey = typeof owner === 'string' ? new PublicKey(owner) : owner;
    
    const [ata] = PublicKey.findProgramAddressSync(
      [
        ownerPubkey.toBuffer(),
        PROGRAM_ADDRESSES.TOKEN_PROGRAM.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      PROGRAM_ADDRESSES.ASSOCIATED_TOKEN_PROGRAM,
    );
    return ata;
  }

  /**
   * Get Metadata PDA (for NFTs)
   * PDA: ["metadata", metadata_program, mint]
   * @param mint - NFT mint address (PublicKey or base58 string)
   */
  static getMetadataPda(mint: PublicKey | string): PublicKey {
    // Convert string to PublicKey if needed
    const mintPubkey = typeof mint === 'string' ? new PublicKey(mint) : mint;
    
    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        PROGRAM_ADDRESSES.METADATA_PROGRAM.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      PROGRAM_ADDRESSES.METADATA_PROGRAM,
    );
    return metadata;
  }

  /**
   * Get Master Edition PDA (for NFTs)
   * PDA: ["metadata", metadata_program, mint, "edition"]
   * @param mint - NFT mint address (PublicKey or base58 string)
   */
  static getMasterEditionPda(mint: PublicKey | string): PublicKey {
    // Convert string to PublicKey if needed
    const mintPubkey = typeof mint === 'string' ? new PublicKey(mint) : mint;
    
    const [masterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        PROGRAM_ADDRESSES.METADATA_PROGRAM.toBuffer(),
        mintPubkey.toBuffer(),
        Buffer.from("edition"),
      ],
      PROGRAM_ADDRESSES.METADATA_PROGRAM,
    );
    return masterEdition;
  }
}
