"use strict";
/**
 * Orbs Game SDK - Main export file
 * Provides a clean public API for the SDK
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICPModule = exports.FetchModule = exports.AccountsModule = exports.uint8ArrayToHex = exports.hexToUint8Array = exports.computePlayerConfigHashHex = exports.computePlayerConfigHash = exports.buildPlayerConfigPreimage = exports.dequantizeSpawn = exports.quantizeSpawn = exports.PLAYER_CONFIG_PREIMAGE_SIZE = exports.PLAYER_CONFIG_HASH_VERSION = exports.constructChunkRootMessage = exports.verifySeedProof = exports.merkleVerify = exports.computeNodeHash = exports.computeLeafHash = exports.CHUNK_SIZE = exports.rosterToHex = exports.mergeRosterWithConfig = exports.sha256JSONBoth = exports.sha256Both = exports.sha256Bytes = exports.sha256JSON = exports.sha256 = exports.parseSeedResponse = exports.generateTestSeed = exports.isValidSignatureHex = exports.isValidSeedHex = exports.hexToSignature = exports.hexToSeed = exports.bytesToHex = exports.hexToBytes = exports.hashSeedMessage = exports.constructSeedMessage = exports.createStatsData = exports.createPayoutData = exports.createSettlementData = exports.encodeU32LE = exports.encodeU64LE = exports.encodeU16BE = exports.encodeU64BE = exports.batchArray = exports.sleep = exports.waitFor = exports.sendWithFreshBlockhash = exports.sendWithRetry = exports.calculatePoints = exports.calculateFees = exports.OrbsGameSDK = void 0;
exports.getCheckpointSummary = exports.calculateCheckpointPoints = exports.getUnclaimedGlobalCheckpoints = exports.getUnclaimedSeasonalCheckpoints = exports.getClaimedGlobalCheckpoints = exports.getClaimedSeasonalCheckpoints = exports.hasGlobalCheckpoint = exports.hasSeasonalCheckpoint = exports.CHECKPOINTS = exports.CheckpointPoints = exports.SeasonalCheckpoint = exports.GlobalCheckpoint = exports.generateRandomSpawn = exports.signAuthChallenge = exports.buildAuthMessage = exports.MatrixWorkerError = exports.MatrixModule = void 0;
// Main client
var client_1 = require("./client");
Object.defineProperty(exports, "OrbsGameSDK", { enumerable: true, get: function () { return client_1.OrbsGameSDK; } });
// Types
__exportStar(require("./types"), exports);
// Constants
__exportStar(require("./constants"), exports);
// Utilities (selective exports for advanced users)
var calculations_1 = require("./utils/calculations");
Object.defineProperty(exports, "calculateFees", { enumerable: true, get: function () { return calculations_1.calculateFees; } });
Object.defineProperty(exports, "calculatePoints", { enumerable: true, get: function () { return calculations_1.calculatePoints; } });
var transaction_1 = require("./utils/transaction");
Object.defineProperty(exports, "sendWithRetry", { enumerable: true, get: function () { return transaction_1.sendWithRetry; } });
Object.defineProperty(exports, "sendWithFreshBlockhash", { enumerable: true, get: function () { return transaction_1.sendWithFreshBlockhash; } });
Object.defineProperty(exports, "waitFor", { enumerable: true, get: function () { return transaction_1.waitFor; } });
Object.defineProperty(exports, "sleep", { enumerable: true, get: function () { return transaction_1.sleep; } });
Object.defineProperty(exports, "batchArray", { enumerable: true, get: function () { return transaction_1.batchArray; } });
var encoding_1 = require("./utils/encoding");
Object.defineProperty(exports, "encodeU64BE", { enumerable: true, get: function () { return encoding_1.encodeU64BE; } });
Object.defineProperty(exports, "encodeU16BE", { enumerable: true, get: function () { return encoding_1.encodeU16BE; } });
Object.defineProperty(exports, "encodeU64LE", { enumerable: true, get: function () { return encoding_1.encodeU64LE; } });
Object.defineProperty(exports, "encodeU32LE", { enumerable: true, get: function () { return encoding_1.encodeU32LE; } });
var builders_1 = require("./utils/builders");
Object.defineProperty(exports, "createSettlementData", { enumerable: true, get: function () { return builders_1.createSettlementData; } });
Object.defineProperty(exports, "createPayoutData", { enumerable: true, get: function () { return builders_1.createPayoutData; } });
Object.defineProperty(exports, "createStatsData", { enumerable: true, get: function () { return builders_1.createStatsData; } });
var seed_1 = require("./utils/seed");
Object.defineProperty(exports, "constructSeedMessage", { enumerable: true, get: function () { return seed_1.constructSeedMessage; } });
Object.defineProperty(exports, "hashSeedMessage", { enumerable: true, get: function () { return seed_1.hashSeedMessage; } });
Object.defineProperty(exports, "hexToBytes", { enumerable: true, get: function () { return seed_1.hexToBytes; } });
Object.defineProperty(exports, "bytesToHex", { enumerable: true, get: function () { return seed_1.bytesToHex; } });
Object.defineProperty(exports, "hexToSeed", { enumerable: true, get: function () { return seed_1.hexToSeed; } });
Object.defineProperty(exports, "hexToSignature", { enumerable: true, get: function () { return seed_1.hexToSignature; } });
Object.defineProperty(exports, "isValidSeedHex", { enumerable: true, get: function () { return seed_1.isValidSeedHex; } });
Object.defineProperty(exports, "isValidSignatureHex", { enumerable: true, get: function () { return seed_1.isValidSignatureHex; } });
Object.defineProperty(exports, "generateTestSeed", { enumerable: true, get: function () { return seed_1.generateTestSeed; } });
Object.defineProperty(exports, "parseSeedResponse", { enumerable: true, get: function () { return seed_1.parseSeedResponse; } });
var hash_1 = require("./utils/hash");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hash_1.sha256; } });
Object.defineProperty(exports, "sha256JSON", { enumerable: true, get: function () { return hash_1.sha256JSON; } });
Object.defineProperty(exports, "sha256Bytes", { enumerable: true, get: function () { return hash_1.sha256Bytes; } });
Object.defineProperty(exports, "sha256Both", { enumerable: true, get: function () { return hash_1.sha256Both; } });
Object.defineProperty(exports, "sha256JSONBoth", { enumerable: true, get: function () { return hash_1.sha256JSONBoth; } });
var roster_1 = require("./utils/roster");
Object.defineProperty(exports, "mergeRosterWithConfig", { enumerable: true, get: function () { return roster_1.mergeRosterWithConfig; } });
Object.defineProperty(exports, "rosterToHex", { enumerable: true, get: function () { return roster_1.rosterToHex; } });
var merkle_1 = require("./utils/merkle");
Object.defineProperty(exports, "CHUNK_SIZE", { enumerable: true, get: function () { return merkle_1.CHUNK_SIZE; } });
Object.defineProperty(exports, "computeLeafHash", { enumerable: true, get: function () { return merkle_1.computeLeafHash; } });
Object.defineProperty(exports, "computeNodeHash", { enumerable: true, get: function () { return merkle_1.computeNodeHash; } });
Object.defineProperty(exports, "merkleVerify", { enumerable: true, get: function () { return merkle_1.merkleVerify; } });
Object.defineProperty(exports, "verifySeedProof", { enumerable: true, get: function () { return merkle_1.verifySeedProof; } });
Object.defineProperty(exports, "constructChunkRootMessage", { enumerable: true, get: function () { return merkle_1.constructChunkRootMessage; } });
var player_config_1 = require("./utils/player-config");
Object.defineProperty(exports, "PLAYER_CONFIG_HASH_VERSION", { enumerable: true, get: function () { return player_config_1.PLAYER_CONFIG_HASH_VERSION; } });
Object.defineProperty(exports, "PLAYER_CONFIG_PREIMAGE_SIZE", { enumerable: true, get: function () { return player_config_1.PLAYER_CONFIG_PREIMAGE_SIZE; } });
Object.defineProperty(exports, "quantizeSpawn", { enumerable: true, get: function () { return player_config_1.quantizeSpawn; } });
Object.defineProperty(exports, "dequantizeSpawn", { enumerable: true, get: function () { return player_config_1.dequantizeSpawn; } });
Object.defineProperty(exports, "buildPlayerConfigPreimage", { enumerable: true, get: function () { return player_config_1.buildPlayerConfigPreimage; } });
Object.defineProperty(exports, "computePlayerConfigHash", { enumerable: true, get: function () { return player_config_1.computePlayerConfigHash; } });
Object.defineProperty(exports, "computePlayerConfigHashHex", { enumerable: true, get: function () { return player_config_1.computePlayerConfigHashHex; } });
Object.defineProperty(exports, "hexToUint8Array", { enumerable: true, get: function () { return player_config_1.hexToUint8Array; } });
Object.defineProperty(exports, "uint8ArrayToHex", { enumerable: true, get: function () { return player_config_1.uint8ArrayToHex; } });
// Modules (for advanced users who want direct access)
var accounts_1 = require("./modules/accounts");
Object.defineProperty(exports, "AccountsModule", { enumerable: true, get: function () { return accounts_1.AccountsModule; } });
var fetch_1 = require("./modules/fetch");
Object.defineProperty(exports, "FetchModule", { enumerable: true, get: function () { return fetch_1.FetchModule; } });
var icp_1 = require("./modules/icp");
Object.defineProperty(exports, "ICPModule", { enumerable: true, get: function () { return icp_1.ICPModule; } });
var matrix_1 = require("./modules/matrix");
Object.defineProperty(exports, "MatrixModule", { enumerable: true, get: function () { return matrix_1.MatrixModule; } });
Object.defineProperty(exports, "MatrixWorkerError", { enumerable: true, get: function () { return matrix_1.MatrixWorkerError; } });
Object.defineProperty(exports, "buildAuthMessage", { enumerable: true, get: function () { return matrix_1.buildAuthMessage; } });
Object.defineProperty(exports, "signAuthChallenge", { enumerable: true, get: function () { return matrix_1.signAuthChallenge; } });
Object.defineProperty(exports, "generateRandomSpawn", { enumerable: true, get: function () { return matrix_1.generateRandomSpawn; } });
// Checkpoint helpers
var checkpoints_1 = require("./modules/checkpoints");
Object.defineProperty(exports, "GlobalCheckpoint", { enumerable: true, get: function () { return checkpoints_1.GlobalCheckpoint; } });
Object.defineProperty(exports, "SeasonalCheckpoint", { enumerable: true, get: function () { return checkpoints_1.SeasonalCheckpoint; } });
Object.defineProperty(exports, "CheckpointPoints", { enumerable: true, get: function () { return checkpoints_1.CheckpointPoints; } });
Object.defineProperty(exports, "CHECKPOINTS", { enumerable: true, get: function () { return checkpoints_1.CHECKPOINTS; } });
Object.defineProperty(exports, "hasSeasonalCheckpoint", { enumerable: true, get: function () { return checkpoints_1.hasSeasonalCheckpoint; } });
Object.defineProperty(exports, "hasGlobalCheckpoint", { enumerable: true, get: function () { return checkpoints_1.hasGlobalCheckpoint; } });
Object.defineProperty(exports, "getClaimedSeasonalCheckpoints", { enumerable: true, get: function () { return checkpoints_1.getClaimedSeasonalCheckpoints; } });
Object.defineProperty(exports, "getClaimedGlobalCheckpoints", { enumerable: true, get: function () { return checkpoints_1.getClaimedGlobalCheckpoints; } });
Object.defineProperty(exports, "getUnclaimedSeasonalCheckpoints", { enumerable: true, get: function () { return checkpoints_1.getUnclaimedSeasonalCheckpoints; } });
Object.defineProperty(exports, "getUnclaimedGlobalCheckpoints", { enumerable: true, get: function () { return checkpoints_1.getUnclaimedGlobalCheckpoints; } });
Object.defineProperty(exports, "calculateCheckpointPoints", { enumerable: true, get: function () { return checkpoints_1.calculateCheckpointPoints; } });
Object.defineProperty(exports, "getCheckpointSummary", { enumerable: true, get: function () { return checkpoints_1.getCheckpointSummary; } });
