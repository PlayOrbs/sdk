/**
 * ICP module for interacting with Internet Computer canister
 * Handles seed generation and retrieval from ICP backend
 * 
 * Note: Requires @dfinity packages to be installed in your project:
 * - @dfinity/agent
 * - @dfinity/identity
 * - @dfinity/principal
 * - @dfinity/candid
 */



// Dynamic imports for @dfinity packages (ES modules)
let HttpAgent: any;
let Actor: any;
let Ed25519KeyIdentity: any;
let Principal: any;
let IDL: any;

// Lazy load @dfinity packages
let dfinityLoadPromise: Promise<void> | null = null;

async function loadDfinityPackages() {
  // Use a shared promise to prevent race conditions
  if (dfinityLoadPromise) {
    return dfinityLoadPromise;
  }
  
  if (Principal) {
    // Already loaded
    return;
  }
  
  dfinityLoadPromise = (async () => {
    try {
      const [agent, identity, principal, candid] = await Promise.all([
        import("@dfinity/agent"),
        import("@dfinity/identity"),
        import("@dfinity/principal"),
        import("@dfinity/candid"),
      ]);
      
      HttpAgent = agent.HttpAgent;
      Actor = agent.Actor;
      Ed25519KeyIdentity = identity.Ed25519KeyIdentity;
      Principal = principal.Principal;
      IDL = candid.IDL;
      
      if (!Principal) {
        throw new Error("Failed to load Principal from @dfinity/principal");
      }
    } catch (error) {
      dfinityLoadPromise = null; // Allow retry on failure
      throw new Error(`Failed to load @dfinity packages: ${error}`);
    }
  })();
  
  return dfinityLoadPromise;
}

/**
 * ICP Canister response types
 */

/**
 * Seed proof for Merkle-based verification
 * Contains the seed, Merkle proof, and chunk signature
 */
export interface SeedProof {
  /** The seed value (32 bytes) */
  seed: Uint8Array;
  /** Chunk ID this seed belongs to */
  chunk_id: bigint;
  /** Merkle root of the chunk (32 bytes) */
  merkle_root: Uint8Array;
  /** ECDSA signature over the chunk root message (64 bytes) */
  root_signature: Uint8Array;
  /** Sibling hashes for Merkle proof (from leaf to root) */
  proof_siblings: Uint8Array[];
  /** Position flags: false = left child, true = right child */
  proof_positions: boolean[];
}

export interface PlayerPage {
  total: bigint;
  players: Uint8Array[];
}

export interface RoundPlayerSnapshotInput {
  player: string;  // hex-encoded 32-byte pubkey
  join_ts: bigint;
  tp_preset: number;
  payout_lamports: bigint;
  placement: number;
  kills: number;
  orb_earned_atoms: bigint;
  player_config_hash?: string;  // V2: hex-encoded 32-byte commitment hash
}

export interface RoundPlayerSnapshotData {
  player: string;  // hex-encoded 32-byte pubkey
  joinTs: bigint;
  tpPreset: number;
  payoutLamports: bigint;
  placement: number;
  kills: number;
  orbEarnedAtoms: bigint;
  playerConfigHash?: string;  // V2: hex-encoded 32-byte commitment hash
}

export interface RoundPlayerSnapshot {
  player: Uint8Array;
  join_ts: bigint;
  tp_preset: number;
  payout_lamports: bigint;
  placement: number;
  kills: number;
  orb_earned_atoms: bigint;
  player_config_hash?: Uint8Array;  // V2: 32-byte commitment hash
}

export interface RoundSnapshot {
  tier_id: number;
  round_id: bigint;
  season_id: number;
  players: RoundPlayerSnapshot[];  // BTreeSet serializes as array in Candid
  did_emit: boolean;  // Whether ORB emission occurred for this round
  config_version: string;  // Engine config version used for this round (e.g., "1.2.2")
}

export interface RoundSnapshotPage {
  total: bigint;
  snapshots: RoundSnapshot[];
}

export interface RoundHistoryEntry {
  tier_id: number;
  round_id: bigint;
  season_id: number;
}

export interface PlayerRoundRef {
  round_key: bigint;  // u128 composite key
  join_ts: bigint;
  placement: number;
  kills: number;
  sol_earned_lamports: bigint;
}

export interface PlayerRoundHistoryEntry {
  tier_id: number;
  round_id: bigint;
  season_id: number;
  join_ts: bigint;
  placement: number;
  kills: number;
  sol_earned_lamports: bigint;
  orb_earned_atoms: bigint;
}

export interface PlayerRoundHistoryPage {
  total: bigint;
  rounds: PlayerRoundHistoryEntry[];
}

export interface EngineConfig {
  version: string;
  config_json: string;
  created_at: bigint;
}

// Player join data types
export interface PlayerJoinDataInput {
  player: Uint8Array;       // 32 bytes pubkey
  tier_id: number;
  round_id: bigint;
  spawn_x_norm: number;
  spawn_y_norm: number;
  spawn_rot_rad: number;
  earned_sp: number;
  alloc_split_aggro: number;
  alloc_tether_res: number;
  alloc_orb_power: number;
}

export interface PlayerJoinData {
  spawn_x_norm: number;
  spawn_y_norm: number;
  spawn_rot_rad: number;
  earned_sp: number;
  alloc_split_aggro: number;
  alloc_tether_res: number;
  alloc_orb_power: number;
  stored_at: bigint;
}

export interface PlayerJoinDataOutput {
  player: Uint8Array;       // 32 bytes pubkey
  spawn_x_norm: number;
  spawn_y_norm: number;
  spawn_rot_rad: number;
  earned_sp: number;
  alloc_split_aggro: number;
  alloc_tether_res: number;
  alloc_orb_power: number;
  stored_at: bigint;
}

/**
 * ICP Canister IDL interface
 */
