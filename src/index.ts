import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idlJson from "./idl/agent_registry.json" with { type: "json" };
import { createHash } from "crypto";
import canonicalize from "canonicalize";

export const AGENT_PROGRAM_ID = new PublicKey((idlJson as any).address);
export const AGENT_SEED = "agent";
export const STAKING_SEED = "staking";

// Placeholder for agent-staking program ID (update after deploy)
export const AGENT_STAKING_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

export type AgentIdl = Idl;

export function getProgram(provider: AnchorProvider, programIdOverride?: PublicKey): Program<AgentIdl> {
  const pid = programIdOverride ?? AGENT_PROGRAM_ID;
  return new (Program as any)(idlJson as unknown as AgentIdl, pid, provider) as Program<AgentIdl>;
}

export function deriveAgentPda(agentWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from(AGENT_SEED),
    agentWallet.toBuffer(),
  ], AGENT_PROGRAM_ID);
}

export function deriveStakingPda(agentWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from(STAKING_SEED),
    agentWallet.toBuffer(),
  ], AGENT_PROGRAM_ID);
}

// Agent-staking PDAs
export function deriveStakingPoolPda(agentPda: PublicKey, programId?: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from("staking_pool"),
    agentPda.toBuffer(),
  ], programId ?? AGENT_STAKING_PROGRAM_ID);
}

export function deriveStakeAccountPda(staker: PublicKey, agentPda: PublicKey, programId?: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from("stake_account"),
    staker.toBuffer(),
    agentPda.toBuffer(),
  ], programId ?? AGENT_STAKING_PROGRAM_ID);
}

export function deriveProgramStatePda(programId?: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from("program_state"),
  ], programId ?? AGENT_STAKING_PROGRAM_ID);
}

export function deriveTokenVaultPda(poolPda: PublicKey, programId?: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from("token_vault"),
    poolPda.toBuffer(),
  ], programId ?? AGENT_STAKING_PROGRAM_ID);
}

export type TxOpts = {
  computeUnitLimit?: number;
  computeUnitPriceMicroLamports?: number;
  feePayer?: PublicKey;
};

function withComputeIx(builder: any, opts?: TxOpts) {
  if (!opts) return builder;
  return builder;
}

// Default connection/provider helpers
export type ClusterName = "devnet" | "testnet" | "mainnet";
export const RPC_BY_CLUSTER: Record<ClusterName, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};
export const DEFAULT_RPC = RPC_BY_CLUSTER.devnet;
export function makeConnection(rpcOrCluster?: string | ClusterName) {
  const url = rpcOrCluster && (rpcOrCluster in RPC_BY_CLUSTER)
    ? (RPC_BY_CLUSTER as any)[rpcOrCluster as ClusterName]
    : (rpcOrCluster ?? DEFAULT_RPC);
  return new Connection(url as string, { commitment: "confirmed" });
}

// -------------------- Reads --------------------
export type AgentAccount = {
  version: number;
  agentWallet: PublicKey;
  admin: PublicKey;
  memoryMode: number;
  memoryPtr: Uint8Array; // trimmed to length
  memoryHash: Uint8Array; // 32
  cardUri: string; // trimmed to length
  cardHash: Uint8Array; // 32
  flags: number; // u32
  bump: number;
  isActive: boolean;
  isLocked: boolean;
};

const OFFSETS = {
  discriminator: 0,
  version: 8,
  agentWallet: 8 + 1,
  admin: 8 + 33,
};

export async function fetchAgentByPda(provider: AnchorProvider, agentPda: PublicKey, programIdOverride?: PublicKey): Promise<AgentAccount | null> {
  const program = getProgram(provider, programIdOverride) as any;
  try {
    const raw = await program.account.agentRegistry.fetch(agentPda);
    return decodeAgent(raw);
  } catch (e) {
    return null;
  }
}

// Raw fetch that does not require full IDL presence
export async function fetchAgentByPdaRaw(connection: Connection, agentPda: PublicKey): Promise<AgentAccount | null> {
  const accInfo = await connection.getAccountInfo(agentPda, { commitment: "confirmed" });
  if (!accInfo || !accInfo.data) return null;
  return decodeAgentFromData(new Uint8Array(accInfo.data));
}

export async function fetchAgentByWallet(provider: AnchorProvider, agentWallet: PublicKey, programIdOverride?: PublicKey): Promise<{ pda: PublicKey; account: AgentAccount } | null> {
  const [pda] = deriveAgentPda(agentWallet);
  const acc = await fetchAgentByPda(provider, pda, programIdOverride);
  if (!acc) return null;
  return { pda, account: acc };
}

