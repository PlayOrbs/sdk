/**
 * Custom error classes for the Orbs Game SDK
 */
export declare class OrbsGameError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class AccountNotFoundError extends OrbsGameError {
    readonly accountType: string;
    readonly accountKey?: string | undefined;
    constructor(accountType: string, accountKey?: string | undefined);
}
export declare class TransactionError extends OrbsGameError {
    readonly signature?: string | undefined;
    constructor(message: string, signature?: string | undefined, cause?: Error);
}
export declare class InvalidConfigError extends OrbsGameError {
    constructor(message: string);
}
export declare class BatchError extends OrbsGameError {
    readonly successfulBatches: number;
    readonly failedBatch: number;
    constructor(message: string, successfulBatches: number, failedBatch: number, cause?: Error);
}
//# sourceMappingURL=errors.d.ts.map