/**
 * Orbs Game SDK - Main export file
 * Provides a clean public API for the SDK
 */
export { OrbsGameSDK } from "./client";
export * from "./types";
export * from "./constants";
export { calculateFees, calculatePoints } from "./utils/calculations";
export { sendWithRetry, sendWithFreshBlockhash, waitFor, sleep, batchArray } from "./utils/transaction";
export { encodeU64BE, encodeU16BE, encodeU64LE, encodeU32LE } from "./utils/encoding";
export { createSettlementData, createPayoutData, createStatsData } from "./utils/builders";
export { constructSeedMessage, hashSeedMessage, hexToBytes, bytesToHex, hexToSeed, hexToSignature, isValidSeedHex, isValidSignatureHex, generateTestSeed, parseSeedResponse, } from "./utils/seed";
export { sha256, sha256JSON, sha256Bytes, sha256Both, sha256JSONBoth, } from "./utils/hash";
export { mergeRosterWithConfig, rosterToHex, } from "./utils/roster";
export type { RoundPlayerData, PlayerConfigRecordData, PlayerJoinDataForEngine, MergedRosterEntry, RosterMergeResult, } from "./utils/roster";
export { CHUNK_SIZE, computeLeafHash, computeNodeHash, merkleVerify, verifySeedProof, constructChunkRootMessage, } from "./utils/merkle";
export { PLAYER_CONFIG_HASH_VERSION, PLAYER_CONFIG_PREIMAGE_SIZE, quantizeSpawn, dequantizeSpawn, buildPlayerConfigPreimage, computePlayerConfigHash, computePlayerConfigHashHex, hexToUint8Array, uint8ArrayToHex, } from "./utils/player-config";
export type { QuantizedSpawn, DequantizedSpawn, SkillAllocation, PlayerConfigHashParams, } from "./utils/player-config";
export { AccountsModule } from "./modules/accounts";
export { FetchModule } from "./modules/fetch";
export type { RosterEntry } from "./modules/fetch";
export { ICPModule } from "./modules/icp";
export type { ICPModuleConfig, SeedProof, PlayerPage, RoundPlayerSnapshotInput, RoundPlayerSnapshotData, RoundPlayerSnapshot, RoundSnapshot, RoundSnapshotPage, EngineConfig, PlayerJoinDataInput, PlayerJoinData, PlayerJoinDataOutput, } from "./modules/icp";
export { MatrixModule, MatrixWorkerError, buildAuthMessage, signAuthChallenge, generateRandomSpawn } from "./modules/matrix";
export type { MatrixModuleConfig, MatrixStartRequest, MatrixStartResponse, MatrixSubmitRequest, MatrixSubmitResponse, MatrixStateRequest, MatrixStateResponse, MatrixEventRequest, MatrixEventResponse, MatrixBroadcastRequest, MatrixBroadcastResponse, MatrixEvent, AttemptStateSnapshot, SkillFlowConfig, TranscriptEvent, SpawnPosition, MatrixApiError, AuthChallengeRequest, AuthChallengeResponse, AuthVerifyRequest, AuthVerifyResponse, } from "./modules/matrix";
export { GlobalCheckpoint, SeasonalCheckpoint, CheckpointPoints, CHECKPOINTS, hasSeasonalCheckpoint, hasGlobalCheckpoint, getClaimedSeasonalCheckpoints, getClaimedGlobalCheckpoints, getUnclaimedSeasonalCheckpoints, getUnclaimedGlobalCheckpoints, calculateCheckpointPoints, getCheckpointSummary, } from "./modules/checkpoints";
export type { CheckpointInfo } from "./modules/checkpoints";
//# sourceMappingURL=index.d.ts.map