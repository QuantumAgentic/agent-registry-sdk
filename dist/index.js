/**
 * Agent Registry SDK - v3.0 (No Anchor)
 * Pure @solana/web3.js implementation for minimal bundle size
 */
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, } from "@solana/web3.js";
import { createHash } from "crypto";
import canonicalize from "canonicalize";
// ============================================================================
// CONSTANTS
// ============================================================================
export const AGENT_PROGRAM_ID = new PublicKey("25wEsSLdsmZUisXuciyUXZqbpocsk5CJ7Uf6Eq553N8r");
export const AGENT_STAKING_PROGRAM_ID = new PublicKey("j3WMvorrddakwt69dqrQ5cve5APpyd4bxUCb9UF9Aqj");
export const AGENT_PLATFORM_PROGRAM_ID = new PublicKey("3TNdmF3EC9yrJjm5fxfFrrBxur5ntiuoByCqYSgtrEbw");
export const AGENT_SEED = Buffer.from("agent");
export const STAKING_POOL_SEED = Buffer.from("staking_pool");
export const STAKE_ACCOUNT_SEED = Buffer.from("stake_account");
export const PROGRAM_STATE_SEED = Buffer.from("program_state");
export const TOKEN_VAULT_SEED = Buffer.from("token_vault");
// Instruction discriminators (from IDL)
// SPL Token Program ID
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
export const RENT_SYSVAR_ID = new PublicKey("SysvarRent111111111111111111111111111111111");
// Instruction discriminators (from IDL - Updated 2025-10-10)
export const DISCRIMINATORS = {
    // Agent Registry
    createAgent: Buffer.from([143, 66, 198, 95, 110, 85, 83, 249]),
    setCard: Buffer.from([179, 140, 204, 98, 31, 239, 197, 254]),
    setMemory: Buffer.from([250, 172, 63, 75, 110, 204, 221, 71]),
    lockMemory: Buffer.from([131, 69, 62, 97, 45, 127, 223, 59]),
    setActive: Buffer.from([29, 16, 225, 132, 38, 216, 206, 33]),
    closeAgent: Buffer.from([52, 185, 104, 145, 157, 30, 87, 237]),
    transferOwner: Buffer.from([245, 25, 221, 175, 106, 229, 225, 45]),
    // Agent Staking
    initProgramState: Buffer.from([206, 55, 251, 246, 152, 194, 56, 56]),
    createStakingPool: Buffer.from([104, 58, 70, 37, 225, 212, 145, 93]),
    initStake: Buffer.from([177, 156, 4, 57, 220, 174, 174, 155]),
    stake: Buffer.from([206, 176, 202, 18, 200, 209, 179, 108]),
    updateMinStake: Buffer.from([209, 210, 237, 163, 84, 150, 199, 196]),
    withdrawStake: Buffer.from([153, 8, 22, 138, 105, 176, 87, 66]),
};
// ============================================================================
// PDA HELPERS
// ============================================================================
export function deriveAgentPda(creator, programId = AGENT_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([AGENT_SEED, creator.toBuffer()], programId);
}
export function deriveStakingPoolPda(agentPda, programId = AGENT_STAKING_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([STAKING_POOL_SEED, agentPda.toBuffer()], programId);
}
export function deriveStakeAccountPda(staker, agentPda, programId = AGENT_STAKING_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([STAKE_ACCOUNT_SEED, staker.toBuffer(), agentPda.toBuffer()], programId);
}
export function deriveProgramStatePda(programId = AGENT_STAKING_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([PROGRAM_STATE_SEED], programId);
}
export function deriveTokenVaultPda(poolPda, programId = AGENT_STAKING_PROGRAM_ID) {
    return PublicKey.findProgramAddressSync([TOKEN_VAULT_SEED, poolPda.toBuffer()], programId);
}
// ============================================================================
// BORSH ENCODING HELPERS
// ============================================================================
function encodeString(str) {
    const strBytes = Buffer.from(str, "utf8");
    const len = Buffer.alloc(4);
    len.writeUInt32LE(strBytes.length, 0);
    return Buffer.concat([len, strBytes]);
}
function encodeOption(value, encoder) {
    if (value === null || value === undefined) {
        return Buffer.from([0]); // None
    }
    return Buffer.concat([Buffer.from([1]), encoder(value)]); // Some
}
function encodeU8(value) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(value, 0);
    return buf;
}
function encodeBool(value) {
    return Buffer.from([value ? 1 : 0]);
}
function encodeBytes(bytes) {
    const arr = Buffer.from(bytes);
    const len = Buffer.alloc(4);
    len.writeUInt32LE(arr.length, 0);
    return Buffer.concat([len, arr]);
}
// ============================================================================
// INSTRUCTION BUILDERS
// ============================================================================
/**
 * Create Agent instruction
 */
