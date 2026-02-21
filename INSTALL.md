# Installation Guide

## Prerequisites

- Node.js 16+ and npm/yarn
- TypeScript 5.0+

## Install SDK

```bash
npm install @orbs-game/sdk
```

## Install ICP Dependencies (Optional)

If you plan to use the ICP module for seed generation:

```bash
npm install @dfinity/agent @dfinity/principal @dfinity/identity
```

These dependencies are already listed in the SDK's `package.json`, but you may need to install them explicitly depending on your package manager.

## Build from Source

If you want to build the SDK from source:

```bash
# Clone the repository
git clone https://github.com/your-org/orbs-game.git
cd orbs-game/sdk

# Install dependencies
npm install

# Build
npm run build

# The compiled SDK will be in the dist/ directory
```

## TypeScript Configuration

Make sure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "resolveJsonModule": true
  }
}
```

## Verify Installation

Create a test file to verify the SDK is working:

```typescript
// test.ts
import { OrbsGameSDK, ICPModule } from "@orbs-game/sdk";

console.log("✅ SDK imported successfully!");
console.log("OrbsGameSDK:", typeof OrbsGameSDK);
console.log("ICPModule:", typeof ICPModule);
```

Run it:

```bash
npx ts-node test.ts
```

## Next Steps

- Read the [README](./README.md) for basic usage
- Check out [ICP_INTEGRATION.md](./ICP_INTEGRATION.md) for ICP seed generation
- Explore [examples/](./examples/) for complete code samples

## Troubleshooting

### Module not found errors

If you see errors like `Cannot find module '@dfinity/agent'`:

```bash
npm install @dfinity/agent @dfinity/principal
```

### TypeScript compilation errors

Make sure you're using TypeScript 5.0+:

```bash
npm install -D typescript@^5.0.0
```

### Solana/Anchor version conflicts

The SDK requires:
- `@solana/web3.js` ^1.95.0
- `@coral-xyz/anchor` ^0.32.0

If you have version conflicts, try:

```bash
npm install @solana/web3.js@^1.95.0 @coral-xyz/anchor@^0.32.0
```

## Support

For issues or questions:
- Open an issue on GitHub
- Check the documentation in `/docs`
- Review the examples in `/examples`
