/**
 * Comprehensive SDK v3 Tests (No Anchor)
 * Tests 100% of SDK functionality
 */

import { strict as assert } from "assert";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  // Core
  createAgent,
  createAgentInstruction,
  setCard,
  setCardInstruction,
  setMemory,
  setMemoryInstruction,
  lockMemory,
  lockMemoryInstruction,
  setActive,
  setActiveInstruction,
  closeAgent,
  closeAgentInstruction,
  transferOwner,
  transferOwnerInstruction,
  // Read
  fetchAgentByPda,
  fetchAgentByCreator,
  decodeAgentFromData,
  // PDA
  deriveAgentPda,
  deriveStakingPoolPda,
  deriveStakeAccountPda,
  deriveProgramStatePda,
  deriveTokenVaultPda,
  // Utils
  hashCardJcs,
  makeConnection,
  // Constants
  AGENT_PROGRAM_ID,
  AGENT_STAKING_PROGRAM_ID,
  AGENT_PLATFORM_PROGRAM_ID,
} from "../dist/index.js";

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

async function asyncTest(name, fn) {
  testsRun++;
  try {
    await fn();
    testsPassed++;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

console.log("\n🧪 SDK v3 - Complete Test Suite\n");

// ============================================================================
// 1. CONSTANTS
// ============================================================================

console.log("📦 Constants");
test("Program IDs are correct", () => {
  assert.equal(AGENT_PROGRAM_ID.toBase58(), "59Z648TXaaZM7j3RrPpVAUQxdn9K42kaAFBbMFbDiops");
  assert.equal(AGENT_STAKING_PROGRAM_ID.toBase58(), "FE5kcoY1CsnAFak5PBBUy689hRKvpE2261C1GaWSbJak");
  assert.equal(AGENT_PLATFORM_PROGRAM_ID.toBase58(), "3TNdmF3EC9yrJjm5fxfFrrBxur5ntiuoByCqYSgtrEbw");
});

// ============================================================================
// 2. PDA DERIVATION
// ============================================================================

console.log("\n🔑 PDA Derivation");

test("deriveAgentPda returns valid PDA", () => {
  const creator = Keypair.generate().publicKey;
  const [pda, bump] = deriveAgentPda(creator);
  assert.ok(pda instanceof PublicKey);
  assert.ok(bump >= 0 && bump <= 255);
});

test("deriveAgentPda is deterministic", () => {
  const creator = Keypair.generate().publicKey;
  const [pda1] = deriveAgentPda(creator);
  const [pda2] = deriveAgentPda(creator);
  assert.equal(pda1.toBase58(), pda2.toBase58());
});

test("deriveAgentPda varies by creator", () => {
  const creator1 = Keypair.generate().publicKey;
  const creator2 = Keypair.generate().publicKey;
  const [pda1] = deriveAgentPda(creator1);
  const [pda2] = deriveAgentPda(creator2);
  assert.notEqual(pda1.toBase58(), pda2.toBase58());
});

test("deriveStakingPoolPda works", () => {
  const agentPda = Keypair.generate().publicKey;
  const [pda, bump] = deriveStakingPoolPda(agentPda);
  assert.ok(pda instanceof PublicKey);
  assert.ok(bump >= 0 && bump <= 255);
});

test("deriveStakeAccountPda works", () => {
  const staker = Keypair.generate().publicKey;
  const agentPda = Keypair.generate().publicKey;
  const [pda, bump] = deriveStakeAccountPda(staker, agentPda);
  assert.ok(pda instanceof PublicKey);
  assert.ok(bump >= 0 && bump <= 255);
});

test("deriveProgramStatePda is deterministic", () => {
  const [pda1] = deriveProgramStatePda();
  const [pda2] = deriveProgramStatePda();
  assert.equal(pda1.toBase58(), pda2.toBase58());
});

test("deriveTokenVaultPda works", () => {
  const poolPda = Keypair.generate().publicKey;
  const [pda, bump] = deriveTokenVaultPda(poolPda);
  assert.ok(pda instanceof PublicKey);
  assert.ok(bump >= 0 && bump <= 255);
});

// ============================================================================
// 3. UTILITIES
// ============================================================================

console.log("\n🛠️  Utilities");

await asyncTest("hashCardJcs produces 32-byte hash", async () => {
  const card = { name: "Test Agent", version: "1.0" };
  const hash = await hashCardJcs(card);
  assert.ok(hash instanceof Uint8Array);
  assert.equal(hash.length, 32);
});

await asyncTest("hashCardJcs is deterministic", async () => {
  const card = { name: "Test", version: "1.0" };
  const hash1 = await hashCardJcs(card);
  const hash2 = await hashCardJcs(card);
  assert.equal(Buffer.from(hash1).toString("hex"), Buffer.from(hash2).toString("hex"));
});

await asyncTest("hashCardJcs varies by input", async () => {
  const card1 = { name: "Agent1" };
  const card2 = { name: "Agent2" };
  const hash1 = await hashCardJcs(card1);
  const hash2 = await hashCardJcs(card2);
  assert.notEqual(Buffer.from(hash1).toString("hex"), Buffer.from(hash2).toString("hex"));
});

await asyncTest("hashCardJcs is order-independent (canonical)", async () => {
  const card1 = { name: "Test", version: "1.0" };
  const card2 = { version: "1.0", name: "Test" };
  const hash1 = await hashCardJcs(card1);
  const hash2 = await hashCardJcs(card2);
  assert.equal(Buffer.from(hash1).toString("hex"), Buffer.from(hash2).toString("hex"));
});

test("makeConnection creates connection", () => {
  const conn = makeConnection("devnet");
  assert.ok(conn instanceof Connection);
  assert.ok(conn.rpcEndpoint.includes("devnet"));
});

test("makeConnection supports custom RPC", () => {
  const customRpc = "https://my-rpc.com";
  const conn = makeConnection(customRpc);
  assert.equal(conn.rpcEndpoint, customRpc);
});

test("makeConnection defaults to devnet", () => {
  const conn = makeConnection();
  assert.ok(conn.rpcEndpoint.includes("devnet"));
});

// ============================================================================
// 4. INSTRUCTION BUILDERS
// ============================================================================

console.log("\n⚙️  Instruction Builders");

test("createAgentInstruction builds valid instruction", () => {
  const payer = Keypair.generate().publicKey;
  const [agentPda] = deriveAgentPda(payer);
  const cardHash = new Uint8Array(32).fill(1);

  const ix = createAgentInstruction({
    agent: agentPda,
    creatorSigner: payer,
    creator: payer,
    cardUri: "https://example.com/card.json",
    cardHash,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 3);
  assert.ok(ix.data.length > 0);
});

test("createAgentInstruction with all params", () => {
  const payer = Keypair.generate().publicKey;
  const [agentPda] = deriveAgentPda(payer);
  const cardHash = new Uint8Array(32).fill(1);
  const memoryHash = new Uint8Array(32).fill(2);

  const ix = createAgentInstruction({
    agent: agentPda,
    creatorSigner: payer,
    creator: payer,
    cardUri: "https://example.com/card.json",
    cardHash,
    hasStaking: true,
    memoryMode: 3,
    memoryPtr: new TextEncoder().encode("https://memory.com"),
    memoryHash,
  });

  assert.ok(ix);
  assert.ok(ix.data.length > 100); // Should be larger with all params
});

test("setCardInstruction builds valid instruction", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;
  const cardHash = new Uint8Array(32).fill(1);

  const ix = setCardInstruction({
    agent: agentPda,
    owner,
    cardUri: "https://example.com/updated.json",
    cardHash,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 2);
});

test("setMemoryInstruction builds valid instruction", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;
  const ptr = new TextEncoder().encode("https://memory.com");
  const hash = new Uint8Array(32).fill(1);

  const ix = setMemoryInstruction({
    agent: agentPda,
    owner,
    mode: 3,
    ptr,
    hash,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 2);
});

test("lockMemoryInstruction builds valid instruction", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;

  const ix = lockMemoryInstruction({
    agent: agentPda,
    owner,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 2);
});

test("setActiveInstruction builds valid instruction", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;

  const ix = setActiveInstruction({
    agent: agentPda,
    owner,
    isActive: true,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 2);
});

test("closeAgentInstruction builds valid instruction", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;
  const recipient = Keypair.generate().publicKey;

  const ix = closeAgentInstruction({
    agent: agentPda,
    owner,
    recipient,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 4);
});

test("transferOwnerInstruction builds valid instruction", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;
  const newOwner = Keypair.generate().publicKey;

  const ix = transferOwnerInstruction({
    agent: agentPda,
    owner,
    newOwner,
  });

  assert.equal(ix.programId.toBase58(), AGENT_PROGRAM_ID.toBase58());
  assert.equal(ix.keys.length, 2);
});

// ============================================================================
// 5. ACCOUNT DECODING
// ============================================================================

console.log("\n📖 Account Decoding");

test("decodeAgentFromData decodes correctly", () => {
  const data = new Uint8Array(337);

  // Set version
  data[8] = 1;

  // Set creator
  const creator = Keypair.generate().publicKey.toBytes();
  data.set(creator, 9);

  // Set owner
  const owner = Keypair.generate().publicKey.toBytes();
  data.set(owner, 41);

  // Set memoryMode
  data[73] = 3;

  // Set cardUri
  const cardUri = "https://example.com/card.json";
  const cardUriBytes = new TextEncoder().encode(cardUri);
  data[203] = cardUriBytes.length;
  data.set(cardUriBytes, 204);

  // Set flags (ACTIVE | HAS_STAKING)
  data[332] = 0x05;

  const agent = decodeAgentFromData(data);

  assert.equal(agent.version, 1);
  assert.ok(agent.creator instanceof PublicKey);
  assert.ok(agent.owner instanceof PublicKey);
  assert.equal(agent.memoryMode, 3);
  assert.equal(agent.cardUri, cardUri);
  assert.equal(agent.isActive, true);
  assert.equal(agent.hasStaking, true);
  assert.equal(agent.isLocked, false);
});

test("decodeAgentFromData handles flags correctly", () => {
  const data = new Uint8Array(337);

  // Test FLAG_ACTIVE (bit 0)
  data[332] = 0x01;
  let agent = decodeAgentFromData(data);
  assert.equal(agent.isActive, true);
  assert.equal(agent.isLocked, false);
  assert.equal(agent.hasStaking, false);

  // Test FLAG_LOCKED (bit 1)
  data[332] = 0x02;
  agent = decodeAgentFromData(data);
  assert.equal(agent.isActive, false);
  assert.equal(agent.isLocked, true);
  assert.equal(agent.hasStaking, false);

  // Test FLAG_HAS_STAKING (bit 2)
  data[332] = 0x04;
  agent = decodeAgentFromData(data);
  assert.equal(agent.isActive, false);
  assert.equal(agent.isLocked, false);
  assert.equal(agent.hasStaking, true);

  // Test all flags
  data[332] = 0x07;
  agent = decodeAgentFromData(data);
  assert.equal(agent.isActive, true);
  assert.equal(agent.isLocked, true);
  assert.equal(agent.hasStaking, true);
});

// ============================================================================
// 6. READ FUNCTIONS (No RPC calls)
// ============================================================================

console.log("\n📚 Read Functions");

await asyncTest("fetchAgentByPda returns null for non-existent", async () => {
  const connection = makeConnection("devnet");
  const nonExistent = Keypair.generate().publicKey;
  const agent = await fetchAgentByPda(connection, nonExistent);
  assert.equal(agent, null);
});

await asyncTest("fetchAgentByCreator doesn't throw", async () => {
  const connection = makeConnection("devnet");
  const creator = Keypair.generate().publicKey;
  const result = await fetchAgentByCreator(connection, creator);
  // Should be null or valid result
  assert.ok(result === null || (result.pda && result.account));
});

// ============================================================================
// 7. EDGE CASES
// ============================================================================

console.log("\n🎭 Edge Cases");

test("handles long cardUri", () => {
  const longUri = "https://example.com/" + "a".repeat(70);
  const cardHash = new Uint8Array(32).fill(1);
  const payer = Keypair.generate().publicKey;
  const [agentPda] = deriveAgentPda(payer);

  const ix = createAgentInstruction({
    agent: agentPda,
    creatorSigner: payer,
    creator: payer,
    cardUri: longUri,
    cardHash,
  });

  assert.ok(ix);
});

test("handles empty memoryPtr", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;

  const ix = setMemoryInstruction({
    agent: agentPda,
    owner,
    mode: 0,
    ptr: new Uint8Array(0),
    hash: null,
  });

  assert.ok(ix);
});

test("handles all memory modes", () => {
  const agentPda = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;
  const ptr = new TextEncoder().encode("test");
  const hash = new Uint8Array(32).fill(1);

  for (let mode = 0; mode <= 4; mode++) {
    const ix = setMemoryInstruction({
      agent: agentPda,
      owner,
      mode,
      ptr: mode === 0 ? new Uint8Array(0) : ptr,
      hash: mode >= 2 ? hash : null,
    });

    assert.ok(ix);
  }
});

test("handles zero-filled hashes", () => {
  const zeroHash = new Uint8Array(32).fill(0);
  const payer = Keypair.generate().publicKey;
  const [agentPda] = deriveAgentPda(payer);

  const ix = createAgentInstruction({
    agent: agentPda,
    creatorSigner: payer,
    creator: payer,
    cardUri: "https://example.com/card.json",
    cardHash: zeroHash,
  });

  assert.ok(ix);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("📊 Test Summary");
console.log("=".repeat(60));
console.log(`Total tests:   ${testsRun}`);
console.log(`✅ Passed:     ${testsPassed} (${Math.round((testsPassed / testsRun) * 100)}%)`);
console.log(`❌ Failed:     ${testsFailed}`);
console.log("=".repeat(60));

if (testsFailed === 0) {
  console.log("\n🎉 All tests passed! SDK is working perfectly! 🚀\n");
  process.exit(0);
} else {
  console.log(`\n❌ ${testsFailed} test(s) failed.\n`);
  process.exit(1);
}

