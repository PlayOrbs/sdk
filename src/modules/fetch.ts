/**
 * Fetch module for retrieving account data
 * Handles account fetching with type safety and error handling
 */

import { PublicKey } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { AccountsModule } from "./accounts";
import {
  RootAccount,
  Round,
  RoundPage,
  RoundPlayer,
  RoundPlayerV2,
  PlayerStats,
  SeasonSnapshot,
} from "../types";
import { AccountNotFoundError } from "../types/errors";
import type { ICPModule, RoundSnapshot } from "./icp";

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
export class FetchModule {
  constructor(
    private program: Program,
    private accounts: AccountsModule,
  ) {}

  /**
   * Fetch Root Account
   * @throws AccountNotFoundError if account doesn't exist
   */
  async root(namespace?: string): Promise<RootAccount> {
    const rootAccount = this.accounts.root(namespace);
    try {
      return (await (this.program.account as any).rootAccount.fetch(
        rootAccount,
      )) as RootAccount;
    } catch (error: any) {
      // Check if it's actually a "not found" error vs a deserialization error
      const errorMsg = error?.message || String(error);
      if (
        errorMsg.includes("Account does not exist") ||
        errorMsg.includes("could not find")
      ) {
        throw new AccountNotFoundError("RootAccount", rootAccount.toBase58());
      }
      // Re-throw with more context for debugging
      throw new Error(
        `Failed to fetch RootAccount (${rootAccount.toBase58()}): ${errorMsg}`,
      );
    }
  }

  /**
   * Fetch Round from RoundPage
   * @throws AccountNotFoundError if round page doesn't exist
   */
  async round(roundId: number, tierId: number): Promise<Round> {
    const pageIndex = AccountsModule.pageIndexFor(roundId);
    const slot = AccountsModule.slotIndexFor(roundId);
    const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
    try {
      const page = (await (this.program.account as any).roundPage.fetch(
        roundPagePda,
      )) as RoundPage;
      const round = page.rounds[slot];
      // Transform status from u8 to RoundStatus enum object
      return this.transformRound(round);
    } catch (error) {
      throw new AccountNotFoundError(
        "RoundPage",
        `round=${roundId} tier=${tierId} page=${pageIndex} (${roundPagePda.toBase58()})`,
      );
    }
  }

  /**
   * Transform raw round data to proper Round type with enum status
   */
  private transformRound(raw: any): Round {
    // Status constants from program
    const STATUS_OPEN = 0;
    const STATUS_COUNTDOWN = 1;
    const STATUS_SETTLED = 2;

    let status: Round["status"];
    const rawStatus = typeof raw.status === "number" ? raw.status : raw.status;

    if (rawStatus === STATUS_COUNTDOWN) {
      status = { countdown: { startTs: raw.countdownStartTs } };
    } else if (rawStatus === STATUS_SETTLED) {
      status = { settled: {} };
    } else {
      status = { open: {} };
    }

    return {
      ...raw,
      status,
    };
  }

  /**
   * Fetch RoundPage Account
   * @throws AccountNotFoundError if page doesn't exist
   */
  async roundPage(tierId: number, pageIndex: number): Promise<RoundPage> {
    const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
    try {
      return (await (this.program.account as any).roundPage.fetch(
        roundPagePda,
      )) as RoundPage;
    } catch (error) {
      throw new AccountNotFoundError(
        "RoundPage",
        `tier=${tierId} page=${pageIndex} (${roundPagePda.toBase58()})`,
      );
    }
  }

