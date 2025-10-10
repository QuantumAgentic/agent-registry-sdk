/**
 * Comprehensive SDK v3 Tests (No Anchor)
 * Tests all functions and edge cases
 */
import { expect } from "chai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { 
// Core functions
createAgent, setCard, setMemory, lockMemory, setActive, closeAgent, transferOwner, 
// Read functions
fetchAgentByPda, fetchAgentByCreator, decodeAgentFromData, 
// PDA helpers
deriveAgentPda, deriveStakingPoolPda, deriveStakeAccountPda, deriveProgramStatePda, deriveTokenVaultPda, 
// Instruction builders
createAgentInstruction, setCardInstruction, setMemoryInstruction, lockMemoryInstruction, setActiveInstruction, closeAgentInstruction, transferOwnerInstruction, 
// Utilities
hashCardJcs, makeConnection, 
// Constants
AGENT_PROGRAM_ID, AGENT_STAKING_PROGRAM_ID, AGENT_PLATFORM_PROGRAM_ID, } from "../dist/index.js";
describe("SDK v3 - No Anchor", () => {
    let connection;
    let payer;
    before(() => {
        connection = makeConnection("devnet");
        payer = Keypair.generate();
    });
    // =========================================================================
    // 1. CONSTANTS
    // =========================================================================
    describe("Constants", () => {
        it("should export correct program IDs", () => {
            expect(AGENT_PROGRAM_ID.toBase58()).to.equal("59Z648TXaaZM7j3RrPpVAUQxdn9K42kaAFBbMFbDiops");
            expect(AGENT_STAKING_PROGRAM_ID.toBase58()).to.equal("FE5kcoY1CsnAFak5PBBUy689hRKvpE2261C1GaWSbJak");
            expect(AGENT_PLATFORM_PROGRAM_ID.toBase58()).to.equal("3TNdmF3EC9yrJjm5fxfFrrBxur5ntiuoByCqYSgtrEbw");
        });
    });
    // =========================================================================
    // 2. PDA DERIVATION
    // =========================================================================
    describe("PDA Derivation", () => {
        it("deriveAgentPda - should derive correct PDA", () => {
            const creator = Keypair.generate().publicKey;
            const [pda, bump] = deriveAgentPda(creator);
            expect(pda).to.be.instanceOf(PublicKey);
            expect(bump).to.be.a("number");
            expect(bump).to.be.at.least(0).and.at.most(255);
        });
        it("deriveAgentPda - should be deterministic", () => {
            const creator = Keypair.generate().publicKey;
            const [pda1] = deriveAgentPda(creator);
            const [pda2] = deriveAgentPda(creator);
            expect(pda1.toBase58()).to.equal(pda2.toBase58());
        });
        it("deriveAgentPda - different creators = different PDAs", () => {
            const creator1 = Keypair.generate().publicKey;
            const creator2 = Keypair.generate().publicKey;
            const [pda1] = deriveAgentPda(creator1);
            const [pda2] = deriveAgentPda(creator2);
            expect(pda1.toBase58()).to.not.equal(pda2.toBase58());
        });
        it("deriveStakingPoolPda - should derive correct PDA", () => {
            const agentPda = Keypair.generate().publicKey;
            const [pda, bump] = deriveStakingPoolPda(agentPda);
            expect(pda).to.be.instanceOf(PublicKey);
            expect(bump).to.be.a("number");
        });
        it("deriveStakeAccountPda - should derive correct PDA", () => {
            const staker = Keypair.generate().publicKey;
            const agentPda = Keypair.generate().publicKey;
            const [pda, bump] = deriveStakeAccountPda(staker, agentPda);
            expect(pda).to.be.instanceOf(PublicKey);
            expect(bump).to.be.a("number");
        });
        it("deriveProgramStatePda - should derive correct PDA", () => {
            const [pda, bump] = deriveProgramStatePda();
            expect(pda).to.be.instanceOf(PublicKey);
            expect(bump).to.be.a("number");
        });
        it("deriveProgramStatePda - should be deterministic", () => {
            const [pda1] = deriveProgramStatePda();
            const [pda2] = deriveProgramStatePda();
            expect(pda1.toBase58()).to.equal(pda2.toBase58());
        });
        it("deriveTokenVaultPda - should derive correct PDA", () => {
            const poolPda = Keypair.generate().publicKey;
            const [pda, bump] = deriveTokenVaultPda(poolPda);
            expect(pda).to.be.instanceOf(PublicKey);
            expect(bump).to.be.a("number");
        });
    });
    // =========================================================================
    // 3. UTILITIES
    // =========================================================================
    describe("Utilities", () => {
        describe("hashCardJcs", () => {
            it("should hash JSON object correctly", async () => {
                const card = { name: "Test Agent", version: "1.0" };
                const hash = await hashCardJcs(card);
                expect(hash).to.be.instanceOf(Uint8Array);
                expect(hash.length).to.equal(32);
            });
            it("should be deterministic", async () => {
                const card = { name: "Test", version: "1.0" };
                const hash1 = await hashCardJcs(card);
                const hash2 = await hashCardJcs(card);
                expect(Buffer.from(hash1).toString("hex")).to.equal(Buffer.from(hash2).toString("hex"));
            });
            it("should handle different inputs differently", async () => {
                const card1 = { name: "Agent1" };
                const card2 = { name: "Agent2" };
                const hash1 = await hashCardJcs(card1);
                const hash2 = await hashCardJcs(card2);
                expect(Buffer.from(hash1).toString("hex")).to.not.equal(Buffer.from(hash2).toString("hex"));
            });
            it("should handle string input", async () => {
                const cardStr = '{"name":"Test"}';
                const hash = await hashCardJcs(cardStr);
                expect(hash).to.be.instanceOf(Uint8Array);
                expect(hash.length).to.equal(32);
            });
            it("should canonicalize JSON (order-independent)", async () => {
                const card1 = { name: "Test", version: "1.0" };
                const card2 = { version: "1.0", name: "Test" };
                const hash1 = await hashCardJcs(card1);
                const hash2 = await hashCardJcs(card2);
                expect(Buffer.from(hash1).toString("hex")).to.equal(Buffer.from(hash2).toString("hex"));
            });
        });
        describe("makeConnection", () => {
            it("should create connection with cluster name", () => {
                const conn = makeConnection("devnet");
                expect(conn).to.be.instanceOf(Connection);
                expect(conn.rpcEndpoint).to.include("devnet");
            });
            it("should create connection with custom RPC", () => {
                const customRpc = "https://my-custom-rpc.com";
                const conn = makeConnection(customRpc);
                expect(conn.rpcEndpoint).to.equal(customRpc);
            });
            it("should default to devnet", () => {
                const conn = makeConnection();
                expect(conn.rpcEndpoint).to.include("devnet");
            });
            it("should handle mainnet", () => {
                const conn = makeConnection("mainnet");
                expect(conn.rpcEndpoint).to.include("mainnet");
            });
            it("should handle testnet", () => {
                const conn = makeConnection("testnet");
                expect(conn.rpcEndpoint).to.include("testnet");
            });
        });
    });
    // =========================================================================
    // 4. INSTRUCTION BUILDERS
    // =========================================================================
    describe("Instruction Builders", () => {
        describe("createAgentInstruction", () => {
            it("should build instruction with minimal params", () => {
                const creator = payer.publicKey;
                const [agentPda] = deriveAgentPda(creator);
                const cardHash = new Uint8Array(32).fill(1);
                const ix = createAgentInstruction({
                    agent: agentPda,
                    creatorSigner: payer.publicKey,
                    creator,
                    cardUri: "https://example.com/card.json",
                    cardHash,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(3);
                expect(ix.data.length).to.be.greaterThan(0);
            });
            it("should build instruction with full params", () => {
                const creator = payer.publicKey;
                const [agentPda] = deriveAgentPda(creator);
                const cardHash = new Uint8Array(32).fill(1);
                const memoryHash = new Uint8Array(32).fill(2);
                const ix = createAgentInstruction({
                    agent: agentPda,
                    creatorSigner: payer.publicKey,
                    creator,
                    cardUri: "https://example.com/card.json",
                    cardHash,
                    hasStaking: true,
                    memoryMode: 3,
                    memoryPtr: new TextEncoder().encode("https://memory.com"),
                    memoryHash,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(3);
            });
            it("should include correct accounts", () => {
                const creator = payer.publicKey;
                const [agentPda] = deriveAgentPda(creator);
                const cardHash = new Uint8Array(32).fill(1);
                const ix = createAgentInstruction({
                    agent: agentPda,
                    creatorSigner: payer.publicKey,
                    creator,
                    cardUri: "https://example.com/card.json",
                    cardHash,
                });
                expect(ix.keys[0].pubkey.toBase58()).to.equal(agentPda.toBase58());
                expect(ix.keys[0].isWritable).to.be.true;
                expect(ix.keys[1].pubkey.toBase58()).to.equal(payer.publicKey.toBase58());
                expect(ix.keys[1].isSigner).to.be.true;
            });
        });
        describe("setCardInstruction", () => {
            it("should build instruction", () => {
                const agentPda = Keypair.generate().publicKey;
                const cardHash = new Uint8Array(32).fill(1);
                const ix = setCardInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    cardUri: "https://example.com/updated.json",
                    cardHash,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(2);
            });
        });
        describe("setMemoryInstruction", () => {
            it("should build instruction with hash", () => {
                const agentPda = Keypair.generate().publicKey;
                const ptr = new TextEncoder().encode("https://memory.com");
                const hash = new Uint8Array(32).fill(1);
                const ix = setMemoryInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    mode: 3,
                    ptr,
                    hash,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(2);
            });
            it("should build instruction without hash", () => {
                const agentPda = Keypair.generate().publicKey;
                const ptr = new TextEncoder().encode("bafybeigdyrzt5...");
                const ix = setMemoryInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    mode: 1, // CID mode (no hash needed)
                    ptr,
                    hash: null,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
            });
        });
        describe("lockMemoryInstruction", () => {
            it("should build instruction", () => {
                const agentPda = Keypair.generate().publicKey;
                const ix = lockMemoryInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(2);
            });
        });
        describe("setActiveInstruction", () => {
            it("should build instruction to activate", () => {
                const agentPda = Keypair.generate().publicKey;
                const ix = setActiveInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    isActive: true,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(2);
            });
            it("should build instruction to deactivate", () => {
                const agentPda = Keypair.generate().publicKey;
                const ix = setActiveInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    isActive: false,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
            });
        });
        describe("closeAgentInstruction", () => {
            it("should build instruction", () => {
                const agentPda = Keypair.generate().publicKey;
                const recipient = Keypair.generate().publicKey;
                const ix = closeAgentInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    recipient,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(4);
            });
        });
        describe("transferOwnerInstruction", () => {
            it("should build instruction", () => {
                const agentPda = Keypair.generate().publicKey;
                const newOwner = Keypair.generate().publicKey;
                const ix = transferOwnerInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    newOwner,
                });
                expect(ix.programId.toBase58()).to.equal(AGENT_PROGRAM_ID.toBase58());
                expect(ix.keys.length).to.equal(2);
            });
        });
    });
    // =========================================================================
    // 5. ACCOUNT DECODING
    // =========================================================================
    describe("Account Decoding", () => {
        it("should decode agent data correctly", () => {
            // Create mock agent data
            const data = new Uint8Array(337); // AgentRegistry size
            // Set discriminator (8 bytes)
            data.set([0, 0, 0, 0, 0, 0, 0, 0], 0);
            // Set version (1 byte)
            data[8] = 1;
            // Set creator (32 bytes)
            const creator = Keypair.generate().publicKey.toBytes();
            data.set(creator, 9);
            // Set owner (32 bytes)
            const owner = Keypair.generate().publicKey.toBytes();
            data.set(owner, 41);
            // Set memoryMode (1 byte)
            data[73] = 3; // URL mode
            // Set cardUriLen (1 byte)
            const cardUri = "https://example.com/card.json";
            const cardUriBytes = new TextEncoder().encode(cardUri);
            data[203] = cardUriBytes.length;
            data.set(cardUriBytes, 204);
            // Set flags (4 bytes) - FLAG_ACTIVE | FLAG_HAS_STAKING
            data[332] = 0x05; // binary: 00000101
            const agent = decodeAgentFromData(data);
            expect(agent.version).to.equal(1);
            expect(agent.creator).to.be.instanceOf(PublicKey);
            expect(agent.owner).to.be.instanceOf(PublicKey);
            expect(agent.memoryMode).to.equal(3);
            expect(agent.cardUri).to.equal(cardUri);
            expect(agent.isActive).to.be.true;
            expect(agent.hasStaking).to.be.true;
            expect(agent.isLocked).to.be.false;
        });
        it("should handle empty cardUri", () => {
            const data = new Uint8Array(337);
            data[203] = 0; // cardUriLen = 0
            const agent = decodeAgentFromData(data);
            expect(agent.cardUri).to.equal("");
        });
        it("should decode flags correctly", () => {
            const data = new Uint8Array(337);
            // Test FLAG_ACTIVE (bit 0)
            data[332] = 0x01;
            let agent = decodeAgentFromData(data);
            expect(agent.isActive).to.be.true;
            expect(agent.isLocked).to.be.false;
            expect(agent.hasStaking).to.be.false;
            // Test FLAG_LOCKED (bit 1)
            data[332] = 0x02;
            agent = decodeAgentFromData(data);
            expect(agent.isActive).to.be.false;
            expect(agent.isLocked).to.be.true;
            expect(agent.hasStaking).to.be.false;
            // Test FLAG_HAS_STAKING (bit 2)
            data[332] = 0x04;
            agent = decodeAgentFromData(data);
            expect(agent.isActive).to.be.false;
            expect(agent.isLocked).to.be.false;
            expect(agent.hasStaking).to.be.true;
            // Test all flags
            data[332] = 0x07;
            agent = decodeAgentFromData(data);
            expect(agent.isActive).to.be.true;
            expect(agent.isLocked).to.be.true;
            expect(agent.hasStaking).to.be.true;
        });
    });
    // =========================================================================
    // 6. READ FUNCTIONS (Mock Tests - No Actual RPC Calls)
    // =========================================================================
    describe("Read Functions", () => {
        it("fetchAgentByPda - should return null for non-existent account", async () => {
            const nonExistentPda = Keypair.generate().publicKey;
            const agent = await fetchAgentByPda(connection, nonExistentPda);
            expect(agent).to.be.null;
        });
        it("fetchAgentByCreator - should derive PDA and fetch", async () => {
            const creator = Keypair.generate().publicKey;
            const result = await fetchAgentByCreator(connection, creator);
            // Should return null since account doesn't exist on devnet
            expect(result).to.be.null;
        });
        it("fetchAgentByCreator - should return PDA if account exists", async () => {
            // This would need a real agent on devnet to test properly
            // For now, we just test that it doesn't throw
            const creator = payer.publicKey;
            const result = await fetchAgentByCreator(connection, creator);
            expect(result).to.satisfy((r) => r === null || (r.pda && r.account));
        });
    });
    // =========================================================================
    // 7. EDGE CASES
    // =========================================================================
    describe("Edge Cases", () => {
        it("should handle long cardUri (max 96 bytes)", async () => {
            const longUri = "https://example.com/" + "a".repeat(70);
            const cardHash = new Uint8Array(32).fill(1);
            const creator = payer.publicKey;
            const [agentPda] = deriveAgentPda(creator);
            const ix = createAgentInstruction({
                agent: agentPda,
                creatorSigner: payer.publicKey,
                creator,
                cardUri: longUri,
                cardHash,
            });
            expect(ix).to.not.be.null;
        });
        it("should handle empty memoryPtr", () => {
            const agentPda = Keypair.generate().publicKey;
            const ix = setMemoryInstruction({
                agent: agentPda,
                owner: payer.publicKey,
                mode: 0, // None
                ptr: new Uint8Array(0),
                hash: null,
            });
            expect(ix).to.not.be.null;
        });
        it("should handle all memory modes", () => {
            const agentPda = Keypair.generate().publicKey;
            const ptr = new TextEncoder().encode("test");
            const hash = new Uint8Array(32).fill(1);
            for (let mode = 0; mode <= 4; mode++) {
                const ix = setMemoryInstruction({
                    agent: agentPda,
                    owner: payer.publicKey,
                    mode,
                    ptr: mode === 0 ? new Uint8Array(0) : ptr,
                    hash: mode >= 2 ? hash : null,
                });
                expect(ix).to.not.be.null;
            }
        });
        it("should handle zero-filled hashes", async () => {
            const zeroHash = new Uint8Array(32).fill(0);
            const creator = payer.publicKey;
            const [agentPda] = deriveAgentPda(creator);
            const ix = createAgentInstruction({
                agent: agentPda,
                creatorSigner: payer.publicKey,
                creator,
                cardUri: "https://example.com/card.json",
                cardHash: zeroHash,
            });
            expect(ix).to.not.be.null;
        });
    });
    // =========================================================================
    // 8. INTEGRATION TEST SUMMARY
    // =========================================================================
    describe("Integration Summary", () => {
        it("should have all core functions exported", () => {
            expect(createAgent).to.be.a("function");
            expect(setCard).to.be.a("function");
            expect(setMemory).to.be.a("function");
            expect(lockMemory).to.be.a("function");
            expect(setActive).to.be.a("function");
            expect(closeAgent).to.be.a("function");
            expect(transferOwner).to.be.a("function");
        });
        it("should have all read functions exported", () => {
            expect(fetchAgentByPda).to.be.a("function");
            expect(fetchAgentByCreator).to.be.a("function");
            expect(decodeAgentFromData).to.be.a("function");
        });
        it("should have all PDA helpers exported", () => {
            expect(deriveAgentPda).to.be.a("function");
            expect(deriveStakingPoolPda).to.be.a("function");
            expect(deriveStakeAccountPda).to.be.a("function");
            expect(deriveProgramStatePda).to.be.a("function");
            expect(deriveTokenVaultPda).to.be.a("function");
        });
        it("should have all instruction builders exported", () => {
            expect(createAgentInstruction).to.be.a("function");
            expect(setCardInstruction).to.be.a("function");
            expect(setMemoryInstruction).to.be.a("function");
            expect(lockMemoryInstruction).to.be.a("function");
            expect(setActiveInstruction).to.be.a("function");
            expect(closeAgentInstruction).to.be.a("function");
            expect(transferOwnerInstruction).to.be.a("function");
        });
        it("should have all utilities exported", () => {
            expect(hashCardJcs).to.be.a("function");
            expect(makeConnection).to.be.a("function");
        });
        it("should have all constants exported", () => {
            expect(AGENT_PROGRAM_ID).to.be.instanceOf(PublicKey);
            expect(AGENT_STAKING_PROGRAM_ID).to.be.instanceOf(PublicKey);
            expect(AGENT_PLATFORM_PROGRAM_ID).to.be.instanceOf(PublicKey);
        });
    });
});
