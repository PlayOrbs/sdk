"use strict";
/**
 * Main SDK client that composes all modules
 * Provides a unified interface for interacting with the Orbs Game program
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrbsGameSDK = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const accounts_1 = require("./modules/accounts");
const fetch_1 = require("./modules/fetch");
const constants_1 = require("./constants");
const orbs_game_json_1 = __importDefault(require("./orbs_game.json"));
const transaction_1 = require("./utils/transaction");
const calculations_1 = require("./utils/calculations");
const builders_1 = require("./utils/builders");
/**
 * Main Orbs Game SDK Client
 */
class OrbsGameSDK {
    constructor(config, program) {
        this.raydiumInstance = null;
        this.raydiumOwner = null;
        const programId = config.programId || constants_1.PROGRAM_ID;
        // If program is provided (common in tests), use it directly
        if (program) {
            this.program = program;
        }
        else {
            // Create Program instance from IDL with custom program ID
            // Override the IDL address with the provided programId
            const idlWithProgramId = { ...orbs_game_json_1.default, address: programId.toBase58() };
            this.program = new anchor_1.Program(idlWithProgramId, config.provider);
        }
        this.config = {
            confirmOptions: config.confirmOptions || {
                commitment: constants_1.DEFAULTS.COMMITMENT,
            },
            maxRetries: config.maxRetries ?? constants_1.DEFAULTS.MAX_RETRIES,
            defaultBatchSize: config.defaultBatchSize ?? constants_1.DEFAULTS.BATCH_SIZE,
        };
        this.accounts = new accounts_1.AccountsModule(this.program.programId);
        this.fetch = new fetch_1.FetchModule(this.program, this.accounts);
        this.provider = config.provider;
    }
    /**
     * Get the underlying Anchor program instance
     * For advanced users who need direct access
     */
    get rawProgram() {
        return this.program;
    }
    /**
     * Send a transaction using sendWithFreshBlockhash for better error handling
     * Private helper method used by all SDK transaction methods
     */
    async sendTransaction(tx, signers) {
        return (0, transaction_1.sendWithFreshBlockhash)(this.provider.connection, tx, signers, this.config.maxRetries);
    }
    /**
     * Send a transaction using wallet provider for signing
     * Used when player provides a WalletSigner instead of Keypair
     */
    async sendTransactionWithWallet(tx, wallet) {
        return (0, transaction_1.sendWithWalletSigner)(this.provider.connection, tx, wallet, this.config.maxRetries);
    }
    /**
     * Get or create a Raydium SDK instance for CLMM operations.
     * Lazily initialized and cached for reuse.
     * @param owner - The owner pubkey for the Raydium instance (usually vaultAuthority)
     */
    async getRaydium(owner) {
        // Return cached instance if owner matches
        if (this.raydiumInstance && this.raydiumOwner?.equals(owner)) {
            return this.raydiumInstance;
        }
        const { Raydium } = await Promise.resolve().then(() => __importStar(require('@raydium-io/raydium-sdk-v2')));
        this.raydiumInstance = await Raydium.load({
            owner,
            connection: this.provider.connection,
            cluster: 'mainnet',
            disableFeatureCheck: true,
            disableLoadToken: true,
        });
        this.raydiumOwner = owner;
        return this.raydiumInstance;
    }
    /**
     * Type guard to check if player is a WalletSigner
     */
    isWalletSigner(player) {
        return 'signTransaction' in player && !('secretKey' in player);
    }
    // ============================================================================
    // Admin Operations
    // ============================================================================
    /**
     * Initialize the root account
     * Must be called once before any other operations
     */
    /**
     * Initialize the root account
     * Must be called once before any other operations
     */
    async initializeRoot(options) {
        const rootAccount = this.accounts.root();
        const programVault = this.accounts.programVault();
        const vaultAuthority = this.accounts.vaultAuthority();
        const lpVault = this.accounts.lpVault();
        const orbLpVault = this.accounts.orbLpVault();
        const referralVault = this.accounts.referralVault();
        const tx = await this.program.methods
            .initializeRoot(options.devFeeBps, options.tierConfigs.map((tc) => ({
            tierId: tc.tierId,
            entryLamports: tc.entryLamports,
            minPlayers: tc.minPlayers,
            maxPlayers: tc.maxPlayers,
            countdownSecs: tc.countdownSecs,
            takeProfit: tc.takeProfit,
            pointsMultiplier: tc.pointsMultiplier,
        })))
            .accountsPartial({
            rootAccount,
            devWallet: options.devWallet,
            programVault,
            orbMint: options.orbMint,
            wsolMint: constants_1.PROGRAM_ADDRESSES.WSOL_MINT,
            vaultAuthority,
            lpVault,
            clmmPool: options.clmmPool,
            orbLpVault,
            referralVault,
            authority: options.authority.publicKey,
        })
            .transaction();
        const signature = await this.sendTransaction(tx, [options.authority]);
        return { signature };
    }
    /**
     * Set current season rounds total
     */
    async setSeasonRounds(authority, roundsTotal) {
        const rootAccount = this.accounts.root();
        const tx = await this.program.methods
            .adminSetSeasonRounds(roundsTotal)
            .accounts({
            rootAccount,
            authority: authority.publicKey,
        })
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    /**
     * Update tier configuration (points multiplier)
     * Use this to fix misconfigured tier settings
     */
    async updateTierConfig(authority, tierId, pointsMultiplier) {
        const rootAccount = this.accounts.root();
        const tx = await this.program.methods
            .adminUpdateTierConfig(tierId, pointsMultiplier)
            .accounts({
            rootAccount,
            authority: authority.publicKey,
        })
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    // ============================================================================
    // Round Operations
    // ============================================================================
    /**
     * Join a round (creates round if it doesn't exist)
     * This is a low-level method - use with specific roundId and tierId
     *
     * Creates a RoundPlayer PDA to track player membership.
     * If player already joined, the transaction will fail (PDA already exists).
     * Supports both Keypair and WalletSigner (wallet provider) for signing
     */
    async joinRound(options) {
        const { roundId, tierId, player, tpPreset = 0, referrer } = options;
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        const roundPlayerPda = this.accounts.roundPlayer(tierId, roundId, player.publicKey);
        const vaultPda = this.accounts.vault(tierId, roundId);
        const lpVault = this.accounts.lpVault();
        // Extract publicKey from player (works for both Keypair and WalletSigner)
        const playerPubkey = player.publicKey;
        // Fetch root to get dev wallet, season ID, and orb mint
        const rootData = await this.fetch.root();
        const playerStatsPda = this.accounts.playerStats(playerPubkey, rootData.seasonId);
        // Check if player has existing stats (first game = no stats)
        let playerHasStats = false;
        try {
            const playerStatsInfo = await this.provider.connection.getAccountInfo(playerStatsPda);
            playerHasStats = !!playerStatsInfo;
        }
        catch {
            playerHasStats = false;
        }
        // Derive referral accounts if referrer is provided
        let referralPda;
        let referrerStatsPda;
        let needsReferralInit = false;
        let referrerHasStats = false;
        if (referrer) {
            referrerStatsPda = this.accounts.playerStats(referrer, rootData.seasonId);
            // Check if referrer has PlayerStats (required for referral to work)
            try {
                const referrerStatsInfo = await this.provider.connection.getAccountInfo(referrerStatsPda);
                referrerHasStats = !!referrerStatsInfo;
            }
            catch {
                referrerHasStats = false;
            }
            // Only proceed with referral if referrer has stats AND player has stats
            // (first-time players don't get referral to offset PDA creation fees)
            if (referrerHasStats && playerHasStats) {
                referralPda = this.accounts.referral(playerPubkey);
                // Check if referral PDA already exists and is initialized
                try {
                    const referralInfo = await this.provider.connection.getAccountInfo(referralPda);
                    // Account must exist, be owned by our program, and have enough data to be a valid Referral
                    // Referral struct: 8 discriminator + 32 player + 32 referrer + 8 created_at + 1 counted = 81 bytes
                    const isValidReferral = referralInfo &&
                        referralInfo.owner.equals(this.program.programId) &&
                        referralInfo.data.length >= 81;
                    needsReferralInit = !isValidReferral;
                }
                catch {
                    needsReferralInit = true;
                }
                // Check for circular referral: if referrer has a referral pointing to player, skip
                if (needsReferralInit) {
                    const referrerReferralPda = this.accounts.referral(referrer);
                    try {
                        const referrerReferralInfo = await this.provider.connection.getAccountInfo(referrerReferralPda);
                        if (referrerReferralInfo && referrerReferralInfo.data.length >= 72) {
                            // Referral layout: 8-byte discriminator + 32-byte player + 32-byte referrer
                            const referrerOfReferrer = new web3_js_1.PublicKey(referrerReferralInfo.data.slice(40, 72));
                            if (referrerOfReferrer.equals(playerPubkey)) {
                                // Circular referral detected - don't init referral
                                needsReferralInit = false;
                                referralPda = undefined;
                            }
                        }
                    }
                    catch {
                        // Referrer has no referral account, no circular dependency
                    }
                }
            }
        }
        // Check if round page exists and if this is the first player
        let isFirstPlayer = false;
        let needsPageInit = false;
        try {
            const round = await this.fetch.round(roundId, tierId);
            // Round exists if created_ts != 0
            isFirstPlayer = round.createdTs.toNumber() === 0;
        }
        catch (error) {
            // Page doesn't exist yet, need to initialize it
            needsPageInit = true;
            isFirstPlayer = true;
        }
        // Build pre-instructions
        const preInstructions = [];
        // Add initRoundPage instruction if page doesn't exist
        if (needsPageInit) {
            const initPageIx = await this.program.methods
                .initRoundPage(tierId, pageIndex)
                .accounts({
                payer: playerPubkey,
                rootAccount,
                roundPage: roundPagePda,
                systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            })
                .instruction();
            preInstructions.push(initPageIx);
        }
        // Add dev fee transfer if not first player AND player has existing stats
        // (first-time players don't pay dev fee to offset PDA creation fees)
        if (!needsPageInit && playerHasStats) {
            preInstructions.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: player.publicKey,
                toPubkey: rootData.devWallet,
                lamports: 600000, // 0.0006 SOL
            }));
        }
        // Add initReferral instruction if referrer provided, has profile, referral PDA doesn't exist,
        // and we're not initializing the round page (to avoid transaction size issues)
        let addedInitReferral = false;
        if (referrer &&
            referrerHasStats &&
            needsReferralInit &&
            referralPda &&
            !needsPageInit) {
            // Get referrer's referral PDA to check for circular referrals
            const referrerReferralPda = this.accounts.referral(referrer);
            const referrerProfilePda = this.accounts.playerProfile(referrer);
            const initReferralIx = await this.program.methods
                .initReferral()
                .accounts({
                referral: referralPda,
                player: playerPubkey,
                referrer: referrer,
                referrerProfile: referrerProfilePda,
                referrerReferral: referrerReferralPda,
                systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            })
                .instruction();
            preInstructions.push(initReferralIx);
            addedInitReferral = true;
        }
        // Only include referral accounts if referral already exists OR we just added initReferral
        const includeReferralAccounts = referrerHasStats && referralPda && (!needsReferralInit || addedInitReferral);
        // Build accounts object
        const accounts = {
            player: playerPubkey,
            rootAccount,
            roundPage: roundPagePda,
            roundPlayer: roundPlayerPda,
            vault: vaultPda,
            devWallet: rootData.devWallet,
            lpVault,
            playerStats: playerStatsPda,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            // Optional referral accounts - only include if referral exists or being initialized
            referral: includeReferralAccounts ? referralPda : null,
            referrerStats: includeReferralAccounts ? referrerStatsPda : null,
            referrerProfile: includeReferralAccounts ? this.accounts.playerProfile(referrer) : null,
            referralVault: includeReferralAccounts ? this.accounts.referralVault() : null,
        };
        const tx = await this.program.methods
            .joinRound(tierId, tpPreset, new bn_js_1.default(roundId), pageIndex)
            .accounts(accounts)
            .preInstructions(preInstructions)
            .transaction();
        // Detect signing method: WalletSigner or Keypair
        const useWalletSigner = options.useWalletSigner ?? this.isWalletSigner(player);
        let signature;
        if (useWalletSigner && this.isWalletSigner(player)) {
            // Use wallet provider for signing
            signature = await this.sendTransactionWithWallet(tx, player);
        }
        else if ('secretKey' in player) {
            // Use Keypair for signing
            signature = await this.sendTransaction(tx, [player]);
        }
        else {
            throw new Error('Invalid player: must be either Keypair or WalletSigner');
        }
        return { signature };
    }
    /**
     * Join a round with verified player config hash (V2)
     * Requires join authority co-signature from backend.
     * Player's config (spawn, skills) is committed via hash, full data stored on ICP.
     *
     * Creates a RoundPlayerV2 PDA to track player membership with config hash.
     * If player already joined, the transaction will fail (PDA already exists).
     */
    async joinRoundV2(options) {
        const { roundId, tierId, player, joinAuthority, playerConfigHash, tpPreset = 0, referrer } = options;
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        const roundPlayerV2Pda = this.accounts.roundPlayerV2(tierId, roundId, player.publicKey);
        const vaultPda = this.accounts.vault(tierId, roundId);
        const lpVault = this.accounts.lpVault();
        const playerPubkey = player.publicKey;
        // Fetch root to get dev wallet, season ID
        const rootData = await this.fetch.root();
        const playerStatsPda = this.accounts.playerStats(playerPubkey, rootData.seasonId);
        // Check if player has existing stats
        let playerHasStats = false;
        try {
            const playerStatsInfo = await this.provider.connection.getAccountInfo(playerStatsPda);
            playerHasStats = !!playerStatsInfo;
        }
        catch {
            playerHasStats = false;
        }
        // Derive referral accounts if referrer is provided
        let referralPda;
        let referrerStatsPda;
        let needsReferralInit = false;
        let referrerHasStats = false;
        if (referrer) {
            referrerStatsPda = this.accounts.playerStats(referrer, rootData.seasonId);
            try {
                const referrerStatsInfo = await this.provider.connection.getAccountInfo(referrerStatsPda);
                referrerHasStats = !!referrerStatsInfo;
            }
            catch {
                referrerHasStats = false;
            }
            if (referrerHasStats && playerHasStats) {
                referralPda = this.accounts.referral(playerPubkey);
                try {
                    const referralInfo = await this.provider.connection.getAccountInfo(referralPda);
                    const isValidReferral = referralInfo &&
                        referralInfo.owner.equals(this.program.programId) &&
                        referralInfo.data.length >= 81;
                    needsReferralInit = !isValidReferral;
                }
                catch {
                    needsReferralInit = true;
                }
                if (needsReferralInit) {
                    const referrerReferralPda = this.accounts.referral(referrer);
                    try {
                        const referrerReferralInfo = await this.provider.connection.getAccountInfo(referrerReferralPda);
                        if (referrerReferralInfo && referrerReferralInfo.data.length >= 72) {
                            const referrerOfReferrer = new web3_js_1.PublicKey(referrerReferralInfo.data.slice(40, 72));
                            if (referrerOfReferrer.equals(playerPubkey)) {
                                needsReferralInit = false;
                                referralPda = undefined;
                            }
                        }
                    }
                    catch {
                        // No circular dependency
                    }
                }
            }
        }
        // Check if round page exists
        let needsPageInit = false;
        try {
            await this.fetch.round(roundId, tierId);
        }
        catch {
            needsPageInit = true;
        }
        // Build pre-instructions
        const preInstructions = [];
        if (needsPageInit) {
            const initPageIx = await this.program.methods
                .initRoundPage(tierId, pageIndex)
                .accounts({
                payer: playerPubkey,
                rootAccount,
                roundPage: roundPagePda,
                systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            })
                .instruction();
            preInstructions.push(initPageIx);
        }
        if (!needsPageInit && playerHasStats) {
            preInstructions.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: player.publicKey,
                toPubkey: rootData.devWallet,
                lamports: 600000,
            }));
        }
        let addedInitReferral = false;
        if (referrer &&
            referrerHasStats &&
            needsReferralInit &&
            referralPda &&
            !needsPageInit) {
            const referrerReferralPda = this.accounts.referral(referrer);
            const referrerProfilePda = this.accounts.playerProfile(referrer);
            const initReferralIx = await this.program.methods
                .initReferral()
                .accounts({
                referral: referralPda,
                player: playerPubkey,
                referrer: referrer,
                referrerProfile: referrerProfilePda,
                referrerReferral: referrerReferralPda,
                systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            })
                .instruction();
            preInstructions.push(initReferralIx);
            addedInitReferral = true;
        }
        const includeReferralAccounts = referrerHasStats && referralPda && (!needsReferralInit || addedInitReferral);
        // Convert playerConfigHash to array if needed
        const configHashArray = Array.from(playerConfigHash);
        const accounts = {
            player: playerPubkey,
            rootAccount,
            roundPage: roundPagePda,
            roundPlayer: roundPlayerV2Pda,
            vault: vaultPda,
            devWallet: rootData.devWallet,
            lpVault,
            playerStats: playerStatsPda,
            joinAuthority: joinAuthority.publicKey,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            referral: includeReferralAccounts ? referralPda : null,
            referrerStats: includeReferralAccounts ? referrerStatsPda : null,
            referrerProfile: includeReferralAccounts ? this.accounts.playerProfile(referrer) : null,
            referralVault: includeReferralAccounts ? this.accounts.referralVault() : null,
        };
        const tx = await this.program.methods
            .joinRoundV2(tierId, new bn_js_1.default(roundId), pageIndex, tpPreset, configHashArray)
            .accounts(accounts)
            .preInstructions(preInstructions)
            .transaction();
        // Detect signing method
        const useWalletSigner = options.useWalletSigner ?? this.isWalletSigner(player);
        let signature;
        if (useWalletSigner && this.isWalletSigner(player)) {
            // For wallet signer, join authority must also sign
            tx.partialSign(joinAuthority);
            signature = await this.sendTransactionWithWallet(tx, player);
        }
        else if ('secretKey' in player) {
            signature = await this.sendTransaction(tx, [player, joinAuthority]);
        }
        else {
            throw new Error('Invalid player: must be either Keypair or WalletSigner');
        }
        return { signature };
    }
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
    async buildJoinRoundV2Transaction(options) {
        const { roundId, tierId, playerPubkey, joinAuthority, playerConfigHash, tpPreset = 0, referrer } = options;
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        const roundPlayerV2Pda = this.accounts.roundPlayerV2(tierId, roundId, playerPubkey);
        const vaultPda = this.accounts.vault(tierId, roundId);
        const lpVault = this.accounts.lpVault();
        // Fetch root to get dev wallet, season ID
        const rootData = await this.fetch.root();
        const playerStatsPda = this.accounts.playerStats(playerPubkey, rootData.seasonId);
        // Check if player has existing stats
        let playerHasStats = false;
        try {
            const playerStatsInfo = await this.provider.connection.getAccountInfo(playerStatsPda);
            playerHasStats = !!playerStatsInfo;
        }
        catch {
            playerHasStats = false;
        }
        // Derive referral accounts if referrer is provided
        let referralPda;
        let referrerStatsPda;
        let needsReferralInit = false;
        let referrerHasStats = false;
        if (referrer) {
            referrerStatsPda = this.accounts.playerStats(referrer, rootData.seasonId);
            try {
                const referrerStatsInfo = await this.provider.connection.getAccountInfo(referrerStatsPda);
                referrerHasStats = !!referrerStatsInfo;
            }
            catch {
                referrerHasStats = false;
            }
            // Also check if referrer has a PlayerProfile (required by initReferral)
            let referrerHasProfile = false;
            if (referrerHasStats) {
                const referrerProfilePda = this.accounts.playerProfile(referrer);
                try {
                    const profileInfo = await this.provider.connection.getAccountInfo(referrerProfilePda);
                    referrerHasProfile = !!profileInfo;
                }
                catch {
                    referrerHasProfile = false;
                }
            }
            if (referrerHasStats && referrerHasProfile && playerHasStats) {
                referralPda = this.accounts.referral(playerPubkey);
                try {
                    const referralInfo = await this.provider.connection.getAccountInfo(referralPda);
                    const isValidReferral = referralInfo &&
                        referralInfo.owner.equals(this.program.programId) &&
                        referralInfo.data.length >= 81;
                    needsReferralInit = !isValidReferral;
                }
                catch {
                    needsReferralInit = true;
                }
                // Check for circular referral
                if (needsReferralInit) {
                    const referrerReferralPda = this.accounts.referral(referrer);
                    try {
                        const referrerReferralInfo = await this.provider.connection.getAccountInfo(referrerReferralPda);
                        if (referrerReferralInfo && referrerReferralInfo.data.length >= 72) {
                            const referrerOfReferrer = new web3_js_1.PublicKey(referrerReferralInfo.data.slice(40, 72));
                            if (referrerOfReferrer.equals(playerPubkey)) {
                                needsReferralInit = false;
                                referralPda = undefined;
                            }
                        }
                    }
                    catch {
                        // No circular dependency
                    }
                }
            }
        }
        // Check if round page exists
        let needsPageInit = false;
        try {
            await this.fetch.round(roundId, tierId);
        }
        catch {
            needsPageInit = true;
        }
        // Build pre-instructions
        const preInstructions = [];
        if (needsPageInit) {
            const initPageIx = await this.program.methods
                .initRoundPage(tierId, pageIndex)
                .accounts({
                payer: playerPubkey,
                rootAccount,
                roundPage: roundPagePda,
                systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            })
                .instruction();
            preInstructions.push(initPageIx);
        }
        // Add dev fee transfer if not first player AND player has existing stats
        if (!needsPageInit && playerHasStats) {
            preInstructions.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: playerPubkey,
                toPubkey: rootData.devWallet,
                lamports: 600000,
            }));
        }
        // Add initReferral instruction if needed
        let addedInitReferral = false;
        if (referrer &&
            referrerHasStats &&
            needsReferralInit &&
            referralPda &&
            !needsPageInit) {
            const referrerReferralPda = this.accounts.referral(referrer);
            const referrerProfilePda = this.accounts.playerProfile(referrer);
            const initReferralIx = await this.program.methods
                .initReferral()
                .accounts({
                referral: referralPda,
                player: playerPubkey,
                referrer: referrer,
                referrerProfile: referrerProfilePda,
                referrerReferral: referrerReferralPda,
                systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            })
                .instruction();
            preInstructions.push(initReferralIx);
            addedInitReferral = true;
        }
        const includeReferralAccounts = referrerHasStats && referralPda && (!needsReferralInit || addedInitReferral);
        // Convert playerConfigHash to array if needed
        const configHashArray = Array.from(playerConfigHash);
        const accounts = {
            player: playerPubkey,
            rootAccount,
            roundPage: roundPagePda,
            roundPlayer: roundPlayerV2Pda,
            vault: vaultPda,
            devWallet: rootData.devWallet,
            lpVault,
            playerStats: playerStatsPda,
            joinAuthority: joinAuthority.publicKey,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            referral: includeReferralAccounts ? referralPda : null,
            referrerStats: includeReferralAccounts ? referrerStatsPda : null,
            referrerProfile: includeReferralAccounts ? this.accounts.playerProfile(referrer) : null,
            referralVault: includeReferralAccounts ? this.accounts.referralVault() : null,
        };
        const tx = await this.program.methods
            .joinRoundV2(tierId, new bn_js_1.default(roundId), pageIndex, tpPreset, configHashArray)
            .accounts(accounts)
            .preInstructions(preInstructions)
            .transaction();
        // Get fresh blockhash
        const { blockhash } = await this.provider.connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = playerPubkey;
        // NOTE: Do NOT sign here - wallet must sign first (Phantom Lighthouse requirement)
        // Backend will co-sign via /matrix/broadcast after wallet signs
        // Compute message hash for validation in /broadcast
        // serializeMessage() returns the message bytes (instructions, accounts, blockhash)
        // Signatures are stored separately, so hash is the same before and after signing
        const messageBytes = tx.serializeMessage();
        const nodeCrypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const messageHash = nodeCrypto.createHash('sha256').update(messageBytes).digest('hex');
        // Serialize transaction
        const serialized = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
        const txBase64 = serialized.toString('base64');
        // Blockhash valid for ~60 seconds on mainnet
        const expiresAt = Date.now() + 60000;
        return { txBase64, expiresAt, messageHash };
    }
    /**
     * Claim accumulated referral rewards
     * Transfers pending rewards from vault to referrer based on PlayerProfile.pendingReferralRewards
     * @param referrer - The referrer claiming their rewards (Keypair or WalletSigner)
     */
    async claimReferralRewards(referrer) {
        const referrerPubkey = referrer.publicKey;
        // Derive PDAs
        const playerProfilePda = this.accounts.playerProfile(referrerPubkey);
        const referralVaultPda = this.accounts.referralVault();
        const tx = await this.program.methods
            .claimReferralRewards()
            .accounts({
            playerProfile: playerProfilePda,
            referralVault: referralVaultPda,
            referrer: referrerPubkey,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        // Detect signing method: WalletSigner or Keypair
        const useWalletSigner = this.isWalletSigner(referrer);
        let signature;
        if (useWalletSigner) {
            signature = await this.sendTransactionWithWallet(tx, referrer);
        }
        else if ('secretKey' in referrer) {
            signature = await this.sendTransaction(tx, [referrer]);
        }
        else {
            throw new Error('Invalid referrer: must be either Keypair or WalletSigner');
        }
        return { signature };
    }
    /**
     * Initialize the referral vault PDA
     * Call this once after upgrading an existing deployment
     */
    async initReferralVault(authority) {
        const rootAccount = this.accounts.root();
        const referralVault = this.accounts.referralVault();
        const tx = await this.program.methods
            .initReferralVault()
            .accounts({
            rootAccount,
            referralVault,
            authority: authority.publicKey,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    async initReferral(player, referrer) {
        const playerPubkey = player.publicKey;
        // Cannot refer yourself
        if (playerPubkey.equals(referrer)) {
            throw new Error('Cannot refer yourself');
        }
        // Derive PDAs
        const referralPda = this.accounts.referral(playerPubkey);
        const referrerReferralPda = this.accounts.referral(referrer);
        const referrerProfilePda = this.accounts.playerProfile(referrer);
        // Check for circular referral: if referrer has a referral pointing to player, reject
        try {
            const referrerReferralInfo = await this.provider.connection.getAccountInfo(referrerReferralPda);
            if (referrerReferralInfo && referrerReferralInfo.data.length >= 72) {
                // Referral layout: 8-byte discriminator + 32-byte player + 32-byte referrer
                const referrerOfReferrer = new web3_js_1.PublicKey(referrerReferralInfo.data.slice(40, 72));
                if (referrerOfReferrer.equals(playerPubkey)) {
                    throw new Error('Circular referral not allowed - referrer is already referred by you');
                }
            }
        }
        catch (e) {
            // Re-throw if it's our circular referral error
            if (e instanceof Error && e.message.includes('Circular referral')) {
                throw e;
            }
            // Otherwise referrer has no referral account, no circular dependency
        }
        const tx = await this.program.methods
            .initReferral()
            .accounts({
            referral: referralPda,
            player: playerPubkey,
            referrer: referrer,
            referrerProfile: referrerProfilePda,
            referrerReferral: referrerReferralPda,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        // Detect signing method: WalletSigner or Keypair
        const useWalletSigner = this.isWalletSigner(player);
        let signature;
        if (useWalletSigner) {
            signature = await this.sendTransactionWithWallet(tx, player);
        }
        else if ('secretKey' in player) {
            signature = await this.sendTransaction(tx, [player]);
        }
        else {
            throw new Error('Invalid player: must be either Keypair or WalletSigner');
        }
        return { signature };
    }
    /**
     * Initialize a player profile account
     * Creates an empty profile that can receive referral rewards
     * @param player - The player initializing their profile (Keypair or WalletSigner)
     */
    async initPlayerProfile(player) {
        const playerPubkey = player.publicKey;
        const playerProfilePda = this.accounts.playerProfile(playerPubkey);
        const tx = await this.program.methods
            .initPlayerProfile()
            .accounts({
            playerProfile: playerProfilePda,
            player: playerPubkey,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        const useWalletSigner = this.isWalletSigner(player);
        let signature;
        if (useWalletSigner) {
            signature = await this.sendTransactionWithWallet(tx, player);
        }
        else if ('secretKey' in player) {
            signature = await this.sendTransaction(tx, [player]);
        }
        else {
            throw new Error('Invalid player: must be either Keypair or WalletSigner');
        }
        return { signature };
    }
    /**
     * Set a unique nickname for a player
     * Costs 0.2 SOL and nicknames are globally unique
     * Automatically frees up old nickname if player is changing their nickname
     * @param player - The player setting their nickname (Keypair or WalletSigner)
     * @param nickname - The desired nickname (3-20 alphanumeric chars or underscores)
     */
    async setNickname(player, nickname) {
        const playerPubkey = player.publicKey;
        // Validate nickname client-side
        if (nickname.length < 3 || nickname.length > 20) {
            throw new Error('Nickname must be between 3 and 20 characters');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
            throw new Error('Nickname can only contain alphanumeric characters and underscores');
        }
        // Derive PDAs
        const playerProfilePda = this.accounts.playerProfile(playerPubkey);
        const nicknamePda = this.accounts.nickname(nickname);
        // Fetch root to get dev wallet
        const rootData = await this.fetch.root();
        // Try to fetch player profile to get old nickname
        let oldNicknamePda;
        try {
            const profileData = await this.program.account.playerProfile.fetch(playerProfilePda);
            if (profileData.currentNickname && profileData.currentNickname !== nickname) {
                oldNicknamePda = this.accounts.nickname(profileData.currentNickname);
            }
        }
        catch (e) {
            // Profile doesn't exist yet, no old nickname to close
        }
        // Derive player stats PDA for current season
        const playerStatsPda = this.accounts.playerStats(playerPubkey, rootData.seasonId);
        const accounts = {
            rootAccount: this.accounts.root(),
            playerProfile: playerProfilePda,
            nicknameAccount: nicknamePda,
            oldNicknameAccount: oldNicknamePda || this.program.programId, // Use program ID if no old nickname
            player: playerPubkey,
            devWallet: rootData.devWallet,
            playerStats: playerStatsPda,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        };
        const tx = await this.program.methods.setNickname(nickname).accounts(accounts).transaction();
        // Detect signing method: WalletSigner or Keypair
        const useWalletSigner = this.isWalletSigner(player);
        let signature;
        if (useWalletSigner) {
            signature = await this.sendTransactionWithWallet(tx, player);
        }
        else if ('secretKey' in player) {
            signature = await this.sendTransaction(tx, [player]);
        }
        else {
            throw new Error('Invalid player: must be either Keypair or WalletSigner');
        }
        return { signature };
    }
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
    async settleRound(authority, roundId, tierId, seedProof) {
        // Build SeedVerificationArgs from SeedProof
        const verificationArgs = {
            chunkId: new bn_js_1.default(seedProof.chunk_id.toString()),
            merkleRoot: Array.from(seedProof.merkle_root),
            rootSignature: Array.from(seedProof.root_signature),
            seed: Array.from(seedProof.seed),
            proofSiblings: seedProof.proof_siblings.map((s) => Array.from(s)),
            proofPositions: seedProof.proof_positions,
        };
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const nextPageIndex = pageIndex + 1;
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        const vaultPda = this.accounts.vault(tierId, roundId);
        // Fetch data
        const rootData = await this.fetch.root();
        const preInstructions = [];
        const seasonPoolVault = this.accounts.seasonPoolVault(rootData.seasonId);
        const seasonSnapshot = this.accounts.seasonSnapshot(rootData.seasonId);
        const mintAuthority = this.accounts.mintAuthority();
        // Proactive page creation: init next page when we're 10 rounds from page end
        const LOOKAHEAD = 10;
        const pageEnd = (pageIndex + 1) * constants_1.PAGE_SIZE - 1; // Last round ID in current page
        const roundsUntilPageEnd = pageEnd - roundId;
        if (roundsUntilPageEnd <= LOOKAHEAD) {
            const nextPagePda = this.accounts.roundPage(tierId, nextPageIndex);
            const nextPageExists = await this.fetch.roundPageExists(tierId, nextPageIndex);
            if (!nextPageExists) {
                const initNextPageIx = await this.program.methods
                    .initRoundPage(tierId, nextPageIndex)
                    .accounts({
                    payer: authority.publicKey,
                    rootAccount,
                    roundPage: nextPagePda,
                    systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
                })
                    .instruction();
                preInstructions.push(initNextPageIx);
            }
        }
        // Add compute budget for ECDSA signature verification (expensive)
        const { ComputeBudgetProgram } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
        preInstructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));
        const [vaultAuthority] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vault_authority')], this.program.programId);
        const tx = await this.program.methods
            .settleRound(new bn_js_1.default(roundId), pageIndex, tierId, verificationArgs)
            .accounts({
            rootAccount,
            roundPage: roundPagePda,
            vault: vaultPda,
            devWallet: rootData.devWallet,
            authority: authority.publicKey,
            mintAuthority,
            vaultAuthority,
            seasonPoolVault,
            orbMint: rootData.orbMint,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            seasonSnapshot,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .preInstructions(preInstructions)
            .transaction();
        const txSignature = await this.sendTransaction(tx, [authority]);
        return { signature: txSignature };
    }
    /**
     * Emit ORB tokens after settlement (Phase 1.5)
     * Only called if genesis is done and round has emissions
     *
     * remaining_accounts convention:
     * - [0..2]: ORB token accounts for first 3 joiners (required)
     * - [3..5]: PlayerStats PDAs for first 3 joiners (optional)
     */
    async emitOrbs(authority, roundId, tierId) {
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        // Fetch data
        const rootData = await this.fetch.root();
        // Only emit if genesis is done
        if (!rootData.genesisDone) {
            throw new Error('Genesis not done - no emissions');
        }
        // Fetch round to check if already emitted
        const roundPage = await this.fetch.roundPage(tierId, pageIndex);
        const slot = accounts_1.AccountsModule.slotIndexFor(roundId);
        const round = roundPage.rounds[slot];
        // Check if round already emitted (did_emit flag)
        if (round.didEmit) {
            throw new Error(`Round ${roundId} already emitted`);
        }
        // Fetch roster for emission recipients
        const roster = await this.fetch.fetchRoundRoster(tierId, roundId);
        roster.sort((a, b) => {
            const joinDiff = a.joinTs.toNumber() - b.joinTs.toNumber();
            if (joinDiff !== 0)
                return joinDiff;
            const aKey = a.player.toBase58();
            const bKey = b.player.toBase58();
            return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
        });
        const emissionRecipients = roster.slice(0, 3);
        if (emissionRecipients.length < 3) {
            throw new Error('Not enough players for emissions');
        }
        // Build remaining accounts with new order for on-chain verification:
        // [0..2]: RoundPlayer PDAs (for verification)
        // [3..5]: ORB token accounts (for minting)
        // [6..8]: PlayerStats PDAs (optional, for tracking)
        const { createAssociatedTokenAccountIdempotentInstruction, getAccount } = await Promise.resolve().then(() => __importStar(require('@solana/spl-token')));
        const preInstructions = [];
        const remainingAccounts = [];
        // Add RoundPlayerV2 PDAs (indices 0-2) - for on-chain verification
        for (const rp of emissionRecipients) {
            const roundPlayerPda = this.accounts.roundPlayerV2(tierId, roundId, rp.player);
            remainingAccounts.push({
                pubkey: roundPlayerPda,
                isWritable: false,
                isSigner: false,
            });
        }
        // Add ORB token accounts (indices 3-5) - for minting
        for (const rp of emissionRecipients) {
            const ata = await accounts_1.AccountsModule.getAssociatedTokenAddress(rootData.orbMint, rp.player);
            // Create ATA if it doesn't exist
            try {
                await getAccount(this.provider.connection, ata);
            }
            catch {
                preInstructions.push(createAssociatedTokenAccountIdempotentInstruction(authority.publicKey, ata, rp.player, rootData.orbMint));
            }
            remainingAccounts.push({
                pubkey: ata,
                isWritable: true,
                isSigner: false,
            });
        }
        // Add PlayerStats PDAs (indices 6-8) - for tracking
        for (const rp of emissionRecipients) {
            const playerStatsPda = this.accounts.playerStats(rp.player, rootData.seasonId);
            remainingAccounts.push({
                pubkey: playerStatsPda,
                isWritable: true,
                isSigner: false,
            });
        }
        const seasonPoolVault = this.accounts.seasonPoolVault(rootData.seasonId);
        const seasonSnapshot = this.accounts.seasonSnapshot(rootData.seasonId);
        const mintAuthority = this.accounts.mintAuthority();
        const tx = await this.program.methods
            .emitOrbs(new bn_js_1.default(roundId), pageIndex, tierId)
            .accounts({
            rootAccount,
            roundPage: roundPagePda,
            seasonSnapshot,
            orbMint: rootData.orbMint,
            mintAuthority,
            seasonPoolVault,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            authority: authority.publicKey,
        })
            .remainingAccounts(remainingAccounts)
            .preInstructions(preInstructions)
            .transaction();
        const txSignature = await this.sendTransaction(tx, [authority]);
        return { signature: txSignature };
    }
    /**
     * Distribute payouts to winners (Phase 2)
     * Low-level method - can be called multiple times for batching
     *
     * remaining_accounts convention:
     * - Accounts come in pairs: [RoundPlayer, PlayerWallet] for each payout
     * - index 2*i     = RoundPlayer PDA
     * - index 2*i + 1 = Player's wallet (destination for payout)
     */
    async roundPayout(authority, roundId, tierId, payouts) {
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        const vaultPda = this.accounts.vault(tierId, roundId);
        const rootData = await this.fetch.root();
        // Build remaining accounts as [RoundPlayerV2, PlayerWallet] pairs
        const remainingAccounts = [];
        for (const payout of payouts) {
            // RoundPlayerV2 PDA
            remainingAccounts.push({
                pubkey: this.accounts.roundPlayerV2(tierId, roundId, payout.player),
                isWritable: true,
                isSigner: false,
            });
            // Player wallet
            remainingAccounts.push({
                pubkey: payout.player,
                isWritable: true,
                isSigner: false,
            });
        }
        const payoutData = (0, builders_1.createPayoutData)(payouts);
        const tx = await this.program.methods
            .roundPayout(new bn_js_1.default(roundId), pageIndex, tierId, payoutData)
            .accounts({
            rootAccount,
            roundPage: roundPagePda,
            vault: vaultPda,
            devWallet: rootData.devWallet,
            authority: authority.publicKey,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .remainingAccounts(remainingAccounts)
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    /**
     * Update player stats (Phase 3)
     * Low-level method - can be called multiple times for batching
     *
     * remaining_accounts convention:
     * - Accounts come in pairs: [RoundPlayerV2, PlayerStats] for each update
     * - index 2*i     = RoundPlayerV2 PDA
     * - index 2*i + 1 = PlayerStats PDA
     */
    async updatePlayerStats(authority, roundId, tierId, stats, seasonId) {
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        // Build remaining accounts as [RoundPlayerV2, PlayerStats] pairs
        const remainingAccounts = [];
        for (const stat of stats) {
            // RoundPlayerV2 PDA
            remainingAccounts.push({
                pubkey: this.accounts.roundPlayerV2(tierId, roundId, stat.player),
                isWritable: true,
                isSigner: false,
            });
            // PlayerStats PDA
            remainingAccounts.push({
                pubkey: this.accounts.playerStats(stat.player, seasonId),
                isWritable: true,
                isSigner: false,
            });
        }
        const statsData = (0, builders_1.createStatsData)(stats);
        const tx = await this.program.methods
            .updatePlayerStats(new bn_js_1.default(roundId), pageIndex, tierId, statsData)
            .accounts({
            rootAccount,
            roundPage: roundPagePda,
            authority: authority.publicKey,
        })
            .remainingAccounts(remainingAccounts)
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    /**
     * Close RoundPlayer accounts after settlement is complete (Phase 4)
     * Reclaims rent from RoundPlayer PDAs after both payout and stats are processed.
     * Rent is returned to dev_wallet.
     *
     * remaining_accounts convention:
     * - Each account is a RoundPlayer PDA to close
     */
    async closeRoundPlayers(authority, roundId, tierId, players) {
        // Compute page index for paged storage
        const pageIndex = accounts_1.AccountsModule.pageIndexFor(roundId);
        const rootAccount = this.accounts.root();
        const roundPagePda = this.accounts.roundPage(tierId, pageIndex);
        const rootData = await this.fetch.root();
        // Build remaining accounts - each is a RoundPlayerV2 PDA
        const remainingAccounts = players.map((player) => ({
            pubkey: this.accounts.roundPlayerV2(tierId, roundId, player),
            isWritable: true,
            isSigner: false,
        }));
        const tx = await this.program.methods
            .closeRoundPlayer(new bn_js_1.default(roundId), pageIndex, tierId)
            .accounts({
            rootAccount,
            roundPage: roundPagePda,
            authority: authority.publicKey,
            devWallet: rootData.devWallet,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .remainingAccounts(remainingAccounts)
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    /**
     * Complete settlement with all 3 phases (settle + payout + stats)
     * High-level method that orchestrates the entire settlement process
     */
    async settleRoundComplete(authority, roundId, tierId, options) {
        const signatures = [];
        const autoBatch = options.autoBatch ?? true;
        const batchSize = options.batchSize ?? this.config.defaultBatchSize;
        // Phase 1: Settle with seed
        const settleResult = await this.settleRound(authority, roundId, tierId, options.seedProof);
        signatures.push(settleResult.signature);
        // Get season ID for stats updates
        const rootData = await this.fetch.root();
        // Phase 1.5: Emit ORB tokens (if genesis done and round will emit)
        if (rootData.genesisDone) {
            try {
                const emitResult = await this.emitOrbs(authority, roundId, tierId);
                signatures.push(emitResult.signature);
            }
            catch (error) {
                // Emission might not trigger (probabilistic) or round might not have enough players
                // This is expected behavior, continue with settlement
            }
        }
        const seasonId = rootData.seasonId;
        // Phase 2: Distribute payouts (with batching if needed)
        if (autoBatch && options.payouts.length > batchSize) {
            const payoutBatches = (0, transaction_1.batchArray)(options.payouts, batchSize);
            for (let i = 0; i < payoutBatches.length; i++) {
                const batch = (0, builders_1.remapPayoutBatch)(options.payouts, i * batchSize, batchSize);
                const result = await this.roundPayout(authority, roundId, tierId, batch);
                signatures.push(result.signature);
            }
        }
        else {
            const result = await this.roundPayout(authority, roundId, tierId, options.payouts);
            signatures.push(result.signature);
        }
        // Phase 3: Update player stats (with batching if needed)
        if (autoBatch && options.stats.length > batchSize) {
            const statsBatches = (0, transaction_1.batchArray)(options.stats, batchSize);
            for (let i = 0; i < statsBatches.length; i++) {
                const batch = (0, builders_1.remapStatsBatch)(options.stats, i * batchSize, batchSize);
                const result = await this.updatePlayerStats(authority, roundId, tierId, batch, seasonId);
                signatures.push(result.signature);
            }
        }
        else {
            const result = await this.updatePlayerStats(authority, roundId, tierId, options.stats, seasonId);
            signatures.push(result.signature);
        }
        return { signatures };
    }
    // ============================================================================
    // Player Operations
    // ============================================================================
    /**
     * Get player stats for a specific season
     */
    async getPlayerStats(player, seasonId) {
        const actualSeasonId = seasonId ?? (await this.fetch.root()).seasonId;
        return this.fetch.playerStats(player, actualSeasonId);
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    /**
     * Get the next available round ID for a tier
     * Checks if lastSettledRoundId + 1 exists and is joinable
     * If not, finds the next available round ID
     */
    async getNextRoundId(tierId) {
        const rootData = await this.fetch.root();
        const tierState = rootData.tierStates.find((ts) => ts.tierId === tierId);
        if (!tierState) {
            throw new Error(`Tier ${tierId} not found`);
        }
        return tierState.lastSettledRoundId.toNumber() + 1;
    }
    // ============================================================================
    // Season Operations
    // ============================================================================
    /**
     * Check and trigger genesis if threshold is met
     * Genesis converts accumulated LP into initial ORB liquidity
     */
    async checkAndRunGenesis(authority) {
        const rootAccount = this.accounts.root();
        const programVault = this.accounts.programVault();
        const mintAuthority = this.accounts.mintAuthority();
        const vaultAuthority = this.accounts.vaultAuthority();
        const rootData = await this.fetch.root();
        // Get pool address from CLMM config (or use default if not set)
        const pool = rootData.clmmCfg?.pool || web3_js_1.PublicKey.default;
        const tx = await this.program.methods
            .checkAndRunGenesis()
            .accounts({
            rootAccount,
            orbMint: rootData.orbMint,
            programVault,
            mintAuthority,
            vaultAuthority,
            pool,
            authority: authority.publicKey,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return { signature };
    }
    /**
     * Claim season pool rewards based on player's point share
     * Available after season is finalized
     */
    async claimSeasonPool(player, seasonId) {
        const rootAccount = this.accounts.root();
        const rootData = await this.fetch.root();
        const playerStatsPda = this.accounts.playerStats(player.publicKey, seasonId);
        const seasonPoolVault = this.accounts.seasonPoolVault(seasonId);
        const seasonSnapshot = this.accounts.seasonSnapshot(seasonId);
        // Get player's ORB ATA
        const playerOrbAta = await accounts_1.AccountsModule.getAssociatedTokenAddress(rootData.orbMint, player.publicKey);
        const tx = await this.program.methods
            .claimSeasonPool(seasonId)
            .accounts({
            rootAccount,
            player: player.publicKey,
            playerStats: playerStatsPda,
            seasonPoolVault,
            seasonSnapshot,
            playerOrbAccount: playerOrbAta,
            devWallet: rootData.devWallet,
            orbMint: rootData.orbMint,
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        const signature = await this.sendTransaction(tx, [player]);
        return { signature };
    }
    /**
     * Convert Season 0 points to ORB tokens or claim season pool rewards
     * Season 0: Converts points to ORB using genesis conversion ratio
     * Season 1+: Claims proportional share of season prize pool
     * @param player - The player claiming rewards (Keypair or WalletSigner)
     * @param seasonId - Season ID to claim from (default: 0 for genesis)
     */
    async convertPoints(player, seasonId = 0) {
        const playerPubkey = player.publicKey;
        const rootAccount = this.accounts.root();
        const rootData = await this.fetch.root();
        const playerStatsPda = this.accounts.playerStats(playerPubkey, seasonId);
        // Get player's ORB ATA (will be created by program if needed)
        const playerOrbAta = await accounts_1.AccountsModule.getAssociatedTokenAddress(rootData.orbMint, playerPubkey);
        const tx = await this.program.methods
            .convertPoints(seasonId)
            .accounts({
            rootAccount,
            player: playerPubkey,
            playerStats: playerStatsPda,
            playerOrbAccount: playerOrbAta,
            devWallet: rootData.devWallet,
            orbMint: rootData.orbMint,
            mintAuthority: this.accounts.mintAuthority(),
            programVault: this.accounts.programVault(),
            seasonPoolVault: this.accounts.seasonPoolVault(seasonId),
            seasonSnapshot: this.accounts.seasonSnapshot(seasonId),
            vaultAuthority: this.accounts.vaultAuthority(),
            tokenProgram: constants_1.PROGRAM_ADDRESSES.TOKEN_PROGRAM,
            associatedTokenProgram: constants_1.PROGRAM_ADDRESSES.ASSOCIATED_TOKEN_PROGRAM,
            systemProgram: constants_1.PROGRAM_ADDRESSES.SYSTEM_PROGRAM,
        })
            .transaction();
        // Detect signing method: WalletSigner or Keypair
        const useWalletSigner = this.isWalletSigner(player);
        let signature;
        if (useWalletSigner) {
            signature = await this.sendTransactionWithWallet(tx, player);
        }
        else if ("secretKey" in player) {
            signature = await this.sendTransaction(tx, [player]);
        }
        else {
            throw new Error("Invalid player: must be either Keypair or WalletSigner");
        }
        return { signature };
    }
    // ============================================================================
    // CLMM & Liquidity Management Operations
    // ============================================================================
    /**
     * Open CLMM position - creates liquidity position via Raydium
     * This is called after genesis to deploy liquidity to the CLMM pool
     *
     * @param authority - The authority keypair for signing
     * @param params.clmmProgramId - Raydium CLMM program ID
     * @param params.poolId - CLMM pool address
     * @param params.raydium - Optional: Raydium SDK instance (will be created if not provided)
     */
    async openClmmPosition(authority, params) {
        const rootAccount = this.accounts.root();
        const programVault = this.accounts.programVault();
        const vaultAuthority = this.accounts.vaultAuthority();
        const lpVault = this.accounts.lpVault();
        const rootData = await this.fetch.root();
        // Import necessary Raydium utilities
        const { Raydium, TickUtils, TxVersion, getLiquidityFromAmounts } = await Promise.resolve().then(() => __importStar(require('@raydium-io/raydium-sdk-v2')));
        const { getOrCreateAssociatedTokenAccount, NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, } = await Promise.resolve().then(() => __importStar(require('@solana/spl-token')));
        const { ComputeBudgetProgram, SYSVAR_RENT_PUBKEY, SystemProgram } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
        const Decimal = (await Promise.resolve().then(() => __importStar(require('decimal.js')))).default;
        const BN = (await Promise.resolve().then(() => __importStar(require('bn.js')))).default;
        // Get or create Raydium instance
        const raydium = params.raydium || (await this.getRaydium(vaultAuthority));
        // Constants for position creation
        const tokenAmount = new BN(250000).mul(new BN(10).pow(new BN(9))); // 250k tokens
        const solAmount = new BN(25 * 1000000000); // 25 SOL
        const lowerPrice = 0.00007; // -30% from initial price
        const upperPrice = BigInt('10000000000000000000'); // Effectively unbounded
        // Get pool info from Raydium
        const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(params.poolId);
        if (!poolInfo)
            throw new Error('Pool not found');
        // Detect which mint is WSOL
        const base = poolKeys.mintA.address == NATIVE_MINT.toBase58() ? 'MintA' : 'MintB';
        const baseIn = base === 'MintA';
        // Calculate ticks for price range
        const { tick: lowerTick } = TickUtils.getPriceAndTick({
            poolInfo,
            price: new Decimal(lowerPrice),
            baseIn,
        });
        const { tick: upperTick } = TickUtils.getPriceAndTick({
            poolInfo,
            price: new Decimal(upperPrice),
            baseIn,
        });
        const epochInfo = await raydium.fetchEpochInfo();
        const liqRes = getLiquidityFromAmounts({
            poolInfo,
            tickLower: lowerTick,
            tickUpper: upperTick,
            amountA: solAmount,
            amountB: tokenAmount,
            slippage: 0,
            add: true,
            epochInfo,
            amountHasFee: false,
        });
        // Create associated token accounts
        const connection = this.provider.connection;
        const payer = authority; // Use authority as payer
        await getOrCreateAssociatedTokenAccount(connection, payer, rootData.orbMint, vaultAuthority, true);
        await getOrCreateAssociatedTokenAccount(connection, payer, NATIVE_MINT, vaultAuthority, true);
        // Initialize Raydium SDK with vault authority as owner
        const _raydium = await Raydium.load({
            owner: vaultAuthority,
            connection,
            cluster: 'mainnet',
            disableFeatureCheck: true,
            disableLoadToken: true,
        });
        // Build Raydium open position instruction
        const { extInfo, builder } = await _raydium.clmm.openPositionFromLiquidity({
            poolInfo,
            poolKeys,
            tickLower: lowerTick,
            tickUpper: upperTick,
            liquidity: liqRes.liquidity,
            amountMaxA: solAmount,
            amountMaxB: tokenAmount,
            checkCreateATAOwner: true,
            associatedOnly: true,
            ownerInfo: {
                useSOLBalance: false,
            },
            txVersion: TxVersion.V0,
            computeBudgetConfig: {
                units: 600000,
                microLamports: 100000,
            },
        });
        // Extract Raydium instruction
        const raydiumIx = builder.allInstructions.find((ix) => ix.programId.equals(params.clmmProgramId));
        if (!raydiumIx) {
            throw new Error('Raydium instruction not found');
        }
        const mintKey = builder.AllTxData.signers.find((s) => s.publicKey.equals(extInfo.address.nftMint));
        // Import metadata utilities
        const { getPdaMetadataKey } = await Promise.resolve().then(() => __importStar(require('@raydium-io/raydium-sdk-v2')));
        const METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        // Build account metas for remaining accounts
        const nftMint = extInfo.address.nftMint;
        const { publicKey: nftMeta } = getPdaMetadataKey(nftMint);
        const nftAta = extInfo.address.positionNftAccount;
        const vault0 = new web3_js_1.PublicKey(poolKeys.vault.A);
        const vault1 = new web3_js_1.PublicKey(poolKeys.vault.B);
        const metas = [
            { pubkey: vaultAuthority, isSigner: false, isWritable: true },
            { pubkey: vaultAuthority, isSigner: false, isWritable: false },
            { pubkey: nftMint, isSigner: true, isWritable: true },
            { pubkey: nftAta, isSigner: false, isWritable: true },
            { pubkey: nftMeta, isSigner: false, isWritable: true },
            { pubkey: new web3_js_1.PublicKey(poolKeys.id), isSigner: false, isWritable: true },
            {
                pubkey: extInfo.address.protocolPosition,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: extInfo.address.tickArrayLower,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: extInfo.address.tickArrayUpper,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: extInfo.address.personalPosition,
                isSigner: false,
                isWritable: true,
            },
            { pubkey: lpVault, isSigner: false, isWritable: true },
            { pubkey: programVault, isSigner: false, isWritable: true },
            { pubkey: vault0, isSigner: false, isWritable: true },
            { pubkey: vault1, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            {
                pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false,
            },
            { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
            { pubkey: rootData.orbMint, isSigner: false, isWritable: false },
        ];
        // Add TickArrayBitmapExtension if present in Raydium instruction (required for position creation)
        if (raydiumIx.keys[22] && raydiumIx.keys[22].pubkey) {
            metas.push({ ...raydiumIx.keys[22] });
        }
        // Validate all account metas have valid pubkeys
        for (let i = 0; i < metas.length; i++) {
            if (!metas[i].pubkey) {
                throw new Error(`Account meta at index ${i} has undefined pubkey`);
            }
        }
        // Execute the transaction
        const tx = await this.program.methods
            .openPosition(Buffer.from(raydiumIx.data))
            .accounts({
            rootAccount,
            orbMint: rootData.orbMint,
            programVault,
            vaultAuthority,
            lpVault,
            raydiumProgram: params.clmmProgramId,
            authority: authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(metas)
            .preInstructions([
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1200000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
        ])
            .transaction();
        const signature = await this.sendTransaction(tx, [authority, mintKey]);
        return { signature, nftMint: extInfo.address.nftMint };
    }
    /**
     * Increase CLMM liquidity - adds more liquidity to existing position
     *
     * @param authority - The authority keypair for signing
     * @param params.clmmProgramId - Raydium CLMM program ID
     * @param params.poolId - CLMM pool address
     * @param params.addSol - BN amount of SOL to add
     * @param params.raydium - Optional: Raydium SDK instance (will be created if not provided)
     */
    async increaseClmmLiquidity(authority, params) {
        const rootAccount = this.accounts.root();
        const orbLpVault = this.accounts.orbLpVault();
        const lpVault = this.accounts.lpVault();
        const vaultAuthority = this.accounts.vaultAuthority();
        const rootData = await this.fetch.root();
        if (!rootData.clmmCfg || rootData.clmmCfg.positionNft.equals(web3_js_1.PublicKey.default)) {
            throw new Error('No CLMM position found in root account');
        }
        // Import necessary utilities
        const { Raydium, getLiquidityFromAmounts, TxVersion } = await Promise.resolve().then(() => __importStar(require('@raydium-io/raydium-sdk-v2')));
        const { getAccount, TOKEN_PROGRAM_ID } = await Promise.resolve().then(() => __importStar(require('@solana/spl-token')));
        const { ComputeBudgetProgram, SystemProgram } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
        const BN = (await Promise.resolve().then(() => __importStar(require('bn.js')))).default;
        // Get or create Raydium instance
        const raydium = params.raydium || (await this.getRaydium(vaultAuthority));
        // Initialize Raydium SDK with vault authority for position operations
        const connection = this.provider.connection;
        const _raydium = await Raydium.load({
            owner: vaultAuthority,
            connection,
            cluster: 'mainnet',
            disableFeatureCheck: true,
            disableLoadToken: true,
        });
        const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(params.poolId);
        const epochInfo = await raydium.fetchEpochInfo();
        // Fetch the position info using the stored position NFT
        const positions = await _raydium.clmm.getOwnerPositionInfo({
            programId: params.clmmProgramId,
        });
        const position = positions.find((p) => p.nftMint.equals(rootData.clmmCfg.positionNft));
        if (!position) {
            throw new Error(`Position not found for NFT: ${rootData.clmmCfg.positionNft.toBase58()}`);
        }
        // Get ORB vault balance
        const amountB = await getAccount(connection, orbLpVault);
        const res = getLiquidityFromAmounts({
            poolInfo,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            amountA: params.addSol,
            amountB: new BN(amountB.amount.toString()),
            slippage: 0.1,
            add: true,
            epochInfo,
            amountHasFee: false,
        });
        const { builder } = await _raydium.clmm.increasePositionFromLiquidity({
            poolInfo,
            poolKeys,
            ownerPosition: position,
            ownerInfo: {
                useSOLBalance: false,
            },
            liquidity: res.liquidity,
            amountMaxA: res.amountA.amount,
            amountMaxB: res.amountB.amount,
            checkCreateATAOwner: false,
            txVersion: TxVersion.V0,
        });
        // Extract Raydium instruction
        const raydiumIx = builder.allInstructions.find((ix) => ix.programId.equals(params.clmmProgramId));
        if (!raydiumIx) {
            throw new Error('Raydium increase liquidity instruction not found');
        }
        // Build remaining accounts from Raydium instruction
        const metas = raydiumIx.keys.map((key) => ({
            pubkey: key.pubkey,
            isSigner: key.isSigner,
            isWritable: key.isWritable,
        }));
        // Fix account mappings for our PDA-based vaults
        metas[0].isSigner = false; // payer is PDA, not signer
        metas[7].pubkey = lpVault; // owner_token_account_A (WSOL)
        metas[7].isWritable = true;
        metas[8].pubkey = orbLpVault; // owner_token_account_B (ORB)
        metas[8].isWritable = true;
        // Execute transaction
        const tx = await this.program.methods
            .increaseLiquidity(Buffer.from(raydiumIx.data))
            .accounts({
            rootAccount,
            vaultAuthority,
            raydiumProgram: params.clmmProgramId,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(metas)
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return signature;
    }
    /**
     * Lock CLMM position NFT - transfers position NFT to lock program
     * Prevents unauthorized liquidity removal by locking the position
     */
    async lockClmmPosition(authority, params) {
        const rootAccount = this.accounts.root();
        const vaultAuthority = this.accounts.vaultAuthority();
        const rootData = await this.fetch.root();
        if (!rootData.clmmCfg || rootData.clmmCfg.positionNft.equals(web3_js_1.PublicKey.default)) {
            throw new Error('No CLMM position found in root account');
        }
        const { Raydium, TxVersion, getPdaPersonalPositionAddress, PositionInfoLayout } = await Promise.resolve().then(() => __importStar(require('@raydium-io/raydium-sdk-v2')));
        const { TOKEN_PROGRAM_ID } = await Promise.resolve().then(() => __importStar(require('@solana/spl-token')));
        const { ComputeBudgetProgram, SystemProgram } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
        // Initialize Raydium SDK with vault authority
        const connection = this.provider.connection;
        const _raydium = await Raydium.load({
            owner: vaultAuthority,
            connection,
            disableFeatureCheck: true,
            disableLoadToken: true,
        });
        // Get position info
        const positionPubKey = getPdaPersonalPositionAddress(params.clmmProgramId, rootData.clmmCfg.positionNft).publicKey;
        const pos = await connection.getAccountInfo(positionPubKey);
        const position = PositionInfoLayout.decode(pos.data);
        // Build Raydium lockPosition transaction
        const { builder, extInfo } = await _raydium.clmm.lockPosition({
            ownerPosition: position,
            txVersion: TxVersion.V0,
        });
        // Extract the Raydium Lock instruction
        const lockIx = builder.allInstructions.find((ix) => ix.programId.equals(params.lockProgramId));
        if (!lockIx) {
            throw new Error('Raydium lockPosition instruction not found in builder');
        }
        // Build remaining accounts from Raydium instruction
        const metas = lockIx.keys.map((k) => ({
            pubkey: k.pubkey,
            isSigner: k.isSigner,
            isWritable: k.isWritable,
        }));
        const mintKey = builder.AllTxData.signers.find((s) => s.publicKey.equals(extInfo.lockNftMint));
        // Fix account mappings for PDA-based ownership
        metas[1].pubkey = authority.publicKey; // payer
        metas[2].isSigner = false; // positionOwner (PDA, via invoke_signed)
        metas[3] = { ...metas[3], isSigner: false, pubkey: rootData.devWallet }; // lockOwner
        // Call our program with Raydium instruction data
        const tx = await this.program.methods
            .lockPosition(Buffer.from(lockIx.data))
            .accounts({
            rootAccount,
            vaultAuthority,
            raydiumLockProgram: params.lockProgramId,
            authority: authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(metas)
            .preInstructions([
            ComputeBudgetProgram.setComputeUnitLimit({ units: 600000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
        ])
            .transaction();
        const signature = await this.sendTransaction(tx, [authority, mintKey]);
        return signature;
    }
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
    async clmmBuyback(authority, params) {
        const rootAccount = this.accounts.root();
        const orbLpVault = this.accounts.orbLpVault();
        const lpVault = this.accounts.lpVault();
        const vaultAuthority = this.accounts.vaultAuthority();
        const rootData = await this.fetch.root();
        const { Raydium, PoolUtils, TxVersion } = await Promise.resolve().then(() => __importStar(require('@raydium-io/raydium-sdk-v2')));
        const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, NATIVE_MINT } = await Promise.resolve().then(() => __importStar(require('@solana/spl-token')));
        const { ComputeBudgetProgram, SystemProgram } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
        const MEMO_PROGRAM_ID = new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
        // Get or create Raydium instance
        const raydium = params.raydium || (await this.getRaydium(vaultAuthority));
        // Initialize Raydium with vault authority for swap operations
        const connection = this.provider.connection;
        const _raydium = await Raydium.load({
            owner: vaultAuthority,
            connection,
            cluster: 'mainnet',
            disableFeatureCheck: true,
            disableLoadToken: true,
        });
        const data = await raydium.clmm.getPoolInfoFromRpc(params.poolId);
        const poolInfo = data.poolInfo;
        const poolKeys = data.poolKeys;
        const clmmPoolInfo = data.computePoolInfo;
        const tickCache = data.tickData;
        if (!poolInfo)
            throw new Error('Pool not found');
        // Calculate minimum amount out with slippage
        const { minAmountOut, remainingAccounts } = await PoolUtils.computeAmountOutFormat({
            poolInfo: clmmPoolInfo,
            tickArrayCache: tickCache[params.poolId],
            amountIn: params.buybackAmount,
            tokenOut: poolInfo.mintB,
            slippage: 0.01,
            epochInfo: await raydium.fetchEpochInfo(),
        });
        // Build Raydium CLMM swap instruction
        const { builder } = await _raydium.clmm.swap({
            poolInfo,
            poolKeys,
            inputMint: NATIVE_MINT,
            amountIn: params.buybackAmount,
            amountOutMin: minAmountOut.amount.raw,
            observationId: clmmPoolInfo.observationId,
            ownerInfo: {
                useSOLBalance: false,
            },
            remainingAccounts,
            txVersion: TxVersion.V0,
        });
        const raydiumIx = builder.allInstructions.find((ix) => ix.programId.equals(params.clmmProgramId));
        if (!raydiumIx) {
            throw new Error('Raydium CLMM swap instruction not found');
        }
        // Build explicit metas for CPI into Raydium CLMM
        const vault0 = new web3_js_1.PublicKey(poolKeys.vault.A);
        const vault1 = new web3_js_1.PublicKey(poolKeys.vault.B);
        const ammConfigId = new web3_js_1.PublicKey(poolKeys.config.id);
        const metas = [
            { pubkey: vaultAuthority, isSigner: false, isWritable: false }, // 0: payer (PDA)
            { pubkey: ammConfigId, isSigner: false, isWritable: false }, // 1: amm_config
            {
                pubkey: new web3_js_1.PublicKey(params.poolId),
                isSigner: false,
                isWritable: true,
            }, // 2: pool_state
            { pubkey: lpVault, isSigner: false, isWritable: true }, // 3: user input ATA (WSOL)
            { pubkey: orbLpVault, isSigner: false, isWritable: true }, // 4: user output ATA (ORB)
            { pubkey: vault0, isSigner: false, isWritable: true }, // 5: vault A
            { pubkey: vault1, isSigner: false, isWritable: true }, // 6: vault B
            { pubkey: clmmPoolInfo.observationId, isSigner: false, isWritable: true }, // 7: observation
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 8
            { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, // 9
            { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false }, // 10
            { pubkey: NATIVE_MINT, isSigner: false, isWritable: false }, // 11: WSOL mint
            {
                pubkey: new web3_js_1.PublicKey(poolInfo.mintB.address),
                isSigner: false,
                isWritable: false,
            }, // 12: ORB mint
            // Append Raydium's remaining accounts
            ...remainingAccounts.map((a) => ({
                pubkey: a,
                isSigner: false,
                isWritable: true,
            })),
        ];
        const tx = await this.program.methods
            .buyback(Buffer.from(raydiumIx.data))
            .accounts({
            rootAccount,
            orbLpVault,
            lpVault,
            orbMint: rootData.orbMint,
            vaultAuthority,
            raydiumClmmProgram: params.clmmProgramId,
            authority: authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(metas)
            .preInstructions([
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1200000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
        ])
            .transaction();
        const signature = await this.sendTransaction(tx, [authority]);
        return signature;
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    /**
     * Calculate fees for an entry
     */
    calculateFees(entryLamports, takeProfitLamports = 0) {
        return this.fetch
            .root()
            .then((root) => (0, calculations_1.calculateFees)(entryLamports, root.devFeeBps, takeProfitLamports));
    }
    /**
     * Calculate points for placement and kills
     */
    calculatePoints(placement, kills, cap) {
        return (0, calculations_1.calculatePoints)(placement, kills, cap);
    }
    /**
     * Create settlement data from round results
     */
    createSettlement(params) {
        return (0, builders_1.createSettlementData)(params);
    }
    /**
     * Get emission recipients for a round (first 3 joiners by join_ts)
     * These are the players who will receive ORB emissions if an emission is triggered
     *
     * @param roundId - The round ID to get emission recipients for
     * @returns Array of up to 3 PublicKeys representing the emission recipients
     *
     * Fetches RoundPlayer PDAs and sorts by join_ts to determine first 3 joiners.
     */
    async getEmissionRecipients(tierId, roundId) {
        const roster = await this.fetch.fetchRoundRoster(tierId, roundId);
        roster.sort((a, b) => {
            const joinDiff = a.joinTs.toNumber() - b.joinTs.toNumber();
            if (joinDiff !== 0)
                return joinDiff;
            const aKey = a.player.toBase58();
            const bKey = b.player.toBase58();
            return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
        });
        return roster.slice(0, 3).map((rp) => rp.player);
    }
    /**
     * Get the full roster for a round
     * Returns all players who joined, sorted by join timestamp
     */
    async getRoundRoster(tierId, roundId) {
        const roster = await this.fetch.fetchRoundRoster(tierId, roundId);
        roster.sort((a, b) => {
            const joinDiff = a.joinTs.toNumber() - b.joinTs.toNumber();
            if (joinDiff !== 0)
                return joinDiff;
            const aKey = a.player.toBase58();
            const bKey = b.player.toBase58();
            return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
        });
        return roster.map((rp) => rp.player);
    }
    /**
     * Calculate emission probability and determine if emission will trigger for a round.
     * Uses the same deterministic logic as the Solana program.
     *
     * @param roundId - The round ID
     * @param seedHex - The 32-byte seed as hex string (with or without 0x prefix)
     * @returns Object with probability info and whether emission will trigger
     */
    async calculateEmissionProbability(roundId, seedHex) {
        const { sha256 } = await Promise.resolve().then(() => __importStar(require('@noble/hashes/sha256')));
        const rootData = await this.fetch.root();
        // Check preconditions
        if (!rootData.genesisDone) {
            return {
                willEmit: false,
                probabilityBps: 0,
                randomBps: 0,
                gap: 0,
                hazardCapRounds: rootData.hazardCapRounds.toNumber(),
                genesisDone: false,
                budgetRemaining: rootData.emissionBudgetCap.sub(rootData.emissionsTotalOrb),
            };
        }
        // Calculate gap since last emission
        const totalRounds = rootData.totalRoundsSinceGenesis.toNumber() + 1; // +1 for this round
        const lastEmissionRound = rootData.lastEmissionRound.toNumber();
        const gap = totalRounds - lastEmissionRound;
        const hazardCapRounds = rootData.hazardCapRounds.toNumber();
        const cappedGap = Math.min(gap, hazardCapRounds);
        // probability_bps = (capped_gap * 10000) / hazard_cap_rounds
        const probabilityBps = Math.floor((cappedGap * 10000) / hazardCapRounds);
        // Generate deterministic random value using SHA256
        // Must match Solana program exactly: round_id + seed + last_emission_round + epoch_index
        const seedBytes = Buffer.from(seedHex.startsWith('0x') ? seedHex.slice(2) : seedHex, 'hex');
        // Build hash input (all big-endian)
        const roundIdBytes = Buffer.alloc(8);
        roundIdBytes.writeBigUInt64BE(BigInt(roundId));
        const lastEmissionBytes = Buffer.alloc(8);
        lastEmissionBytes.writeBigUInt64BE(BigInt(lastEmissionRound));
        const epochIndexBytes = Buffer.alloc(4);
        epochIndexBytes.writeUInt32BE(rootData.epochIndex);
        const hashInput = Buffer.concat([roundIdBytes, seedBytes, lastEmissionBytes, epochIndexBytes]);
        const hash = sha256(hashInput);
        // Take first 8 bytes as u64 (big-endian)
        const randomU64 = Buffer.from(hash.slice(0, 8)).readBigUInt64BE();
        // Convert to basis points range [0, 10000)
        const randomBps = Number((randomU64 * 10000n) / BigInt('18446744073709551615'));
        // Check budget
        const budgetRemaining = rootData.emissionBudgetCap.sub(rootData.emissionsTotalOrb);
        const hasBudget = budgetRemaining.gt(new bn_js_1.default(0));
        // Emission triggers if random_bps < probability_bps AND has budget
        const willEmit = hasBudget && randomBps < probabilityBps;
        return {
            willEmit,
            probabilityBps,
            randomBps,
            gap,
            hazardCapRounds,
            genesisDone: true,
            budgetRemaining,
        };
    }
}
exports.OrbsGameSDK = OrbsGameSDK;