const icpIdl = ({ IDL }: any) => {
  // Seed proof for Merkle-based verification
  const SeedProofIDL = IDL.Record({
    seed: IDL.Vec(IDL.Nat8),           // [u8; 32]
    chunk_id: IDL.Nat64,
    merkle_root: IDL.Vec(IDL.Nat8),    // [u8; 32]
    root_signature: IDL.Vec(IDL.Nat8), // Vec<u8> (64 bytes)
    proof_siblings: IDL.Vec(IDL.Vec(IDL.Nat8)), // Vec<[u8; 32]>
    proof_positions: IDL.Vec(IDL.Bool),         // Vec<bool>
  });

  const PlayerPage = IDL.Record({
    total: IDL.Nat64,
    players: IDL.Vec(IDL.Vec(IDL.Nat8)),
  });

  const RoundPlayerSnapshotInput = IDL.Record({
    player: IDL.Text,  // base58-encoded pubkey
    join_ts: IDL.Nat64,
    tp_preset: IDL.Nat8,
    payout_lamports: IDL.Nat64,
    placement: IDL.Nat8,
    kills: IDL.Nat8,
    orb_earned_atoms: IDL.Nat64, // Required field for canister input
    player_config_hash: IDL.Opt(IDL.Text), // V2: hex-encoded 32-byte commitment hash
  });

  const RoundPlayerSnapshot = IDL.Record({
    player: IDL.Vec(IDL.Nat8),
    join_ts: IDL.Nat64,  // Fixed: was Int64, should be Nat64 to match canister
    tp_preset: IDL.Nat8,
    payout_lamports: IDL.Nat64,
    placement: IDL.Nat8,
    kills: IDL.Nat8,
    orb_earned_atoms: IDL.Opt(IDL.Nat64), // Optional for backwards compatibility
    player_config_hash: IDL.Opt(IDL.Vec(IDL.Nat8)), // V2: 32-byte commitment hash
  });

  const RoundSnapshot = IDL.Record({
    tier_id: IDL.Nat8,
    round_id: IDL.Nat64,
    season_id: IDL.Nat16,
    players: IDL.Vec(RoundPlayerSnapshot),
    did_emit: IDL.Bool,
    emit_tx_sig: IDL.Opt(IDL.Text), // Solana tx signature for ORB mint
    config_version: IDL.Text, // Engine config version used for this round
  });

  const RoundSnapshotPage = IDL.Record({
    total: IDL.Nat64,
    snapshots: IDL.Vec(RoundSnapshot),
  });

  const RoundHistoryEntry = IDL.Record({
    tier_id: IDL.Nat8,
    round_id: IDL.Nat64,
    season_id: IDL.Nat16,
  });

  const PlayerRoundHistoryEntry = IDL.Record({
    tier_id: IDL.Nat8,
    round_id: IDL.Nat64,
    season_id: IDL.Nat16,
    join_ts: IDL.Nat64,
    placement: IDL.Nat8,
    kills: IDL.Nat8,
    sol_earned_lamports: IDL.Nat64,
    orb_earned_atoms: IDL.Opt(IDL.Nat64), // Optional for backwards compatibility
  });

  const PlayerRoundHistoryPage = IDL.Record({
    total: IDL.Nat64,
    rounds: IDL.Vec(PlayerRoundHistoryEntry),
  });

  const EngineConfigIDL = IDL.Record({
    version: IDL.Text,
    config_json: IDL.Text,
    created_at: IDL.Nat64,
  });

  // Player join data types
  const PlayerJoinDataInputIDL = IDL.Record({
    player: IDL.Vec(IDL.Nat8),
    tier_id: IDL.Nat8,
    round_id: IDL.Nat64,
    spawn_x_norm: IDL.Float32,
    spawn_y_norm: IDL.Float32,
    spawn_rot_rad: IDL.Float32,
    earned_sp: IDL.Nat8,
    alloc_split_aggro: IDL.Nat8,
    alloc_tether_res: IDL.Nat8,
    alloc_orb_power: IDL.Nat8,
  });

  const PlayerJoinDataIDL = IDL.Record({
    spawn_x_norm: IDL.Float32,
    spawn_y_norm: IDL.Float32,
    spawn_rot_rad: IDL.Float32,
    earned_sp: IDL.Nat8,
    alloc_split_aggro: IDL.Nat8,
    alloc_tether_res: IDL.Nat8,
    alloc_orb_power: IDL.Nat8,
    stored_at: IDL.Nat64,
  });

  const PlayerJoinDataOutputIDL = IDL.Record({
    player: IDL.Vec(IDL.Nat8),
    spawn_x_norm: IDL.Float32,
    spawn_y_norm: IDL.Float32,
    spawn_rot_rad: IDL.Float32,
    earned_sp: IDL.Nat8,
    alloc_split_aggro: IDL.Nat8,
    alloc_tether_res: IDL.Nat8,
    alloc_orb_power: IDL.Nat8,
    stored_at: IDL.Nat64,
  });

  // Player config v2 types (quantized, with commitment hash)
  const PlayerConfigInputIDL = IDL.Record({
    player_config_hash: IDL.Vec(IDL.Nat8), // 32 bytes (key + commitment)
    round_id: IDL.Nat64,
    tier_id: IDL.Nat8,
    player_pubkey: IDL.Vec(IDL.Nat8),     // 32 bytes
    tp_preset: IDL.Nat16,
    spawn_x_q: IDL.Int16,
    spawn_y_q: IDL.Int16,
    spawn_rot_q: IDL.Nat16,
    alloc_split: IDL.Nat8,
    alloc_tether: IDL.Nat8,
    alloc_power: IDL.Nat8,
  });

  const PlayerConfigOutputIDL = IDL.Record({
    player_config_hash: IDL.Vec(IDL.Nat8), // 32 bytes (key + commitment)
    round_id: IDL.Nat64,
    tier_id: IDL.Nat8,
    player_pubkey: IDL.Vec(IDL.Nat8),
    tp_preset: IDL.Nat16,
    spawn_x_q: IDL.Int16,
    spawn_y_q: IDL.Int16,
    spawn_rot_q: IDL.Nat16,
    alloc_split: IDL.Nat8,
    alloc_tether: IDL.Nat8,
    alloc_power: IDL.Nat8,
    created_at: IDL.Nat64,
  });

  return IDL.Service({
    // Admin functions
    init_orbs_ic_pubkey: IDL.Func([], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], []),
    set_admin: IDL.Func([IDL.Principal], [], []),
    add_players: IDL.Func([IDL.Vec(IDL.Vec(IDL.Nat8))], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], []),
    store_round_snapshot: IDL.Func(
      [IDL.Nat8, IDL.Nat64, IDL.Nat16, IDL.Vec(RoundPlayerSnapshotInput), IDL.Bool, IDL.Opt(IDL.Text)],
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      []
    ),
    get_current_config_version: IDL.Func(
      [],
      [IDL.Text],
      ["query"]
    ),
    set_current_config_version: IDL.Func(
      [IDL.Text],
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      []
    ),

    // Chunk-based seed API (Merkle tree) - season_id removed, round IDs are globally unique per tier
    reveal_seed_for_round: IDL.Func(
      [IDL.Nat8, IDL.Nat64],  // tier_id, round_id
      [IDL.Variant({ Ok: SeedProofIDL, Err: IDL.Text })],
      []
    ),
    generate_and_store_chunk: IDL.Func(
      [IDL.Nat8, IDL.Nat64],  // tier_id, chunk_id
      [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })],
      []
    ),
    regenerate_chunk: IDL.Func(
      [IDL.Nat8, IDL.Nat64],  // tier_id, chunk_id
      [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })],
      []
    ),
    refresh_chunks_for_tier: IDL.Func(
      [IDL.Nat8, IDL.Nat64],  // tier_id, round_id
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      []
    ),

    // Query functions
    get_orbs_ic_pubkey: IDL.Func([], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], ["query"]),
    get_players: IDL.Func([IDL.Nat64, IDL.Nat64], [PlayerPage], ["query"]),
    player_exists: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Bool], ["query"]),
    get_last_settled_round: IDL.Func([IDL.Nat8], [IDL.Nat64], ["query"]),  // tier_id only
    chunk_exists: IDL.Func(
      [IDL.Nat8],  // tier_id only
      [IDL.Bool],
      ["query"]
    ),
    get_chunk_size: IDL.Func([], [IDL.Nat64], ["query"]),
    get_revealed_seed: IDL.Func(
      [IDL.Nat8, IDL.Nat64],  // tier_id, round_id
      [IDL.Opt(SeedProofIDL)],
      ["query"]
    ),
    get_round_snapshot: IDL.Func([IDL.Nat8, IDL.Nat64], [IDL.Opt(RoundSnapshot)], ["query"]),
    get_round_snapshots_by_tier: IDL.Func([IDL.Nat8, IDL.Nat64, IDL.Nat64], [RoundSnapshotPage], ["query"]),
    get_player_round_history: IDL.Func(
      [IDL.Vec(IDL.Nat8), IDL.Nat64, IDL.Nat64],
      [IDL.Variant({ Ok: PlayerRoundHistoryPage, Err: IDL.Text })],
      ["query"]
    ),
    
    // Engine config functions
    add_engine_config: IDL.Func(
      [IDL.Text, IDL.Text],  // version, config_json
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      []
    ),
    get_engine_config: IDL.Func(
      [IDL.Text],  // version
      [IDL.Opt(EngineConfigIDL)],
      ["query"]
    ),
    get_latest_engine_config: IDL.Func(
      [],
      [IDL.Opt(EngineConfigIDL)],
      ["query"]
    ),
    get_latest_engine_config_version: IDL.Func(
      [],
      [IDL.Opt(IDL.Text)],
      ["query"]
    ),
    list_engine_config_versions: IDL.Func(
      [],
      [IDL.Vec(EngineConfigIDL)],
      ["query"]
    ),

    // Player join data functions
    store_player_join_data: IDL.Func(
      [PlayerJoinDataInputIDL],
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      []
    ),
    get_player_join_data: IDL.Func(
      [IDL.Vec(IDL.Nat8), IDL.Nat8, IDL.Nat64],  // player, tier_id, round_id
      [IDL.Variant({ Ok: IDL.Opt(PlayerJoinDataIDL), Err: IDL.Text })],
      ["query"]
    ),
    get_round_join_data: IDL.Func(
      [IDL.Nat8, IDL.Nat64],  // tier_id, round_id
      [IDL.Vec(PlayerJoinDataOutputIDL)],
      ["query"]
    ),
    get_player_round_seed: IDL.Func(
      [IDL.Nat8, IDL.Nat64, IDL.Vec(IDL.Nat8)],  // tier_id, round_id, player
      [IDL.Variant({ Ok: IDL.Vec(IDL.Nat8), Err: IDL.Text })],
      ["query"]
    ),

    // Player config v2 functions (quantized, with commitment hash)
    set_player_config: IDL.Func(
      [PlayerConfigInputIDL],
      [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
      []
    ),
    get_player_config: IDL.Func(
      [IDL.Nat64, IDL.Nat8, IDL.Vec(IDL.Nat8)],  // round_id, tier_id, player_config_hash
      [IDL.Variant({ Ok: IDL.Opt(PlayerConfigOutputIDL), Err: IDL.Text })],
      ["query"]
    ),
    list_player_configs: IDL.Func(
      [IDL.Nat64, IDL.Nat8],  // round_id, tier_id
      [IDL.Variant({ Ok: IDL.Vec(PlayerConfigOutputIDL), Err: IDL.Text })],  // Admin only - returns Result
      ["query"]
    ),
    list_player_configs_consistent: IDL.Func(
      [IDL.Nat64, IDL.Nat8],  // round_id, tier_id
      [IDL.Variant({ Ok: IDL.Vec(PlayerConfigOutputIDL), Err: IDL.Text })],  // Admin only - #[update] for consistent read
      []  // No "query" annotation = update call (goes through consensus)
    ),
    list_player_configs_if_revealed: IDL.Func(
      [IDL.Nat64, IDL.Nat8],  // round_id, tier_id
      [IDL.Variant({ Ok: IDL.Vec(PlayerConfigOutputIDL), Err: IDL.Text })],  // Public - only for revealed rounds
      ["query"]
    ),
  });
};

