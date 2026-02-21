/**
 * Main SDK client that composes all modules
 * Provides a unified interface for interacting with the Orbs Game program
 */
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { OrbsGameSDKConfig, TransactionResult, SettleOptions, JoinRoundOptions, JoinRoundV2Options, BuildJoinRoundV2Options, BuildTransactionResult, InitializeRootOptions, PlayerStatsUpdate, WalletSigner } from './types';
import { AccountsModule } from './modules/accounts';
import { FetchModule } from './modules/fetch';
import { SeedProof } from './modules/icp';
/**
 * Main Orbs Game SDK Client
 */
export declare class OrbsGameSDK {
    readonly accounts: AccountsModule;
    readonly fetch: FetchModule;
    readonly provider: AnchorProvider;
    private readonly program;
    private readonly config;
    private raydiumInstance;
    private raydiumOwner;
    constructor(config: OrbsGameSDKConfig, program?: Program);
    /**
     * Get the underlying Anchor program instance
     * For advanced users who need direct access
     */
    get rawProgram(): Program;
    /**
     * Send a transaction using sendWithFreshBlockhash for better error handling
     * Private helper method used by all SDK transaction methods
     */
    private sendTransaction;
    /**
     * Send a transaction using wallet provider for signing
     * Used when player provides a WalletSigner instead of Keypair
     */
    private sendTransactionWithWallet;
    /**
     * Get or create a Raydium SDK instance for CLMM operations.
     * Lazily initialized and cached for reuse.
     * @param owner - The owner pubkey for the Raydium instance (usually vaultAuthority)
     */
    private getRaydium;
    /**
     * Type guard to check if player is a WalletSigner
     */
    private isWalletSigner;
    /**
     * Initialize the root account
     * Must be called once before any other operations
     */
    /**
     * Initialize the root account
     * Must be called once before any other operations
     */
    initializeRoot(options: InitializeRootOptions): Promise<TransactionResult>;
    /**
     * Set current season rounds total
     */
    setSeasonRounds(authority: Keypair, roundsTotal: number): Promise<TransactionResult>;
    /**
     * Update tier configuration (points multiplier)
     * Use this to fix misconfigured tier settings
     */
    updateTierConfig(authority: Keypair, tierId: number, pointsMultiplier: number): Promise<TransactionResult>;
    /**
     * Join a round (creates round if it doesn't exist)
     * This is a low-level method - use with specific roundId and tierId
     *
     * Creates a RoundPlayer PDA to track player membership.
     * If player already joined, the transaction will fail (PDA already exists).
     * Supports both Keypair and WalletSigner (wallet provider) for signing
     */
    joinRound(options: JoinRoundOptions): Promise<TransactionResult>;
    /**
     * Join a round with verified player config hash (V2)
     * Requires join authority co-signature from backend.
     * Player's config (spawn, skills) is committed via hash, full data stored on ICP.
     *
     * Creates a RoundPlayerV2 PDA to track player membership with config hash.
     * If player already joined, the transaction will fail (PDA already exists).
     */
    joinRoundV2(options: JoinRoundV2Options): Promise<TransactionResult>;
    /**
     * Build a join round v2 transaction without sending it.
     * Used by backend services (matrix-worker) to create partially signed transactions.
     * The transaction is signed by joinAuthority and returned for the player to sign.
     *
     * Mirrors joinRoundV2 logic including:
     * - Page initialization if needed
     * - Dev fee transfer for returning players
     * - Referral initialization if referrer provided
     */
    buildJoinRoundV2Transaction(options: BuildJoinRoundV2Options): Promise<BuildTransactionResult>;
    /**
     * Claim accumulated referral rewards
     * Transfers pending rewards from vault to referrer based on PlayerProfile.pendingReferralRewards
     * @param referrer - The referrer claiming their rewards (Keypair or WalletSigner)
     */
    claimReferralRewards(referrer: Keypair | WalletSigner): Promise<TransactionResult>;
    /**
     * Initialize the referral vault PDA
     * Call this once after upgrading an existing deployment
     */
    initReferralVault(authority: Keypair): Promise<TransactionResult>;
    initReferral(player: Keypair | WalletSigner, referrer: PublicKey): Promise<TransactionResult>;
    /**
     * Initialize a player profile account
     * Creates an empty profile that can receive referral rewards
     * @param player - The player initializing their profile (Keypair or WalletSigner)
     */
    initPlayerProfile(player: Keypair | WalletSigner): Promise<TransactionResult>;
    /**
     * Set a unique nickname for a player
     * Costs 0.2 SOL and nicknames are globally unique
     * Automatically frees up old nickname if player is changing their nickname
     * @param player - The player setting their nickname (Keypair or WalletSigner)
     * @param nickname - The desired nickname (3-20 alphanumeric chars or underscores)
     */
    setNickname(player: Keypair | WalletSigner, nickname: string): Promise<TransactionResult>;
    /**
     * Settle a round (Phase 1: seed + emissions)
     * Low-level method - for complete settlement use settleRoundComplete()
     * @param seedProof - SeedProof from ICP canister containing seed, Merkle proof, and chunk signature
     *
     * Fetches the roster via RoundPlayer PDAs to determine emission recipients.
     *
     * remaining_accounts convention:
     * - [0..2]: ORB token accounts for first 3 joiners (required for emissions)
     * - [3..5]: PlayerStats PDAs for first 3 joiners (optional, for immediate emission tracking)
     */
    settleRound(authority: Keypair, roundId: number, tierId: number, seedProof: SeedProof): Promise<TransactionResult>;
    /**
     * Emit ORB tokens after settlement (Phase 1.5)
     * Only called if genesis is done and round has emissions
     *
     * remaining_accounts convention:
     * - [0..2]: ORB token accounts for first 3 joiners (required)
     * - [3..5]: PlayerStats PDAs for first 3 joiners (optional)
     */
    emitOrbs(authority: Keypair, roundId: number, tierId: number): Promise<TransactionResult>;
    /**
     * Distribute payouts to winners (Phase 2)
     * Low-level method - can be called multiple times for batching
     *
     * remaining_accounts convention:
     * - Accounts come in pairs: [RoundPlayer, PlayerWallet] for each payout
     * - index 2*i     = RoundPlayer PDA
     * - index 2*i + 1 = Player's wallet (destination for payout)
     */
    roundPayout(authority: Keypair, roundId: number, tierId: number, payouts: {
        player: PublicKey;
        accountIndex: number;
        payout: BN;
    }[]): Promise<TransactionResult>;
    /**
     * Update player stats (Phase 3)
     * Low-level method - can be called multiple times for batching
     *
     * remaining_accounts convention:
     * - Accounts come in pairs: [RoundPlayerV2, PlayerStats] for each update
     * - index 2*i     = RoundPlayerV2 PDA
     * - index 2*i + 1 = PlayerStats PDA
     */
    updatePlayerStats(authority: Keypair, roundId: number, tierId: number, stats: PlayerStatsUpdate[], seasonId: number): Promise<TransactionResult>;
    /**
     * Close RoundPlayer accounts after settlement is complete (Phase 4)
     * Reclaims rent from RoundPlayer PDAs after both payout and stats are processed.
     * Rent is returned to dev_wallet.
     *
     * remaining_accounts convention:
     * - Each account is a RoundPlayer PDA to close
     */
    closeRoundPlayers(authority: Keypair, roundId: number, tierId: number, players: PublicKey[]): Promise<TransactionResult>;
    /**
     * Complete settlement with all 3 phases (settle + payout + stats)
     * High-level method that orchestrates the entire settlement process
     */
    settleRoundComplete(authority: Keypair, roundId: number, tierId: number, options: SettleOptions): Promise<{
        signatures: string[];
    }>;
    /**
     * Get player stats for a specific season
     */
    getPlayerStats(player: PublicKey, seasonId?: number): Promise<import("./types").PlayerStats | null>;
    /**
     * Get the next available round ID for a tier
     * Checks if lastSettledRoundId + 1 exists and is joinable
     * If not, finds the next available round ID
     */
    getNextRoundId(tierId: number): Promise<number>;
    /**
     * Check and trigger genesis if threshold is met
     * Genesis converts accumulated LP into initial ORB liquidity
     */
    checkAndRunGenesis(authority: Keypair): Promise<TransactionResult>;
    /**
     * Claim season pool rewards based on player's point share
     * Available after season is finalized
     */
    claimSeasonPool(player: Keypair, seasonId: number): Promise<TransactionResult>;
    /**
     * Convert Season 0 points to ORB tokens or claim season pool rewards
     * Season 0: Converts points to ORB using genesis conversion ratio
     * Season 1+: Claims proportional share of season prize pool
     * @param player - The player claiming rewards (Keypair or WalletSigner)
     * @param seasonId - Season ID to claim from (default: 0 for genesis)
     */
    convertPoints(player: Keypair | WalletSigner, seasonId?: number): Promise<TransactionResult>;
    /**
     * Open CLMM position - creates liquidity position via Raydium
     * This is called after genesis to deploy liquidity to the CLMM pool
     *
     * @param authority - The authority keypair for signing
     * @param params.clmmProgramId - Raydium CLMM program ID
     * @param params.poolId - CLMM pool address
     * @param params.raydium - Optional: Raydium SDK instance (will be created if not provided)
     */
    openClmmPosition(authority: Keypair, params: {
        clmmProgramId: PublicKey;
        poolId: string;
        raydium?: any;
    }): Promise<{
        signature: string;
        nftMint: PublicKey;
    }>;
    /**
     * Increase CLMM liquidity - adds more liquidity to existing position
     *
     * @param authority - The authority keypair for signing
     * @param params.clmmProgramId - Raydium CLMM program ID
     * @param params.poolId - CLMM pool address
     * @param params.addSol - BN amount of SOL to add
     * @param params.raydium - Optional: Raydium SDK instance (will be created if not provided)
     */
    increaseClmmLiquidity(authority: Keypair, params: {
        clmmProgramId: PublicKey;
        poolId: string;
        addSol: any;
        raydium?: any;
    }): Promise<string>;
    /**
     * Lock CLMM position NFT - transfers position NFT to lock program
     * Prevents unauthorized liquidity removal by locking the position
     */
    lockClmmPosition(authority: Keypair, params: {
        lockProgramId: PublicKey;
        clmmProgramId: PublicKey;
        poolId: string;
        raydium: any;
    }): Promise<string>;
    /**
     * Execute CLMM buyback - swaps SOL for ORB tokens via CLMM pool
     * Uses accumulated LP fees to buy back ORB tokens
     *
     * @param authority - The authority keypair for signing
     * @param params.clmmProgramId - Raydium CLMM program ID
     * @param params.poolId - CLMM pool address
     * @param params.buybackAmount - BN amount of WSOL to swap
     * @param params.raydium - Optional: Raydium SDK instance (will be created if not provided)
     */
    clmmBuyback(authority: Keypair, params: {
        clmmProgramId: PublicKey;
        poolId: string;
        buybackAmount: any;
        raydium?: any;
    }): Promise<string>;
    /**
     * Calculate fees for an entry
     */
    calculateFees(entryLamports: number, takeProfitLamports?: number): Promise<import("./types").FeeBreakdown>;
    /**
     * Calculate points for placement and kills
     */
    calculatePoints(placement: number, kills: number, cap?: number): import("./types").PointsBreakdown;
    /**
     * Create settlement data from round results
     */
    createSettlement(params: {
        players: PublicKey[];
        totalPrizePool: number;
        placements: number[];
        kills: number[];
    }): {
        payouts: import("./types").PlayerResult[];
        stats: PlayerStatsUpdate[];
    };
    /**
     * Get emission recipients for a round (first 3 joiners by join_ts)
     * These are the players who will receive ORB emissions if an emission is triggered
     *
     * @param roundId - The round ID to get emission recipients for
     * @returns Array of up to 3 PublicKeys representing the emission recipients
     *
     * Fetches RoundPlayer PDAs and sorts by join_ts to determine first 3 joiners.
     */
    getEmissionRecipients(tierId: number, roundId: number): Promise<PublicKey[]>;
    /**
     * Get the full roster for a round
     * Returns all players who joined, sorted by join timestamp
     */
    getRoundRoster(tierId: number, roundId: number): Promise<PublicKey[]>;
    /**
     * Calculate emission probability and determine if emission will trigger for a round.
     * Uses the same deterministic logic as the Solana program.
     *
     * @param roundId - The round ID
     * @param seedHex - The 32-byte seed as hex string (with or without 0x prefix)
     * @returns Object with probability info and whether emission will trigger
     */
    calculateEmissionProbability(roundId: number, seedHex: string): Promise<{
        willEmit: boolean;
        probabilityBps: number;
        randomBps: number;
        gap: number;
        hazardCapRounds: number;
        genesisDone: boolean;
        budgetRemaining: BN;
    }>;
}
//# sourceMappingURL=client.d.ts.map