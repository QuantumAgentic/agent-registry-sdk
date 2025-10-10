# Agent Registry SDK (Solana + Anchor)

A complete TypeScript SDK for interacting with:
- **Agent Registry**: On-chain agent management (PDA: `seeds = ["agent", agentWallet]`)
- **Agent Staking**: SPL token staking pools with linear decay fees

## 🚀 Features

### Agent Registry
- ✅ Create/update/close agents
- ✅ Memory pointer management (CID, IPNS, URL, Manifest)
- ✅ Agent card (off-chain JSON with JCS+SHA-256 hash)
- ✅ Lock memory (irreversible)
- ✅ Admin transfer
- ✅ Staking flag support

### Agent Staking
- ✅ **Atomic creation**: Agent + Pool in 1 transaction ⚛️
- ✅ Create staking pools (SPL tokens)
- ✅ Stake/unstake with real SPL transfers
- ✅ Linear decay fees (3% → 0.5% over 30 days)
- ✅ Read helpers (pool, stake, state)
- ✅ List helpers (pools, user stakes)
- ✅ CPI validation (FLAG_HAS_STAKING)

## 📦 Install

```bash
npm i @pipeline/agent-registry-sdk
```

## 🎯 Quick Start

### 1. Agent Registry

```typescript
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import * as SDK from "@pipeline/agent-registry-sdk";

const connection = SDK.makeConnection("devnet");
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, wallet, {});

// Create an agent
const agentWallet = Keypair.generate().publicKey;
const agentPda = await SDK.createAgent({
  provider,
  agentWallet,
  hasStaking: true,  // Enable staking
});

// Fetch agent
const agent = await SDK.fetchAgentByPda(provider, agentPda);
console.log(`Agent active: ${agent.isActive}`);
console.log(`Has staking: ${(agent.flags & 4) !== 0}`);
```

### 2. Agent Staking (Atomic) ⚛️

```typescript
import stakingIdl from "./agent_staking.json";

// Create agent + pool in 1 transaction!
const { agentPda, poolPda, vaultPda, signature } = await SDK.createAgentWithStakingPool({
  provider,
  stakingIdl,
  agentWallet: Keypair.generate().publicKey,
  tokenMint: yourTokenMint,
  minStakeAmount: 1000,
});

console.log(`Agent + Pool created in TX: ${signature}`);

// Stake tokens
const stakePda = await SDK.stakeTokens({
  provider,
  stakingIdl,
  agentPda,
  stakerTokenAccount: userAta,
  amount: 10000,
});

// Withdraw (with fees)
await SDK.withdrawStake({
  provider,
  stakingIdl,
  agentPda,
  stakerTokenAccount: userAta,
});
```

## 📚 API Reference

### Agent Registry

| Function | Description |
|----------|-------------|
| `createAgent()` | Create agent with optional staking flag |
| `setCard()` | Set agent card (URI + hash) |
| `setMemory()` | Set memory pointer (CID/IPNS/URL/Manifest) |
| `lockMemory()` | Lock memory (irreversible) |
| `setActive()` | Activate/deactivate agent |
| `transferAdmin()` | Transfer admin to new owner |
| `closeAgent()` | Close agent and reclaim rent |
| `fetchAgentByPda()` | Read agent by PDA |
| `fetchAgentByWallet()` | Read agent by wallet |
| `listAgents()` | List agents with filters |

### Agent Staking - Write

| Function | Description |
|----------|-------------|
| `createAgentWithStakingPool()` ⚛️ | **Atomic**: Create agent + pool in 1 TX |
| `initProgramState()` | Initialize program state (1x per deployment) |
| `createStakingPool()` | Create staking pool for agent |
| `stakeTokens()` | Stake SPL tokens |
| `withdrawStake()` | Withdraw staked tokens (with fees) |

### Agent Staking - Read

| Function | Description |
|----------|-------------|
| `fetchStakingPool()` | Read pool account |
| `fetchStakeAccount()` | Read stake account |
| `fetchProgramState()` | Read program state (fees, treasury) |
| `listStakingPools()` | List pools with filters (owner, tokenMint) |
| `listStakesByUser()` | List stakes for a user |

### PDA Helpers

```typescript
// Agent Registry
const [agentPda, bump] = SDK.deriveAgentPda(agentWallet);

// Agent Staking
const [poolPda, bump] = SDK.deriveStakingPoolPda(agentPda);
const [vaultPda, bump] = SDK.deriveTokenVaultPda(poolPda);
const [stakePda, bump] = SDK.deriveStakeAccountPda(staker, agentPda);
const [statePda, bump] = SDK.deriveProgramStatePda();
```

## ⚛️ Atomic Transaction