/**
 * Configuration for ICP module
 */
export interface ICPModuleConfig {
  canisterId: string;
  host?: string;
  identity?: any; // Ed25519KeyIdentity - For admin operations
  secretKey?: Uint8Array; // Alternative: 32-byte Ed25519 secret key to derive identity
}

/**
 * ICP Module for canister interactions
 */
export class ICPModule {
  private agent: any;
  private actor: any;
  private canisterId: any;
  private initialized: Promise<void>;
  private config: ICPModuleConfig;

  constructor(config: ICPModuleConfig) {
    this.config = config;
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load @dfinity packages dynamically
    await loadDfinityPackages();
    
    this.canisterId = Principal.fromText(this.config.canisterId);
    
    // Determine identity: use provided identity or derive from secret key
    let identity = this.config.identity;
    if (!identity && this.config.secretKey) {
      identity = ICPModule.createIdentityFromSecretKey(this.config.secretKey);
    }
    
    // Create agent using @dfinity/agent API
    this.agent = HttpAgent.createSync({
      host: this.config.host || "https://icp-api.io",
      identity,
    });

    // In development, fetch root key
    await this.initializeAgent(this.config.host);

    // Create actor using Actor.createActor
    this.actor = Actor.createActor(icpIdl, {
      agent: this.agent,
      canisterId: this.canisterId,
    });
  }

