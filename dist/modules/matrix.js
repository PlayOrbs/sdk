"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixModule = exports.MatrixWorkerError = void 0;
exports.buildAuthMessage = buildAuthMessage;
exports.signAuthChallenge = signAuthChallenge;
exports.generateRandomSpawn = generateRandomSpawn;
class MatrixWorkerError extends Error {
    constructor(error) {
        const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
        super(message);
        this.name = 'MatrixWorkerError';
        this.statusCode = error.statusCode;
        this.details = error.message;
    }
}
exports.MatrixWorkerError = MatrixWorkerError;
/**
 * Build the auth message string for wallet signing.
 * Format must match backend verification exactly.
 */
function buildAuthMessage(domain, nonce, expiresAtMs, pubkey) {
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
function signAuthChallenge(secretKey, publicKeyBase58, challenge) {
    // Build the message
    const message = buildAuthMessage(challenge.domain, challenge.nonce, challenge.expiresAtMs, publicKeyBase58);
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
function generateRandomSpawn(seed) {
    // Simple seeded PRNG (mulberry32)
    const mulberry32 = (a) => {
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
    let x, y;
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
class MatrixModule {
    constructor(config) {
        this.sessionJwt = null;
        this.sessionExpiresAtMs = 0;
        this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    /**
     * Set session JWT (e.g., restored from localStorage).
     */
    setSession(jwt, expiresAtMs) {
        this.sessionJwt = jwt;
        this.sessionExpiresAtMs = expiresAtMs;
    }
    /**
     * Get current session JWT if valid.
     */
    getSession() {
        if (!this.sessionJwt || Date.now() >= this.sessionExpiresAtMs - 60000) {
            return null;
        }
        return { jwt: this.sessionJwt, expiresAtMs: this.sessionExpiresAtMs };
    }
    /**
     * Clear session (e.g., on wallet disconnect).
     */
    clearSession() {
        this.sessionJwt = null;
        this.sessionExpiresAtMs = 0;
    }
    /**
     * Check if session is valid.
     */
    hasValidSession() {
        return this.getSession() !== null;
    }
    /**
     * Get Authorization header value.
     */
    getAuthHeader() {
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
    async challenge(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        return response.json();
    }
    /**
     * Verify wallet signature and get session JWT.
     */
    async verify(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        const result = await response.json();
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
    async authenticateWithKeypair(secretKey, publicKeyBase58) {
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
    async startMatrix(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        return response.json();
    }
    /**
     * Submit matrix results and get a partially signed join transaction.
     * The transaction must be signed by the player's wallet before broadcasting.
     * Requires session JWT.
     */
    async submitMatrix(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        return response.json();
    }
    /**
     * Get current attempt state for resume after page refresh.
     * Returns remaining time, clicks used, and events recorded so far.
     * Requires session JWT.
     */
    async getState(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        return response.json();
    }
    /**
     * Record a click event during the matrix game.
     * Called on each tile click to persist progress server-side.
     * Requires session JWT.
     */
    async recordEvent(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        return response.json();
    }
    /**
     * Broadcast a wallet-signed transaction.
     * Backend validates the tx hash, co-signs with joinAuthority, and broadcasts to Solana.
     * This is the final step after submitMatrix() - wallet signs first, then backend co-signs.
     * Requires session JWT.
     */
    async broadcast(request) {
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
            }));
            throw new MatrixWorkerError(error);
        }
        return response.json();
    }
}
exports.MatrixModule = MatrixModule;
