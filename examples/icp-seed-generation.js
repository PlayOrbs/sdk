"use strict";
/**
 * Example: ICP Seed Generation and Retrieval
 *
 * This example demonstrates how to:
 * 1. Initialize the ICP module
 * 2. Generate seeds for rounds (admin only)
 * 3. Retrieve seeds and signatures
 * 4. Use seeds with the Solana program
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeICPModule = initializeICPModule;
exports.initializeICPModuleWithAdmin = initializeICPModuleWithAdmin;
exports.generateRoundSeed = generateRoundSeed;
exports.retrieveRoundSeed = retrieveRoundSeed;
exports.verifySeedMessage = verifySeedMessage;
exports.getICPPublicKey = getICPPublicKey;
exports.initializeICPPublicKey = initializeICPPublicKey;
exports.addPlayersToWhitelist = addPlayersToWhitelist;
exports.getPlayers = getPlayers;
exports.completeWorkflow = completeWorkflow;
const index_js_1 = require("../src/index.js");
const web3_js_1 = require("@solana/web3.js");
// Example configuration
const CANISTER_ID = "your-canister-id-here";
const ICP_HOST = "https://icp-api.io"; // or "http://localhost:4943" for local
/**
 * Example 1: Initialize ICP Module
 */
function initializeICPModule() {
    return __awaiter(this, void 0, void 0, function* () {
        // For read-only operations (no identity needed)
        const icp = new index_js_1.ICPModule({
            canisterId: CANISTER_ID,
            host: ICP_HOST,
        });
        return icp;
    });
}
/**
 * Example 2: Initialize ICP Module with Admin Identity from Ed25519 Secret Key
 */
function initializeICPModuleWithAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        // For admin operations, provide an Ed25519 secret key
        // Can be extracted from Solana keypair or any Ed25519 key
        const solanaKeypair = web3_js_1.Keypair.generate(); // In production, load from secure storage
        const secretKey = solanaKeypair.secretKey.slice(0, 32); // Extract 32-byte Ed25519 secret
        const icp = new index_js_1.ICPModule({
            canisterId: CANISTER_ID,
            host: ICP_HOST,
            secretKey, // SDK derives ICP identity from secret key
        });
        return icp;
    });
}
/**
 * Example 2b: Initialize ICP Module with Existing Ed25519 Key
 */
function initializeICPModuleWithSecretKey(secretKey) {
    return __awaiter(this, void 0, void 0, function* () {
        // Use an existing Ed25519 secret key (32 bytes)
        // Can be from Solana keypair, raw bytes, or any Ed25519 source
        const icp = new index_js_1.ICPModule({
            canisterId: CANISTER_ID,
            host: ICP_HOST,
            secretKey,
        });
        return icp;
    });
}
/**
 * Example 2c: Manually Create Identity from Secret Key
 */
function createIdentityManually(secretKey) {
    return __awaiter(this, void 0, void 0, function* () {
        // You can also manually create the identity
        const identity = index_js_1.ICPModule.createIdentityFromSecretKey(secretKey);
        const icp = new index_js_1.ICPModule({
            canisterId: CANISTER_ID,
            host: ICP_HOST,
            identity,
        });
        return icp;
    });
}
/**
 * Example 3: Generate a Round Seed (Admin Only)
 */
function generateRoundSeed(roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        const icp = yield initializeICPModuleWithAdmin();
        try {
            console.log(`Generating seed for round ${roundId}...`);
            const [seedHex, signatureHex] = yield icp.generateRoundSeed(roundId);
            console.log("✅ Seed generated successfully!");
            console.log("Seed (hex):", seedHex);
            console.log("Signature (hex):", signatureHex);
            // Convert to bytes for use in Solana program
            const seedBytes = (0, index_js_1.hexToSeed)(seedHex);
            const signatureBytes = (0, index_js_1.hexToSignature)(signatureHex);
            console.log("Seed (bytes):", seedBytes);
            console.log("Signature (bytes):", signatureBytes);
            return { seedHex, signatureHex, seedBytes, signatureBytes };
        }
        catch (error) {
            console.error("❌ Failed to generate seed:", error);
            throw error;
        }
    });
}
/**
 * Example 4: Retrieve an Existing Seed
 */
function retrieveRoundSeed(roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        const icp = yield initializeICPModule();
        try {
            console.log(`Retrieving seed for round ${roundId}...`);
            const data = yield icp.getRoundSeedWithSignature(roundId);
            if (!data) {
                console.log("⚠️  No seed found for this round");
                return null;
            }
            console.log("✅ Seed retrieved successfully!");
            console.log("Seed (hex):", data.seed);
            console.log("Signature (hex):", data.signature);
            // Convert to bytes
            const seedBytes = (0, index_js_1.hexToSeed)(data.seed);
            const signatureBytes = (0, index_js_1.hexToSignature)(data.signature);
            return Object.assign(Object.assign({}, data), { seedBytes, signatureBytes });
        }
        catch (error) {
            console.error("❌ Failed to retrieve seed:", error);
            throw error;
        }
    });
}
/**
 * Example 5: Verify Seed Message Format
 */
