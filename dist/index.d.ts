/**
 * Agent Registry SDK - v3.0 (No Anchor)
 * Pure @solana/web3.js implementation for minimal bundle size
 */
import { Connection, PublicKey, TransactionInstruction, Signer, SendOptions, Commitment } from "@solana/web3.js";
export declare const AGENT_PROGRAM_ID: PublicKey;
export declare const AGENT_STAKING_PROGRAM_ID: PublicKey;
export declare const AGENT_PLATFORM_PROGRAM_ID: PublicKey;
export declare const AGENT_SEED: Buffer<ArrayBuffer>;
export declare const STAKING_POOL_SEED: Buffer<ArrayBuffer>;
export declare const STAKE_ACCOUNT_SEED: Buffer<ArrayBuffer>;
export declare const PROGRAM_STATE_SEED: Buffer<ArrayBuffer>;
export declare const TOKEN_VAULT_SEED: Buffer<ArrayBuffer>;
export declare const TOKEN_PROGRAM_ID: PublicKey;
export declare const SYSTEM_PROGRAM_ID: PublicKey;
export declare const RENT_SYSVAR_ID: PublicKey;
export declare const DISCRIMINATORS: {
    createAgent: Buffer<ArrayBuffer>;
    setCard: Buffer<ArrayBuffer>;
    setMemory: Buffer<ArrayBuffer>;
    lockMemory: Buffer<ArrayBuffer>;
    setActive: Buffer<ArrayBuffer>;
    closeAgent: Buffer<ArrayBuffer>;
    transferOwner: Buffer<ArrayBuffer>;
    initProgramState: Buffer<ArrayBuffer>;
    createStakingPool: Buffer<ArrayBuffer>;
    initStake: Buffer<ArrayBuffer>;
    stake: Buffer<ArrayBuffer>;
    updateMinStake: Buffer<ArrayBuffer>;
    withdrawStake: Buffer<ArrayBuffer>;
};
export type AgentAccount = {
    version: number;
    creator: PublicKey;
    owner: PublicKey;
    memoryMode: number;
    memoryPtr: Uint8Array;
    memoryHash: Uint8Array;
    cardUri: string;
    cardHash: Uint8Array;
    flags: number;
    bump: number;
    isActive: boolean;
    isLocked: boolean;
    hasStaking: boolean;
};
export type SendAndConfirmOptions = {
    connection: Connection;
    payer: Signer;
    signers?: Signer[];
    commitment?: Commitment;
    sendOptions?: SendOptions;
};
export declare function deriveAgentPda(creator: PublicKey, programId?: PublicKey): [PublicKey, number];
export declare function deriveStakingPoolPda(agentPda: PublicKey, programId?: PublicKey): [PublicKey, number];
export declare function deriveStakeAccountPda(staker: PublicKey, agentPda: PublicKey, programId?: PublicKey): [PublicKey, number];
export declare function deriveProgramStatePda(programId?: PublicKey): [PublicKey, number];
export declare function deriveTokenVaultPda(poolPda: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Create Agent instruction
 */
export declare function createAgentInstruction(params: {
    agent: PublicKey;
    creatorSigner: PublicKey;
    creator: PublicKey;
    cardUri: string;
    cardHash: Uint8Array | number[];
    hasStaking?: boolean | null;
    memoryMode?: number | null;
    memoryPtr?: Uint8Array | number[] | null;
    memoryHash?: Uint8Array | number[] | null;
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Set Card instruction
 */
export declare function setCardInstruction(params: {
    agent: PublicKey;
    owner: PublicKey;
    cardUri: string;
    cardHash: Uint8Array | number[];
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Set Memory instruction
 */
export declare function setMemoryInstruction(params: {
    agent: PublicKey;
    owner: PublicKey;
    mode: number;
    ptr: Uint8Array | number[];
    hash: Uint8Array | number[] | null;
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Lock Memory instruction
 */
export declare function lockMemoryInstruction(params: {
    agent: PublicKey;
    owner: PublicKey;
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Set Active instruction
 */
export declare function setActiveInstruction(params: {
    agent: PublicKey;
    owner: PublicKey;
    isActive: boolean;
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Close Agent instruction
 */
export declare function closeAgentInstruction(params: {
    agent: PublicKey;
    owner: PublicKey;
    recipient: PublicKey;
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Transfer Owner instruction
 */
export declare function transferOwnerInstruction(params: {
    agent: PublicKey;
    owner: PublicKey;
    newOwner: PublicKey;
    programId?: PublicKey;
}): TransactionInstruction;
/**
 * Create an agent
 */
export declare function createAgent(params: {
    connection: Connection;
    payer: Signer;
    creator?: PublicKey;
    cardUri: string;
    cardHash: Uint8Array | number[];
    hasStaking?: boolean;
    memoryMode?: number;
    memoryPtr?: string;
    memoryHash?: Uint8Array | number[];
    programId?: PublicKey;
}): Promise<PublicKey>;
/**
 * Set card
 */
export declare function setCard(params: {
    connection: Connection;
    payer: Signer;
    agentPda: PublicKey;
    cardUri: string;
    cardHash: Uint8Array | number[];
    programId?: PublicKey;
}): Promise<void>;
/**
 * Set memory
 */
export declare function setMemory(params: {
    connection: Connection;
    payer: Signer;
    agentPda: PublicKey;
    mode: number;
    ptr: Uint8Array | number[];
    hash?: Uint8Array | number[];
    programId?: PublicKey;
}): Promise<void>;
/**
 * Lock memory
 */
export declare function lockMemory(params: {
    connection: Connection;
    payer: Signer;
    agentPda: PublicKey;
    programId?: PublicKey;
}): Promise<void>;
/**
 * Set active
 */
export declare function setActive(params: {
    connection: Connection;
    payer: Signer;
    agentPda: PublicKey;
    isActive: boolean;
    programId?: PublicKey;
}): Promise<void>;
/**
 * Close agent
 */
export declare function closeAgent(params: {
    connection: Connection;
    payer: Signer;
    agentPda: PublicKey;
    recipient: PublicKey;
    programId?: PublicKey;
}): Promise<void>;
/**
 * Transfer owner
 */
export declare function transferOwner(params: {
    connection: Connection;
    payer: Signer;
    agentPda: PublicKey;
    newOwner: PublicKey;
    programId?: PublicKey;
}): Promise<void>;
/**
 * Fetch agent by PDA
 */
export declare function fetchAgentByPda(connection: Connection, agentPda: PublicKey, programId?: PublicKey): Promise<AgentAccount | null>;
/**
 * Fetch agent by creator
 */
export declare function fetchAgentByCreator(connection: Connection, creator: PublicKey, programId?: PublicKey): Promise<{
    pda: PublicKey;
    account: AgentAccount;
} | null>;
/**
 * Decode agent from raw data
 */
export declare function decodeAgentFromData(data: Uint8Array): AgentAccount;
/**
 * Hash card using JCS (JSON Canonical Serialization) + SHA-256
 */
export declare function hashCardJcs(card: unknown): Promise<Uint8Array>;
/**
 * Create connection helper
 */
export type ClusterName = "devnet" | "testnet" | "mainnet";
export declare const RPC_BY_CLUSTER: Record<ClusterName, string>;
export declare function makeConnection(rpcOrCluster?: string | ClusterName, commitment?: Commitment): Connection;
/**
 * Create Staking Pool instruction
 */
export declare function createStakingPoolInstruction(params: {
    agent: PublicKey;
    stakingPool: PublicKey;
    tokenVault: PublicKey;
    tokenMint: PublicKey;
    owner: PublicKey;
    minStakeAmount: bigint;
    stakingProgramId?: PublicKey;
}): TransactionInstruction;
/**
 * Create agent with staking pool in a single atomic transaction
 */
export declare function createAgentWithStakingPool(params: {
    connection: Connection;
    payer: Signer;
    creator?: PublicKey;
    tokenMint: PublicKey;
    minStakeAmount: bigint;
    cardUri: string;
    cardHash: Uint8Array | number[];
    memoryMode?: number;
    memoryPtr?: string;
    memoryHash?: Uint8Array | number[];
    agentProgramId?: PublicKey;
    stakingProgramId?: PublicKey;
}): Promise<{
    agentPda: PublicKey;
    poolPda: PublicKey;
    vaultPda: PublicKey;
    signature: string;
}>;
