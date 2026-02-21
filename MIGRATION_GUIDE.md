# Migration Guide: Converting Tests to Use the SDK

This guide shows how to convert existing test code to use the Orbs Game SDK.

## Before: Using Test Helpers

```typescript
// Old test pattern
import { getRootPda, getRoundPda, getVaultPda, joinRound, settleRound } from "./helpers/test-utils";

describe("Round tests", () => {
  it("should join and settle a round", async () => {
    // Manual PDA derivation
    const [rootAccount] = getRootPda(program);
    const [roundPda] = getRoundPda(program, roundId);
    const [vaultPda] = getVaultPda(program, roundId);

    // Manual account fetching
    const rootData = await program.account.rootAccount.fetch(rootAccount);
    const roundData = await program.account.round.fetch(roundPda);

    // Join round using helper
    await joinRound(program, player, rootAccount, roundId, tierId, orbMint);

    // Multi-step settlement
    await settleRound(program, authority, rootAccount, roundId, seedHex, orbMint);
    await roundPayoutBatched(program, authority, rootAccount, roundId, payoutData, 10);
    await updatePlayerStatsBatched(program, authority, rootAccount, roundId, statsData, 10);
  });
});
```

## After: Using the SDK

```typescript
// New SDK pattern
import { OrbsGameSDK } from "@orbs-game/sdk";

describe("Round tests", () => {
  let sdk: OrbsGameSDK;

  beforeAll(() => {
    sdk = new OrbsGameSDK({ provider });
  });

  it("should join and settle a round", async () => {
    // Automatic PDA derivation (with caching)
    const rootAccount = sdk.accounts.root();
    const roundPda = sdk.accounts.round(roundId);
    const vaultPda = sdk.accounts.vault(roundId);

    // Clean account fetching
    const rootData = await sdk.fetch.root();
    const roundData = await sdk.fetch.round(roundId);

    // Join round - single method
    await sdk.joinRound({
      roundId,
      tierId,
      player: playerKeypair,
    });

    // Complete settlement - single method with auto-batching
    await sdk.settleRoundComplete(authorityKeypair, roundId, {
      seedHex,
      payouts,
      stats,
      autoBatch: true,
    });
  });
});
```

## Key Improvements

### 1. **Simplified PDA Derivation**

Before:
```typescript
const [rootAccount] = PublicKey.findProgramAddressSync([Buffer.from("root")], program.programId);
const [roundPda] = getRoundPda(program, roundId);
```

After:
```typescript
const rootAccount = sdk.accounts.root();
const roundPda = sdk.accounts.round(roundId);
```

### 2. **Cleaner Account Fetching**

Before:
```typescript
const rootData = await program.account.rootAccount.fetch(rootAccount);
const roundData = await program.account.round.fetch(roundPda);
```

After:
```typescript
const rootData = await sdk.fetch.root();
const roundData = await sdk.fetch.round(roundId);
```

### 3. **High-Level Operations**

Before (multi-step):
```typescript
await settleRound(program, authority, rootAccount, roundId, seedHex, orbMint);

for (let i = 0; i < payouts.length; i += 10) {
  const batch = payouts.slice(i, i + 10);
  const remapped = batch.map((p, idx) => ({
    ...p,
    accountIndex: idx,
  }));
  await roundPayout(program, authority, rootAccount, roundId, { payouts: remapped });
}

for (let i = 0; i < stats.length; i += 10) {
  const batch = stats.slice(i, i + 10);
  const remapped = batch.map((s, idx) => ({
    ...s,
    accountIndex: idx,
  }));
  await updatePlayerStats(program, authority, rootAccount, roundId, { updates: remapped });
}
```

After (single call):
```typescript
await sdk.settleRoundComplete(authorityKeypair, roundId, {
  seedHex,
  payouts,
  stats,
  autoBatch: true, // Handles batching automatically
});
```

### 4. **Built-in Utilities**

Before:
```typescript
const devFee = Math.floor((entryLamports * devFeeBps) / 10000);
const lpAccum = Math.floor(devFee / 2);
const actualDev = devFee - lpAccum;
const netToVault = entryLamports - devFee - takeProfit;
```

After:
```typescript
const fees = sdk.calculateFees(entryLamports);
// Returns: { devFee, lpAccum, actualDev, takeProfit, netToVault }
```