  /**
   * Initialize agent and fetch root key if needed
   */
  private async initializeAgent(host?: string): Promise<void> {
    if (host?.includes("localhost") || host?.includes("127.0.0.1")) {
      try {
        await this.agent.fetchRootKey();
      } catch (error) {
        console.error("Failed to fetch root key:", error);
      }
    }
  }

  /**
   * Ensure agent is initialized before making calls
   */
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  // ==================== CHUNK-BASED SEED API (Merkle Tree) ====================

  /**
   * Reveal seed for a specific round (admin only)
   * Ensures the chunk exists (generates if needed) and returns the full proof.
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @returns SeedProof with seed, Merkle proof, and chunk signature
   */
  async revealSeedForRound(
    tierId: number,
    roundId: number
  ): Promise<SeedProof> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.reveal_seed_for_round(
        tierId,
        BigInt(roundId)
      );
      
      if ("Err" in result) {
        throw new Error(`Failed to reveal seed: ${result.Err}`);
      }
      
      const proof = result.Ok;
      return {
        seed: new Uint8Array(proof.seed),
        chunk_id: proof.chunk_id,
        merkle_root: new Uint8Array(proof.merkle_root),
        root_signature: new Uint8Array(proof.root_signature),
        proof_siblings: proof.proof_siblings.map((s: number[]) => new Uint8Array(s)),
        proof_positions: proof.proof_positions,
      };
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get a revealed seed proof for a specific round (public query).
   * Only returns proofs that have been revealed via revealSeedForRound.
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @returns The seed proof or null if not yet revealed
   */
  async getRevealedSeed(
    tierId: number,
    roundId: number
  ): Promise<SeedProof | null> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_revealed_seed(
        tierId,
        BigInt(roundId)
      );
      
      if (!result || result.length === 0) {
        return null;
      }
      
      const proof = result[0];
      return {
        seed: new Uint8Array(proof.seed),
        chunk_id: proof.chunk_id,
        merkle_root: new Uint8Array(proof.merkle_root),
        root_signature: new Uint8Array(proof.root_signature),
        proof_siblings: proof.proof_siblings.map((s: number[]) => new Uint8Array(s)),
        proof_positions: proof.proof_positions,
      };
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Generate and store a seed chunk for a specific tier (admin only)
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @param chunkId - Chunk ID
   * @returns The chunk_id of the generated chunk
   */
  async generateAndStoreChunk(
    tierId: number,
    chunkId: number
  ): Promise<bigint> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.generate_and_store_chunk(
        tierId,
        BigInt(chunkId)
      );
      
      if ("Err" in result) {
        throw new Error(`Failed to generate chunk: ${result.Err}`);
      }
      
      return result.Ok;
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Regenerate a specific chunk (removes existing and creates new) (admin only)
   * Use this if a specific chunk may have been compromised.
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @param chunkId - Chunk ID
   * @returns The chunk_id of the regenerated chunk
   */
  async regenerateChunk(
    tierId: number,
    chunkId: number
  ): Promise<bigint> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.regenerate_chunk(
        tierId,
        BigInt(chunkId)
      );
      
      if ("Err" in result) {
        throw new Error(`Failed to regenerate chunk: ${result.Err}`);
      }
      
      return result.Ok;
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Emergency refresh: Clear all chunks for a tier and regenerate (admin only)
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @param roundId - Round ID to regenerate from
   */
  async refreshChunksForTier(
    tierId: number,
    roundId: number
  ): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.refresh_chunks_for_tier(
        tierId,
        BigInt(roundId)
      );
      
