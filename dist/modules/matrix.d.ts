/**
 * Matrix Worker API Module
 *
 * Provides methods for interacting with the matrix-worker service.
 * Used by frontend and bots for the v2 join flow.
 *
 * Auth Flow:
 * 1. Call challenge() with playerPubkey to get nonce
 * 2. Sign auth message with wallet
 * 3. Call verify() with signature to get session JWT
 * 4. Use session JWT for all subsequent matrix API calls
 */
export interface AuthChallengeRequest {
    playerPubkey: string;
}
export interface AuthChallengeResponse {
    nonce: string;
    expiresAtMs: number;
    domain: string;
}
export interface AuthVerifyRequest {
    playerPubkey: string;
    nonce: string;
    message: string;
    signatureBase58: string;
}
export interface AuthVerifyResponse {
    sessionJwt: string;
    expiresAtMs: number;
}
export interface MatrixStartRequest {
    roundId: string;
    tierId?: number;
    tpPreset?: number;
}
export interface SkillFlowConfig {
    gridSize: number;
    pointsTotal: number;
    huntMs: number;
    postRevealMs: number;
    allocationMs: number;
    maxPerSkill: number;
    skillCurve: {
        a: number;
        k: number;
    };
    revealTileMs: number;
    revealBufferMs: number;
    revealOrder: string;
    shuffleAfterPoints: number;
    shuffleSteps: number;
    shuffleStepMs: number;
    shufflePauseMs: number;
    maxClicks: number;
}
/**
 * A single matrix event stored on the server.
 */
export interface MatrixEvent {
    tServerMs: number;
    kind: 'click' | 'skip';
    displayIdx?: number;
}
/**
 * Snapshot of attempt state returned to client.
 */
export interface AttemptStateSnapshot {
    huntRemainingMs: number;
    remainingTimeMs: number;
    clicksUsed: number;
    clicksRemaining: number;
    events: MatrixEvent[];
    earnedSp: number;
    huntExpired: boolean;
    expired: boolean;
}
export interface MatrixStartResponse {
    playerSeed: string;
    config: SkillFlowConfig;
    state: AttemptStateSnapshot;
    tpPreset: number;
}
export interface TranscriptEvent {
    type: 'collect' | 'miss' | 'reveal' | 'shuffle';
    tMs: number;
    idx?: number;
    pts?: number;
}
export interface SpawnPosition {
    xNorm: number;
    yNorm: number;
    rotRad: number;
}
export interface MatrixSubmitRequest {
    roundId: string;
    transcript: TranscriptEvent[];
    earnedSp: number;
    allocation: {
        splitAggro: number;
        tetherRes: number;
        orbPower: number;
    };
    spawn: SpawnPosition;
    tpPreset: number;
    tierId?: number;
    referrer?: string;
}
export interface MatrixSubmitResponse {
    ok: true;
    joinTxBase64: string;
    verifierPubkey: string;
    expiresAt?: number;
}
export interface MatrixApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
}
export interface MatrixStateRequest {
    roundId: string;
}
export interface MatrixStateResponse {
    ok: true;
    remainingTimeMs: number;
    state: AttemptStateSnapshot;
}
export interface MatrixEventRequest {
    roundId: string;
    kind: 'click' | 'skip';
    displayIdx?: number;
}
export interface MatrixEventResponse {
    ok: true;
    remainingTimeMs: number;
    state: AttemptStateSnapshot;
}
export interface MatrixBroadcastRequest {
    signedTxBase64: string;
    roundId: string;
    tierId: number;
}
export interface MatrixBroadcastResponse {
    signature: string;
}
export declare class MatrixWorkerError extends Error {
    readonly statusCode: number;
    readonly details: string | string[];
    constructor(error: MatrixApiError);
}
export interface MatrixModuleConfig {
    baseUrl: string;
}
/**
 * Build the auth message string for wallet signing.
 * Format must match backend verification exactly.
 */
