"use strict";
/**
 * Custom error classes for the Orbs Game SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchError = exports.InvalidConfigError = exports.TransactionError = exports.AccountNotFoundError = exports.OrbsGameError = void 0;
class OrbsGameError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "OrbsGameError";
        Object.setPrototypeOf(this, OrbsGameError.prototype);
    }
}
exports.OrbsGameError = OrbsGameError;
class AccountNotFoundError extends OrbsGameError {
    constructor(accountType, accountKey) {
        super(`Account not found: ${accountType}${accountKey ? ` (${accountKey})` : ""}`);
        this.accountType = accountType;
        this.accountKey = accountKey;
        this.name = "AccountNotFoundError";
        Object.setPrototypeOf(this, AccountNotFoundError.prototype);
    }
}
exports.AccountNotFoundError = AccountNotFoundError;
class TransactionError extends OrbsGameError {
    constructor(message, signature, cause) {
        super(message, cause);
        this.signature = signature;
        this.name = "TransactionError";
        Object.setPrototypeOf(this, TransactionError.prototype);
    }
}
exports.TransactionError = TransactionError;
class InvalidConfigError extends OrbsGameError {
    constructor(message) {
        super(message);
        this.name = "InvalidConfigError";
        Object.setPrototypeOf(this, InvalidConfigError.prototype);
    }
}
exports.InvalidConfigError = InvalidConfigError;
class BatchError extends OrbsGameError {
    constructor(message, successfulBatches, failedBatch, cause) {
        super(message, cause);
        this.successfulBatches = successfulBatches;
        this.failedBatch = failedBatch;
        this.name = "BatchError";
        Object.setPrototypeOf(this, BatchError.prototype);
    }
}
exports.BatchError = BatchError;
