# 📦 Agent Registry SDK

**Lightweight** TypeScript SDK for Solana **Agent Registry** and **Agent Staking** smart contracts.

[![npm version](https://img.shields.io/npm/v/@pipeline/agent-registry-sdk.svg)](https://www.npmjs.com/package/@pipeline/agent-registry-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Size](https://img.shields.io/badge/size-84KB-brightgreen.svg)]()

**Pure `@solana/web3.js`** implementation - no framework dependencies, ultra-lightweight.

---

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Types](#types)

---

## 🚀 Installation

```bash
npm install @pipeline/agent-registry-sdk @solana/web3.js

# or with yarn
yarn add @pipeline/agent-registry-sdk @solana/web3.js

# or with pnpm
pnpm add @pipeline/agent-registry-sdk @solana/web3.js
```

**Dependencies**:
- ✅ `@solana/web3.js` (only Solana dependency)
- ✅ `canonicalize` (JSON canonicalization)

**Bundle size**: Only 84 KB! 🎉

---

## ⚡ Quick Start

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import {
  createAgent,
  fetchAgentByCreator,
  hashCardJcs,
  makeConnection 
} from "@pipeline/agent-registry-sdk";

// 1. Setup
const connection = makeConnection("devnet");
const payer = Keypair.generate();

// 2. Airdrop (devnet only)
const sig = await connection.requestAirdrop(payer.publicKey, 1_000_000_000);
await connection.confirmTransaction(sig);

// 3. Create card hash
const cardData = {
  name: "My AI Agent",
  description: "An autonomous AI agent",
  version: "1.0.0"
};
const cardHash = await hashCardJcs(cardData);

// 4. Create agent
const agentPda = await createAgent({
  connection,
  payer,
  cardUri: "https://example.com/agent-card.json",
  cardHash,
  hasStaking: true,
});

console.log("✅ Agent created:", agentPda.toBase58());

// 5. Fetch agent data
const result = await fetchAgentByCreator(connection, payer.publicKey);
if (result) {
  console.log("Agent data:", result.account);
}
```

---

## 📚 API Reference

### Core Functions

#### `createAgent()`

Create a new agent on-chain.

```typescript
async function createAgent(params: {
  connection: Connection;
  payer: Signer;
  creator?: PublicKey;         // Optional: defaults to payer.publicKey
  cardUri: string;             // Required
  cardHash: Uint8Array | number[];  // Required (32 bytes)
  hasStaking?: boolean;        // Optional: default true
  memoryMode?: number;         // Optional: 0=None, 1=CID, 2=IPNS, 3=URL
  memoryPtr?: string;          // Optional
  memoryHash?: Uint8Array | number[];  // Optional (32 bytes)
  programId?: PublicKey;       // Optional: override program ID
}): Promise<PublicKey>
```

**Example**:

```typescript
const cardHash = await hashCardJcs({ name: "Agent" });

const agentPda = await createAgent({
  connection,
  payer: myKeypair,
  cardUri: "https://example.com/card.json",
  cardHash,
  hasStaking: true,
  memoryMode: 3,  // URL mode
  memoryPtr: "https://example.com/memory.json",
});
```

#### `setCard()`

Update agent's card.

```typescript
async function setCard(params: {
  connection: Connection;
  payer: Signer;
  agentPda: PublicKey;
  cardUri: string;
  cardHash: Uint8Array | number[];
  programId?: PublicKey;
}): Promise<void>
```

#### `setMemory()`

Configure agent's memory.

```typescript
async function setMemory(params: {
  connection: Connection;
  payer: Signer;
  agentPda: PublicKey;
  mode: number;  // 0=None, 1=CID, 2=IPNS, 3=URL
  ptr: Uint8Array | number[];
  hash?: Uint8Array | number[];
  programId?: PublicKey;
}): Promise<void>
```

**Memory Modes**:

| Mode | Value | Ptr Required | Hash Required | Use Case |
|------|-------|--------------|---------------|----------|
| **None** | 0 | ❌ | ❌ | No memory |
| **CID** | 1 | ✅ | ❌ | IPFS CID (self-verifying) |
| **IPNS** | 2 | ✅ | ✅ | IPNS name (mutable) |
| **URL** | 3 | ✅ | ✅ | HTTPS URL |
| **Manifest** | 4 | ✅ | ✅ | Manifest pointer |

#### `lockMemory()`

Lock memory permanently.

```typescript
async function lockMemory(params: {
  connection: Connection;
  payer: Signer;
  agentPda: PublicKey;
  programId?: PublicKey;
}): Promise<void>
```

#### `setActive()`

Activate or deactivate agent.

```typescript
async function setActive(params: {
  connection: Connection;
  payer: Signer;
  agentPda: PublicKey;
  isActive: boolean;
  programId?: PublicKey;
}): Promise<void>
```

#### `closeAgent()`

Close agent account and recover rent.

```typescript
async function closeAgent(params: {
  connection: Connection;
  payer: Signer;
  agentPda: PublicKey;
  recipient: PublicKey;
  programId?: PublicKey;
}): Promise<void>
```

#### `transferOwner()`

Transfer ownership to another address.

```typescript
async function transferOwner(params: {
  connection: Connection;
  payer: Signer;
  agentPda: PublicKey;
  newOwner: PublicKey;
  programId?: PublicKey;
}): Promise<void>
```

---

### Atomic Transactions

#### `createAgentWithStakingPool()`

Create agent and staking pool in a single atomic transaction.

```typescript
async function createAgentWithStakingPool(params: {
  connection: Connection;
  payer: Signer;
  creator?: PublicKey;         // Optional: defaults to payer.publicKey
  tokenMint: PublicKey;        // SPL token for staking
  minStakeAmount: bigint;      // Minimum stake amount
  cardUri: string;             // Required
  cardHash: Uint8Array | number[];  // Required (32 bytes)
  memoryMode?: number;         // Optional
  memoryPtr?: string;          // Optional
  memoryHash?: Uint8Array | number[];  // Optional
  agentProgramId?: PublicKey;
  stakingProgramId?: PublicKey;
}): Promise<{
  agentPda: PublicKey;
  poolPda: PublicKey;
  vaultPda: PublicKey;
  signature: string;
}>
```

**Example**:

```typescript
import { PublicKey } from "@solana/web3.js";

const tokenMint = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL
const cardHash = await hashCardJcs({ name: "Staking Agent" });

const result = await createAgentWithStakingPool({
  connection,
  payer: myKeypair,
  tokenMint,
  minStakeAmount: 1_000_000n, // 1 token (6 decimals)
  cardUri: "https://example.com/card.json",
  cardHash,
});

console.log("✅ Agent:", result.agentPda.toBase58());
console.log("✅ Pool:", result.poolPda.toBase58());
console.log("✅ Vault:", result.vaultPda.toBase58());
console.log("✅ TX:", result.signature);
```

**Note**: For v1.0, only agent+pool creation is supported. Stake/unstake functions will come in v2.0.

---

### Read Functions

#### `fetchAgentByPda()`

Fetch agent by its PDA.

```typescript
async function fetchAgentByPda(
  connection: Connection,
  agentPda: PublicKey,
  programId?: PublicKey
): Promise<AgentAccount | null>
```

#### `fetchAgentByCreator()`

Fetch agent by creator public key.

```typescript
async function fetchAgentByCreator(
  connection: Connection,
  creator: PublicKey,
  programId?: PublicKey
): Promise<{ pda: PublicKey; account: AgentAccount } | null>
```

---

### PDA Helpers

All PDA derivation functions:

```typescript
function deriveAgentPda(creator: PublicKey, programId?: PublicKey): [PublicKey, number]
function deriveStakingPoolPda(agentPda: PublicKey, programId?: PublicKey): [PublicKey, number]
function deriveStakeAccountPda(staker: PublicKey, agentPda: PublicKey, programId?: PublicKey): [PublicKey, number]
function deriveProgramStatePda(programId?: PublicKey): [PublicKey, number]
function deriveTokenVaultPda(poolPda: PublicKey, programId?: PublicKey): [PublicKey, number]
```

---

### Utilities

#### `hashCardJcs()`

Hash card data using JCS + SHA-256.

```typescript
async function hashCardJcs(card: unknown): Promise<Uint8Array>
```

#### `makeConnection()`

Create a Solana connection.

```typescript
function makeConnection(
  rpcOrCluster?: string | "devnet" | "testnet" | "mainnet",
  commitment?: Commitment
): Connection
```

**Example**:

```typescript
const connection = makeConnection("devnet");
// or
const connection = makeConnection("https://my-rpc.example.com");
```

---

## 💡 Examples

### Example 1: Create and Update Agent

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { createAgent, setCard, hashCardJcs } from "@pipeline/agent-registry-sdk";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const payer = Keypair.generate();

  // Airdrop
  await connection.requestAirdrop(payer.publicKey, 1_000_000_000);
  await new Promise(r => setTimeout(r, 1000));

  // Create
  const cardHash = await hashCardJcs({ name: "Agent v1" });
  const agentPda = await createAgent({
    connection,
    payer,
    cardUri: "https://example.com/v1.json",
    cardHash,
  });

  console.log("✅ Agent:", agentPda.toBase58());

  // Update
  const newHash = await hashCardJcs({ name: "Agent v2" });
  await setCard({
    connection,
    payer,
    agentPda,
    cardUri: "https://example.com/v2.json",
    cardHash: newHash,
  });

  console.log("✅ Card updated");
}

main().catch(console.error);
```

### Example 2: Fetch and Display

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchAgentByCreator } from "@pipeline/agent-registry-sdk";

async function display(creatorAddress: string) {
  const connection = new Connection("https://api.devnet.solana.com");
  const creator = new PublicKey(creatorAddress);

  const result = await fetchAgentByCreator(connection, creator);
  
  if (!result) {
    console.log("❌ Agent not found");
    return;
  }

  const { pda, account } = result;
  console.log("✅ Agent PDA:", pda.toBase58());
  console.log("   Creator:", account.creator.toBase58());
  console.log("   Owner:", account.owner.toBase58());
  console.log("   Card URI:", account.cardUri);
  console.log("   Active:", account.isActive);
  console.log("   Staking:", account.hasStaking);
}
```

### Example 3: Set Memory (IPFS)

```typescript
import { setMemory } from "@pipeline/agent-registry-sdk";

async function setIPFSMemory(agentPda: PublicKey) {
  const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

await setMemory({
    connection,
    payer,
  agentPda,
    mode: 1,  // CID mode
    ptr: new TextEncoder().encode(cid),
  });

  console.log("✅ IPFS memory set:", cid);
}
```

---

## 📝 Types

### `AgentAccount`

```typescript
type AgentAccount = {
  version: number;
  creator: PublicKey;      // Immutable (PDA seed)
  owner: PublicKey;        // Mutable (transferable)
  memoryMode: number;      // 0=None, 1=CID, 2=IPNS, 3=URL
  memoryPtr: Uint8Array;   // Max 96 bytes
  memoryHash: Uint8Array;  // 32 bytes
  cardUri: string;         // Max 96 bytes
  cardHash: Uint8Array;    // 32 bytes
  flags: number;           // u32 bitfield
  bump: number;
  isActive: boolean;       // Computed from flags
  isLocked: boolean;       // Computed from flags
  hasStaking: boolean;     // Computed from flags
};
```

**Flags**:

| Flag | Bit | Description |
|------|-----|-------------|
| `FLAG_ACTIVE` | 0 | Agent is active |
| `FLAG_LOCKED` | 1 | Memory is locked |
| `FLAG_HAS_STAKING` | 2 | Staking enabled |

---

## 🔧 Low-Level API

For advanced users, you can build instructions manually:

```typescript
import { 
  createAgentInstruction,
  setCardInstruction,
  // ... other instruction builders
} from "@pipeline/agent-registry-sdk";

// Build instruction
const ix = createAgentInstruction({
  agent: agentPda,
  creatorSigner: payer.publicKey,
  creator: payer.publicKey,
  cardUri: "...",
  cardHash: hash,
});

// Add to transaction
const tx = new Transaction().add(ix);
// ... sign and send manually
```

---

## 🚀 Programs Supported

| Program | ID | Description |
|---------|----|----- --|
| **Agent Registry** | `59Z648...Diops` | Agent management |
| **Agent Staking** | `FE5kco...bJak` | Token staking |
| **Agent Platform** | `3TNdmF...rEbw` | Merged (33% cheaper) |

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📞 Support

- 📧 Email: contact@pipeline.app
- 🐦 Twitter: [@pipeline_app](https://twitter.com/pipeline_app)
- 💬 Discord: [Join our Discord](https://discord.gg/pipeline)

---

**Made with ❤️ by the Pipeline Team**