export async function listAgents(provider: AnchorProvider, opts?: { admin?: PublicKey; activeOnly?: boolean; limit?: number; programId?: PublicKey }): Promise<Array<{ pubkey: PublicKey; account: AgentAccount }>> {
  const program = getProgram(provider, opts?.programId) as any;
  const filters: any[] = [];
  if (opts?.admin) {
    filters.push({ memcmp: { offset: OFFSETS.admin, bytes: opts.admin.toBase58() } });
  }
  const all = await program.account.agentRegistry.all(filters.length ? filters : undefined);
  let out = all.map((e: any) => ({ pubkey: e.publicKey as PublicKey, account: decodeAgent(e.account) }));
  if (opts?.activeOnly) out = out.filter((x: any) => x.account.isActive);
  if (opts?.limit != null) out = out.slice(0, opts.limit);
  return out;
}

function decodeAgent(raw: any): AgentAccount {
  const memPtrLen: number = raw.memoryPtrLen ?? raw.memory_ptr_len ?? 0;
  const cardUriLen: number = raw.cardUriLen ?? raw.card_uri_len ?? 0;
  const memoryPtrFull: Uint8Array = new Uint8Array(raw.memoryPtr ?? raw.memory_ptr ?? []);
  const cardUriFull: Uint8Array = new Uint8Array(raw.cardUri ?? raw.card_uri ?? []);
  const memPtr = memoryPtrFull.slice(0, memPtrLen);
  const cardUriStr = new TextDecoder().decode(cardUriFull.slice(0, cardUriLen));
  const flags: number = raw.flags >>> 0;
  return {
    version: Number(raw.version ?? 0),
    agentWallet: new PublicKey(raw.agentWallet ?? raw.agent_wallet),
    admin: new PublicKey(raw.admin),
    memoryMode: Number(raw.memoryMode ?? raw.memory_mode ?? 0),
    memoryPtr: memPtr,
    memoryHash: new Uint8Array(raw.memoryHash ?? raw.memory_hash ?? new Array(32).fill(0)),
    cardUri: cardUriStr,
    cardHash: new Uint8Array(raw.cardHash ?? raw.card_hash ?? new Array(32).fill(0)),
    flags,
    bump: Number(raw.bump ?? 0),
    isActive: (flags & 1) !== 0,
    isLocked: (flags & (1 << 1)) !== 0,
  };
}

// Decode from raw bytes (Anchor account layout)
export function decodeAgentFromData(data: Uint8Array): AgentAccount {
  // Offsets within account data (includes 8B discriminator)
  const o = {
    version: 8,
    agentWallet: 9,
    admin: 41,
    memoryMode: 73,
    memoryPtrLen: 74,
    memoryPtr: 75,
    memoryHash: 171,
    cardUriLen: 203,
    cardUri: 204,
    cardHash: 300,
    flags: 332,
    bump: 336,
  } as const;
  const getU8 = (i: number) => data[i] ?? 0;
  const getU32 = (i: number) => (data[i] | (data[i+1]<<8) | (data[i+2]<<16) | (data[i+3]<<24)) >>> 0;
  const getPubkey = (i: number) => new PublicKey(data.slice(i, i+32));
  const version = getU8(o.version);
  const agentWallet = getPubkey(o.agentWallet);
  const admin = getPubkey(o.admin);
  const memoryMode = getU8(o.memoryMode);
  const memoryPtrLen = getU8(o.memoryPtrLen);
  const memoryPtrFull = data.slice(o.memoryPtr, o.memoryPtr + 96);
  const memoryPtr = memoryPtrFull.slice(0, memoryPtrLen);
  const memoryHash = data.slice(o.memoryHash, o.memoryHash + 32);
  const cardUriLen = getU8(o.cardUriLen);
  const cardUriFull = data.slice(o.cardUri, o.cardUri + 96);
  const cardUri = new TextDecoder().decode(cardUriFull.slice(0, cardUriLen));
  const cardHash = data.slice(o.cardHash, o.cardHash + 32);
  const flags = getU32(o.flags);
  const bump = getU8(o.bump);
  return {
    version,
    agentWallet,
    admin,
    memoryMode,
    memoryPtr,
    memoryHash,
    cardUri,
    cardHash,
    flags,
    bump,
    isActive: (flags & 1) !== 0,
    isLocked: (flags & (1 << 1)) !== 0,
  };
}

