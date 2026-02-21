/**
 * Transaction utilities for the Orbs Game SDK
 * Handles transaction confirmation, retries, and error handling
 */
import { Connection, Transaction, VersionedTransaction, Signer, Commitment } from "@solana/web3.js";
import type { WalletSigner } from "../types";
/**
 * Send a transaction with automatic retries on blockhash expiry
 * Matches the pattern from tests/helpers/raydium-pool.ts:sendWithFreshBlockhash
 */
export declare function sendWithRetry(connection: Connection, transaction: Transaction | VersionedTransaction, signers: Signer[], options?: {
    maxRetries?: number;
    commitment?: Commitment;
    skipPreflight?: boolean;
}): Promise<{
    signature: string;
    slot: number;
}>;
/**
 * Simple sleep utility
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Wait for a condition to be true
 * Matches the pattern from tests/helpers/test-utils.ts:waitFor
 */
export declare function waitFor<T>(condition: () => Promise<T | false>, options?: {
    maxAttempts?: number;
    delayMs?: number;
    timeoutMs?: number;
}): Promise<T>;
/**
 * Batch an array into chunks
 */
export declare function batchArray<T>(array: T[], batchSize: number): T[][];
/**
 * Send a transaction with fresh blockhash and retry on blockhash errors
 * This is the same pattern as used in test-utils.ts
 * Provides better error handling with detailed transaction logs
 */
export declare function sendWithFreshBlockhash(connection: Connection, tx: Transaction, signers: Signer[], maxRetries?: number): Promise<string>;
/**
 * Send a transaction using a wallet provider for signing
 * Compatible with Solana wallet adapters (Phantom, Solflare, etc.)
 */
export declare function sendWithWalletSigner(connection: Connection, tx: Transaction, wallet: WalletSigner, maxRetries?: number): Promise<string>;
//# sourceMappingURL=transaction.d.ts.map