Before:
```typescript
let points = 50; // Participation floor
if (placement === 1) points = 500;
else if (placement === 2) points = 350;
else if (placement === 3) points = 250;
points += kills * 100;
points = Math.min(points, cap);
```

After:
```typescript
const points = sdk.calculatePoints(placement, kills, cap);
// Returns: { placementPoints, killPoints, totalBeforeCap, totalAfterCap }
```

## Example: Full Test Conversion

### Before

```typescript
import { expect } from "vitest";
import { getRootPda, joinRound, settleRound } from "./helpers/test-utils";

describe("Integration test", () => {
  it("complete round lifecycle", async () => {
    const [rootAccount] = getRootPda(program);
    const rootData = await program.account.rootAccount.fetch(rootAccount);
    const roundId = rootData.nextRoundId.toNumber();

    // Join players
    for (const player of players) {
      await joinRound(program, player, rootAccount, roundId, tierId, orbMint);
    }

    // Verify round state
    const [roundPda] = getRoundPda(program, roundId);
    const roundData = await program.account.round.fetch(roundPda);
    expect(roundData.joinedCount).toBe(players.length);

    // Settle
    await settleRound(program, authority, rootAccount, roundId, seedHex, orbMint);
    await roundPayoutBatched(program, authority, rootAccount, roundId, payoutData, 10);
    await updatePlayerStatsBatched(program, authority, rootAccount, roundId, statsData, 10);

    // Verify stats
    for (const player of players) {
      const stats = await getPlayerStats(program, player.publicKey, rootData.seasonId);
      expect(stats.roundsPlayed).toBeGreaterThan(0);
    }
  });
});
```

### After

```typescript
import { expect } from "vitest";
import { OrbsGameSDK } from "@orbs-game/sdk";

describe("Integration test", () => {
  let sdk: OrbsGameSDK;

  beforeAll(() => {
    sdk = new OrbsGameSDK({ provider });
  });

  it("complete round lifecycle", async () => {
    const rootData = await sdk.fetch.root();
    const roundId = rootData.nextRoundId.toNumber();

    // Join players
    for (const player of players) {
      await sdk.joinRound({ roundId, tierId, player });
    }

    // Verify round state
    const roundData = await sdk.fetch.round(roundId);
    expect(roundData.joinedCount).toBe(players.length);

    // Settle (single call, auto-batched)
    await sdk.settleRoundComplete(authorityKeypair, roundId, {
      seedHex,
      payouts,
      stats,
    });

    // Verify stats
    for (const player of players) {
      const playerStats = await sdk.getPlayerStats(player.publicKey);
      expect(playerStats?.roundsPlayed).toBeGreaterThan(0);
    }
  });
});
```

## Migration Checklist

- [ ] Replace manual PDA derivation with `sdk.accounts.*`
- [ ] Replace `program.account.*.fetch()` with `sdk.fetch.*`
- [ ] Replace helper functions like `joinRound()` with `sdk.joinRound()`
- [ ] Consolidate multi-phase settlements with `sdk.settleRoundComplete()`
- [ ] Replace manual fee calculations with `sdk.calculateFees()`
- [ ] Replace manual points calculations with `sdk.calculatePoints()`
- [ ] Remove batching logic (handled by SDK with `autoBatch: true`)
- [ ] Update imports to use SDK types
- [ ] Remove test helper dependencies where SDK provides equivalent functionality

## TypeScript Benefits

The SDK provides full type safety:

```typescript
// All typed!
const rootData: RootAccount = await sdk.fetch.root();
const roundData: Round = await sdk.fetch.round(roundId);
const stats: PlayerStats | null = await sdk.getPlayerStats(player);
const fees: FeeBreakdown = sdk.calculateFees(entryLamports);
const points: PointsBreakdown = sdk.calculatePoints(1, 5);
```

## Error Handling

The SDK provides better error handling:

```typescript
import { AccountNotFoundError, TransactionError } from "@orbs-game/sdk";

try {
  await sdk.joinRound({...});
} catch (error) {
  if (error instanceof AccountNotFoundError) {
    console.error(`Missing account: ${error.accountType}`);
  } else if (error instanceof TransactionError) {
    console.error(`TX failed: ${error.signature}`);
  }
}
```

## Next Steps

1. Start with a single test file conversion
2. Verify tests still pass with identical behavior
3. Gradually convert remaining tests
4. Remove obsolete test helpers once all tests are migrated
5. Update documentation to reference SDK instead of helpers