export async function createAgent(opts: {
  provider: AnchorProvider;
  agentWallet: PublicKey;
  cardUri?: string;
  cardHash?: Uint8Array | number[];
  hasStaking?: boolean;
  programId?: PublicKey;
} & TxOpts) {
  const program = getProgram(opts.provider, opts.programId);
  const [agentPda] = deriveAgentPda(opts.agentWallet);
  await (program.methods as any)
    .createAgent(opts.agentWallet, opts.cardUri ?? null, opts.cardHash ? Array.from(opts.cardHash) : null, !!opts.hasStaking)
    .accounts({ agent: agentPda, admin: opts.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
    .rpc();
  return agentPda;
}

export async function setCard(opts: {
  provider: AnchorProvider;
  agentPda: PublicKey;
  cardUri: string;
  cardHash: Uint8Array | number[];
  programId?: PublicKey;
} & TxOpts) {
  const program = getProgram(opts.provider, opts.programId);
  // client-side guards
  requireLen(opts.cardUri, 96, "cardUri");
  requireUrlHttpsIfUrl(opts.cardUri);
  await (program.methods as any)
    .setCard(opts.cardUri, Array.from(opts.cardHash))
    .accounts({ agent: opts.agentPda, admin: opts.provider.wallet.publicKey })
    .rpc();
}

export async function setMemory(opts: {
  provider: AnchorProvider;
  agentPda: PublicKey;
  mode: number;
  ptr: Uint8Array | number[];
  hash?: Uint8Array | number[];
  programId?: PublicKey;
} & TxOpts) {
  const program = getProgram(opts.provider, opts.programId);
  const ptrArr = Array.from(opts.ptr);
  if (ptrArr.length > 96) throw new Error("ptr too long (max 96)");
  const zero = new Uint8Array(32);
  if (opts.mode === 0) {
    if (ptrArr.length !== 0) throw new Error("None: ptr must be empty");
    if (opts.hash && !eq32(opts.hash, zero)) throw new Error("None: hash must be null/zero");
  } else if (opts.mode === 1) {
    if (ptrArr.length === 0) throw new Error("Cid: ptr required");
    if (opts.hash && !eq32(opts.hash, zero)) throw new Error("Cid: hash must be null/zero");
  } else if (opts.mode === 2 || opts.mode === 3 || opts.mode === 4) {
    if (ptrArr.length === 0) throw new Error("Ipns/Url/Manifest: ptr required");
    if (!opts.hash || (opts.hash as any).length !== 32) throw new Error("Ipns/Url/Manifest: 32-byte hash required");
    if (opts.mode === 3) {
      const s = new TextDecoder().decode(new Uint8Array(ptrArr));
      if (!s.startsWith("https://")) throw new Error("Url mode requires https://");
    }
  } else {
    throw new Error("invalid mode");
  }
  await (program.methods as any)
    .setMemory(opts.mode, ptrArr, opts.hash ? Array.from(opts.hash) : null)
    .accounts({ agent: opts.agentPda, admin: opts.provider.wallet.publicKey })
    .rpc();
}

export async function lockMemory(provider: AnchorProvider, agentPda: PublicKey, programIdOverride?: PublicKey) {
  const program = getProgram(provider, programIdOverride);
  await (program.methods as any)
    .lockMemory()
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey })
    .rpc();
}

export async function setActive(provider: AnchorProvider, agentPda: PublicKey, isActive: boolean, programIdOverride?: PublicKey) {
  const program = getProgram(provider, programIdOverride);
  await (program.methods as any)
    .setActive(isActive)
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey })
    .rpc();
}

export async function closeAgent(provider: AnchorProvider, agentPda: PublicKey, recipient: PublicKey, programIdOverride?: PublicKey) {
  const program = getProgram(provider, programIdOverride);
  await (program.methods as any)
    .closeAgent()
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey, recipient, systemProgram: SystemProgram.programId })
    .rpc();
}

export async function transferAdmin(provider: AnchorProvider, agentPda: PublicKey, newAdmin: PublicKey, programIdOverride?: PublicKey) {
  const program = getProgram(provider, programIdOverride);
  await (program.methods as any)
    .transferAdmin(newAdmin)
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey })
    .rpc();
}