export declare function buildAuthMessage(domain: string, nonce: string, expiresAtMs: number, pubkey: string): string;
/**
 * Sign auth challenge with a Keypair (for bots/programmatic access).
 * Returns the signature and message for verify().
 *
 * @param secretKey - 64-byte secret key (Keypair.secretKey)
 * @param publicKeyBase58 - Base58-encoded public key
 * @param challenge - Challenge response from challenge()
 * @returns Message and base58-encoded signature for verify()
 */
export declare function signAuthChallenge(secretKey: Uint8Array, publicKeyBase58: string, challenge: AuthChallengeResponse): {
    message: string;
    signatureBase58: string;
};
/**
 * Generate a random spawn position inside the unit circle.
 * Uses a seed for deterministic results (e.g., botIndex + roundId).
 *
 * @param seed - Integer seed for PRNG
 * @returns Spawn position with xNorm, yNorm in [-1,1] and rotRad in [0, 2π)
 */
export declare function generateRandomSpawn(seed: number): SpawnPosition;
/**
 * Matrix Worker API Module
 *
 * Centralizes all matrix-worker API calls for use by frontend and bots.
 *
 * Usage:
 * 1. Create instance with baseUrl
 * 2. Call authenticate() after wallet connect to get session JWT
 * 3. Use session JWT for all matrix API calls
 */
export declare class MatrixModule {
    private readonly baseUrl;
    private sessionJwt;
    private sessionExpiresAtMs;
    constructor(config: MatrixModuleConfig);
    /**
     * Set session JWT (e.g., restored from localStorage).
     */
    setSession(jwt: string, expiresAtMs: number): void;
    /**
     * Get current session JWT if valid.
     */
    getSession(): {
        jwt: string;
        expiresAtMs: number;
    } | null;
    /**
     * Clear session (e.g., on wallet disconnect).
     */
    clearSession(): void;
    /**
     * Check if session is valid.
     */
    hasValidSession(): boolean;
    /**
     * Get Authorization header value.
     */
    private getAuthHeader;
    /**
     * Request auth challenge (nonce) for wallet signing.
     */
    challenge(request: AuthChallengeRequest): Promise<AuthChallengeResponse>;
    /**
     * Verify wallet signature and get session JWT.
     */
    verify(request: AuthVerifyRequest): Promise<AuthVerifyResponse>;
    /**
     * Authenticate with a Keypair (for bots/programmatic access).
     * Combines challenge + sign + verify into a single call.
     *
     * @param secretKey - 64-byte secret key (Keypair.secretKey)
     * @param publicKeyBase58 - Base58-encoded public key
     * @returns Session JWT and expiry
     */
    authenticateWithKeypair(secretKey: Uint8Array, publicKeyBase58: string): Promise<AuthVerifyResponse>;
    /**
     * Start a matrix session for a player.
     * Returns the deterministic player seed, game config, and JWT start token.
     * Requires session JWT.
     */
    startMatrix(request: MatrixStartRequest): Promise<MatrixStartResponse>;
    /**
     * Submit matrix results and get a partially signed join transaction.
     * The transaction must be signed by the player's wallet before broadcasting.
     * Requires session JWT.
     */
    submitMatrix(request: MatrixSubmitRequest): Promise<MatrixSubmitResponse>;
    /**
     * Get current attempt state for resume after page refresh.
     * Returns remaining time, clicks used, and events recorded so far.
     * Requires session JWT.
     */
    getState(request: MatrixStateRequest): Promise<MatrixStateResponse>;
    /**
     * Record a click event during the matrix game.
     * Called on each tile click to persist progress server-side.
     * Requires session JWT.
     */
    recordEvent(request: MatrixEventRequest): Promise<MatrixEventResponse>;
    /**
     * Broadcast a wallet-signed transaction.
     * Backend validates the tx hash, co-signs with joinAuthority, and broadcasts to Solana.
     * This is the final step after submitMatrix() - wallet signs first, then backend co-signs.
     * Requires session JWT.
     */
    broadcast(request: MatrixBroadcastRequest): Promise<MatrixBroadcastResponse>;
}
//# sourceMappingURL=matrix.d.ts.map