  /**
   * Check if a RoundPage exists
   */
  async roundPageExists(tierId: number, pageIndex: number): Promise<boolean> {
    const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
    try {
      await (this.program.account as any).roundPage.fetch(roundPagePda);
      return true;
    } catch {
      return false;
    }
  }

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
  async fetchRoundRoster(
    tierId: number,
    roundId: BN | number,
  ): Promise<RoundPlayer[]> {
    // Convert to BN if number
    const roundIdBn = typeof roundId === "number" ? new BN(roundId) : roundId;

    // Encode tier_id as 1-byte buffer
    const tierIdBytes = Buffer.from([tierId]);

    // Encode round_id as 8-byte little-endian (Anchor default)
    const roundIdBytes = roundIdBn.toArrayLike(Buffer, "le", 8);

    try {
      // Step 1: Get pubkeys only using dataSlice (much lighter RPC call)
      const pubkeys = await this.fetchRoundRosterPubkeys(tierIdBytes, roundIdBytes);
      
      if (pubkeys.length === 0) {
        return [];
      }

      // Step 2: Fetch full accounts in chunks using Anchor's fetchMultiple
      const CHUNK_SIZE = 50;
      const results: RoundPlayer[] = [];
      
      for (let i = 0; i < pubkeys.length; i += CHUNK_SIZE) {
        const chunk = pubkeys.slice(i, i + CHUNK_SIZE);
        const accounts = await (this.program.account as any).roundPlayerV2.fetchMultiple(chunk);
        
        for (let j = 0; j < accounts.length; j++) {
          const data = accounts[j];
          if (data) {
            results.push({
              tierId: data.tierId,
              roundId: data.roundId,
              seasonId: data.seasonId,
              player: data.player,
              stats: data.stats,
              joinTs: data.joinTs,
              payoutProcessed: data.payoutProcessed,
              statsApplied: data.statsApplied,
              tpPreset: data.tpPreset ?? 0,
            } as RoundPlayer);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error fetching round roster:", error);
      return [];
    }
  }

  /**
   * Fetch RoundPlayer pubkeys only (no account data)
   * Uses dataSlice to minimize RPC payload and avoid 429s
   * Includes exponential backoff retry for rate limit errors
   */
  private async fetchRoundRosterPubkeys(
    tierIdBytes: Buffer,
    roundIdBytes: Buffer,
    maxRetries = 3,
  ): Promise<PublicKey[]> {
    const connection = this.program.provider.connection;
    const programId = this.program.programId;
    
    // Get the discriminator for RoundPlayerV2 account
    // Anchor uses first 8 bytes of sha256("account:RoundPlayerV2")
    // Computed via: sha256("account:RoundPlayerV2").slice(0, 8)
    const discriminator = Buffer.from([
      0xa2, 0xd1, 0x23, 0x78, 0x52, 0xba, 0x51, 0xf1
    ]);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const accounts = await connection.getProgramAccounts(programId, {
          dataSlice: { offset: 0, length: 0 }, // Pubkeys only, no data
          filters: [
            {
              memcmp: {
                offset: 0, // discriminator at offset 0
                bytes: bs58.encode(discriminator),
              },
            },
            {
              memcmp: {
                offset: 8, // tier_id at offset 8 (after discriminator)
                bytes: bs58.encode(tierIdBytes),
              },
            },
            {
              memcmp: {
                offset: 9, // round_id at offset 9 (after discriminator + tier_id)
                bytes: bs58.encode(roundIdBytes),
              },
            },
          ],
        });

        return accounts.map((acc) => acc.pubkey);
      } catch (error: any) {
        const is429 = 
          error?.message?.includes("429") ||
          error?.message?.includes("Too Many Requests") ||
          error?.message?.includes("rate limit");

        if (is429 && attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          const delay = 500 * Math.pow(2, attempt - 1);
          console.warn(`[FetchModule] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    return []; // Should not reach here
  }

  /**
   * Fetch RoundPlayer Account (v1 - deprecated)
   * Returns null if player hasn't joined this round
   */
  async roundPlayer(
    tierId: number,
    roundId: number,
    player: PublicKey,
  ): Promise<RoundPlayer | null> {
    const roundPlayerPda = this.accounts.roundPlayerV2(tierId, roundId, player);
    try {
      const rp = (await (this.program.account as any).roundPlayerV2.fetch(
        roundPlayerPda,
      )) as RoundPlayer;
      // Handle legacy accounts without tp_preset field
      if (rp.tpPreset === undefined) {
        rp.tpPreset = 0;
      }
      return rp;
    } catch (error: any) {
      // RoundPlayerV2 may not exist if player hasn't joined
      // Also handle decode errors from legacy accounts
      if (error.message?.includes("beyond buffer length")) {
        console.warn("[roundPlayer] Legacy account decode error");
      }
      return null;
    }
  }

  /**
   * Fetch Round Roster V2
   * Returns all RoundPlayerV2 accounts for a specific round.
   * RoundPlayerV2 includes player_config_hash for config verification.
   * 
   * @param tierId - Tier ID
   * @param roundId - Round ID
   */
  async fetchRoundRosterV2(
    tierId: number,
    roundId: BN | number,
  ): Promise<RoundPlayerV2[]> {
    const roundIdBn = typeof roundId === "number" ? new BN(roundId) : roundId;
    const tierIdBytes = Buffer.from([tierId]);
    const roundIdBytes = roundIdBn.toArrayLike(Buffer, "le", 8);

    try {
      // Step 1: Get pubkeys only using dataSlice
      const pubkeys = await this.fetchRoundRosterV2Pubkeys(tierIdBytes, roundIdBytes);
      
      if (pubkeys.length === 0) {
        return [];
      }

      // Step 2: Fetch full accounts in chunks
      const CHUNK_SIZE = 50;
      const results: RoundPlayerV2[] = [];
      
      for (let i = 0; i < pubkeys.length; i += CHUNK_SIZE) {
        const chunk = pubkeys.slice(i, i + CHUNK_SIZE);
        const accounts = await (this.program.account as any).roundPlayerV2.fetchMultiple(chunk);
        
        for (let j = 0; j < accounts.length; j++) {
          const data = accounts[j];
          if (data) {
            results.push({
              tierId: data.tierId,
              roundId: data.roundId,
              seasonId: data.seasonId,
              player: data.player,
              stats: data.stats,
              joinTs: data.joinTs,
              tpPreset: data.tpPreset ?? 0,
              playerConfigHash: data.playerConfigHash,
              payoutProcessed: data.payoutProcessed,
              statsApplied: data.statsApplied,
            } as RoundPlayerV2);
          }
        }
      }

      // CRITICAL: Sort by join timestamp for deterministic ordering
      // This ensures UI and backend produce identical simulation results
      // Use player pubkey as tiebreaker when joinTs is equal
      results.sort((a, b) => {
        const joinDiff = a.joinTs.toNumber() - b.joinTs.toNumber();
        if (joinDiff !== 0) return joinDiff;
        const aKey = a.player.toBase58();
        const bKey = b.player.toBase58();
        return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
      });

      return results;
    } catch (error) {
      console.error("Error fetching round roster v2:", error);
      return [];
    }
  }

  /**
   * Fetch RoundPlayerV2 pubkeys only (no account data)
   */
  private async fetchRoundRosterV2Pubkeys(
    tierIdBytes: Buffer,
    roundIdBytes: Buffer,
    maxRetries = 3,
  ): Promise<PublicKey[]> {
    const connection = this.program.provider.connection;
    const programId = this.program.programId;
    
    // Get the discriminator for RoundPlayerV2 account
    // Anchor uses first 8 bytes of sha256("account:RoundPlayerV2")
    const discriminator = Buffer.from([
      0xa2, 0xd1, 0x23, 0x78, 0x52, 0xba, 0x51, 0xf1
    ]);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const accounts = await connection.getProgramAccounts(programId, {
          dataSlice: { offset: 0, length: 0 },
          filters: [
            {
              memcmp: {
                offset: 0, // discriminator at offset 0
                bytes: bs58.encode(discriminator),
              },
            },
            {
              memcmp: {
                offset: 8, // tier_id at offset 8 (after discriminator)
                bytes: bs58.encode(tierIdBytes),
              },
            },
            {
              memcmp: {
                offset: 9, // round_id at offset 9
                bytes: bs58.encode(roundIdBytes),
              },
            },
          ],
        });

        return accounts.map((acc) => acc.pubkey);
      } catch (error: any) {
        const is429 = 
          error?.message?.includes("429") ||
          error?.message?.includes("Too Many Requests") ||
          error?.message?.includes("rate limit");

        if (is429 && attempt < maxRetries) {
          const delay = 500 * Math.pow(2, attempt - 1);
          console.warn(`[FetchModule] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    return [];
  }

  /**
   * Fetch Player Stats
   * Returns null if player stats don't exist (player hasn't played in this season)
   */
  async playerStats(
    player: PublicKey,
    seasonId: number,
  ): Promise<PlayerStats | null> {
    const statsPda = this.accounts.playerStats(player, seasonId);
    try {
      return (await (this.program.account as any).playerStats.fetch(
        statsPda,
      )) as PlayerStats;
    } catch (error) {
      // PlayerStats may not exist if player hasn't played, so return null instead of throwing
      return null;
    }
  }

  /**
   * Fetch Season Snapshot
   * Returns null if season hasn't been finalized yet
   */
  async seasonSnapshot(seasonId: number): Promise<SeasonSnapshot | null> {
    const snapshotPda = this.accounts.seasonSnapshot(seasonId);
    try {
      return (await (this.program.account as any).seasonSnapshot.fetch(
        snapshotPda,
      )) as SeasonSnapshot;
    } catch (error) {
      // Snapshot may not exist if season hasn't ended
      return null;
    }
  }

  /**
   * Fetch multiple rounds in parallel
   * Filters out rounds that don't exist
   */
  async rounds(
    roundIds: number[],
    tierId: number,
  ): Promise<Map<number, Round>> {
    const results = await Promise.allSettled(
      roundIds.map((id) => this.round(id, tierId)),
    );

    const rounds = new Map<number, Round>();
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        rounds.set(roundIds[index], result.value);
      }
    });

    return rounds;
  }

  /**
   * Fetch multiple player stats using batch RPC call
   * Uses getMultipleAccountsInfo for efficiency (1 RPC call instead of N)
   */
  async playerStatsMultiple(
    players: PublicKey[],
    seasonId: number,
  ): Promise<Map<string, PlayerStats>> {
    if (players.length === 0) return new Map();

    // Derive all PDAs
    const pdas = players.map((player) => this.accounts.playerStats(player, seasonId));

    // Batch fetch all accounts in one RPC call
    const accountInfos = await this.program.provider.connection.getMultipleAccountsInfo(pdas);

    const stats = new Map<string, PlayerStats>();
    accountInfos.forEach((accountInfo, index) => {
      if (accountInfo !== null) {
        try {
          // Decode the account data using Anchor's coder
          const decoded = (this.program.coder.accounts as any).decode(
            "playerStats",
            accountInfo.data,
          ) as PlayerStats;
          stats.set(players[index].toBase58(), decoded);
        } catch (e) {
          // Skip accounts that fail to decode
        }
      }
    });

    return stats;
  }

  /**
   * Fetch PlayerProfile (nickname and referral data)
   * @param player - The player's public key
   * @returns PlayerProfile data or null if not found
   */
  async playerProfile(player: PublicKey): Promise<{
    player: PublicKey;
    currentNickname: string;
    createdAt: number;
    updatedAt: number;
    pendingReferralRewards: BN;
    totalReferralClaimed: BN;
    referralCount: BN;
    referralPointsEarned: BN;
  } | null> {
    const profilePda = this.accounts.playerProfile(player);
    try {
      const data = await (this.program.account as any).playerProfile.fetch(
        profilePda,
      );
      return {
        player: data.player,
        currentNickname: data.currentNickname,
        createdAt: data.createdAt?.toNumber?.() ?? 0,
        updatedAt: data.updatedAt?.toNumber?.() ?? 0,
        pendingReferralRewards: data.pendingReferralRewards ?? new BN(0),
        totalReferralClaimed: data.totalReferralClaimed ?? new BN(0),
        referralCount: data.referralCount ?? new BN(0),
        referralPointsEarned: data.referralPointsEarned ?? new BN(0),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetch nicknames for multiple players using batch RPC call
   * Uses getMultipleAccountsInfo for efficiency (1 RPC call instead of N)
   * @param players - Array of player public keys
   * @returns Map of player pubkey (base58) to nickname (empty string if no nickname set)
   */
  async nicknames(players: PublicKey[]): Promise<Map<string, string>> {
    if (players.length === 0) return new Map();

    // Derive all PDAs
    const pdas = players.map((player) => this.accounts.playerProfile(player));

    // Batch fetch all accounts in one RPC call
    const accountInfos = await this.program.provider.connection.getMultipleAccountsInfo(pdas);

    const nicknames = new Map<string, string>();
    accountInfos.forEach((accountInfo, index) => {
      const playerKey = players[index].toBase58();
      if (accountInfo !== null) {
        try {
          // Decode the account data using Anchor's coder
          const decoded = (this.program.coder.accounts as any).decode(
            "playerProfile",
            accountInfo.data,
          );
          nicknames.set(playerKey, decoded.currentNickname || "");
        } catch (e) {
          nicknames.set(playerKey, "");
        }
      } else {
        nicknames.set(playerKey, "");
      }
    });

    return nicknames;
  }

  /**
   * Fetch nickname for a single player
   * @param player - The player's public key
   * @returns The nickname or empty string if not set
   */
  async nickname(player: PublicKey): Promise<string> {
    const profile = await this.playerProfile(player);
    return profile?.currentNickname || "";
  }

  /**
   * Check if a nickname is available
   * @param nickname - The nickname to check
   * @returns true if available, false if taken
   */
  async isNicknameAvailable(nickname: string): Promise<boolean> {
    const nicknamePda = this.accounts.nickname(nickname);
    try {
      const data = await (this.program.account as any).nickname.fetch(
        nicknamePda,
      );
      // If account exists and has an owner, nickname is taken
      return !data.owner || data.owner.equals(PublicKey.default);
    } catch (e) {
      // Account doesn't exist = nickname is available
      return true;
    }
  }

  /**
   * Resolve a nickname to its owner's public key
   * @param nickname - The nickname to resolve
   * @returns Owner's PublicKey if found, null otherwise
   */
  async nicknameOwner(nickname: string): Promise<PublicKey | null> {
    const nicknamePda = this.accounts.nickname(nickname);
    try {
      const data = await (this.program.account as any).nickname.fetch(
        nicknamePda,
      );
      if (data.owner && !data.owner.equals(PublicKey.default)) {
        return data.owner;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if an account exists
   */
  async exists(address: PublicKey): Promise<boolean> {
    const accountInfo =
      await this.program.provider.connection.getAccountInfo(address);
    return accountInfo !== null;
  }

  /**
   * Get SOL balance for an account
   */
  async balance(address: PublicKey): Promise<number> {
    return await this.program.provider.connection.getBalance(address);
  }

  /**
   * Get token account balance
   */
  async tokenBalance(tokenAccount: PublicKey): Promise<bigint> {
    try {
      const accountInfo =
        await this.program.provider.connection.getAccountInfo(tokenAccount);
      if (!accountInfo) {
        return BigInt(0);
      }

      // Token account data layout:
      // - 0-31: mint (32 bytes)
      // - 32-63: owner (32 bytes)
      // - 64-71: amount (8 bytes, little endian)
      const amount = accountInfo.data.readBigUInt64LE(64);
      return amount;
    } catch (error) {
      return BigInt(0);
    }
  }

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
  async fetchRoster(
    tierId: number,
    roundId: number,
    icpModule?: ICPModule,
    knownSettled?: boolean, // Optional: pass true if caller already knows round is settled (avoids extra RPC)
  ): Promise<RosterEntry[]> {
    // Use known status if provided, otherwise check via RoundPage fetch
    let isSettled = knownSettled ?? false;
    if (knownSettled === undefined) {
      try {
        const roundData = await this.round(roundId, tierId);
        isSettled = "settled" in roundData.status;
      } catch (err) {
        // Round doesn't exist yet or fetch failed - assume not settled
        console.debug(
          `[FetchModule] Could not fetch round status for ${roundId}, assuming not settled`,
        );
      }
    }

    // For settled rounds, skip expensive getProgramAccounts and go directly to ICP
    if (isSettled) {
      return this.fetchRosterFromICP(tierId, roundId, icpModule, 1);
    }

    // For open/countdown rounds, use Solana getProgramAccounts
    try {
      const solanaRoster = await this.fetchRoundRoster(tierId, roundId);
      if (solanaRoster.length > 0) {
        // Sort by joinTs ascending for deterministic ordering (critical for simulation)
        // Use player pubkey as tiebreaker when joinTs is equal
        solanaRoster.sort((a, b) => {
          const joinDiff = a.joinTs.toNumber() - b.joinTs.toNumber();
          if (joinDiff !== 0) return joinDiff;
          const aKey = a.player.toBase58();
          const bKey = b.player.toBase58();
          return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
        });
        return solanaRoster.map((rp) => ({
          player: rp.player,
          joinTs: rp.joinTs.toNumber(),
          tpPreset: rp.tpPreset,
          payoutLamports: 0, // Not yet settled
          placement: 0,
          kills: 0,
          source: "solana" as const,
        }));
      }
    } catch (err) {
      console.warn(
        `[FetchModule] Solana fetch failed for round ${roundId}, trying ICP:`,
        err,
      );
    }

    // Fallback to ICP if Solana returned empty (race condition: just settled)
    return this.fetchRosterFromICP(tierId, roundId, icpModule);
  }

  /**
   * Fetch roster from ICP archive with retry logic for race conditions.
   * Retries up to 3 times with exponential backoff if ICP doesn't have data yet.
   */
  private async fetchRosterFromICP(
    tierId: number,
    roundId: number,
    icpModule?: ICPModule,
    maxRetries: number = 3,
  ): Promise<RosterEntry[]> {
    if (!icpModule) {
      console.warn(
        `[FetchModule] No ICP module available, cannot fetch archived roster for round ${roundId}`,
      );
      return [];
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const snapshot = await icpModule.getRoundSnapshot(tierId, roundId);

        if (snapshot && snapshot.players.length > 0) {
          // Map and sort by join_ts to match Solana roster order (critical for determinism)
          const entries = snapshot.players.map((p) => ({
            // Candid IDL.Vec(IDL.Nat8) returns number[], convert to Uint8Array for PublicKey
            player: new PublicKey(new Uint8Array(p.player)),
            joinTs: Number(p.join_ts),
            tpPreset: p.tp_preset,
            payoutLamports: Number(p.payout_lamports),
            placement: p.placement,
            kills: p.kills,
            source: "icp" as const,
          }));

          // Sort by joinTs ascending to match Solana's join order
          // Use player pubkey as tiebreaker when joinTs is equal
          entries.sort((a, b) => {
            const joinDiff = a.joinTs - b.joinTs;
            if (joinDiff !== 0) return joinDiff;
            const aKey = a.player.toBase58();
            const bKey = b.player.toBase58();
            return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
          });

          return entries;
        }

        // Snapshot empty - might be race condition, retry after delay
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (err) {
        lastError = err as Error;
        console.warn(
          `[FetchModule] ICP fetch attempt ${attempt + 1} failed:`,
          err,
        );

        // Retry after delay
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn(
      `[FetchModule] No ICP snapshot found for tier ${tierId} round ${roundId} after ${maxRetries} attempts`,
    );
    return [];
  }
}