      if ("Err" in result) {
        throw new Error(`Failed to refresh chunks: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Check if a chunk exists for the given tier
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @returns true if chunk exists
   */
  async chunkExists(
    tierId: number
  ): Promise<boolean> {
    await this.ensureInitialized();
    try {
      return await this.actor.chunk_exists(tierId);
    } catch (error) {
      throw new Error(`Failed to check chunk existence: ${error}`);
    }
  }

  // ==================== CONVENIENCE METHODS FOR FRONTEND ====================

  /**
   * Get round seed as hex string (convenience method for frontend).
   * Uses getRevealedSeed internally.
   * @param roundId - Round ID
   * @param tierId - Tier ID (default: 0)
   * @returns Seed as hex string or null if not revealed
   */
  async getRoundSeed(roundId: number, tierId: number = 0): Promise<string | null> {
    try {
      const proof = await this.getRevealedSeed(tierId, roundId);
      if (!proof) return null;
      
      // Convert seed bytes to hex string
      return Array.from(proof.seed)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.warn(`Failed to get round seed: ${error}`);
      return null;
    }
  }

  /**
   * Get round seed with signature (convenience method for frontend).
   * Uses getRevealedSeed internally.
   * @param roundId - Round ID
   * @param tierId - Tier ID (default: 0)
   * @returns Object with seed and signature hex strings, or null if not revealed
   */
  async getRoundSeedWithSignature(
    roundId: number,
    tierId: number = 0
  ): Promise<{ seed: string; signature: string } | null> {
    try {
      const proof = await this.getRevealedSeed(tierId, roundId);
      if (!proof) return null;
      
      // Convert to hex strings
      const seedHex = Array.from(proof.seed)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const signatureHex = Array.from(proof.root_signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return { seed: seedHex, signature: signatureHex };
    } catch (error) {
      console.warn(`Failed to get round seed with signature: ${error}`);
      return null;
    }
  }

  /**
   * Get the chunk size constant (number of seeds per chunk)
   * @returns CHUNK_SIZE (50)
   */
  async getChunkSize(): Promise<bigint> {
    await this.ensureInitialized();
    try {
      return await this.actor.get_chunk_size();
    } catch (error) {
      throw new Error(`Failed to get chunk size: ${error}`);
    }
  }

  /**
   * Get ICP canister public key (hex string)
   * @returns Hex-encoded ECDSA public key
   * @throws Error if pubkey not initialized
   */
  async getOrbsIcPubkey(): Promise<string> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_orbs_ic_pubkey();
      
      if ("Err" in result) {
        throw new Error(`Pubkey not initialized: ${result.Err}`);
      }
      
      return result.Ok;
    } catch (error) {
      throw new Error(`Failed to fetch ICP pubkey: ${error}`);
    }
  }

  /**
   * Initialize ICP canister public key (admin only)
   * Must be called once before using seed generation
   * @throws Error if already initialized or caller is not admin
   */
  async initOrbsIcPubkey(): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.init_orbs_ic_pubkey();
      
      if ("Err" in result) {
        throw new Error(`Failed to initialize pubkey: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Add players to whitelist (admin only)
   * @param pubkeys - Array of 32-byte public keys
   * @throws Error if invalid pubkey format or caller is not admin
   */
  async addPlayers(pubkeys: Uint8Array[]): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.add_players(pubkeys);
      
      if ("Err" in result) {
        throw new Error(`Failed to add players: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get the last settled round ID for a tier from ICP
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @returns Last settled round ID (0 if none settled yet)
   */
  async getLastSettledRound(tierId: number): Promise<number> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_last_settled_round(tierId);
      return Number(result);
    } catch (error) {
      throw new Error(`Failed to get last settled round: ${error}`);
    }
  }

  /**
   * Get paginated list of players
   * @param offset - Starting index
   * @param limit - Number of players to fetch
   * @returns PlayerPage with total count and player pubkeys
   */
  async getPlayers(offset: number, limit: number): Promise<PlayerPage> {
    await this.ensureInitialized();
    try {
      return await this.actor.get_players(BigInt(offset), BigInt(limit));
    } catch (error) {
      throw new Error(`Failed to fetch players: ${error}`);
    }
  }

  /**
   * Check if a player exists in the ICP canister registry
   * @param pubkey - 32-byte public key
   * @returns true if the player is already registered
   */
  async playerExists(pubkey: Uint8Array): Promise<boolean> {
    await this.ensureInitialized();
    try {
      return await this.actor.player_exists(pubkey);
    } catch (error) {
      throw new Error(`Failed to check player existence: ${error}`);
    }
  }

  /**
   * Set a new admin (admin only)
   * @param principal - Principal ID of new admin
   * @throws Error if caller is not admin
   */
  async setAdmin(principal: string): Promise<void> {
    await this.ensureInitialized();
    try {
      const principalObj = Principal.fromText(principal);
      await this.actor.set_admin(principalObj);
    } catch (error) {
      throw new Error(`Failed to set admin: ${error}`);
    }
  }

  /**
   * Store round snapshot to ICP (admin only)
   * Archives RoundPlayer data before closing accounts on Solana.
   * Uses the current global config version set on the canister.
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @param seasonId - Season ID
   * @param players - Array of player snapshots
   * @param didEmit - Whether ORB emission occurred for this round
   * @throws Error if snapshot already exists or caller is not admin
   */
  async storeRoundSnapshot(
    tierId: number,
    roundId: number,
    seasonId: number,
    players: RoundPlayerSnapshotInput[],
    didEmit: boolean = false,
    emitTxSig?: string
  ): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.store_round_snapshot(
        tierId,
        BigInt(roundId),
        seasonId,
        players.map(p => ({
          player: p.player,  // Already hex string
          join_ts: p.join_ts,
          tp_preset: p.tp_preset,
          payout_lamports: p.payout_lamports,
          placement: p.placement,
          kills: p.kills,
          orb_earned_atoms: p.orb_earned_atoms,
          player_config_hash: p.player_config_hash ? [p.player_config_hash] : [],  // Candid Opt encoding
        })),
        didEmit,
        emitTxSig ? [emitTxSig] : []  // Candid Opt encoding
      );

      if ("Err" in result) {
        throw new Error(`Failed to store snapshot: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get the current active config version (public query)
   * All new rounds use this version.
   * @returns Version string (e.g., "1.2.2")
   */
  async getCurrentConfigVersion(): Promise<string> {
    await this.ensureInitialized();
    try {
      return await this.actor.get_current_config_version();
    } catch (error) {
      throw new Error(`Failed to get current config version: ${error}`);
    }
  }

  /**
   * Set the current active config version (admin only)
   * All new rounds will use this version.
   * The config must already exist (added via addEngineConfig).
   * @param version - Version string (e.g., "1.2.2")
   * @throws Error if version doesn't exist or caller is not admin
   */
  async setCurrentConfigVersion(version: string): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.set_current_config_version(version);
      
      if ("Err" in result) {
        throw new Error(`Failed to set current config version: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get round snapshot from ICP
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @returns RoundSnapshot or null if not found
   */
  async getRoundSnapshot(tierId: number, roundId: number): Promise<RoundSnapshot | null> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_round_snapshot(tierId, BigInt(roundId));
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Failed to fetch round snapshot: ${error}`);
    }
  }

  /**
   * Get paginated round snapshots by tier
   * @param tierId - Tier ID
   * @param offset - Starting index
   * @param limit - Number of snapshots to fetch
   * @returns RoundSnapshotPage with total count and snapshots
   */
  async getRoundSnapshotsByTier(
    tierId: number,
    offset: number,
    limit: number
  ): Promise<RoundSnapshotPage> {
    await this.ensureInitialized();
    try {
      return await this.actor.get_round_snapshots_by_tier(
        tierId,
        BigInt(offset),
        BigInt(limit)
      );
    } catch (error) {
      throw new Error(`Failed to fetch round snapshots: ${error}`);
    }
  }

  /**
   * Get player round history from ICP
   * Returns list of rounds the player participated in with their stats
   * @param playerPubkey - 32-byte player public key
   * @param offset - Starting index
   * @param limit - Number of rounds to fetch
   * @returns PlayerRoundHistoryPage with total count and round entries
   */
  async getPlayerRoundHistory(
    playerPubkey: Uint8Array,
    offset: number,
    limit: number
  ): Promise<PlayerRoundHistoryPage> {
    await this.ensureInitialized();
    try {
      if (playerPubkey.length !== 32) {
        throw new Error('Player pubkey must be 32 bytes');
      }

      const result = await this.actor.get_player_round_history(
        Array.from(playerPubkey),
        BigInt(offset),
        BigInt(limit)
      );

      if ("Err" in result) {
        throw new Error(`Failed to fetch player history: ${result.Err}`);
      }

      return result.Ok;
    } catch (error) {
      throw new Error(`Failed to fetch player round history: ${error}`);
    }
  }

  // ==================== ENGINE CONFIG API ====================

  /**
   * Get engine config by version string (public query)
   * @param version - Version string (e.g., "1.2.2")
   * @returns EngineConfig or null if not found
   */
  async getEngineConfig(version: string): Promise<EngineConfig | null> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_engine_config(version);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Failed to fetch engine config: ${error}`);
    }
  }

  /**
   * Get the latest engine config (public query)
   * @returns EngineConfig or null if none exist
   */
  async getLatestEngineConfig(): Promise<EngineConfig | null> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_latest_engine_config();
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Failed to fetch latest engine config: ${error}`);
    }
  }

