import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idlJson from "./idl/agent_registry.json" with { type: "json" };
import { createHash } from "crypto";
import canonicalize from "canonicalize";

export const AGENT_PROGRAM_ID = new PublicKey((idlJson as any).address);
export const AGENT_SEED = "agent";

export type AgentIdl = Idl;

export function getProgram(provider: AnchorProvider): Program<AgentIdl> {
  return new (Program as any)(idlJson as unknown as AgentIdl, AGENT_PROGRAM_ID, provider) as Program<AgentIdl>;
}

export function deriveAgentPda(agentWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from(AGENT_SEED),
    agentWallet.toBuffer(),
  ], AGENT_PROGRAM_ID);
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
export const DEFAULT_RPC = "https://api.devnet.solana.com";
export function makeConnection(rpcUrl?: string) {
  return new Connection(rpcUrl ?? DEFAULT_RPC, { commitment: "confirmed" });
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

export async function fetchAgentByPda(provider: AnchorProvider, agentPda: PublicKey): Promise<AgentAccount | null> {
  const program = getProgram(provider) as any;
  try {
    const raw = await program.account.agentRegistry.fetch(agentPda);
    return decodeAgent(raw);
  } catch (e) {
    return null;
  }
}

export async function fetchAgentByWallet(provider: AnchorProvider, agentWallet: PublicKey): Promise<{ pda: PublicKey; account: AgentAccount } | null> {
  const [pda] = deriveAgentPda(agentWallet);
  const acc = await fetchAgentByPda(provider, pda);
  if (!acc) return null;
  return { pda, account: acc };
}

export async function listAgents(provider: AnchorProvider, opts?: { admin?: PublicKey; activeOnly?: boolean; limit?: number }): Promise<Array<{ pubkey: PublicKey; account: AgentAccount }>> {
  const program = getProgram(provider) as any;
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

export async function createAgent(opts: {
  provider: AnchorProvider;
  agentWallet: PublicKey;
  cardUri?: string;
  cardHash?: Uint8Array | number[];
} & TxOpts) {
  const program = getProgram(opts.provider);
  const [agentPda] = deriveAgentPda(opts.agentWallet);
  await (program.methods as any)
    .createAgent(opts.agentWallet, opts.cardUri ?? null, opts.cardHash ? Array.from(opts.cardHash) : null)
    .accounts({ agent: agentPda, admin: opts.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
    .rpc();
  return agentPda;
}

export async function setCard(opts: {
  provider: AnchorProvider;
  agentPda: PublicKey;
  cardUri: string;
  cardHash: Uint8Array | number[];
} & TxOpts) {
  const program = getProgram(opts.provider);
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
} & TxOpts) {
  const program = getProgram(opts.provider);
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

export async function lockMemory(provider: AnchorProvider, agentPda: PublicKey) {
  const program = getProgram(provider);
  await (program.methods as any)
    .lockMemory()
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey })
    .rpc();
}

export async function setActive(provider: AnchorProvider, agentPda: PublicKey, isActive: boolean) {
  const program = getProgram(provider);
  await (program.methods as any)
    .setActive(isActive)
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey })
    .rpc();
}

export async function closeAgent(provider: AnchorProvider, agentPda: PublicKey, recipient: PublicKey) {
  const program = getProgram(provider);
  await (program.methods as any)
    .closeAgent()
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey, recipient, systemProgram: SystemProgram.programId })
    .rpc();
}

export async function transferAdmin(provider: AnchorProvider, agentPda: PublicKey, newAdmin: PublicKey) {
  const program = getProgram(provider);
  await (program.methods as any)
    .transferAdmin(newAdmin)
    .accounts({ agent: agentPda, admin: provider.wallet.publicKey })
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
