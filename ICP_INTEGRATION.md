# ICP Integration Guide

This guide explains how to use the ICP module in the Orbs Game SDK for seed generation and retrieval.

## Overview

The ICP module provides a TypeScript interface to interact with the Internet Computer canister that generates and stores cryptographically secure seeds for game rounds. Seeds are generated using ICP's threshold ECDSA and signed to ensure authenticity.

## Installation

The ICP integration uses `@icp-sdk/core` which is already included in the SDK's `package.json`.

```bash
npm install @icp-sdk/core
```

No additional dependencies are required!

## Basic Usage

### Initialize the ICP Module

```typescript
import { ICPModule } from "@orbs-game/sdk";
import { Keypair } from "@solana/web3.js";

// Option 1: Read-only access (no identity)
const icp = new ICPModule({
  canisterId: "your-canister-id",
  host: "https://icp-api.io", // or "http://localhost:4943" for local
});

// Option 2: Admin access using Solana keypair
const solanaKeypair = Keypair.generate(); // or load from wallet
const icpWithAdmin = new ICPModule({
  canisterId: "your-canister-id",
  host: "https://ic0.app",
  solanaKeypair, // SDK automatically derives ICP identity
});

// Option 3: Manually create identity from Solana keypair
// Both Solana and ICP use Ed25519, so this is a direct conversion
const identity = ICPModule.createIdentityFromSolanaKeypair(solanaKeypair);
const icpWithIdentity = new ICPModule({
  canisterId: "your-canister-id",
  host: "https://ic0.app",
  identity,
});

// Option 4: Create identity from raw Ed25519 secret key
const secretKey = new Uint8Array(32); // Your 32-byte Ed25519 secret key
const identityFromKey = ICPModule.createIdentityFromSecretKey(secretKey);
```

### Generate a Round Seed (Admin Only)

```typescript
try {
  const [seedHex, signatureHex] = await icp.generateRoundSeed(roundId);
  console.log("Seed:", seedHex);
  console.log("Signature:", signatureHex);
} catch (error) {
  console.error("Failed to generate seed:", error);
}
```

### Retrieve a Round Seed

```typescript
// Get seed only
const seedHex = await icp.getRoundSeed(roundId);

// Get signature only
const signatureHex = await icp.getRoundSignature(roundId);

// Get both together
const data = await icp.getRoundSeedWithSignature(roundId);
if (data) {
  console.log("Seed:", data.seed);
  console.log("Signature:", data.signature);
}
```

### Get ICP Public Key

```typescript
// Initialize pubkey (admin only, once)
await icp.initOrbsIcPubkey();

// Retrieve pubkey (anyone)
const pubkeyHex = await icp.getOrbsIcPubkey();
console.log("ICP ECDSA Pubkey:", pubkeyHex);
```

## Seed Utilities

The SDK provides utility functions for working with seeds:

```typescript
import {
  hexToSeed,
  hexToSignature,
  constructSeedMessage,
  hashSeedMessage,
  parseSeedResponse,
  isValidSeedHex,
  isValidSignatureHex,
} from "@orbs-game/sdk";

// Convert hex to bytes
const seedBytes = hexToSeed(seedHex); // 32 bytes
const signatureBytes = hexToSignature(signatureHex); // 64 bytes

// Construct the signed message
const message = constructSeedMessage(roundId, seedHex);
// Returns: "OrbsSeed\nRound:123\nSeed:abcdef..."

// Hash the message for verification
const messageHash = hashSeedMessage(message);

// Parse ICP response
const { seed, signature } = parseSeedResponse(seedHex, signatureHex);

// Validate formats
if (isValidSeedHex(seedHex) && isValidSignatureHex(signatureHex)) {
  // Valid formats
}
```

## Admin Operations

### Add Players to Whitelist

```typescript
const pubkeys = [
  new Uint8Array(32), // Player 1 pubkey
  new Uint8Array(32), // Player 2 pubkey
];

await icp.addPlayers(pubkeys);
```

### Get Players (Paginated)

```typescript
const page = await icp.getPlayers(0, 100); // offset, limit
console.log("Total players:", page.total);
console.log("Players:", page.players);
```

### Set Admin

```typescript
await icp.setAdmin("principal-id-here");
```

## Seed Verification Flow

1. **Generate seed on ICP**: Admin calls `generateRoundSeed(roundId)`
2. **ICP generates random seed**: Uses `raw_rand()` for 32 bytes
3. **ICP constructs message**: `"OrbsSeed\nRound:{round}\nSeed:{seed_hex}"`
4. **ICP signs message**: Uses threshold ECDSA to sign SHA-256 hash
5. **Store seed + signature**: Both stored in canister stable memory
6. **Retrieve on Solana**: Frontend fetches seed and signature
7. **Verify signature**: Solana program or client verifies ECDSA signature
8. **Use seed**: Seed is used for deterministic game simulation

## Message Format

The signed message follows this exact format:

```
OrbsSeed
Round:{roundId}
Seed:{seedHex}
```

Example:
```
OrbsSeed
Round:123
Seed:a1b2c3d4e5f6...
```

This message is hashed with SHA-256 and signed using ICP's threshold ECDSA.

## Error Handling

```typescript
try {
  const [seed, sig] = await icp.generateRoundSeed(roundId);
} catch (error) {
  if (error.message.includes("already exists")) {
    // Seed already generated for this round
  } else if (error.message.includes("unauthorized")) {
    // Caller is not admin
  } else {
    // Other error
  }
}
```

## Local Development

For local development with dfx:

```typescript
const icp = new ICPModule({
  canisterId: "your-local-canister-id",
  host: "http://localhost:4943",
  identity: yourIdentity,
});
```

The module will automatically fetch the root key for local development.

## Security Considerations

1. **Admin-only operations**: Seed generation, player management, and admin management require admin privileges
2. **One seed per round**: Each round can only have one seed generated (immutable)
3. **Signature verification**: Always verify signatures on-chain or client-side before using seeds
4. **Public key caching**: ICP public key is cached in canister stable storage for efficiency
5. **Deterministic**: Seeds are cryptographically random but verifiable via signatures

## Integration with Solana Program

The seeds generated by ICP can be used with the Solana program:

```typescript
import { OrbsGameSDK, ICPModule } from "@orbs-game/sdk";

// Initialize both modules
const sdk = new OrbsGameSDK({ provider });
const icp = new ICPModule({ canisterId });

// Generate seed on ICP
const [seedHex, signatureHex] = await icp.generateRoundSeed(roundId);

// Convert to bytes
const seed = hexToSeed(seedHex);

// Use seed in Solana program
// (Signature verification happens on-chain or client-side)
```

## TypeScript Types

```typescript
interface RoundSeedWithSignature {
  seed: string; // hex-encoded
  signature: string; // hex-encoded
}

interface PlayerPage {
  total: bigint;
  players: Uint8Array[];
}

interface ICPModuleConfig {
  canisterId: string;
  host?: string;
  identity?: any;
}
```

## Testing

For testing purposes, you can generate deterministic test seeds:

```typescript
import { generateTestSeed } from "@orbs-game/sdk";

// DO NOT USE IN PRODUCTION
const testSeed = generateTestSeed(roundId);
```

## Further Reading

- [ICP Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)
- [Candid Interface](https://internetcomputer.org/docs/current/developer-docs/backend/candid/)
- [Orbs Game Documentation](../docs/DOCUMENTATION.md)