  /**
   * Get the latest engine config version string (public query)
   * @returns Version string or null if none exist
   */
  async getLatestEngineConfigVersion(): Promise<string | null> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_latest_engine_config_version();
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Failed to fetch latest engine config version: ${error}`);
    }
  }

  /**
   * List all engine config versions (public query)
   * @returns Array of EngineConfig records
   */
  async listEngineConfigVersions(): Promise<EngineConfig[]> {
    await this.ensureInitialized();
    try {
      return await this.actor.list_engine_config_versions();
    } catch (error) {
      throw new Error(`Failed to list engine config versions: ${error}`);
    }
  }

  /**
   * Add a new engine config (admin only)
   * Configs are immutable - once added, they cannot be modified.
   * @param version - Version string (e.g., "1.2.2")
   * @param configJson - JSON string containing the full engine configuration
   * @throws Error if version already exists or caller is not admin
   */
  async addEngineConfig(version: string, configJson: string): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.add_engine_config(version, configJson);
      
      if ("Err" in result) {
        throw new Error(`Failed to add engine config: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  // ==================== PLAYER JOIN DATA METHODS ====================

  /**
   * Store player join data (spawn position, skill allocation) - admin only
   * Called by Matrix Worker when player submits matrix results.
   * @param input - Player join data input
   * @throws Error if validation fails or caller is not admin
   */
  async storePlayerJoinData(input: {
    player: Uint8Array;
    tierId: number;
    roundId: number;
    spawnXNorm: number;
    spawnYNorm: number;
    spawnRotRad: number;
    earnedSp: number;
    allocSplitAggro: number;
    allocTetherRes: number;
    allocOrbPower: number;
  }): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.store_player_join_data({
        player: Array.from(input.player),
        tier_id: input.tierId,
        round_id: BigInt(input.roundId),
        spawn_x_norm: input.spawnXNorm,
        spawn_y_norm: input.spawnYNorm,
        spawn_rot_rad: input.spawnRotRad,
        earned_sp: input.earnedSp,
        alloc_split_aggro: input.allocSplitAggro,
        alloc_tether_res: input.allocTetherRes,
        alloc_orb_power: input.allocOrbPower,
      });
      
