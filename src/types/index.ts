/**
 * Type definitions for the Orbs Game SDK
 * These types mirror the program IDL and test patterns
 */

import { PublicKey, Keypair, ConfirmOptions, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import type { SeedProof } from "../modules/icp";

/**
 * Wallet provider interface for signing transactions
 * Compatible with Solana wallet adapters
 */
export interface WalletSigner {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

// Re-export errors
export * from "./errors";

/**
 * SDK Configuration
 */
export interface OrbsGameSDKConfig {
  /** Solana RPC endpoint */
  provider: AnchorProvider;
  /** Program ID (optional, uses default if not provided) */
  programId?: PublicKey;
  /** Transaction confirmation options */
  confirmOptions?: ConfirmOptions;
  /** Maximum retries for failed transactions */
  maxRetries?: number;
  /** Default batch size for batched operations */
  defaultBatchSize?: number;
}

/**
 * Transaction Result
 */
export interface TransactionResult {
  /** Transaction signature */
  signature: string;
  /** Slot number */
  slot?: number;
}

/**
 * Tier Configuration (from program IDL)
 */
export interface TierConfig {
  tierId: number;
  entryLamports: BN;
  minPlayers: number;
  maxPlayers: number;
  countdownSecs: number;
  takeProfit: BN;
  pointsMultiplier: number;
}

/**
 * Tier State (from program IDL)
 */
export interface TierState {
  tierId: number;
  lastSettledRoundId: BN;
}

/**
 * Round Status (from program IDL)
 */
export type RoundStatus =
  | { open: {} }
  | { countdown: { startTs: BN } }
  | { settled: {} };

/**
 * Round Kind (from program IDL)
 */
export type RoundKind = { tier: { tierId: number } };

/**
 * Round Meta Data (from program IDL)
 * Compact round data stored in RoundPage slots.
 * Player membership is tracked via RoundPlayer PDAs.
 */
export interface Round {
  id: BN;
  seasonId: number;
  kind: RoundKind;
  entryLamports: BN;
  minPlayers: number;
  maxPlayers: number;
  countdownSecs: number;
  status: RoundStatus;
  seedHex: number[] | null;
  joinedCount: number;
  createdTs: BN;
  emitExecuted: boolean;  // Idempotency: emission logic was run
  didEmit: boolean;       // Actual: tokens were minted
}

/**
 * RoundPage Account Data (from program IDL)
 * Stores 64 rounds per page for rent amortization.
 * PDA: ["round_page", page_index.to_be_bytes()]
 */
export interface RoundPage {
  rounds: Round[];
}

/**
 * RoundPlayer Account Data (from program IDL)
 *
 * One account per (tier_id, round_id, player) - proves player joined.
 * Seeds: ["rp", tier_id.to_be_bytes(), round_id.to_be_bytes(), player.key()]
 *
 * Layout for memcmp filtering (after 8-byte discriminator):
 *   offset 8:  tier_id (1 byte)
 *   offset 9:  round_id (8 bytes, LE)
 */
export interface RoundPlayer {
  tierId: number;
  roundId: BN;
  seasonId: number;
  player: PublicKey;
  stats: PublicKey;
  joinTs: BN;
  tpPreset: number;  // 0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo
  payoutProcessed: boolean;
  statsApplied: boolean;
}

/** Memcmp offsets for RoundPlayer filtering */
export const ROUND_PLAYER_OFFSETS = {
  TIER_ID: 8,
  ROUND_ID: 9,
} as const;

/**
 * RoundPlayerV2 Account Data (from program IDL)
 *
 * One account per (tier_id, round_id, player) - proves player joined with config commitment.
 * Seeds: ["round_player_v2", tier_id.to_be_bytes(), round_id.to_be_bytes(), player.key()]
 *
 * Layout for memcmp filtering (after 8-byte discriminator):
 *   offset 8:  tier_id (1 byte)
 *   offset 9:  round_id (8 bytes, LE)
 */
export interface RoundPlayerV2 {
  tierId: number;
  roundId: BN;
  seasonId: number;
  player: PublicKey;
  stats: PublicKey;
  joinTs: BN;
  tpPreset: number;  // 0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo
  playerConfigHash: number[];  // 32 bytes - commitment hash
  payoutProcessed: boolean;
  statsApplied: boolean;
}

/** Memcmp offsets for RoundPlayerV2 filtering */
export const ROUND_PLAYER_V2_OFFSETS = {
  TIER_ID: 8,
  ROUND_ID: 9,
} as const;

/**
 * Root Account Data (from program IDL)
 */
export interface RootAccount {
  devFeeBps: number;
  authority: PublicKey;
  devWallet: PublicKey;
  orbMint: PublicKey;
  tierConfigs: TierConfig[];
  tierStates: TierState[];
  seasonId: number;
  seasonRoundsTotal: number;
  seasonRoundsPlayed: number;
  pointsCapPerRound: number;
  nextSeasonRoundsTotal: number;
  genesisDone: boolean;
  genesisThresholdLamports: BN;
  lpAccumSol: BN;
  genesisOrbCap: BN;
  conversionOpen: boolean;
  pointsPerOrbBase: number;
  pointsPerOrbEffective: BN;
  orbsMintedFromConversion: BN;
  clmmCfg: ClmmCfg | null;
  totalRoundsSinceGenesis: BN;
  epochRounds: BN;
  epochIndex: number;
  seasonRounds: BN;
  emitBase: BN;
  decayBps: number;
  hazardCapRounds: BN;
  lastEmissionRound: BN;
  seasonPoolOrb: BN;
  emissionsTotalOrb: BN;
  emissionBudgetCap: BN;
  totalMintedOrb: BN;
  currentSeasonTotalPoints: BN;
}

/**
 * CLMM Configuration (from program IDL)
 * Note: program ID is passed as config, not stored on-chain
 */
export interface ClmmCfg {
  pool: PublicKey;
  positionNft: PublicKey;
}

/**
 * Player Stats Account Data (from program IDL)
 * Note: playerPubKey is not stored - PDA derivation proves ownership
 */
export interface PlayerStats {
  seasonId: number;
  seasonPoints: BN;
  roundsPlayed: number;
  wins: number;
  kills: number;
  solEarnedLamports: BN;
  orbEarnedAtoms: BN;
  lastUpdateTs: BN;
  poolClaimed: boolean;
  /** 256-bit bitmap for seasonal one-time awards (resets each season) */
  checkpointsSeason: BN[];
  /** 64-bit bitmap for global/lifetime one-time awards */
  checkpointsGlobal: BN;
  /** Last round ID where player won (for streak tracking) */
  lastWinRoundId: BN;
  /** Current consecutive win streak (reset on non-win) */
  winStreak: number;
}

/**
 * Player Profile Account Data (from program IDL)
 * PDA: ["player_profile", player_pubkey]
 */
export interface PlayerProfile {
  /** The player who owns this profile */
  player: PublicKey;
  /** The player's current nickname (empty string if none set) */
  currentNickname: string;
  /** Timestamp when profile was created */
  createdAt: BN;
  /** Timestamp when nickname was last updated */
  updatedAt: BN;
  /** Pending referral rewards to claim (in lamports) */
  pendingReferralRewards: BN;
  /** Total referral rewards claimed (in lamports) */
  totalReferralClaimed: BN;
  /** Number of players referred */
  referralCount: BN;
  /** Total points earned from referrals (20 points per referral + checkpoint bonuses) */
  referralPointsEarned: BN;
}

/**
 * Referral Account Data (from program IDL)
 * PDA: ["referral", player.key()]
 */
export interface Referral {
  /** The player who was referred */
  player: PublicKey;
  /** The player who referred them */
  referrer: PublicKey;
  /** Timestamp when referral was set */
  createdAt: BN;
  /** Whether this referral has been counted in referrer's referral_count */
  counted: boolean;
}

/**
 * Season Snapshot Account Data (from program IDL)
 */
export interface SeasonSnapshot {
  seasonId: number;
  totalPoints: BN;
  poolOrbAtoms: BN;
  orbsClaimed: BN;
  finalized: boolean;
}

/**
 * Player Result (used in payouts and stats)
 */
export interface PlayerResult {
  player: PublicKey;
  accountIndex: number;
  payout: BN;
}

/**
 * Player Stats Update (used in updatePlayerStats instruction)
 */
export interface PlayerStatsUpdate {
  player: PublicKey;
  accountIndex: number;
  prize: BN;
  placement: number;
  kills: number;
  orbEarnedAtoms: BN;
}

/**
 * Payout Data (instruction parameter)
 */
export interface PayoutData {
  payouts: PlayerResult[];
}

/**
 * Stats Data (instruction parameter)
 */
export interface StatsData {
  updates: PlayerStatsUpdate[];
}

/**
 * Settlement Options
 */
export interface SettleOptions {
  /** Seed proof from ICP canister containing seed, Merkle proof, and chunk signature */
  seedProof: SeedProof;
  /** Payout data for winners */
  payouts: PlayerResult[];
  /** Stats updates for players */
  stats: PlayerStatsUpdate[];
  /** Auto-batch large operations (default: true) */
  autoBatch?: boolean;
  /** Batch size (default: from config) */
  batchSize?: number;
}

/**
 * Fee Breakdown
 */
export interface FeeBreakdown {
  /** Developer fee */
  devFee: number;
  /** LP accumulation (half of dev fee pre-genesis) */
  lpAccum: number;
  /** Actual dev wallet portion */
  actualDev: number;
  /** Take profit fee */
  takeProfit: number;
  /** Net amount to vault (prize pool) */
  netToVault: number;
}

/**
 * Points Breakdown
 */
export interface PointsBreakdown {
  /** Points from placement */
  placementPoints: number;
  /** Points from kills */
  killPoints: number;
  /** Total points before cap */
  totalBeforeCap: number;
  /** Total points after cap */
  totalAfterCap: number;
}

/**
 * Join Round Options (V1 - DISABLED)
 */
export interface JoinRoundOptions {
  /** Round ID to join */
  roundId: number;
  /** Tier ID */
  tierId: number;
  /** Player keypair or wallet signer */
  player: Keypair | WalletSigner;
  /** Take Profit preset (0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo) */
  tpPreset?: number;
  /** Optional: Use wallet provider for signing (auto-detected if player is WalletSigner) */
  useWalletSigner?: boolean;
  /** Optional: Referrer's public key if player was referred */
  referrer?: PublicKey;
}

/**
 * Join Round V2 Options - requires join authority co-signature
 */
export interface JoinRoundV2Options {
  /** Round ID to join */
  roundId: number;
  /** Tier ID */
  tierId: number;
  /** Player keypair or wallet signer */
  player: Keypair | WalletSigner;
  /** Join authority keypair (backend key that co-signs the join) */
  joinAuthority: Keypair;
  /** SHA256 hash of player's pre-round config (spawn, skills, tp_preset) */
  playerConfigHash: Uint8Array | number[];
  /** Take Profit preset (0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo) */
  tpPreset?: number;
  /** Optional: Use wallet provider for signing (auto-detected if player is WalletSigner) */
  useWalletSigner?: boolean;
  /** Optional: Referrer's public key if player was referred */
  referrer?: PublicKey;
}

/**
 * Build Join Round V2 Transaction Options - for backend partial signing
 */
export interface BuildJoinRoundV2Options {
  /** Round ID to join */
  roundId: number;
  /** Tier ID */
  tierId: number;
  /** Player public key */
  playerPubkey: PublicKey;
  /** Join authority keypair (backend key that co-signs the join) */
  joinAuthority: Keypair;
  /** SHA256 hash of player's pre-round config (spawn, skills, tp_preset) */
  playerConfigHash: Uint8Array | number[];
  /** Take Profit preset (0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo) */
  tpPreset?: number;
  /** Optional: Referrer's public key if player was referred */
  referrer?: PublicKey;
}

/**
 * Build Transaction Result - returns unsigned transaction
 */
export interface BuildTransactionResult {
  /** Base64-encoded serialized transaction */
  txBase64: string;
  /** Timestamp when the transaction expires (blockhash validity) */
  expiresAt: number;
  /** SHA256 hash of tx.serializeMessage() - used for validation in /broadcast */
  messageHash: string;
}

/**
 * Initialize Root Options
 */
export interface InitializeRootOptions {
  /** Authority keypair */
  authority: Keypair;
  /** Developer wallet address */
  devWallet: PublicKey;
  /** ORB mint address */
  orbMint: PublicKey;
  /** CLMM pool address for ORB/WSOL */
  clmmPool: PublicKey;
  /** Developer fee in basis points */
  devFeeBps: number;
  /** Tier configurations */
  tierConfigs: TierConfig[];
}

/**
 * CLMM Operation Options
 */
export interface OpenPositionOptions {
  /** Raw instruction data for Raydium CLMM */
  instructionData: Buffer;
  /** Additional accounts for CPI */
  remainingAccounts: Array<{
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }>;
}

export interface BuybackOptions {
  /** Swap instruction data for Raydium CLMM */
  swapIxData: Buffer;
  /** Additional accounts for swap CPI */
  remainingAccounts: Array<{
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }>;
}

export interface IncreaseLiquidityOptions {
  /** Instruction data for Raydium CLMM */
  instructionData: Buffer;
  /** Additional accounts for CPI */
  remainingAccounts: Array<{
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }>;
}

export interface LockPositionOptions {
  /** Instruction data for Raydium Lock program */
  instructionData: Buffer;
  /** Additional accounts for lock CPI */
  remainingAccounts: Array<{
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }>;
}