export function createAgentInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    // Validate cardHash is exactly 32 bytes
    const cardHashBuffer = Buffer.from(params.cardHash);
    if (cardHashBuffer.length !== 32) {
        throw new Error(`cardHash must be exactly 32 bytes, got ${cardHashBuffer.length}`);
    }
    // Encode parameters
    const data = Buffer.concat([
        DISCRIMINATORS.createAgent,
        params.creator.toBuffer(), // 32 bytes
        encodeString(params.cardUri),
        cardHashBuffer, // 32 bytes
        encodeOption(params.hasStaking ?? null, encodeBool),
        encodeOption(params.memoryMode ?? null, encodeU8),
        encodeOption(params.memoryPtr ?? null, encodeBytes),
        encodeOption(params.memoryHash ?? null, (hash) => {
            const hashBuf = Buffer.from(hash);
            if (hashBuf.length !== 32) {
                throw new Error(`memoryHash must be exactly 32 bytes, got ${hashBuf.length}`);
            }
            return hashBuf;
        }),
    ]);
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.creatorSigner, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}
/**
 * Set Card instruction
 */
export function setCardInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    const data = Buffer.concat([
        DISCRIMINATORS.setCard,
        encodeString(params.cardUri),
        Buffer.from(params.cardHash),
    ]);
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.owner, isSigner: true, isWritable: false },
        ],
        programId,
        data,
    });
}
/**
 * Set Memory instruction
 */
export function setMemoryInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    const data = Buffer.concat([
        DISCRIMINATORS.setMemory,
        encodeU8(params.mode),
        encodeBytes(params.ptr),
        encodeOption(params.hash, (h) => Buffer.from(h)),
    ]);
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.owner, isSigner: true, isWritable: false },
        ],
        programId,
        data,
    });
}
/**
 * Lock Memory instruction
 */
export function lockMemoryInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.owner, isSigner: true, isWritable: false },
        ],
        programId,
        data: DISCRIMINATORS.lockMemory,
    });
}
/**
 * Set Active instruction
 */
export function setActiveInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    const data = Buffer.concat([
        DISCRIMINATORS.setActive,
        encodeBool(params.isActive),
    ]);
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.owner, isSigner: true, isWritable: false },
        ],
        programId,
        data,
    });
}
/**
 * Close Agent instruction
 */
export function closeAgentInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.owner, isSigner: true, isWritable: false },
            { pubkey: params.recipient, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: DISCRIMINATORS.closeAgent,
    });
}
/**
 * Transfer Owner instruction
 */
export function transferOwnerInstruction(params) {
    const programId = params.programId || AGENT_PROGRAM_ID;
    const data = Buffer.concat([
        DISCRIMINATORS.transferOwner,
        params.newOwner.toBuffer(),
    ]);
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: true },
            { pubkey: params.owner, isSigner: true, isWritable: false },
        ],
        programId,
        data,
    });
}
// ============================================================================
// HIGH-LEVEL API
// ============================================================================
/**
 * Create an agent
 */