Instead of 2 separate transactions:
```typescript
// ❌ Old way: 2 TXs
const agentPda = await SDK.createAgent({ ... });  // TX 1
const { poolPda } = await SDK.createStakingPool({ ... });  // TX 2
```

Use atomic creation:
```typescript
// ✅ New way: 1 TX (atomic)
const { agentPda, poolPda } = await SDK.createAgentWithStakingPool({ ... });
```

**Benefits:**
- 1 TX fee instead of 2
- Atomic guarantee (all or nothing)
- Faster (~1.2s vs ~2.5s)
- Guaranteed consistency

## 🔐 Security Features

- **CPI Validation**: Pool creation validates `FLAG_HAS_STAKING` (0 CU cost)
- **Min Stake Enforcement**: New stakes must meet `minStakeAmount`
- **Fee Anti-Manipulation**: `staked_at` preserved on re-stake
- **Account Non-Closure**: Stake account remains (fixes fee bypass)
- **SOL Balance Check**: Withdraw verifies sufficient SOL for fees

## 💰 Fee Model

### Parameters (in `ProgramState`)
- `fee_immediate`: 3% (300 bps) - immediate withdraw
- `fee_regular`: 0.5% (50 bps) - after decay period
- `decay_duration_seconds`: 2,592,000 (30 days)

### Linear Decay Formula
```
Fee = fee_immediate - ((fee_immediate - fee_regular) * time_elapsed / decay_duration)
```

**Example:**
- Stake 10,000 tokens at T=0
- Withdraw at T=15 days (50% decay)
- Fee: 3% → 0.5% = **1.75%** = **175 tokens**

## 🧪 Development

### Build SDK

```bash
cd sdk
npm install
npm run build
```

### Run Tests

```bash
# Test 1: Full SDK E2E
cd smartcontract/agent-registry
npm run test:devnet:sdk

# Test 2: Atomic creation
npm run test:devnet:atomic
```

## 📊 Examples

See:
- `smartcontract/agent-registry/scripts/test-devnet-with-sdk.ts`
- `smartcontract/agent-registry/scripts/test-atomic-creation.ts`
- `smartcontract/SDK_INTEGRATION.md` (full guide)

## 🔧 Utilities

### `hashCardJcs(obj|string) → Promise<Uint8Array>`
- RFC 8785 JCS canonicalization + SHA-256
- Browser-first (WebCrypto), Node fallback

```typescript
const card = { schema: "agent-card-v1", name: "Nightfall" };
const hash = await SDK.hashCardJcs(card);
```

### Memory Modes

| Mode | Name | Requirements |
|------|------|--------------|
| 0 | None | ptr empty, no hash |
| 1 | Cid | ptr required, no hash |
| 2 | Ipns | ptr required, 32-byte hash |
| 3 | Url | ptr (https://), 32-byte hash |
| 4 | Manifest | ptr required, 32-byte hash |

## 📝 Types

```typescript
type AgentAccount = {
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

type StakingPoolAccount = {
  owner: PublicKey;
  agentPda: PublicKey;
  tokenMint: PublicKey;
  tokenVault: PublicKey;
  minStakeAmount: bigint;
  totalStaked: bigint;
  createdAt: bigint;
  flags: number;
  bump: number;
};

type StakeAccount = {
  staker: PublicKey;
  agentPda: PublicKey;
  stakedAmount: bigint;
  stakedAt: bigint;
  lastUpdatedAt: bigint;
  bump: number;
};

type ProgramStateAccount = {
  authority: PublicKey;
  treasury: PublicKey;
  feeImmediate: number;
  feeRegular: number;
  feeMax: number;
  decayDurationSeconds: bigint;
  bump: number;
};
```

## 🎯 Roadmap

- [x] ✅ Agent Registry (create, update, close)
- [x] ✅ Agent Staking (stake, withdraw, fees)
- [x] ✅ Atomic creation (agent + pool in 1 TX)
- [x] ✅ Read helpers (pool, stake, state)
- [x] ✅ List helpers (pools, user stakes)
- [ ] Pause/unpause pool (admin)
- [ ] Multi-token support (multiple pools per agent)
- [ ] On-chain metrics (APY history, volume)

## 📞 Support

Documentation:
- `smartcontract/SDK_INTEGRATION.md` - Full API guide
- `smartcontract/SECURITY_FIXES.md` - Security audit
- `smartcontract/CPI_IMPLEMENTATION.md` - CPI details
- `docs/SOLANA_PDA_CAHIER_DES_CHARGES.md` - Complete spec

## 📄 License

MIT

---

**Last updated**: 2025-10-10  
**Version**: V2 - Atomic Transactions + Read/List Helpers