      if ("Err" in result) {
        throw new Error(`Failed to store player join data: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get player join data for a specific player in a round
   * @param player - 32-byte player pubkey
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @returns PlayerJoinData or null if not found
   */
  async getPlayerJoinData(
    player: Uint8Array,
    tierId: number,
    roundId: number
  ): Promise<PlayerJoinData | null> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_player_join_data(
        Array.from(player),
        tierId,
        BigInt(roundId)
      );
      
      if ("Err" in result) {
        throw new Error(`Failed to get player join data: ${result.Err}`);
      }
      
      // Result.Ok is Option<PlayerJoinData> - array with 0 or 1 element
      return result.Ok.length > 0 ? result.Ok[0] : null;
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get all player join data for a round
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @returns Array of PlayerJoinDataOutput (includes player pubkey)
   */
  async getRoundJoinData(
    tierId: number,
    roundId: number
  ): Promise<PlayerJoinDataOutput[]> {
    await this.ensureInitialized();
    try {
      const results = await this.actor.get_round_join_data(tierId, BigInt(roundId));
      
      // Convert Vec<u8> player fields to Uint8Array
      return results.map((r: any) => ({
        player: new Uint8Array(r.player),
        spawn_x_norm: r.spawn_x_norm,
        spawn_y_norm: r.spawn_y_norm,
        spawn_rot_rad: r.spawn_rot_rad,
        earned_sp: r.earned_sp,
        alloc_split_aggro: r.alloc_split_aggro,
        alloc_tether_res: r.alloc_tether_res,
        alloc_orb_power: r.alloc_orb_power,
        stored_at: r.stored_at,
      }));
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Get player-specific matrix seed derived from round seed.
   * Uses INTERNAL seed from SEED_CHUNKS (not publicly revealed yet).
   * @param tierId - Tier ID
   * @param roundId - Round ID
   * @param player - 32-byte player pubkey
   * @returns 32-byte player seed as Uint8Array
   * @throws Error if seed not ready for this round
   */
  async getPlayerRoundSeed(
    tierId: number,
    roundId: number,
    player: Uint8Array
  ): Promise<Uint8Array> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.get_player_round_seed(
        tierId,
        BigInt(roundId),
        Array.from(player)
      );
      
      if ("Err" in result) {
        throw new Error(result.Err);
      }
      
      return new Uint8Array(result.Ok);
    } catch (error) {
      throw new Error(`Failed to get player round seed: ${error}`);
    }
  }

  // ==================== PLAYER CONFIG V2 METHODS ====================

  /**
   * Store player config record (v2 - quantized values with commitment hash) - admin only
   * Called by Matrix Worker when player submits matrix results.
   * Immutable - rejects overwrites for same player_config_hash.
   * @param input - Player config data with quantized values
   * @throws Error if validation fails, already exists, or caller is not admin
   */
  async setPlayerConfig(input: {
    playerConfigHash: number[];
    roundId: number;
    tierId: number;
    playerPubkey: number[];
    tpPreset: number;
    spawnXQ: number;
    spawnYQ: number;
    spawnRotQ: number;
    allocSplit: number;
    allocTether: number;
    allocPower: number;
  }): Promise<void> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.set_player_config({
        player_config_hash: input.playerConfigHash,
        round_id: BigInt(input.roundId),
        tier_id: input.tierId,
        player_pubkey: input.playerPubkey,
        tp_preset: input.tpPreset,
        spawn_x_q: input.spawnXQ,
        spawn_y_q: input.spawnYQ,
        spawn_rot_q: input.spawnRotQ,
        alloc_split: input.allocSplit,
        alloc_tether: input.allocTether,
        alloc_power: input.allocPower,
      });
      
      if ("Err" in result) {
        throw new Error(`Failed to store player config: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * List all player config records for a round - admin only
   * Used by engine runner to fetch all configs for roster merge.
   * @param roundId - Round ID
   * @param tierId - Tier ID
   * @returns Array of player config records
   */
  async listPlayerConfigs(roundId: number, tierId: number): Promise<{
    playerConfigHash: Uint8Array;
    roundId: number;
    tierId: number;
    playerPubkey: Uint8Array;
    tpPreset: number;
    spawnXQ: number;
    spawnYQ: number;
    spawnRotQ: number;
    allocSplit: number;
    allocTether: number;
    allocPower: number;
    createdAt: bigint;
  }[]> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.list_player_configs(BigInt(roundId), tierId);
      
      // Handle Result<Vec, String> return type
      if ("Err" in result) {
        throw new Error(`Failed to list player configs: ${result.Err}`);
      }
      
      const results = result.Ok;
      return results.map((r: any) => ({
        playerConfigHash: new Uint8Array(r.player_config_hash),
        roundId: Number(r.round_id),
        tierId: r.tier_id,
        playerPubkey: new Uint8Array(r.player_pubkey),
        tpPreset: r.tp_preset,
        spawnXQ: r.spawn_x_q,
        spawnYQ: r.spawn_y_q,
        spawnRotQ: r.spawn_rot_q,
        allocSplit: r.alloc_split,
        allocTether: r.alloc_tether,
        allocPower: r.alloc_power,
        createdAt: r.created_at,
      }));
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * List all player config records for a round - admin only (consistent read)
   * Uses #[update] call that goes through consensus — guaranteed no replica staleness.
   * Used by engine runner as fallback when #[query] retries fail to return all configs.
   * @param roundId - Round ID
   * @param tierId - Tier ID
   * @returns Array of player config records
   */
  async listPlayerConfigsConsistent(roundId: number, tierId: number): Promise<{
    playerConfigHash: Uint8Array;
    roundId: number;
    tierId: number;
    playerPubkey: Uint8Array;
    tpPreset: number;
    spawnXQ: number;
    spawnYQ: number;
    spawnRotQ: number;
    allocSplit: number;
    allocTether: number;
    allocPower: number;
    createdAt: bigint;
  }[]> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.list_player_configs_consistent(BigInt(roundId), tierId);
      
      if ("Err" in result) {
        throw new Error(`Failed to list player configs (consistent): ${result.Err}`);
      }
      
      const results = result.Ok;
      return results.map((r: any) => ({
        playerConfigHash: new Uint8Array(r.player_config_hash),
        roundId: Number(r.round_id),
        tierId: r.tier_id,
        playerPubkey: new Uint8Array(r.player_pubkey),
        tpPreset: r.tp_preset,
        spawnXQ: r.spawn_x_q,
        spawnYQ: r.spawn_y_q,
        spawnRotQ: r.spawn_rot_q,
        allocSplit: r.alloc_split,
        allocTether: r.alloc_tether,
        allocPower: r.alloc_power,
        createdAt: r.created_at,
      }));
    } catch (error) {
      throw new Error(`ICP canister call (consistent) failed: ${error}`);
    }
  }

