"use strict";
/**
 * Transaction utilities for the Orbs Game SDK
 * Handles transaction confirmation, retries, and error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWithRetry = sendWithRetry;
exports.sleep = sleep;
exports.waitFor = waitFor;
exports.batchArray = batchArray;
exports.sendWithFreshBlockhash = sendWithFreshBlockhash;
exports.sendWithWalletSigner = sendWithWalletSigner;
const web3_js_1 = require("@solana/web3.js");
const errors_1 = require("../types/errors");
/**
 * Send a transaction with automatic retries on blockhash expiry
 * Matches the pattern from tests/helpers/raydium-pool.ts:sendWithFreshBlockhash
 */
async function sendWithRetry(connection, transaction, signers, options) {
    const maxRetries = options?.maxRetries ?? 3;
    const commitment = options?.commitment ?? "confirmed";
    const skipPreflight = options?.skipPreflight ?? false;
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Get fresh blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
            // Set blockhash on transaction
            if (transaction instanceof web3_js_1.Transaction) {
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = signers[0].publicKey;
            }
            else {
                // For VersionedTransaction, we need to recreate with new blockhash
                // This is handled by the caller in most cases
            }
            // Sign transaction
            if (transaction instanceof web3_js_1.Transaction) {
                transaction.sign(...signers);
            }
            // Send transaction
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight,
                maxRetries: 0, // We handle retries ourselves
            });
            // Confirm transaction
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, commitment);
            if (confirmation.value.err) {
                throw new errors_1.TransactionError(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`, signature);
            }
            // Get slot from confirmation
            const slot = confirmation.context.slot;
            return { signature, slot };
        }
        catch (error) {
            lastError = error;
            // Check if it's a blockhash expiry error or should retry
            const errorMessage = error instanceof Error ? error.message : String(error);
            const shouldRetry = errorMessage.includes("blockhash") ||
                errorMessage.includes("block height exceeded") ||
                errorMessage.includes("BlockhashNotFound");
            if (!shouldRetry || attempt === maxRetries - 1) {
                throw new errors_1.TransactionError(`Transaction failed after ${attempt + 1} attempt(s): ${errorMessage}`, undefined, lastError);
            }
            // Wait a bit before retrying
            await sleep(500 * (attempt + 1));
        }
    }
    throw new errors_1.TransactionError(`Transaction failed after ${maxRetries} retries`, undefined, lastError);
}
/**
 * Simple sleep utility
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Wait for a condition to be true
 * Matches the pattern from tests/helpers/test-utils.ts:waitFor
 */
async function waitFor(condition, options) {
    const maxAttempts = options?.maxAttempts ?? 50;
    const delayMs = options?.delayMs ?? 100;
    const timeoutMs = options?.timeoutMs;
    const startTime = Date.now();
    for (let i = 0; i < maxAttempts; i++) {
        const result = await condition();
        if (result !== false) {
            return result;
        }
        if (timeoutMs && Date.now() - startTime > timeoutMs) {
            throw new Error(`Condition not met within ${timeoutMs}ms (${i + 1} attempts)`);
        }
        await sleep(delayMs);
    }
    throw new Error(`Condition not met after ${maxAttempts} attempts`);
}
/**
 * Batch an array into chunks
 */
function batchArray(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
}
/**
 * Send a transaction with fresh blockhash and retry on blockhash errors
 * This is the same pattern as used in test-utils.ts
 * Provides better error handling with detailed transaction logs
 */
async function sendWithFreshBlockhash(connection, tx, signers, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        // Set feePayer to the first signer if not already set
        if (!tx.feePayer && signers.length > 0) {
            tx.feePayer = signers[0].publicKey;
        }
        tx.sign(...signers);
        try {
            const sig = await connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                maxRetries: 5,
            });
            await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
            return sig;
        }
        catch (e) {
            if (e instanceof web3_js_1.SendTransactionError &&
                e.message.includes("Blockhash not found")) {
                // stale blockhash, try again with a new one
                continue;
            }
            // Output full transaction logs for debugging
            if (e instanceof web3_js_1.SendTransactionError) {
                console.error("=== FULL TRANSACTION LOGS ===");
                try {
                    const logs = await e.getLogs(connection);
                    if (logs && logs.length > 0) {
                        logs.forEach((log, index) => {
                            console.error(`[${index}] ${log}`);
                        });
                    }
                    else {
                        console.error("No logs available");
                    }
                }
                catch (logError) {
                    console.error("Failed to get logs:", logError);
                }
                console.error("=== END TRANSACTION LOGS ===");
            }
            throw e;
        }
    }
    throw new Error("Failed to send tx after blockhash retries");
}
/**
 * Confirm transaction with timeout and polling fallback.
 * WebSocket-based confirmation can hang with some RPC proxies.
 */
async function confirmTransactionWithTimeout(connection, signature, blockhash, lastValidBlockHeight, timeoutMs = 30000) {
    console.log(`[confirmTx] Starting confirmation for ${signature.slice(0, 8)}...`);
    // Use polling-only approach - more reliable across different RPC setups
    const startTime = Date.now();
    let lastStatus = null;
    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await connection.getSignatureStatus(signature);
            const status = response?.value;
            if (status) {
                const currentStatus = status.confirmationStatus || 'unknown';
                if (currentStatus !== lastStatus) {
                    console.log(`[confirmTx] Status: ${currentStatus}`);
                    lastStatus = currentStatus;
                }
                if (status.confirmationStatus === "confirmed" ||
                    status.confirmationStatus === "finalized") {
                    console.log(`[confirmTx] Confirmed in ${Date.now() - startTime}ms`);
                    return;
                }
                if (status.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
                }
            }
        }
        catch (e) {
            // Only log non-network errors
            if (!e.message?.includes('fetch')) {
                console.warn(`[confirmTx] Poll error:`, e.message);
            }
        }
        await sleep(1500); // Poll every 1.5 seconds
    }
    throw new Error(`Transaction confirmation timeout after ${timeoutMs}ms`);
}
/**
 * Send a transaction using a wallet provider for signing
 * Compatible with Solana wallet adapters (Phantom, Solflare, etc.)
 */
async function sendWithWalletSigner(connection, tx, wallet, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = wallet.publicKey;
        try {
            // Sign transaction using wallet provider
            const signedTx = await wallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                maxRetries: 5,
            });
            // Use timeout-based confirmation to avoid hanging on RPC proxies
            await confirmTransactionWithTimeout(connection, sig, blockhash, lastValidBlockHeight, 30000 // 30 second timeout
            );
            return sig;
        }
        catch (e) {
            if (e instanceof web3_js_1.SendTransactionError &&
                e.message.includes("Blockhash not found")) {
                // stale blockhash, try again with a new one
                continue;
            }
            // Output full transaction logs for debugging
            if (e instanceof web3_js_1.SendTransactionError) {
                console.error("=== FULL TRANSACTION LOGS ===");
                try {
                    const logs = await e.getLogs(connection);
                    if (logs && logs.length > 0) {
                        logs.forEach((log, index) => {
                            console.error(`[${index}] ${log}`);
                        });
                    }
                    else {
                        console.error("No logs available");
                    }
                }
                catch (logError) {
                    console.error("Failed to get logs:", logError);
                }
                console.error("=== END TRANSACTION LOGS ===");
            }
            throw e;
        }
    }
    throw new Error("Failed to send tx after blockhash retries");
}