function verifySeedMessage(roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        const icp = yield initializeICPModule();
        const data = yield icp.getRoundSeedWithSignature(roundId);
        if (!data) {
            throw new Error("Seed not found");
        }
        // Construct the message that was signed
        const message = (0, index_js_1.constructSeedMessage)(roundId, data.seed);
        console.log("Signed message:");
        console.log(message);
        // This message format is:
        // OrbsSeed
        // Round:{roundId}
        // Seed:{seedHex}
        return message;
    });
}
/**
 * Example 6: Get ICP Public Key
 */
function getICPPublicKey() {
    return __awaiter(this, void 0, void 0, function* () {
        const icp = yield initializeICPModule();
        try {
            const pubkeyHex = yield icp.getOrbsIcPubkey();
            console.log("✅ ICP ECDSA Public Key:", pubkeyHex);
            return pubkeyHex;
        }
        catch (error) {
            console.error("❌ Failed to get public key:", error);
            console.log("💡 Hint: Public key may not be initialized yet. Admin must call initOrbsIcPubkey() first.");
            throw error;
        }
    });
}
/**
 * Example 7: Initialize ICP Public Key (Admin Only, One-Time)
 */
function initializeICPPublicKey() {
    return __awaiter(this, void 0, void 0, function* () {
        const icp = yield initializeICPModuleWithAdmin();
        try {
            console.log("Initializing ICP public key...");
            yield icp.initOrbsIcPubkey();
            console.log("✅ Public key initialized successfully!");
            // Now retrieve it
            const pubkeyHex = yield icp.getOrbsIcPubkey();
            console.log("Public Key:", pubkeyHex);
            return pubkeyHex;
        }
        catch (error) {
            console.error("❌ Failed to initialize public key:", error);
            throw error;
        }
    });
}
/**
 * Example 8: Add Players to Whitelist (Admin Only)
 */
function addPlayersToWhitelist(playerPubkeys) {
    return __awaiter(this, void 0, void 0, function* () {
        const icp = yield initializeICPModuleWithAdmin();
        try {
            console.log(`Adding ${playerPubkeys.length} players to whitelist...`);
            yield icp.addPlayers(playerPubkeys);
            console.log("✅ Players added successfully!");
        }
        catch (error) {
            console.error("❌ Failed to add players:", error);
            throw error;
        }
    });
}
/**
 * Example 9: Get Players (Paginated)
 */
function getPlayers() {
    return __awaiter(this, arguments, void 0, function* (offset = 0, limit = 100) {
        const icp = yield initializeICPModule();
        try {
            console.log(`Fetching players (offset: ${offset}, limit: ${limit})...`);
            const page = yield icp.getPlayers(offset, limit);
            console.log(`✅ Total players: ${page.total}`);
            console.log(`✅ Fetched: ${page.players.length} players`);
            // Display first few players
            page.players.slice(0, 5).forEach((pubkey, i) => {
                console.log(`Player ${offset + i + 1}:`, Buffer.from(pubkey).toString("hex"));
            });
            return page;
        }
        catch (error) {
            console.error("❌ Failed to get players:", error);
            throw error;
        }
    });
}
/**
 * Example 10: Complete Workflow - Generate and Use Seed
 */
function completeWorkflow(roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("=== Complete ICP Seed Workflow ===\n");
        // Step 1: Initialize public key (one-time, admin only)
        console.log("Step 1: Initialize ICP public key");
        try {
            yield initializeICPPublicKey();
        }
        catch (error) {
            console.log("Public key already initialized or error occurred");
        }
        console.log();
        // Step 2: Generate seed for round
        console.log(`Step 2: Generate seed for round ${roundId}`);
        const { seedHex, signatureHex, seedBytes, signatureBytes } = yield generateRoundSeed(roundId);
        console.log();
        // Step 3: Verify message format
        console.log("Step 3: Verify signed message format");
        const message = yield verifySeedMessage(roundId);
        console.log();
        // Step 4: Retrieve seed (simulating another client)
        console.log("Step 4: Retrieve seed from another client");
        const retrieved = yield retrieveRoundSeed(roundId);
        console.log();
        // Step 5: Verify consistency
        console.log("Step 5: Verify consistency");
        if (retrieved && retrieved.seed === seedHex && retrieved.signature === signatureHex) {
            console.log("✅ Seed and signature match!");
        }
        else {
            console.log("❌ Mismatch detected!");
        }
        console.log();
        // Step 6: Use seed in Solana program
        console.log("Step 6: Ready to use in Solana program");
        console.log("Seed bytes:", seedBytes);
        console.log("Signature bytes:", signatureBytes);
        console.log("Message:", message);
        console.log();
        return {
            seedBytes,
            signatureBytes,
            message,
        };
    });
}
/**
 * Main execution
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Example: Complete workflow for round 1
            yield completeWorkflow(1);
            // Example: Get players
            yield getPlayers(0, 10);
            // Example: Get ICP public key
            yield getICPPublicKey();
        }
        catch (error) {
            console.error("Error in main:", error);
            process.exit(1);
        }
    });
}
// Run if executed directly
if (require.main === module) {
    main();
}