  /**
   * List player config records for a revealed round - public
   * Only returns configs if the round's seed has been revealed.
   * Used by frontend to load spawn positions for replay.
   * @param roundId - Round ID
   * @param tierId - Tier ID
   * @returns Array of player config records
   */
  async listPlayerConfigsIfRevealed(roundId: number, tierId: number): Promise<{
    playerConfigHash: Uint8Array;
    roundId: number;
    tierId: number;
    playerPubkey: Uint8Array;
    tpPreset: number;
    spawnXQ: number;
    spawnYQ: number;
    spawnRotQ: number;
    allocSplit: number;
    allocTether: number;
    allocPower: number;
    createdAt: bigint;
  }[]> {
    await this.ensureInitialized();
    try {
      const result = await this.actor.list_player_configs_if_revealed(BigInt(roundId), tierId);
      
      // Handle Result<Vec, String> return type
      if ("Err" in result) {
        throw new Error(`Failed to list player configs: ${result.Err}`);
      }
      
      const results = result.Ok;
      return results.map((r: any) => ({
        playerConfigHash: new Uint8Array(r.player_config_hash),
        roundId: Number(r.round_id),
        tierId: r.tier_id,
        playerPubkey: new Uint8Array(r.player_pubkey),
        tpPreset: r.tp_preset,
        spawnXQ: r.spawn_x_q,
        spawnYQ: r.spawn_y_q,
        spawnRotQ: r.spawn_rot_q,
        allocSplit: r.alloc_split,
        allocTether: r.alloc_tether,
        allocPower: r.alloc_power,
        createdAt: r.created_at,
      }));
    } catch (error) {
      throw new Error(`ICP canister call failed: ${error}`);
    }
  }

  /**
   * Encode tier_id and round_id into a composite round key
   * The key is u128: upper 8 bits = tier_id, lower 64 bits = round_id
   * @param tierId - Tier ID (0-255)
   * @param roundId - Round ID
   * @returns Composite key as bigint
   */
  static encodeRoundKey(tierId: number, roundId: number | bigint): bigint {
    // Shift tier_id to upper 8 bits and OR with round_id
    return (BigInt(tierId) << 64n) | BigInt(roundId);
  }

  /**
   * Decode composite round key into tier_id and round_id
   * The key is u128: upper 8 bits = tier_id, lower 64 bits = round_id
   * @param roundKey - Composite key as bigint
   * @returns Object with tier_id and round_id
   */
  static decodeRoundKey(roundKey: bigint): { tierId: number; roundId: bigint } {
    // Extract tier_id from upper 8 bits (shift right by 64 bits)
    const tierId = Number(roundKey >> 64n);
    
    // Extract round_id from lower 64 bits (mask with 0xFFFFFFFFFFFFFFFF)
    const roundId = roundKey & 0xFFFFFFFFFFFFFFFFn;
    
    return { tierId, roundId };
  }

  /**
   * Convert hex seed to Uint8Array (32 bytes)
   * @param hexSeed - Hex-encoded seed string
   * @returns 32-byte Uint8Array
   */
  static hexToSeed(hexSeed: string): Uint8Array {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexSeed.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /**
   * Convert hex signature to Uint8Array (64 bytes compact ECDSA)
   * @param hexSignature - Hex-encoded signature string
   * @returns 64-byte Uint8Array
   */
  static hexToSignature(hexSignature: string): Uint8Array {
    const bytes = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      bytes[i] = parseInt(hexSignature.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /**
   * Construct the chunk root message that was signed by ICP canister
   * Note: season_id removed - round IDs are globally unique per tier.
   * @param tierId - Tier ID
   * @param chunkId - Chunk ID
   * @param merkleRootHex - Hex-encoded Merkle root
   * @returns Message string that was signed
   */
  static constructChunkRootMessage(
    tierId: number,
    chunkId: number,
    merkleRootHex: string
  ): string {
    return `OrbsChunkRoot\nTier:${tierId}\nChunk:${chunkId}\nRoot:${merkleRootHex}`;
  }

  /**
   * Create ICP identity from raw secret key bytes
   * Works with any Ed25519 secret key (e.g., from Solana keypair, raw bytes, etc.)
   * 
   * @param secretKey - 32-byte Ed25519 secret key
   * @returns Ed25519KeyIdentity for ICP
   */
  static createIdentityFromSecretKey(secretKey: Uint8Array): typeof Ed25519KeyIdentity {
    if (!Ed25519KeyIdentity) {
      throw new Error("@dfinity/identity not loaded. Make sure to await ICPModule initialization.");
    }
    if (secretKey.length !== 32) {
      throw new Error("Secret key must be exactly 32 bytes");
    }
    return Ed25519KeyIdentity.fromSecretKey(secretKey);
  }
}
