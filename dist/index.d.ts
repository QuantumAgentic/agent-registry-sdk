import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
export declare const AGENT_PROGRAM_ID: PublicKey;
export declare const AGENT_SEED = "agent";
export type AgentIdl = Idl;
export declare function getProgram(provider: AnchorProvider): Program<AgentIdl>;
export declare function deriveAgentPda(agentWallet: PublicKey): [PublicKey, number];
export type TxOpts = {
    computeUnitLimit?: number;
    computeUnitPriceMicroLamports?: number;
    feePayer?: PublicKey;
};
export declare const DEFAULT_RPC = "https://api.devnet.solana.com";
export declare function makeConnection(rpcUrl?: string): Connection;
export type AgentAccount = {
    version: number;
    agentWallet: PublicKey;
    admin: PublicKey;
    memoryMode: number;
    memoryPtr: Uint8Array;
    memoryHash: Uint8Array;
    cardUri: string;
    cardHash: Uint8Array;
    flags: number;
    bump: number;
    isActive: boolean;
    isLocked: boolean;
};
export declare function fetchAgentByPda(provider: AnchorProvider, agentPda: PublicKey): Promise<AgentAccount | null>;
export declare function fetchAgentByWallet(provider: AnchorProvider, agentWallet: PublicKey): Promise<{
    pda: PublicKey;
    account: AgentAccount;
} | null>;
export declare function listAgents(provider: AnchorProvider, opts?: {
    admin?: PublicKey;
    activeOnly?: boolean;
    limit?: number;
}): Promise<Array<{
    pubkey: PublicKey;
    account: AgentAccount;
}>>;
export declare function createAgent(opts: {
    provider: AnchorProvider;
    agentWallet: PublicKey;
    cardUri?: string;
    cardHash?: Uint8Array | number[];
} & TxOpts): Promise<PublicKey>;
export declare function setCard(opts: {
    provider: AnchorProvider;
    agentPda: PublicKey;
    cardUri: string;
    cardHash: Uint8Array | number[];
} & TxOpts): Promise<void>;
export declare function setMemory(opts: {
    provider: AnchorProvider;
    agentPda: PublicKey;
    mode: number;
    ptr: Uint8Array | number[];
    hash?: Uint8Array | number[];
} & TxOpts): Promise<void>;
export declare function lockMemory(provider: AnchorProvider, agentPda: PublicKey): Promise<void>;
export declare function setActive(provider: AnchorProvider, agentPda: PublicKey, isActive: boolean): Promise<void>;
export declare function closeAgent(provider: AnchorProvider, agentPda: PublicKey, recipient: PublicKey): Promise<void>;
export declare function transferAdmin(provider: AnchorProvider, agentPda: PublicKey, newAdmin: PublicKey): Promise<void>;
export declare function hashCardJcs(card: unknown): Promise<Uint8Array>;