export async function createAgent(params) {
    const creator = params.creator || params.payer.publicKey;
    const [agentPda] = deriveAgentPda(creator, params.programId);
    const memoryPtrBytes = params.memoryPtr
        ? new TextEncoder().encode(params.memoryPtr)
        : null;
    const ix = createAgentInstruction({
        agent: agentPda,
        creatorSigner: params.payer.publicKey,
        creator,
        cardUri: params.cardUri,
        cardHash: params.cardHash,
        hasStaking: params.hasStaking ?? true,
        memoryMode: params.memoryMode ?? null,
        memoryPtr: memoryPtrBytes,
        memoryHash: params.memoryHash ?? null,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
    return agentPda;
}
/**
 * Set card
 */
export async function setCard(params) {
    const ix = setCardInstruction({
        agent: params.agentPda,
        owner: params.payer.publicKey,
        cardUri: params.cardUri,
        cardHash: params.cardHash,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
}
/**
 * Set memory
 */
export async function setMemory(params) {
    const ix = setMemoryInstruction({
        agent: params.agentPda,
        owner: params.payer.publicKey,
        mode: params.mode,
        ptr: params.ptr,
        hash: params.hash ?? null,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
}
/**
 * Lock memory
 */
export async function lockMemory(params) {
    const ix = lockMemoryInstruction({
        agent: params.agentPda,
        owner: params.payer.publicKey,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
}
/**
 * Set active
 */
export async function setActive(params) {
    const ix = setActiveInstruction({
        agent: params.agentPda,
        owner: params.payer.publicKey,
        isActive: params.isActive,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
}
/**
 * Close agent
 */
export async function closeAgent(params) {
    const ix = closeAgentInstruction({
        agent: params.agentPda,
        owner: params.payer.publicKey,
        recipient: params.recipient,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
}
/**
 * Transfer owner
 */
export async function transferOwner(params) {
    const ix = transferOwnerInstruction({
        agent: params.agentPda,
        owner: params.payer.publicKey,
        newOwner: params.newOwner,
        programId: params.programId,
    });
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
}
// ============================================================================
// READ FUNCTIONS
// ============================================================================
/**
 * Fetch agent by PDA
 */
export async function fetchAgentByPda(connection, agentPda, programId) {
    const accInfo = await connection.getAccountInfo(agentPda);
    if (!accInfo || !accInfo.data)
        return null;
    return decodeAgentFromData(new Uint8Array(accInfo.data));
}
/**
 * Fetch agent by creator
 */
export async function fetchAgentByCreator(connection, creator, programId) {
    const [pda] = deriveAgentPda(creator, programId);
    const acc = await fetchAgentByPda(connection, pda, programId);
    if (!acc)
        return null;
    return { pda, account: acc };
}
/**
 * Decode agent from raw data
 */
export function decodeAgentFromData(data) {
    const o = {
        version: 8,
        creator: 9,
        owner: 41,
        memoryMode: 73,
        memoryPtrLen: 74,
        memoryPtr: 75,
        memoryHash: 171,
        cardUriLen: 203,
        cardUri: 204,
        cardHash: 300,
        flags: 332,
        bump: 336,
    };
    const getU8 = (i) => data[i] ?? 0;
    const getU32 = (i) => (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0;
    const getPubkey = (i) => new PublicKey(data.slice(i, i + 32));
    const version = getU8(o.version);
    const creator = getPubkey(o.creator);
    const owner = getPubkey(o.owner);
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
        creator,
        owner,
        memoryMode,
        memoryPtr,
        memoryHash,
        cardUri,
        cardHash,
        flags,
        bump,
        isActive: (flags & 1) !== 0,
        isLocked: (flags & (1 << 1)) !== 0,
        hasStaking: (flags & (1 << 2)) !== 0,
    };
}
// ============================================================================
// UTILITIES
// ============================================================================
/**
 * Send and confirm transaction
 */
async function sendAndConfirmTransaction(params) {
    const { connection, transaction, payer, signers = [], commitment = "confirmed" } = params;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer, ...signers);
    const sig = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: commitment,
    });
    await connection.confirmTransaction(sig, commitment);
    return sig;
}
/**
 * Hash card using JCS (JSON Canonical Serialization) + SHA-256
 */
export async function hashCardJcs(card) {
    const canon = typeof card === "string"
        ? canonicalize(JSON.parse(card))
        : canonicalize(card);
    // Browser WebCrypto fallback
    if (typeof globalThis.crypto?.subtle?.digest === "function") {
        const enc = new TextEncoder().encode(canon);
        const buf = await globalThis.crypto.subtle.digest("SHA-256", enc);
        return new Uint8Array(buf);
    }
    // Node fallback
    const hash = createHash("sha256").update(canon).digest();
    return new Uint8Array(hash);
}
export const RPC_BY_CLUSTER = {
    devnet: "https://api.devnet.solana.com",
    testnet: "https://api.testnet.solana.com",
    mainnet: "https://api.mainnet-beta.solana.com",
};
export function makeConnection(rpcOrCluster, commitment = "confirmed") {
    const url = rpcOrCluster && rpcOrCluster in RPC_BY_CLUSTER
        ? RPC_BY_CLUSTER[rpcOrCluster]
        : rpcOrCluster ?? RPC_BY_CLUSTER.devnet;
    return new Connection(url, commitment);
}
// ============================================================================
// STAKING INSTRUCTIONS
// ============================================================================
/**
 * Create Staking Pool instruction
 */
export function createStakingPoolInstruction(params) {
    const programId = params.stakingProgramId || AGENT_STAKING_PROGRAM_ID;
    // Encode min_stake_amount as u64 (8 bytes, little-endian)
    const minStakeBuf = Buffer.alloc(8);
    minStakeBuf.writeBigUInt64LE(params.minStakeAmount, 0);
    const data = Buffer.concat([
        DISCRIMINATORS.createStakingPool,
        minStakeBuf,
    ]);
    return new TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: false, isWritable: false },
            { pubkey: params.stakingPool, isSigner: false, isWritable: true },
            { pubkey: params.tokenVault, isSigner: false, isWritable: true },
            { pubkey: params.tokenMint, isSigner: false, isWritable: false },
            { pubkey: params.owner, isSigner: true, isWritable: true },
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: RENT_SYSVAR_ID, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}
// ============================================================================
// ATOMIC TRANSACTION: CREATE AGENT + STAKING POOL
// ============================================================================
/**
 * Create agent with staking pool in a single atomic transaction
 */
export async function createAgentWithStakingPool(params) {
    const creator = params.creator || params.payer.publicKey;
    const agentProgramId = params.agentProgramId || AGENT_PROGRAM_ID;
    const stakingProgramId = params.stakingProgramId || AGENT_STAKING_PROGRAM_ID;
    // Derive PDAs
    const [agentPda] = deriveAgentPda(creator, agentProgramId);
    const [poolPda] = deriveStakingPoolPda(agentPda, stakingProgramId);
    const [vaultPda] = deriveTokenVaultPda(poolPda, stakingProgramId);
    // Convert memory parameters
    const memoryPtrBytes = params.memoryPtr
        ? new TextEncoder().encode(params.memoryPtr)
        : null;
    // Instruction 1: Create Agent (with hasStaking=true)
    const ix1 = createAgentInstruction({
        agent: agentPda,
        creatorSigner: params.payer.publicKey,
        creator,
        cardUri: params.cardUri,
        cardHash: params.cardHash,
        hasStaking: true, // Force true for atomic creation
        memoryMode: params.memoryMode ?? null,
        memoryPtr: memoryPtrBytes,
        memoryHash: params.memoryHash ?? null,
        programId: agentProgramId,
    });
    // Instruction 2: Create Staking Pool
    const ix2 = createStakingPoolInstruction({
        agent: agentPda,
        stakingPool: poolPda,
        tokenVault: vaultPda,
        tokenMint: params.tokenMint,
        owner: params.payer.publicKey,
        minStakeAmount: params.minStakeAmount,
        stakingProgramId,
    });
    // Build and send atomic transaction
    const tx = new Transaction().add(ix1, ix2);
    const signature = await sendAndConfirmTransaction({
        connection: params.connection,
        transaction: tx,
        payer: params.payer,
    });
    return { agentPda, poolPda, vaultPda, signature };
}
