/**
 * Custom error classes for the Orbs Game SDK
 */

export class OrbsGameError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "OrbsGameError";
    Object.setPrototypeOf(this, OrbsGameError.prototype);
  }
}

export class AccountNotFoundError extends OrbsGameError {
  constructor(
    public readonly accountType: string,
    public readonly accountKey?: string,
  ) {
    super(
      `Account not found: ${accountType}${accountKey ? ` (${accountKey})` : ""}`,
    );
    this.name = "AccountNotFoundError";
    Object.setPrototypeOf(this, AccountNotFoundError.prototype);
  }
}

export class TransactionError extends OrbsGameError {
  constructor(
    message: string,
    public readonly signature?: string,
    cause?: Error,
  ) {
    super(message, cause);
    this.name = "TransactionError";
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}

export class InvalidConfigError extends OrbsGameError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConfigError";
    Object.setPrototypeOf(this, InvalidConfigError.prototype);
  }
}

export class BatchError extends OrbsGameError {
  constructor(
    message: string,
    public readonly successfulBatches: number,
    public readonly failedBatch: number,
    cause?: Error,
  ) {
    super(message, cause);
    this.name = "BatchError";
    Object.setPrototypeOf(this, BatchError.prototype);
  }
}
