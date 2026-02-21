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

// ============================================================================
// Auth Types
// ============================================================================

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

// ============================================================================
// Matrix Types
// ============================================================================

export interface MatrixStartRequest {
  roundId: string;
  tierId?: number;
  tpPreset?: number; // 0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo
}

export interface SkillFlowConfig {
  gridSize: number;
  pointsTotal: number;
  huntMs: number;
  postRevealMs: number;
  allocationMs: number;
  maxPerSkill: number;
  skillCurve: { a: number; k: number };
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
  huntRemainingMs: number; // Time remaining in hunt phase (0 if hunt expired)
  remainingTimeMs: number; // Time remaining before JWT expires
  clicksUsed: number;
  clicksRemaining: number;
  events: MatrixEvent[];
  earnedSp: number; // Server-validated earned skill points
  huntExpired: boolean; // True if hunt phase is over
  expired: boolean; // True if entire attempt is expired
}

export interface MatrixStartResponse {
  playerSeed: string;
  config: SkillFlowConfig;
  state: AttemptStateSnapshot;
  tpPreset: number; // Take Profit preset stored in attempt
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

export class MatrixWorkerError extends Error {
  public readonly statusCode: number;
  public readonly details: string | string[];

  constructor(error: MatrixApiError) {
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    super(message);
    this.name = 'MatrixWorkerError';
    this.statusCode = error.statusCode;
    this.details = error.message;
  }
}

export interface MatrixModuleConfig {
  baseUrl: string;
}

/**
 * Build the auth message string for wallet signing.
 * Format must match backend verification exactly.
 */
export function buildAuthMessage(
  domain: string,
  nonce: string,
  expiresAtMs: number,
  pubkey: string,
): string {
  return [
    'PlayOrbs Authentication',
    '',
    `domain=${domain}`,
    `nonce=${nonce}`,
    `exp=${expiresAtMs}`,
    `pubkey=${pubkey}`,
  ].join('\n');
}

/**
 * Sign auth challenge with a Keypair (for bots/programmatic access).
 * Returns the signature and message for verify().
 * 
 * @param secretKey - 64-byte secret key (Keypair.secretKey)
 * @param publicKeyBase58 - Base58-encoded public key
 * @param challenge - Challenge response from challenge()
 * @returns Message and base58-encoded signature for verify()
 */
export function signAuthChallenge(
  secretKey: Uint8Array,
  publicKeyBase58: string,
  challenge: AuthChallengeResponse,
): { message: string; signatureBase58: string } {
  // Build the message
  const message = buildAuthMessage(
    challenge.domain,
    challenge.nonce,
    challenge.expiresAtMs,
    publicKeyBase58,
  );
  
  // Sign with nacl
  const messageBytes = new TextEncoder().encode(message);
  
  // Import nacl dynamically to avoid bundling issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nacl = require('tweetnacl');
  const bs58 = require('bs58');
  
  const signature = nacl.sign.detached(messageBytes, secretKey);
  const signatureBase58 = typeof bs58.encode === 'function' 
    ? bs58.encode(signature) 
    : bs58.default.encode(signature);
  
  return { message, signatureBase58 };
}

/**
 * Generate a random spawn position inside the unit circle.
 * Uses a seed for deterministic results (e.g., botIndex + roundId).
 * 
 * @param seed - Integer seed for PRNG
 * @returns Spawn position with xNorm, yNorm in [-1,1] and rotRad in [0, 2π)
 */
export function generateRandomSpawn(seed: number): SpawnPosition {
  // Simple seeded PRNG (mulberry32)
  const mulberry32 = (a: number) => {
    return () => {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  
  const rng = mulberry32(seed);
  
  // Generate point inside unit circle using rejection sampling
  // Stay inside 0.9 radius for safety margin from arena edge
  let x: number, y: number;
  do {
    x = rng() * 2 - 1; // [-1, 1]
    y = rng() * 2 - 1; // [-1, 1]
  } while (x * x + y * y > 0.81); // 0.9^2 = 0.81
  
  const rotRad = rng() * 2 * Math.PI; // [0, 2π)
  
  return { xNorm: x, yNorm: y, rotRad };
}

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
export class MatrixModule {
  private readonly baseUrl: string;
  private sessionJwt: string | null = null;
  private sessionExpiresAtMs: number = 0;

  constructor(config: MatrixModuleConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Set session JWT (e.g., restored from localStorage).
   */
  setSession(jwt: string, expiresAtMs: number): void {
    this.sessionJwt = jwt;
    this.sessionExpiresAtMs = expiresAtMs;
  }

  /**
   * Get current session JWT if valid.
   */
  getSession(): { jwt: string; expiresAtMs: number } | null {
    if (!this.sessionJwt || Date.now() >= this.sessionExpiresAtMs - 60000) {
      return null;
    }
    return { jwt: this.sessionJwt, expiresAtMs: this.sessionExpiresAtMs };
  }

  /**
   * Clear session (e.g., on wallet disconnect).
   */
  clearSession(): void {
    this.sessionJwt = null;
    this.sessionExpiresAtMs = 0;
  }

  /**
   * Check if session is valid.
   */
  hasValidSession(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Get Authorization header value.
   */
  private getAuthHeader(): string {
    if (!this.sessionJwt) {
      throw new MatrixWorkerError({
        statusCode: 401,
        message: 'No session JWT. Call authenticate() first.',
      });
    }
    return `Bearer ${this.sessionJwt}`;
  }

  // ============================================================================
  // Auth Endpoints
  // ============================================================================

  /**
   * Request auth challenge (nonce) for wallet signing.
   */
  async challenge(request: AuthChallengeRequest): Promise<AuthChallengeResponse> {
    const response = await fetch(`${this.baseUrl}/auth/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    return response.json() as Promise<AuthChallengeResponse>;
  }

  /**
   * Verify wallet signature and get session JWT.
   */
  async verify(request: AuthVerifyRequest): Promise<AuthVerifyResponse> {
    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    const result = await response.json() as AuthVerifyResponse;

    // Store session
    this.sessionJwt = result.sessionJwt;
    this.sessionExpiresAtMs = result.expiresAtMs;

    return result;
  }

  /**
   * Authenticate with a Keypair (for bots/programmatic access).
   * Combines challenge + sign + verify into a single call.
   * 
   * @param secretKey - 64-byte secret key (Keypair.secretKey)
   * @param publicKeyBase58 - Base58-encoded public key
   * @returns Session JWT and expiry
   */
  async authenticateWithKeypair(
    secretKey: Uint8Array,
    publicKeyBase58: string,
  ): Promise<AuthVerifyResponse> {
    // 1. Get challenge
    const challenge = await this.challenge({ playerPubkey: publicKeyBase58 });
    
    // 2. Sign it
    const { message, signatureBase58 } = signAuthChallenge(secretKey, publicKeyBase58, challenge);
    
    // 3. Verify and get JWT
    return this.verify({
      playerPubkey: publicKeyBase58,
      nonce: challenge.nonce,
      message,
      signatureBase58,
    });
  }

  // ============================================================================
  // Matrix Endpoints (require session JWT)
  // ============================================================================

  /**
   * Start a matrix session for a player.
   * Returns the deterministic player seed, game config, and JWT start token.
   * Requires session JWT.
   */
  async startMatrix(request: MatrixStartRequest): Promise<MatrixStartResponse> {
    const response = await fetch(`${this.baseUrl}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    return response.json() as Promise<MatrixStartResponse>;
  }

  /**
   * Submit matrix results and get a partially signed join transaction.
   * The transaction must be signed by the player's wallet before broadcasting.
   * Requires session JWT.
   */
  async submitMatrix(request: MatrixSubmitRequest): Promise<MatrixSubmitResponse> {
    const response = await fetch(`${this.baseUrl}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    return response.json() as Promise<MatrixSubmitResponse>;
  }

  /**
   * Get current attempt state for resume after page refresh.
   * Returns remaining time, clicks used, and events recorded so far.
   * Requires session JWT.
   */
  async getState(request: MatrixStateRequest): Promise<MatrixStateResponse> {
    const response = await fetch(`${this.baseUrl}/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    return response.json() as Promise<MatrixStateResponse>;
  }

  /**
   * Record a click event during the matrix game.
   * Called on each tile click to persist progress server-side.
   * Requires session JWT.
   */
  async recordEvent(request: MatrixEventRequest): Promise<MatrixEventResponse> {
    const response = await fetch(`${this.baseUrl}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    return response.json() as Promise<MatrixEventResponse>;
  }

  /**
   * Broadcast a wallet-signed transaction.
   * Backend validates the tx hash, co-signs with joinAuthority, and broadcasts to Solana.
   * This is the final step after submitMatrix() - wallet signs first, then backend co-signs.
   * Requires session JWT.
   */
  async broadcast(request: MatrixBroadcastRequest): Promise<MatrixBroadcastResponse> {
    const response = await fetch(`${this.baseUrl}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      })) as MatrixApiError;
      throw new MatrixWorkerError(error);
    }

    return response.json() as Promise<MatrixBroadcastResponse>;
  }
}
