# Orbs Game SDK Documentation

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Advanced Features](#advanced-features)
8. [Security Assessment](#security-assessment)

---

## Overview

The Orbs Game SDK (`@orbs-game/sdk`) is a TypeScript client library for interacting with the Orbs Game Solana program. It provides a comprehensive API for:

- **Player Operations**: Join rounds, set nicknames, claim rewards
- **Admin Operations**: Initialize game, manage tiers, configure seasons
- **Settlement**: Multi-phase settlement with cryptographic verification
- **Liquidity Management**: CLMM position management via Raydium
- **Account Management**: PDA derivation and account fetching

### Key Features

- Full TypeScript type safety
- Automatic transaction retry with blockhash refresh
- Support for both `Keypair` and wallet adapter (`WalletSigner`)
- Batched operations for large datasets
- Merkle-based seed verification for provably fair randomness
- Internet Computer (ICP) integration for decentralized randomness

---

## Installation

```bash
npm install @orbs-game/sdk
# or
yarn add @orbs-game/sdk
```

### Peer Dependencies

```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token bn.js
```

### Optional Dependencies (for ICP integration)

```bash
npm install @dfinity/agent @dfinity/candid @dfinity/identity @dfinity/principal
```

### Optional Dependencies (for CLMM operations)

```bash
npm install @raydium-io/raydium-sdk-v2
```

---

## Quick Start

### Initialize the SDK

```typescript
import { OrbsGameSDK } from "@orbs-game/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

// Create connection
const connection = new Connection("https://api.mainnet-beta.solana.com");

// Create provider (with wallet for browser, or Keypair for Node.js)
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

// Initialize SDK
const sdk = new OrbsGameSDK({ provider });
```

### Join a Round

```typescript
import { Keypair } from "@solana/web3.js";

const playerKeypair = Keypair.fromSecretKey(/* your secret key */);

// Get the next available round
const nextRoundId = await sdk.getNextRoundId(0); // tier 0

// Join the round
const { signature } = await sdk.joinRound({
  roundId: nextRoundId,
  tierId: 0,
  player: playerKeypair,
  tpPreset: 0, // 0=disabled, 1=safe, 2=balanced, 3=fierce, 4=yolo
});

console.log(`Joined round ${nextRoundId}, tx: ${signature}`);
```

### Browser Wallet Support

```typescript
import { useWallet } from "@solana/wallet-adapter-react";

function JoinRoundButton() {
  const wallet = useWallet();

  const handleJoin = async () => {
    const { signature } = await sdk.joinRound({
      roundId: nextRoundId,
      tierId: 0,
      player: {
        publicKey: wallet.publicKey!,
        signTransaction: wallet.signTransaction!,
      },
    });
  };

  return <button onClick={handleJoin}>Join Round</button>;
}
```

---

## Architecture

### Module Structure

```
@orbs-game/sdk
├── OrbsGameSDK          # Main SDK client
├── AccountsModule       # PDA derivation with caching
├── FetchModule          # Account data fetching
├── ICPModule            # Internet Computer integration
└── utilities/
    ├── calculations     # Fee and points calculations
    ├── builders         # Settlement data builders
    ├── transaction      # Transaction helpers
    ├── encoding         # Buffer encoding utilities
    ├── hash             # SHA-256 utilities
    ├── seed             # Seed verification utilities
    └── merkle           # Merkle proof verification
```

### Account PDAs

| Account | Seeds | Purpose |
|---------|-------|---------|
| Root | `["root"]` | Global game configuration |
| RoundPage | `["round_page", tier_id, page_index]` | Stores 120 rounds per page |
| RoundPlayer | `["rp", tier_id, round_id, player]` | Player round membership |
| Vault | `["vault", tier_id, round_id]` | Round prize pool |
| PlayerStats | `["ps", season_id, player]` | Per-season player statistics |
| Referral | `["referral", player]` | Referral relationship |
| Nickname | `["nickname", lowercase_name]` | Unique nickname ownership |

---

## API Reference

### OrbsGameSDK

#### Constructor

```typescript
const sdk = new OrbsGameSDK(config: OrbsGameSDKConfig, program?: Program);
```

**Config Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `provider` | `AnchorProvider` | Required | Solana provider |
| `programId` | `PublicKey` | Default program | Custom program ID |
| `confirmOptions` | `ConfirmOptions` | `{ commitment: "confirmed" }` | Transaction confirmation |
| `maxRetries` | `number` | `3` | Max transaction retries |
| `defaultBatchSize` | `number` | `10` | Batch size for operations |

#### Properties

- `accounts: AccountsModule` - PDA derivation
- `fetch: FetchModule` - Account fetching
- `provider: AnchorProvider` - Solana provider
- `rawProgram: Program` - Underlying Anchor program

---

### Admin Operations

#### `initializeRoot(options: InitializeRootOptions)`

Initialize the game with tier configurations.

```typescript
const { signature } = await sdk.initializeRoot({
  authority: authorityKeypair,
  devWallet: devWalletPublicKey,
  orbMint: orbMintPublicKey,
  clmmPool: clmmPoolPublicKey,
  devFeeBps: 1000, // 10%
  tierConfigs: [
    {
      tierId: 0,
      entryLamports: new BN(10_000_000), // 0.01 SOL
      minPlayers: 3,
      maxPlayers: 10,
      countdownSecs: 60,
      takeProfit: new BN(0),
      pointsMultiplier: 100, // 1x
    },
  ],
});
```

#### `setSeasonTemplate(authority, nextSeasonRoundsTotal)`

Set the template for future seasons.

```typescript
await sdk.setSeasonTemplate(authorityKeypair, 60000);
```

#### `setSeasonRounds(authority, roundsTotal)`

Update current season configuration.

```typescript
await sdk.setSeasonRounds(authorityKeypair, 1000);
```

#### `updateTierConfig(authority, tierId, pointsMultiplier)`

Update tier points multiplier.

```typescript
await sdk.updateTierConfig(authorityKeypair, 0, 150); // 1.5x multiplier
```

---

### Round Operations

#### `joinRound(options: JoinRoundOptions)`

Join a game round by paying the entry fee.

```typescript
interface JoinRoundOptions {
  roundId: number;
  tierId: number;
  player: Keypair | WalletSigner;
  tpPreset?: number;           // Take Profit: 0-4
  useWalletSigner?: boolean;   // Force wallet signing
  referrer?: PublicKey;        // Optional referrer
}

const { signature } = await sdk.joinRound({
  roundId: 1,
  tierId: 0,
  player: playerKeypair,
  tpPreset: 2, // balanced
  referrer: referrerPublicKey,
});
```

#### `getNextRoundId(tierId: number)`

Get the next available round ID for a tier.

```typescript
const nextRound = await sdk.getNextRoundId(0);
```

#### `getRoundRoster(tierId, roundId)`

Get all players in a round, sorted by join time.

```typescript
const players = await sdk.getRoundRoster(0, 1);
// Returns: PublicKey[]
```

#### `getEmissionRecipients(tierId, roundId)`

Get the first 3 players (eligible for ORB emissions).

```typescript
const recipients = await sdk.getEmissionRecipients(0, 1);
// Returns: PublicKey[] (max 3)
```

---

### Settlement Operations

Settlement is a multi-phase process:

1. **Phase 1 (`settleRound`)**: Seed verification + ORB emissions
2. **Phase 2 (`roundPayout`)**: SOL distribution to winners
3. **Phase 3 (`updatePlayerStats`)**: Points and stats updates
4. **Phase 4 (`closeRoundPlayers`)**: Reclaim rent from RoundPlayer PDAs

#### `settleRoundComplete(authority, roundId, tierId, options)`

High-level method that orchestrates all phases with automatic batching.

```typescript
import { createSettlementData } from "@orbs-game/sdk";

// Prepare settlement data
const players = await sdk.getRoundRoster(tierId, roundId);
const settlement = createSettlementData({
  players,
  totalPrizePool: 100_000_000, // lamports
  placements: [1, 2, 3, 4, 5], // 1st, 2nd, 3rd, etc.
  kills: [3, 1, 0, 2, 0],
});

// Get seed proof from ICP
const seedProof = await icpModule.getSeed(seasonId, tierId, roundId);

// Execute complete settlement
const { signatures } = await sdk.settleRoundComplete(
  authorityKeypair,
  roundId,
  tierId,
  {
    seedProof,
    payouts: settlement.payouts,
    stats: settlement.stats,
    autoBatch: true,
    batchSize: 10,
  }
);
```

#### `settleRound(authority, roundId, tierId, seedProof)`

Phase 1: Verify seed and trigger ORB emissions.

```typescript
const { signature } = await sdk.settleRound(
  authorityKeypair,
  roundId,
  tierId,
  seedProof
);
```

#### `roundPayout(authority, roundId, tierId, payouts)`

Phase 2: Distribute SOL to winners.

```typescript
const { signature } = await sdk.roundPayout(
  authorityKeypair,
  roundId,
  tierId,
  [
    { player: player1, accountIndex: 0, payout: new BN(50_000_000) },
    { player: player2, accountIndex: 1, payout: new BN(30_000_000) },
    { player: player3, accountIndex: 2, payout: new BN(20_000_000) },
  ]
);
```

#### `updatePlayerStats(authority, roundId, tierId, stats, seasonId)`

Phase 3: Update player statistics.

```typescript
const { signature } = await sdk.updatePlayerStats(
  authorityKeypair,
  roundId,
  tierId,
  [
    {
      player: player1,
      accountIndex: 0,
      prize: new BN(50_000_000),
      placement: 1,
      kills: 3,
      orbEarnedAtoms: new BN(0),
    },
  ],
  seasonId
);
```

#### `closeRoundPlayers(authority, roundId, tierId, players)`

Phase 4: Close RoundPlayer accounts and reclaim rent.

```typescript
const { signature } = await sdk.closeRoundPlayers(
  authorityKeypair,
  roundId,
  tierId,
  [player1, player2, player3]
);
```

---

### Player Operations

#### `getPlayerStats(player, seasonId?)`

Get player statistics for a season.

```typescript
const stats = await sdk.getPlayerStats(playerPublicKey);
// Returns: PlayerStats {
//   seasonId, totalPoints, seasonPoints, roundsPlayed,
//   wins, kills, solEarnedLamports, orbEarnedAtoms, etc.
// }
```

#### `setNickname(player, nickname)`

Set a unique nickname (costs 0.2 SOL).

```typescript
const { signature } = await sdk.setNickname(playerKeypair, "ProGamer123");
```

**Nickname Rules:**
- 3-20 characters
- Alphanumeric and underscores only
- Case-insensitive uniqueness

#### `initReferral(player, referrer)`

Initialize a referral relationship.

```typescript
const { signature } = await sdk.initReferral(playerKeypair, referrerPublicKey);
```

**Referral Rules:**
- One-time only
- Cannot refer yourself
- Referrer must have played at least one round
- No circular referrals

#### `claimReferralRewards(referrer)`

Claim accumulated referral rewards in SOL.

```typescript
const { signature } = await sdk.claimReferralRewards(referrerKeypair);
```

---

### Season Operations

#### `checkAndRunGenesis(authority)`

Trigger genesis liquidity bootstrap when threshold is met.

```typescript
const { signature } = await sdk.checkAndRunGenesis(authorityKeypair);
```

**Prerequisites:**
- `genesisDone == false`
- `lpAccumSol >= genesisThresholdLamports` (default 25 SOL)

#### `convertPoints(player, seasonId)`

Convert Season 0 points to ORB tokens.

```typescript
const { signature } = await sdk.convertPoints(playerKeypair, 0);
```

#### `claimSeasonPool(player, seasonId)`

Claim proportional share of season prize pool (Season 1+).

```typescript
const { signature } = await sdk.claimSeasonPool(playerKeypair, 1);
```

---

### CLMM Operations

These operations manage the Raydium CLMM liquidity position.

#### `openClmmPosition(authority, params)`

Create a new CLMM liquidity position.

```typescript
const { signature, nftMint } = await sdk.openClmmPosition(authorityKeypair, {
  clmmProgramId: RAYDIUM_CLMM_PROGRAM_ID,
  poolId: "pool-address-string",
});
```

#### `increaseClmmLiquidity(authority, params)`

Add liquidity to existing position.

```typescript
const signature = await sdk.increaseClmmLiquidity(authorityKeypair, {
  clmmProgramId: RAYDIUM_CLMM_PROGRAM_ID,
  poolId: "pool-address-string",
  addSol: new BN(5_000_000_000), // 5 SOL
});
```

#### `lockClmmPosition(authority, params)`

Lock position NFT to prevent unauthorized removal.

```typescript
const signature = await sdk.lockClmmPosition(authorityKeypair, {
  lockProgramId: RAYDIUM_LOCK_PROGRAM_ID,
  clmmProgramId: RAYDIUM_CLMM_PROGRAM_ID,
  poolId: "pool-address-string",
  raydium: raydiumInstance,
});
```

#### `clmmBuyback(authority, params)`

Execute SOL -> ORB swap via CLMM.

```typescript
const signature = await sdk.clmmBuyback(authorityKeypair, {
  clmmProgramId: RAYDIUM_CLMM_PROGRAM_ID,
  poolId: "pool-address-string",
  buybackAmount: new BN(1_000_000_000), // 1 SOL
});
```

---

### Utility Functions

#### Fee Calculations

```typescript
import { calculateFees } from "@orbs-game/sdk";

const fees = calculateFees(
  100_000_000,  // entry: 0.1 SOL
  1000,         // devFeeBps: 10%
  10_000_000    // takeProfit: 0.01 SOL
);

// Returns: {
//   devFee: 11_000_000,      // 10% of total payment
//   lpAccum: 11_000_000,     // 10% of total payment
//   actualDev: 11_000_000,   // Dev portion (minus referral if applicable)
//   takeProfit: 10_000_000,  // Take profit amount
//   netToVault: 88_000_000,  // 80% goes to prize pool
// }
```

**Fee Structure:**
- 80% of payment -> Prize Pool (vault)
- 10% of payment -> LP Accumulation
- 10% of payment -> Dev Wallet (10% of this -> Referrer if applicable)

#### Points Calculations

```typescript
import { calculatePoints, POINTS } from "@orbs-game/sdk";

const points = calculatePoints(1, 3); // 1st place, 3 kills

// Returns: {
//   placementPoints: 500,   // 1st place bonus
//   killPoints: 300,        // 3 kills * 100
//   totalBeforeCap: 800,
//   totalAfterCap: 500,     // Capped at 500 (default)
// }
```

**Point Distribution:**
- 1st place: 500 points
- 2nd place: 350 points
- 3rd place: 250 points
- Other: 50 points (participation floor)
- Per kill: 100 points
- Default cap: 500 points per round

#### Settlement Data Builders

```typescript
import { createSettlementData } from "@orbs-game/sdk";

const settlement = createSettlementData({
  players: [player1, player2, player3],
  totalPrizePool: 100_000_000, // lamports
  placements: [1, 2, 3],
  kills: [2, 1, 0],
});

// Returns: { payouts, stats }
// payouts: [{ player, accountIndex, payout }]
// stats: [{ player, accountIndex, prize, placement, kills, orbEarnedAtoms }]
```

---

### AccountsModule

PDA derivation with caching.

```typescript
const accounts = sdk.accounts;

// Derive PDAs
const rootPda = accounts.root();
const roundPage = accounts.roundPage(0, 0);
const roundPlayer = accounts.roundPlayer(0, 1, playerPublicKey);
const vault = accounts.vault(0, 1);
const playerStats = accounts.playerStats(playerPublicKey, 0);
const referral = accounts.referral(playerPublicKey);
const nickname = accounts.nickname("ProGamer");
const seasonSnapshot = accounts.seasonSnapshot(0);
const seasonPoolVault = accounts.seasonPoolVault(0);
const programVault = accounts.programVault();
const mintAuthority = accounts.mintAuthority();
const vaultAuthority = accounts.vaultAuthority();
const lpVault = accounts.lpVault();
const orbLpVault = accounts.orbLpVault();
const referralVault = accounts.referralVault();

// Static methods
const pageIndex = AccountsModule.pageIndexFor(roundId);
const slotIndex = AccountsModule.slotIndexFor(roundId);
const ata = await AccountsModule.getAssociatedTokenAddress(mint, owner);
```

---

### FetchModule

Account data fetching with deserialization.

```typescript
const fetch = sdk.fetch;

// Fetch accounts
const root = await fetch.root();
const round = await fetch.round(roundId, tierId);
const roundPlayer = await fetch.roundPlayer(tierId, roundId, player);
const playerStats = await fetch.playerStats(player, seasonId);
const seasonSnapshot = await fetch.seasonSnapshot(seasonId);

// Fetch roster (all RoundPlayer PDAs for a round)
const roster = await fetch.fetchRoundRoster(tierId, roundId);

// Check page existence
const exists = await fetch.roundPageExists(tierId, pageIndex);
```

---

### Checkpoints System

Track player achievements with bitmap-based checkpoints.

```typescript
import {
  SeasonalCheckpoint,
  GlobalCheckpoint,
  hasSeasonalCheckpoint,
  hasGlobalCheckpoint,
  getClaimedSeasonalCheckpoints,
  calculateCheckpointPoints,
} from "@orbs-game/sdk";

const stats = await sdk.getPlayerStats(player);

// Check specific checkpoint
if (hasSeasonalCheckpoint(stats, SeasonalCheckpoint.CHAMPION)) {
  console.log("Player has won a season!");
}

// Get all claimed checkpoints
const claimed = getClaimedSeasonalCheckpoints(stats);
// Returns: SeasonalCheckpoint[]

// Calculate total checkpoint points
const points = calculateCheckpointPoints(stats);
// Returns: number
```

**Seasonal Checkpoints (reset each season):**
- `FIRST_BLOOD` (50 pts) - First paid round
- `GETTING_WARM` (75 pts) - 5 rounds played
- `COMMITTED` (120 pts) - 25 rounds played
- `DEDICATED` (180 pts) - 50 rounds played
- `VETERAN` (250 pts) - 100 rounds played
- `MINER` (90 pts) - First ORB emission earned
- `CHAMPION` (220 pts) - First season win
- `KILLING_SPREE` (300 pts) - 3 kills in one round
- `HOT_STREAK` (450 pts) - 2 consecutive wins
- `LEGENDARY` (1800 pts) - 10 consecutive wins

**Global Checkpoints (lifetime):**
- `NICKNAME_PIONEER` (500 pts) - First nickname ever
- `REFERRER_ROOKIE` (200 pts) - First referral
- `REFERRER_PRO` (800 pts) - 50 referrals
- `REFERRER_LEGEND` (2000 pts) - 250 referrals

---

## Usage Examples

### Complete Round Lifecycle

```typescript
import { OrbsGameSDK, createSettlementData } from "@orbs-game/sdk";
import { Keypair, Connection } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";

// Setup
const connection = new Connection("https://api.mainnet-beta.solana.com");
const authority = Keypair.fromSecretKey(/* authority key */);
const provider = new AnchorProvider(connection, new Wallet(authority), {});
const sdk = new OrbsGameSDK({ provider });

// Step 1: Players join the round
const tierId = 0;
const roundId = await sdk.getNextRoundId(tierId);

for (const player of players) {
  await sdk.joinRound({
    roundId,
    tierId,
    player,
    tpPreset: 0,
  });
}

// Step 2: Wait for countdown to expire...

// Step 3: Settle the round
const roster = await sdk.getRoundRoster(tierId, roundId);
const root = await sdk.fetch.root();

// Calculate prize pool
const round = await sdk.fetch.round(roundId, tierId);
const prizePool = round.joinedCount * Number(round.entryLamports) * 0.8;

// Prepare settlement data (determine winners server-side)
const placements = [1, 2, 3, 4, 5]; // Based on game results
const kills = [3, 1, 2, 0, 0];

const settlement = createSettlementData({
  players: roster,
  totalPrizePool: prizePool,
  placements,
  kills,
});

// Get seed from ICP
const seedProof = await icpModule.getSeed(root.seasonId, tierId, roundId);

// Complete settlement
const { signatures } = await sdk.settleRoundComplete(
  authority,
  roundId,
  tierId,
  {
    seedProof,
    payouts: settlement.payouts,
    stats: settlement.stats,
  }
);

console.log("Settlement complete:", signatures);
```

### Referral System

```typescript
// Player A refers Player B
const playerA = Keypair.fromSecretKey(/* key */);
const playerB = Keypair.fromSecretKey(/* key */);

// Player A must have played at least one round first
await sdk.joinRound({
  roundId: 1,
  tierId: 0,
  player: playerA,
});

// Player B sets Player A as referrer (once)
await sdk.initReferral(playerB, playerA.publicKey);

// When Player B joins rounds, Player A earns:
// - 20 base points per round
// - 10% of dev fee in SOL
// - Checkpoint bonuses at milestones

// Player A can claim accumulated rewards
const playerAStats = await sdk.getPlayerStats(playerA.publicKey);
console.log("Pending rewards:", playerAStats.pendingReferralRewards.toString());

await sdk.claimReferralRewards(playerA);
```

### Season Transition

```typescript
// During Season 0: Accumulate points
await sdk.joinRound({
  roundId: nextRound,
  tierId: 0,
  player,
});

// When LP accumulation reaches threshold (25 SOL)
const root = await sdk.fetch.root();
if (!root.genesisDone && root.lpAccumSol.gte(root.genesisThresholdLamports)) {
  // Trigger genesis
  await sdk.checkAndRunGenesis(authority);
}

// After genesis: Convert Season 0 points to ORB
await sdk.convertPoints(player, 0);

// Season 1+: Claim pool share after season ends
const snapshot = await sdk.fetch.seasonSnapshot(1);
if (snapshot.finalized) {
  await sdk.claimSeasonPool(player, 1);
}
```

### Emission Probability Check

```typescript
// Check if a round will trigger ORB emissions
const emissionInfo = await sdk.calculateEmissionProbability(roundId, seedHex);

console.log({
  willEmit: emissionInfo.willEmit,
  probabilityBps: emissionInfo.probabilityBps, // 0-10000
  gap: emissionInfo.gap, // Rounds since last emission
  hazardCapRounds: emissionInfo.hazardCapRounds, // Max gap before guaranteed emission
});

// If emission triggers, first 3 joiners receive ORB:
// - 1st joiner: 100 ORB
// - 2nd joiner: 60 ORB
// - 3rd joiner: 40 ORB
// - Season pool: 50 ORB
```

---

## Advanced Features

### ICP Module (Internet Computer Integration)

```typescript
import { ICPModule } from "@orbs-game/sdk";

const icpModule = new ICPModule({
  canisterId: "your-canister-id",
  host: "https://ic0.app",
  identity: yourIdentity, // Optional
});

// Get seed proof for settlement
const seedProof = await icpModule.getSeed(seasonId, tierId, roundId);

// Batch seed requests
const proofs = await icpModule.getSeedBatch([
  { seasonId: 0, tierId: 0, roundId: 1 },
  { seasonId: 0, tierId: 0, roundId: 2 },
]);

// Archive round data
await icpModule.archiveRound(roundSnapshot);

// Paginate archived data
const players = await icpModule.getPlayerPage(0, 100);
const rounds = await icpModule.getRoundSnapshotPage(0, 100);
```

### Merkle Proof Verification

```typescript
import {
  computeLeafHash,
  merkleVerify,
  verifySeedProof,
  CHUNK_SIZE,
} from "@orbs-game/sdk";

// Verify a seed proof locally
const isValid = verifySeedProof(
  seedProof.seed,
  seedProof.merkle_root,
  seedProof.proof_siblings,
  seedProof.proof_positions,
  seasonId,
  tierId,
  roundId
);
```

### Custom Transaction Handling

```typescript
import { sendWithFreshBlockhash, sendWithRetry, batchArray } from "@orbs-game/sdk";

// Send with automatic blockhash retry
const signature = await sendWithFreshBlockhash(
  connection,
  transaction,
  signers,
  maxRetries
);

// Generic retry wrapper
const result = await sendWithRetry(async () => {
  // Your async operation
}, maxRetries);

// Batch large arrays
const batches = batchArray(largeArray, 10);
for (const batch of batches) {
  // Process batch
}
```

---

## Security Assessment

### Overview

The Orbs Game SDK and Solana program implement a competitive gaming platform with robust security measures. This assessment covers both the TypeScript SDK and the underlying Rust/Anchor program.

### Security Strengths

#### 1. PDA-Based Access Control

All accounts are derived using Program Derived Addresses (PDAs), ensuring:
- Deterministic account derivation
- Tamper-proof account ownership
- Collision-resistant addressing

```rust
// Example: RoundPlayer PDA ensures unique player-round membership
seeds = [b"rp", tier_id, round_id, player.key()]
```

#### 2. Idempotent Operations

Settlement uses boolean flags to prevent double-execution:
- `payout_processed`: Prevents duplicate SOL transfers
- `stats_applied`: Prevents duplicate point awards
- `did_emit`: Prevents duplicate ORB emissions

#### 3. Checked Arithmetic

All arithmetic operations use safe methods:
```rust
value.checked_add(other).ok_or(ErrorCode::MathOverflow)?;
value.checked_mul(other).ok_or(ErrorCode::MathOverflow)?;
value.saturating_add(other); // For points
```

#### 4. Merkle-Based Seed Verification

Cryptographic binding prevents seed manipulation:
- SHA-256 leaf hashing with round ID binding
- ECDSA signature verification from ICP canister
- Merkle proof verification against signed root

```rust
// Leaf = SHA256("orbs-leaf" || season_id || tier_id || round_id || seed)
```

#### 5. Referral Graph Validation

Prevents circular referral attacks:
- Self-referral blocked
- Referrer must have played (has PlayerStats)
- Direct circular check (A->B->A)

#### 6. Zero-Copy Account Handling

Large arrays use zero-copy to prevent stack overflow:
```rust
#[account(zero_copy)]
#[repr(C)]
pub struct RoundPage {
    pub rounds: [RoundMeta; 120],
}
```

### Potential Concerns & Mitigations

#### 1. Feature-Gated Verification

**Concern**: Seed verification can be disabled via feature flag.

```rust
#[cfg(feature = "seed-verification")]
```

**Mitigation**: Ensure `seed-verification` feature is enabled in production deployments.

#### 2. Authority Centralization

**Concern**: Single authority key controls settlement and admin operations.

**Mitigation**:
- Use multisig for authority
- Consider time-locked operations for sensitive changes
- Monitor authority key usage

#### 3. ICP Canister Trust

**Concern**: Seed randomness depends on external ICP canister.

**Mitigation**:
- ICP provides cryptographic proofs (Merkle + ECDSA)
- Seeds are bound to specific rounds
- Signature verification uses hardcoded public key

#### 4. Raydium CPI Operations

**Concern**: Liquidity operations proxy external program calls.

**Mitigation**:
- Authority-only access
- Explicit account validation
- Program ID verification

### Error Handling

The program defines 117 distinct error codes covering:
- Round state validation
- Authorization checks
- Data consistency
- Cryptographic verification
- Input validation

### Recommendations

1. **Production Deployment**
   - Enable `seed-verification` feature
   - Use mainnet ICP ECDSA public key
   - Implement multisig for authority

2. **Monitoring**
   - Log all settlement events
   - Alert on unusual payout patterns
   - Monitor ORB supply cap

3. **Testing**
   - Fuzz test RoundPage deserialization
   - Test Merkle proof edge cases
   - Verify fee calculations at boundaries

4. **Operational Security**
   - Rotate authority keys periodically
   - Use hardware wallets for admin operations
   - Implement rate limiting on settlements

### Audit Checklist

| Area | Status | Notes |
|------|--------|-------|
| Integer overflow protection | ✅ Pass | Checked arithmetic throughout |
| Access control | ✅ Pass | PDA-based, authority-validated |
| Reentrancy | ✅ Pass | Anchor handles CPI safely |
| Account validation | ✅ Pass | Comprehensive constraints |
| Cryptographic verification | ✅ Pass | Merkle + ECDSA |
| Fee handling | ✅ Pass | Exact accounting |
| Idempotency | ✅ Pass | Boolean flags prevent replay |
| Zero-copy safety | ⚠️ Review | Verify packed struct alignment |
| Feature flag security | ⚠️ Review | Ensure enabled in production |
| Supply cap enforcement | ✅ Pass | 100M cap tracked |

---

## Constants Reference

```typescript
import { PROGRAM_ID, SEEDS, PAGE_SIZE, POINTS, FEES, DEFAULTS } from "@orbs-game/sdk";

// Program ID
PROGRAM_ID // "CZGSRyEqc9RkCsGbknF92FQQJqPF7SzQDH7avmfRUaqd"

// Page size for round storage
PAGE_SIZE // 120 rounds per page

// Points
POINTS.FIRST_PLACE    // 500
POINTS.SECOND_PLACE   // 350
POINTS.THIRD_PLACE    // 250
POINTS.PER_KILL       // 100
POINTS.PARTICIPATION_FLOOR // 50
POINTS.DEFAULT_CAP    // 500

// Defaults
DEFAULTS.MAX_RETRIES  // 3
DEFAULTS.BATCH_SIZE   // 10
DEFAULTS.COMMITMENT   // "confirmed"
```

---

## Troubleshooting

### Common Errors

#### "RoundNotOpen"
Round is not accepting players (settled or in countdown after max players).

#### "AlreadyJoined"
Player has already joined this round (RoundPlayer PDA exists).

#### "InvalidMerkleProof"
Seed proof verification failed - check proof data from ICP.

#### "CountdownNotComplete"
Settlement attempted before countdown expired and max players not reached.

#### "CircularReferral"
Attempted to create A->B referral when B->A already exists.

### Transaction Failures

1. **Blockhash expired**: SDK automatically retries with fresh blockhash
2. **Insufficient funds**: Ensure player has enough SOL for entry + fees
3. **Account not found**: Round page may need initialization

---

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/PlayOrbs/sdk/issues)
- Documentation: This file
- Program Source: `/programs/orbs_game/`

---

*SDK Version: 0.1.0*
*Last Updated: 2026-01-08*