export async function initStaking(opts: {
  provider: AnchorProvider;
  agentPda: PublicKey;
  agentWallet: PublicKey; // for PDA derivation of staking
  programId?: PublicKey;
} & TxOpts) {
  const program = getProgram(opts.provider, opts.programId);
  const [stakingPda] = deriveStakingPda(opts.agentWallet);
  await (program.methods as any)
    .initStaking()
    .accounts({ agent: opts.agentPda, staking: stakingPda, admin: opts.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
    .rpc();
  return stakingPda;
}

// Agent-staking methods
export function getStakingProgram(provider: AnchorProvider, stakingIdl: Idl, programId?: PublicKey): Program<Idl> {
  const pid = programId ?? AGENT_STAKING_PROGRAM_ID;
  return new (Program as any)(stakingIdl, pid, provider) as Program<Idl>;
}

export async function initProgramState(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  treasury?: PublicKey;
  stakingProgramId?: PublicKey;
} & TxOpts) {
  const program = getStakingProgram(opts.provider, opts.stakingIdl, opts.stakingProgramId);
  const [statePda] = deriveProgramStatePda(opts.stakingProgramId);
  const treasury = opts.treasury ?? opts.provider.wallet.publicKey;
  
  await (program.methods as any)
    .initProgramState()
    .accounts({
      programState: statePda,
      authority: opts.provider.wallet.publicKey,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  return statePda;
}

export async function createStakingPool(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  tokenMint: PublicKey;
  minStakeAmount: number | bigint;
  stakingProgramId?: PublicKey;
} & TxOpts) {
  const program = getStakingProgram(opts.provider, opts.stakingIdl, opts.stakingProgramId);
  const [poolPda] = deriveStakingPoolPda(opts.agentPda, opts.stakingProgramId);
  const [vaultPda] = deriveTokenVaultPda(poolPda, opts.stakingProgramId);
  
  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const RENT_SYSVAR = new PublicKey("SysvarRent111111111111111111111111111111111");
  
  await (program.methods as any)
    .createStakingPool(typeof opts.minStakeAmount === 'bigint' ? opts.minStakeAmount : BigInt(opts.minStakeAmount))
    .accounts({
      agent: opts.agentPda,
      stakingPool: poolPda,
      tokenVault: vaultPda,
      tokenMint: opts.tokenMint,
      owner: opts.provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: RENT_SYSVAR,
    })
    .rpc();
  
  return { poolPda, vaultPda };
}

export async function stakeTokens(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  stakerTokenAccount: PublicKey;
  amount: number | bigint;
  stakingProgramId?: PublicKey;
} & TxOpts) {
  const program = getStakingProgram(opts.provider, opts.stakingIdl, opts.stakingProgramId);
  const [poolPda] = deriveStakingPoolPda(opts.agentPda, opts.stakingProgramId);
  const [vaultPda] = deriveTokenVaultPda(poolPda, opts.stakingProgramId);
  const [stakePda] = deriveStakeAccountPda(opts.provider.wallet.publicKey, opts.agentPda, opts.stakingProgramId);
  
  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  
  await (program.methods as any)
    .stake(typeof opts.amount === 'bigint' ? opts.amount : BigInt(opts.amount))
    .accounts({
      stakingPool: poolPda,
      agentPda: opts.agentPda,
      stakeAccount: stakePda,
      tokenVault: vaultPda,
      stakerTokenAccount: opts.stakerTokenAccount,
      staker: opts.provider.wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  return stakePda;
}

export async function withdrawStake(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  stakerTokenAccount: PublicKey;
  treasury?: PublicKey;
  stakingProgramId?: PublicKey;
} & TxOpts) {
  const program = getStakingProgram(opts.provider, opts.stakingIdl, opts.stakingProgramId);
  const [poolPda] = deriveStakingPoolPda(opts.agentPda, opts.stakingProgramId);
  const [vaultPda] = deriveTokenVaultPda(poolPda, opts.stakingProgramId);
  const [stakePda] = deriveStakeAccountPda(opts.provider.wallet.publicKey, opts.agentPda, opts.stakingProgramId);
  const [statePda] = deriveProgramStatePda(opts.stakingProgramId);
  
  // Fetch treasury from program state if not provided
  let treasuryPubkey = opts.treasury;
  if (!treasuryPubkey) {
    const stateAccount = await (program.account as any).programState.fetch(statePda);
    treasuryPubkey = stateAccount.treasury;
  }
  
  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  
  await (program.methods as any)
    .withdrawStake()
    .accounts({
      programState: statePda,
      stakingPool: poolPda,
      agentPda: opts.agentPda,
      stakeAccount: stakePda,
      tokenVault: vaultPda,
      stakerTokenAccount: opts.stakerTokenAccount,
      staker: opts.provider.wallet.publicKey,
      treasury: treasuryPubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function hashCardJcs(card: unknown): Promise<Uint8Array> {
  const canon = typeof card === "string" ? (canonicalize as any)(JSON.parse(card))! : (canonicalize as any)(card as any)!;
  // Browser WebCrypto fallback
  if (typeof (globalThis as any).crypto?.subtle?.digest === "function") {
    const enc = new TextEncoder().encode(canon);
    const buf = await (globalThis as any).crypto.subtle.digest("SHA-256", enc);
    return new Uint8Array(buf);
  }
  // Node fallback
  const hash = createHash("sha256").update(canon).digest();
  return new Uint8Array(hash);
}

function eq32(a: Uint8Array | number[], b: Uint8Array): boolean {
  const aa = a instanceof Uint8Array ? a : new Uint8Array(a);
  if (aa.length !== 32) return false;
  for (let i = 0; i < 32; i++) if (aa[i] !== b[i]) return false;
  return true;
}

function requireLen(s: string, max: number, label: string) {
  if (new TextEncoder().encode(s).length > max) throw new Error(`${label} too long (max ${max})`);
}

function requireUrlHttpsIfUrl(u: string) {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") throw new Error("cardUri must use https://");
  } catch { /* not a URL ⇒ allowed (ipfs:// etc.) */ }
}
