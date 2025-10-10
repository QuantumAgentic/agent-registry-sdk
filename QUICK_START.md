# 🚀 Quick Start Guide - Agent Registry SDK

## Installation

```bash
npm install @pipeline/agent-registry-sdk @solana/web3.js
```

## Usage

### 1. Basic Setup

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import {
  createAgent,
  fetchAgentByCreator,
  hashCardJcs,
  AGENT_PROGRAM_ID,
  AGENT_STAKING_PROGRAM_ID,
} from "@pipeline/agent-registry-sdk";

// Create connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Your wallet (in production, use a secure wallet)
const payer = Keypair.generate();
```

### 2. Create an Agent

```typescript
// 1. Prepare card data
const cardData = {
  name: "My AI Agent",
  description: "An autonomous agent on Solana",
  version: "1.0.0",
  capabilities: ["chat", "trading"],
};

// 2. Hash the card (JCS + SHA3-256)
const cardHash = await hashCardJcs(cardData);

// 3. Create agent on-chain
const agentPda = await createAgent({
  connection,
  payer,
  cardUri: "https://example.com/agent-card.json",
  cardHash: Array.from(cardHash),
  hasStaking: false, // Set to true if you want staking
});

console.log("✅ Agent created at:", agentPda.toBase58());
```

### 3. Fetch Agent Data

```typescript
const result = await fetchAgentByCreator(connection, payer.publicKey);

if (result) {
  const { pda, account } = result;
  console.log("Agent PDA:", pda.toBase58());
  console.log("Creator:", account.creator.toBase58());
  console.log("Owner:", account.owner.toBase58());
  console.log("Active:", account.isActive);
  console.log("Staking:", account.hasStaking);
}
```

### 4. Create Agent with Staking (Atomic)

```typescript
import { PublicKey } from "@solana/web3.js";

// Your SPL token mint
const tokenMint = new PublicKey("So11111111111111111111111111111111111111112");

const result = await createAgentWithStakingPool({
  connection,
  payer,
  tokenMint,
  minStakeAmount: 1_000_000n, // Minimum stake (adjust for token decimals)
  cardUri: "https://example.com/staking-agent.json",
  cardHash: Array.from(cardHash),
});

console.log("✅ Agent PDA:", result.agentPda.toBase58());
console.log("✅ Staking Pool PDA:", result.poolPda.toBase58());
console.log("✅ Token Vault PDA:", result.vaultPda.toBase58());
console.log("✅ Transaction:", result.signature);
```

### 5. Update Agent Card

```typescript
import { setCard } from "@pipeline/agent-registry-sdk";

const newCardData = {
  ...cardData,
  version: "2.0.0",
};

const newHash = await hashCardJcs(newCardData);

await setCard({
  connection,
  payer,
  agentPda,
  cardUri: "https://example.com/agent-card-v2.json",
  cardHash: Array.from(newHash),
});

console.log("✅ Card updated");
```

### 6. Set Agent Memory

```typescript
import { setMemory } from "@pipeline/agent-registry-sdk";

// Example: Store memory on IPFS
const ipfsCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

await setMemory({
  connection,
  payer,
  agentPda,
  mode: 1, // CID mode (IPFS)
  ptr: new TextEncoder().encode(ipfsCid),
  // hash not required for CID mode (self-verifying)
});

console.log("✅ Memory set to IPFS:", ipfsCid);
```

### 7. Transfer Ownership

```typescript
import { transferOwner } from "@pipeline/agent-registry-sdk";

const newOwnerPubkey = new PublicKey("...");

await transferOwner({
  connection,
  payer, // Current owner must sign
  agentPda,
  newOwner: newOwnerPubkey,
});

console.log("✅ Ownership transferred to:", newOwnerPubkey.toBase58());
```

### 8. Deactivate and Close Agent

```typescript
import { setActive, closeAgent } from "@pipeline/agent-registry-sdk";

// 1. Deactivate
await setActive({
  connection,
  payer,
  agentPda,
  isActive: false,
});

// 2. Close (recovers rent)
await closeAgent({
  connection,
  payer,
  agentPda,
  recipient: payer.publicKey, // Where to send rent refund
});

console.log("✅ Agent closed, rent recovered");
```

## Program IDs

```typescript
import { AGENT_PROGRAM_ID, AGENT_STAKING_PROGRAM_ID } from "@pipeline/agent-registry-sdk";

console.log("Agent Registry:", AGENT_PROGRAM_ID.toBase58());
// => 59Z648TXaaZM7j3RrPpVAUQxdn9K42kaAFBbMFbDiops

console.log("Agent Staking:", AGENT_STAKING_PROGRAM_ID.toBase58());
// => FE5kcoY1CsnAFak5PBBUy689hRKvpE2261C1GaWSbJak
```

## Memory Modes

| Mode | Value | Description | Ptr Required | Hash Required |
|------|-------|-------------|--------------|---------------|
| None | 0 | No memory | ❌ | ❌ |
| CID | 1 | IPFS CID (self-verifying) | ✅ | ❌ |
| IPNS | 2 | IPNS name (mutable) | ✅ | ✅ |
| URL | 3 | HTTPS URL | ✅ | ✅ |
| Manifest | 4 | Manifest pointer | ✅ | ✅ |

## Helper Functions

### Derive PDAs

```typescript
import { deriveAgentPda, deriveStakingPoolPda } from "@pipeline/agent-registry-sdk";

const [agentPda, bump] = deriveAgentPda(creatorPubkey);
const [poolPda, poolBump] = deriveStakingPoolPda(agentPda);
```

### Make Connection

```typescript
import { makeConnection } from "@pipeline/agent-registry-sdk";

const connection = makeConnection("devnet");
// or
const connection = makeConnection("mainnet");
// or custom RPC
const connection = makeConnection("https://my-rpc.example.com");
```

## Error Handling

```typescript
try {
  await createAgent({
    connection,
    payer,
    cardUri: "https://example.com/card.json",
    cardHash: Array.from(cardHash),
  });
} catch (error) {
  if (error.message.includes("AccountAlreadyInitialized")) {
    console.log("Agent already exists for this creator");
  } else {
    console.error("Error creating agent:", error);
  }
}
```

## Complete Example

See [examples/](./examples/) folder for complete working examples.

## Need Help?

- 📖 Full API Reference: See [README.md](./README.md)
- 🐛 Issues: [GitHub Issues](https://github.com/QuantumAgentic/agent-registry-sdk/issues)
- 💬 Discord: [Join our Discord](https://discord.gg/pipeline)

---

**SDK Version**: 1.0.0  
**Bundle Size**: 9.6 KB (compressed)  
**No Anchor dependency** ✅

