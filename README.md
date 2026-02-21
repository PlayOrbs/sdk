# Orbs Game SDK

TypeScript SDK for interacting with the Orbs Game Solana program.

## Installation

```bash
npm install @orbs-game/sdk
```

## Quick Start

```typescript
import { OrbsGameSDK } from "@orbs-game/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

// Initialize SDK
const provider = AnchorProvider.env();
const sdk = new OrbsGameSDK({ provider });

// Join a round
await sdk.joinRound({
  roundId: 1,
  tierId: 0,
  player: playerKeypair,
});

// Fetch player stats
const stats = await sdk.getPlayerStats(playerKeypair.publicKey);
console.log(`Total points: ${stats.totalPoints}`);
```

## Core Features

### ICP Integration (Seed Generation)

The SDK includes an ICP module for generating and retrieving cryptographically secure seeds:

```typescript
import { ICPModule } from "@orbs-game/sdk";

// Initialize ICP module
const icp = new ICPModule({
  canisterId: "your-canister-id",
  host: "https://ic0.app",
});

// Generate seed (admin only)
const [seedHex, signatureHex] = await icp.generateRoundSeed(roundId);

// Retrieve seed
const data = await icp.getRoundSeedWithSignature(roundId);
console.log("Seed:", data.seed);
console.log("Signature:", data.signature);
```

See [ICP_INTEGRATION.md](./ICP_INTEGRATION.md) for detailed documentation.

### Account Management

The SDK automatically handles PDA derivation and caching:

```typescript
// Get account addresses
const rootAccount = sdk.accounts.root();
const roundPda = sdk.accounts.round(roundId);
const vaultPda = sdk.accounts.vault(roundId);
const playerStats = sdk.accounts.playerStats(player, seasonId);

// Fetch account data
const rootData = await sdk.fetch.root();
const roundData = await sdk.fetch.round(roundId);
const statsData = await sdk.fetch.playerStats(player, seasonId);
```

### Admin Operations

```typescript
// Initialize root account (one-time setup)
await sdk.initializeRoot({
  authority: authorityKeypair,
  devWallet: devWalletPubkey,
  orbMint: orbMintPubkey,
  devFeeBps: 500, // 5%
  tierConfigs: [
    {
      tierId: 0,
      entryLamports: new BN(0.1 * LAMPORTS_PER_SOL),
      minPlayers: 3,
      maxPlayers: 100,
      countdownSecs: 30,
      takeProfit: new BN(0),
      pointsMultiplier: 100,
    },
  ],
});

// Set season configuration
await sdk.setSeasonTemplate(authorityKeypair, 60000);
await sdk.setSeasonRounds(authorityKeypair, 60000);
```

### Round Operations

#### High-Level API (Recommended)

```typescript
// Complete settlement in one call (auto-batching)
const result = await sdk.settleRoundComplete(authorityKeypair, roundId, {
  seedHex: [...], // 32-byte seed
  payouts: [
    { player: winner1, accountIndex: 0, payout: new BN(1000000) },
    { player: winner2, accountIndex: 1, payout: new BN(500000) },
  ],
  stats: [
    { player: winner1, accountIndex: 0, prize: new BN(1000000), placement: 1, kills: 5 },
    { player: winner2, accountIndex: 1, prize: new BN(500000), placement: 2, kills: 3 },
  ],
  autoBatch: true, // Automatically batch large operations
  batchSize: 10,
});

console.log(`Settlement completed: ${result.signatures.length} transactions`);
```

#### Low-Level API (Advanced)

```typescript
// Phase 1: Settle with seed + emissions
await sdk.settleRound(authorityKeypair, roundId, seedHex);

// Phase 2: Distribute payouts (can be batched)
await sdk.roundPayout(authorityKeypair, roundId, payouts);

// Phase 3: Update player stats (can be batched)
await sdk.updatePlayerStats(authorityKeypair, roundId, stats, seasonId);
```

### Utility Functions

```typescript
// Calculate fees
const fees = sdk.calculateFees(entryLamports);
console.log(`Dev fee: ${fees.devFee}, Net to vault: ${fees.netToVault}`);

// Calculate points
const points = sdk.calculatePoints(placement, kills);
console.log(`Total points: ${points.totalAfterCap}`);

// Create settlement data
const settlement = sdk.createSettlement({
  players: [player1, player2, player3],
  totalPrizePool: 10000000,
  placements: [1, 2, 3],
  kills: [5, 3, 1],
});
```

## Configuration

```typescript
const sdk = new OrbsGameSDK({
  provider,
  programId: customProgramId, // Optional, uses default if not provided
  confirmOptions: {
    commitment: "confirmed",
    skipPreflight: false,
  },
  maxRetries: 3, // Transaction retry attempts
  defaultBatchSize: 10, // Default batch size for auto-batching
});
```

## Advanced Usage

### Direct Program Access

For operations not covered by the SDK:

```typescript
const program = sdk.rawProgram;
await program.methods.customInstruction().accounts({...}).rpc();
```

### Custom PDA Derivation

```typescript
import { AccountsModule } from "@orbs-game/sdk";

// Static methods for special PDAs
const ata = await AccountsModule.getAssociatedTokenAddress(mint, owner);
const metadata = AccountsModule.getMetadataPda(mint);
const masterEdition = AccountsModule.getMasterEditionPda(mint);
```

### Transaction Utilities

```typescript
import { sendWithRetry, waitFor, batchArray } from "@orbs-game/sdk";

// Send transaction with automatic retries
const { signature, slot } = await sendWithRetry(
  connection,
  transaction,
  signers,
  { maxRetries: 5 }
);

// Wait for a condition
const result = await waitFor(
  async () => {
    const account = await connection.getAccountInfo(address);
    return account !== null ? account : false;
  },
  { maxAttempts: 50, delayMs: 100 }
);

// Batch arrays
const batches = batchArray(largeArray, 10);
```

## Error Handling

The SDK provides typed errors for better debugging:

```typescript
import { OrbsGameError, AccountNotFoundError, TransactionError } from "@orbs-game/sdk";

try {
  await sdk.joinRound({...});
} catch (error) {
  if (error instanceof AccountNotFoundError) {
    console.error(`Account not found: ${error.accountType}`);
  } else if (error instanceof TransactionError) {
    console.error(`Transaction failed: ${error.signature}`);
  } else if (error instanceof OrbsGameError) {
    console.error(`SDK error: ${error.message}`);
  }
}
```

## Type Safety

All account data and instruction parameters are fully typed:

```typescript
import type { RootAccount, Round, PlayerStats, TierConfig } from "@orbs-game/sdk";

const root: RootAccount = await sdk.fetch.root();
const round: Round = await sdk.fetch.round(roundId);
const stats: PlayerStats | null = await sdk.fetch.playerStats(player, seasonId);
```

## Examples

See the `/examples` directory for complete examples:

- `basic-round.ts` - Join and settle a basic round
- `multi-tier.ts` - Working with multiple tiers
- `season-management.ts` - Season configuration and rollover
- `batch-settlement.ts` - Settling large rounds with batching

## Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

## License

MIT
