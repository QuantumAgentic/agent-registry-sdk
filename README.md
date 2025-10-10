# 📦 Agent Registry SDK

SDK TypeScript pour interagir avec les smart contracts Solana **Agent Registry** et **Agent Staking**.

[![npm version](https://img.shields.io/npm/v/@pipeline/agent-registry-sdk.svg)](https://www.npmjs.com/package/@pipeline/agent-registry-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Table des Matières

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Programmes Supportés](#programmes-supportés)
- [API Référence](#api-référence)
  - [Agent Registry](#agent-registry)
  - [Agent Staking](#agent-staking)
  - [Transactions Atomiques](#transactions-atomiques)
  - [PDA Helpers](#pda-helpers)
  - [Read Helpers](#read-helpers)
- [Types](#types)
- [Exemples Complets](#exemples-complets)
- [Changelog](#changelog)

---

## 🚀 Installation

```bash
npm install @pipeline/agent-registry-sdk @coral-xyz/anchor @solana/web3.js

# ou avec yarn
yarn add @pipeline/agent-registry-sdk @coral-xyz/anchor @solana/web3.js

# ou avec pnpm
pnpm add @pipeline/agent-registry-sdk @coral-xyz/anchor @solana/web3.js
```

---

## ⚡ Quick Start

```typescript
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import {
  createAgent,
  fetchAgentByCreator,
  hashCardJcs,
  makeConnection 
} from "@pipeline/agent-registry-sdk";

// 1. Setup
const connection = makeConnection("devnet");
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

// 2. Créer un agent
const cardData = {
  name: "My AI Agent",
  description: "An autonomous AI agent",
  version: "1.0.0"
};

const cardHash = await hashCardJcs(cardData);

const agentPda = await createAgent({
  provider,
  cardUri: "https://example.com/agent-card.json",
  cardHash,
  hasStaking: true,  // Enable staking
});

console.log("Agent created:", agentPda.toBase58());

// 3. Lire les données de l'agent
const result = await fetchAgentByCreator(provider, wallet.publicKey);
if (result) {
  console.log("Agent data:", result.account);
}
```

---

## 📦 Programmes Supportés

### 1. **Agent Registry** (Agent Management)

**Program ID**: `59Z648TXaaZM7j3RrPpVAUQxdn9K42kaAFBbMFbDiops` (Devnet)

Gère le cycle de vie des agents:
- Création d'agents avec card (identity)
- Gestion de la mémoire (CID, IPFS, URL)
- États (active/inactive, locked)
- Transfer de propriété

### 2. **Agent Staking** (Token Staking)

**Program ID**: `FE5kcoY1CsnAFak5PBBUy689hRKvpE2261C1GaWSbJak` (Devnet)

Permet le staking de tokens SPL:
- Création de pools de staking
- Stake/Unstake de tokens
- Fees dégressives avec le temps
- Gestion de treasury

### 3. **Agent Platform** (Merged)

**Program ID**: `3TNdmF3EC9yrJjm5fxfFrrBxur5ntiuoByCqYSgtrEbw` (Devnet)

Programme fusionné combinant Registry + Staking:
- Même fonctionnalités que les 2 programmes séparés
- **33% moins cher** à déployer
- Pas de CPI overhead
- Architecture simplifiée

---

## 📚 API Référence

### Agent Registry

#### `createAgent()`

Crée un nouvel agent on-chain.

```typescript
async function createAgent(opts: {
  provider: AnchorProvider;
  creator?: PublicKey;         // Optional: defaults to wallet.publicKey
  cardUri: string;             // Required: URI du card JSON
  cardHash: Uint8Array | number[];  // Required: SHA-256 du card
  hasStaking?: boolean;        // Optional: enable staking (default: true)
  memoryMode?: number;         // Optional: 0=None, 1=CID, 2=IPNS, 3=URL
  memoryPtr?: string;          // Optional: memory pointer
  memoryHash?: Uint8Array | number[];  // Optional: memory hash
  programId?: PublicKey;       // Optional: override program ID
}): Promise<PublicKey>
```

**Exemple**:

```typescript
const cardHash = await hashCardJcs({ name: "Agent" });

const agentPda = await createAgent({
  provider,
  cardUri: "https://example.com/card.json",
  cardHash,
  hasStaking: true,
  memoryMode: 3,  // URL mode
  memoryPtr: "https://example.com/memory.json",
  memoryHash: new Uint8Array(32).fill(0),
});
```

#### `setCard()`

Met à jour le card de l'agent.

```typescript
async function setCard(opts: {
  provider: AnchorProvider;
  agentPda: PublicKey;
  cardUri: string;
  cardHash: Uint8Array | number[];
  programId?: PublicKey;
}): Promise<void>
```

**Exemple**:

```typescript
const newCard = { name: "Updated Agent", version: "2.0" };
const newHash = await hashCardJcs(newCard);

await setCard({
  provider,
  agentPda,
  cardUri: "https://example.com/updated-card.json",
  cardHash: newHash,
});
```

#### `setMemory()`

Configure la mémoire de l'agent selon le mode choisi.

```typescript
async function setMemory(opts: {
  provider: AnchorProvider;
  agentPda: PublicKey;
  mode: number;  // 0=None, 1=CID, 2=IPNS, 3=URL, 4=Manifest
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

**Exemples**:

```typescript
// CID mode (IPFS)
await setMemory({
  provider,
  agentPda,
  mode: 1,
  ptr: new TextEncoder().encode("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"),
});

// URL mode
const memoryContent = JSON.stringify({ data: "..." });
const memoryHash = await hashCardJcs(memoryContent);

await setMemory({
  provider,
  agentPda,
  mode: 3,
  ptr: new TextEncoder().encode("https://example.com/memory.json"),
  hash: memoryHash,
});
```

#### `lockMemory()`

Verrouille la mémoire de façon permanente.

```typescript
async function lockMemory(
  provider: AnchorProvider,
  agentPda: PublicKey,
  programId?: PublicKey
): Promise<void>
```

**Exemple**:

```typescript
await lockMemory(provider, agentPda);
// La mémoire ne peut plus être modifiée
```

#### `setActive()`

Active ou désactive l'agent.

```typescript
async function setActive(
  provider: AnchorProvider,
  agentPda: PublicKey,
  isActive: boolean,
  programId?: PublicKey
): Promise<void>
```

**Exemple**:

```typescript
// Désactiver l'agent
await setActive(provider, agentPda, false);

// Réactiver l'agent
await setActive(provider, agentPda, true);
```

#### `closeAgent()`

Ferme le compte de l'agent et récupère le rent.

```typescript
async function closeAgent(
  provider: AnchorProvider,
  agentPda: PublicKey,
  recipient: PublicKey,
  programId?: PublicKey
): Promise<void>
```

**Conditions**:
- ❌ L'agent doit être **inactif** (`FLAG_ACTIVE = 0`)
- ❌ L'agent ne doit **pas avoir de staking** (`FLAG_HAS_STAKING = 0`)

**Exemple**:

```typescript
// 1. Désactiver l'agent
await setActive(provider, agentPda, false);

// 2. Fermer le compte
await closeAgent(provider, agentPda, provider.wallet.publicKey);
```

#### `transferOwner()` (NOUVEAU - v2.0)

Transfère la propriété de l'agent à un nouveau owner.

```typescript
async function transferOwner(
  provider: AnchorProvider,
  agentPda: PublicKey,
  newOwner: PublicKey,
  programId?: PublicKey
): Promise<void>
```

**Note**: Le champ `creator` reste immutable (utilisé pour le PDA). Seul `owner` change.

**Exemple**:

```typescript
const newOwnerKeypair = Keypair.generate();

await transferOwner(provider, agentPda, newOwnerKeypair.publicKey);

// newOwner peut maintenant modifier l'agent
```

---

### Agent Staking

#### `initProgramState()`

Initialise le state global du programme de staking (à faire une seule fois).

```typescript
async function initProgramState(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  treasury?: PublicKey;  // Default: wallet.publicKey
  stakingProgramId?: PublicKey;
}): Promise<PublicKey>
```

**Exemple**:

```typescript
import stakingIdl from "./idl/agent_staking.json";

const statePda = await initProgramState({
  provider,
  stakingIdl,
  treasury: treasuryKeypair.publicKey,
});
```

#### `createStakingPool()`

Crée un pool de staking pour un agent.

```typescript
async function createStakingPool(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  tokenMint: PublicKey;      // SPL token mint
  minStakeAmount: number | bigint;
  stakingProgramId?: PublicKey;
}): Promise<{ poolPda: PublicKey; vaultPda: PublicKey }>
```

**Exemple**:

```typescript
const { poolPda, vaultPda } = await createStakingPool({
  provider,
  stakingIdl,
  agentPda,
  tokenMint: new PublicKey("So11111111111111111111111111111111111111112"), // SOL wrapped
  minStakeAmount: 1_000_000,  // 1 token (avec 6 decimals)
});
```

#### `initStakeAccount()`

Initialise le compte de stake pour un staker (requis avant le premier stake).

```typescript
async function initStakeAccount(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  stakingProgramId?: PublicKey;
}): Promise<PublicKey>
```

**Exemple**:

```typescript
const stakePda = await initStakeAccount({
  provider,
  stakingIdl,
  agentPda,
});
```

#### `stakeTokens()`

Stake des tokens dans le pool.

```typescript
async function stakeTokens(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  stakerTokenAccount: PublicKey;  // ATA du staker
  amount: number | bigint;
  stakingProgramId?: PublicKey;
}): Promise<PublicKey>
```

**Exemple**:

```typescript
import { getAssociatedTokenAddress } from "@solana/spl-token";

const userAta = await getAssociatedTokenAddress(
  tokenMint,
  provider.wallet.publicKey
);

await stakeTokens({
  provider,
  stakingIdl,
  agentPda,
  stakerTokenAccount: userAta,
  amount: 10_000_000,  // 10 tokens
});
```

#### `withdrawStake()`

Retire les tokens stakés (avec fee dégressive).

```typescript
async function withdrawStake(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  agentPda: PublicKey;
  stakerTokenAccount: PublicKey;
  treasury?: PublicKey;  // Auto-fetched si non fourni
  stakingProgramId?: PublicKey;
}): Promise<void>
```

**Fee Model** (Linear Decay):

```
fee(t) = fee_immediate - (fee_immediate - fee_regular) * (t / decay_duration)

Où:
- t = temps écoulé depuis le stake
- fee_immediate = 0.1 SOL (fee immédiate)
- fee_regular = 0.001 SOL (fee après decay_duration)
- decay_duration = 24h (par défaut)
```

**Exemple**:

| Temps | Fee |
|-------|-----|
| t=0 (immédiat) | 0.100 SOL |
| t=6h | 0.075 SOL |
| t=12h | 0.050 SOL |
| t=18h | 0.025 SOL |
| t=24h+ | 0.001 SOL |

```typescript
await withdrawStake({
  provider,
  stakingIdl,
  agentPda,
  stakerTokenAccount: userAta,
});
```

---

### Transactions Atomiques

#### `createAgentWithStakingPool()`

Crée un agent **ET** son pool de staking dans une seule transaction atomique.

```typescript
async function createAgentWithStakingPool(opts: {
  provider: AnchorProvider;
  stakingIdl: Idl;
  creator?: PublicKey;         // Optional: defaults to wallet.publicKey
  tokenMint: PublicKey;
  minStakeAmount: number | bigint;
  cardUri: string;
  cardHash: Uint8Array | number[];
  memoryMode?: number;
  memoryPtr?: string;
  memoryHash?: Uint8Array | number[];
  agentRegistryProgramId?: PublicKey;
  stakingProgramId?: PublicKey;
}): Promise<{
  agentPda: PublicKey;
  poolPda: PublicKey;
  vaultPda: PublicKey;
  signature: string;
}>
```

**Avantages**:
- ✅ **Atomique**: Les 2 comptes sont créés ou aucun
- ✅ **Économique**: Une seule transaction au lieu de 2
- ✅ **Garantie**: Le flag `FLAG_HAS_STAKING` est correctement défini

**Exemple**:

```typescript
const cardHash = await hashCardJcs({ name: "Staking Agent" });

const { agentPda, poolPda, vaultPda, signature } = await createAgentWithStakingPool({
  provider,
  stakingIdl,
  tokenMint: new PublicKey("So11111111111111111111111111111111111111112"),
  minStakeAmount: 1_000_000,
  cardUri: "https://example.com/card.json",
  cardHash,
});

console.log("✅ Agent + Pool créés:", signature);
```

---

### PDA Helpers

#### `deriveAgentPda()`

Dérive le PDA d'un agent.

```typescript
function deriveAgentPda(creator: PublicKey): [PublicKey, number]
```

**Seeds**: `["agent", creator]`

**Exemple**:

```typescript
const [agentPda, bump] = deriveAgentPda(creatorPublicKey);
```

#### `deriveStakingPoolPda()`

Dérive le PDA d'un pool de staking.

```typescript
function deriveStakingPoolPda(
  agentPda: PublicKey,
  programId?: PublicKey
): [PublicKey, number]
```

**Seeds**: `["staking_pool", agentPda]`

#### `deriveStakeAccountPda()`

Dérive le PDA d'un compte de stake.

```typescript
function deriveStakeAccountPda(
  staker: PublicKey,
  agentPda: PublicKey,
  programId?: PublicKey
): [PublicKey, number]
```

**Seeds**: `["stake_account", staker, agentPda]`

#### `deriveProgramStatePda()`

Dérive le PDA du state global du staking.

```typescript
function deriveProgramStatePda(programId?: PublicKey): [PublicKey, number]
```

**Seeds**: `["program_state"]`

#### `deriveTokenVaultPda()`

Dérive le PDA du vault de tokens.

```typescript
function deriveTokenVaultPda(
  poolPda: PublicKey,
  programId?: PublicKey
): [PublicKey, number]
```

**Seeds**: `["token_vault", poolPda]`

---

### Read Helpers

#### `fetchAgentByPda()`

Récupère un agent par son PDA.

```typescript
async function fetchAgentByPda(
  provider: AnchorProvider,
  agentPda: PublicKey,
  programId?: PublicKey
): Promise<AgentAccount | null>
```

#### `fetchAgentByCreator()`

Récupère un agent par son creator.

```typescript
async function fetchAgentByCreator(
  provider: AnchorProvider,
  creator: PublicKey,
  programId?: PublicKey
): Promise<{ pda: PublicKey; account: AgentAccount } | null>
```

#### `listAgents()`

Liste tous les agents avec filtres optionnels.

```typescript
async function listAgents(
  provider: AnchorProvider,
  opts?: {
    admin?: PublicKey;      // Filter by owner
    activeOnly?: boolean;   // Only active agents
    limit?: number;         // Max results
    programId?: PublicKey;
  }
): Promise<Array<{ pubkey: PublicKey; account: AgentAccount }>>
```

**Exemple**:

```typescript
// Tous les agents actifs
const activeAgents = await listAgents(provider, { activeOnly: true });

// Agents d'un owner spécifique
const myAgents = await listAgents(provider, { 
  admin: provider.wallet.publicKey 
});
```

#### `fetchStakingPool()`

Récupère un pool de staking.

```typescript
async function fetchStakingPool(
  provider: AnchorProvider,
  stakingIdl: Idl,
  poolPda: PublicKey,
  stakingProgramId?: PublicKey
): Promise<StakingPoolAccount | null>
```

#### `fetchStakeAccount()`

Récupère un compte de stake.

```typescript
async function fetchStakeAccount(
  provider: AnchorProvider,
  stakingIdl: Idl,
  stakePda: PublicKey,
  stakingProgramId?: PublicKey
): Promise<StakeAccount | null>
```

#### `listStakingPools()`

Liste tous les pools de staking.

```typescript
async function listStakingPools(
  provider: AnchorProvider,
  stakingIdl: Idl,
  opts?: {
    owner?: PublicKey;
    tokenMint?: PublicKey;
    limit?: number;
    stakingProgramId?: PublicKey;
  }
): Promise<Array<{ pubkey: PublicKey; account: StakingPoolAccount }>>
```

#### `listStakesByUser()`

Liste tous les stakes d'un utilisateur.

```typescript
async function listStakesByUser(
  provider: AnchorProvider,
  stakingIdl: Idl,
  staker: PublicKey,
  opts?: {
    agentPda?: PublicKey;
    minAmount?: bigint;
    limit?: number;
    stakingProgramId?: PublicKey;
  }
): Promise<Array<{ pubkey: PublicKey; account: StakeAccount }>>
```

---

## 📝 Types

### `AgentAccount`

```typescript
type AgentAccount = {
  version: number;
  creator: PublicKey;    // Immutable: original creator (PDA seed)
  owner: PublicKey;      // Mutable: current owner (transferable)
  memoryMode: number;    // 0=None, 1=CID, 2=IPNS, 3=URL, 4=Manifest
  memoryPtr: Uint8Array; // Memory pointer (max 96 bytes)
  memoryHash: Uint8Array; // 32 bytes
  cardUri: string;       // Max 96 bytes
  cardHash: Uint8Array;  // 32 bytes
  flags: number;         // u32 bitfield
  bump: number;
  isActive: boolean;     // Computed from flags
  isLocked: boolean;     // Computed from flags
};
```

**Flags**:

| Flag | Bit | Description |
|------|-----|-------------|
| `FLAG_ACTIVE` | 0 | Agent is active |
| `FLAG_LOCKED` | 1 | Memory is locked |
| `FLAG_HAS_STAKING` | 2 | Staking pool exists |

### `StakingPoolAccount`

```typescript
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
```

### `StakeAccount`

```typescript
type StakeAccount = {
  staker: PublicKey;
  agentPda: PublicKey;
  stakedAmount: bigint;
  stakedAt: bigint;        // Unix timestamp
  lastUpdatedAt: bigint;   // Unix timestamp
  bump: number;
};
```

### `ProgramStateAccount`

```typescript
type ProgramStateAccount = {
  authority: PublicKey;  // REMOVED in v2.1 (zero-admin)
  treasury: PublicKey;
  feeImmediate: number;
  feeRegular: number;
  feeMax: number;
  decayDurationSeconds: bigint;
  bump: number;
};
```

---

## 💡 Exemples Complets

### Exemple 1: Créer un Agent Complet

```typescript
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import {
  createAgent,
  setMemory,
  hashCardJcs,
  makeConnection,
} from "@pipeline/agent-registry-sdk";

async function main() {
  // Setup
  const connection = makeConnection("devnet");
  const keypair = Keypair.generate();
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Airdrop pour les frais
  const sig = await connection.requestAirdrop(
    keypair.publicKey,
    1_000_000_000 // 1 SOL
  );
  await connection.confirmTransaction(sig);

  // 1. Préparer les données
  const cardData = {
    name: "My AI Agent",
    description: "An autonomous AI agent for DeFi",
    version: "1.0.0",
    capabilities: ["trading", "analysis"],
  };

  const cardUri = "https://example.com/agent-card.json";
  const cardHash = await hashCardJcs(cardData);

  // 2. Créer l'agent
  const agentPda = await createAgent({
    provider,
    cardUri,
    cardHash,
    hasStaking: true,
    memoryMode: 3, // URL
    memoryPtr: "https://example.com/memory.json",
    memoryHash: new Uint8Array(32).fill(0),
  });

  console.log("✅ Agent créé:", agentPda.toBase58());

  // 3. Mettre à jour la mémoire
  const memoryData = { state: "initialized", data: {} };
  const memoryHash = await hashCardJcs(memoryData);

  await setMemory({
    provider,
    agentPda,
    mode: 3,
    ptr: new TextEncoder().encode("https://example.com/updated-memory.json"),
    hash: memoryHash,
  });

  console.log("✅ Mémoire mise à jour");
}

main().catch(console.error);
```

### Exemple 2: Staking Complet

```typescript
import { getAssociatedTokenAddress, createMint, mintTo } from "@solana/spl-token";
import stakingIdl from "./idl/agent_staking.json";

async function stakingExample() {
  // Assuming provider, agentPda already set up

  // 1. Créer un token mint (ou utiliser un existant)
  const tokenMint = await createMint(
    provider.connection,
    (provider.wallet as any).payer,
    provider.wallet.publicKey,
    null,
    9 // decimals
  );

  // 2. Créer le pool
  const { poolPda, vaultPda } = await createStakingPool({
    provider,
    stakingIdl,
    agentPda,
    tokenMint,
    minStakeAmount: 1_000_000, // 0.001 token
  });

  console.log("✅ Pool créé:", poolPda.toBase58());

  // 3. Minter des tokens au user
  const userAta = await getAssociatedTokenAddress(tokenMint, provider.wallet.publicKey);
  await mintTo(
    provider.connection,
    (provider.wallet as any).payer,
    tokenMint,
    userAta,
    provider.wallet.publicKey,
    1_000_000_000 // 1 token
  );

  // 4. Initialiser le compte de stake
  const stakePda = await initStakeAccount({
    provider,
    stakingIdl,
    agentPda,
  });

  // 5. Staker des tokens
  await stakeTokens({
    provider,
    stakingIdl,
    agentPda,
    stakerTokenAccount: userAta,
    amount: 10_000_000, // 0.01 token
  });

  console.log("✅ Tokens stakés");

  // 6. Attendre un peu...
  await new Promise(resolve => setTimeout(resolve, 60000)); // 1 min

  // 7. Retirer les tokens
  await withdrawStake({
    provider,
    stakingIdl,
    agentPda,
    stakerTokenAccount: userAta,
  });

  console.log("✅ Tokens retirés");
}
```

### Exemple 3: Création Atomique

```typescript
async function atomicCreation() {
  const cardHash = await hashCardJcs({ name: "Staking Agent" });

  // Tout en une transaction !
  const { agentPda, poolPda, signature } = await createAgentWithStakingPool({
    provider,
    stakingIdl,
    tokenMint: existingTokenMint,
    minStakeAmount: 1_000_000,
    cardUri: "https://example.com/card.json",
    cardHash,
  });

  console.log("✅ Agent + Pool créés atomiquement:", signature);
  console.log("   Agent PDA:", agentPda.toBase58());
  console.log("   Pool PDA:", poolPda.toBase58());
}
```

### Exemple 4: Lister et Filtrer

```typescript
async function listAndFilter() {
  // 1. Lister tous mes agents
  const myAgents = await listAgents(provider, {
    admin: provider.wallet.publicKey,
    activeOnly: true,
  });

  console.log(`Vous avez ${myAgents.length} agents actifs`);

  for (const { pubkey, account } of myAgents) {
    console.log(`- Agent ${pubkey.toBase58()}`);
    console.log(`  Card: ${account.cardUri}`);
    console.log(`  Staking: ${account.flags & 4 ? "Enabled" : "Disabled"}`);
  }

  // 2. Lister tous mes stakes
  const myStakes = await listStakesByUser(
    provider,
    stakingIdl,
    provider.wallet.publicKey,
    { minAmount: 1000000n } // Au moins 1 token
  );

  console.log(`\nVous avez ${myStakes.length} stakes actifs`);

  for (const { pubkey, account } of myStakes) {
    console.log(`- Stake ${pubkey.toBase58()}`);
    console.log(`  Amount: ${account.stakedAmount} tokens`);
    console.log(`  Staked at: ${new Date(Number(account.stakedAt) * 1000).toISOString()}`);
  }
}
```

---

## 🔄 Changelog

### v2.1.0 (2025-10-10)

**Breaking Changes**:
- ✅ Renommé `agentWallet` → `creator` dans tous les types et fonctions
- ✅ Ajout du champ `owner` (distinct de `creator`)
- ✅ `creator` est maintenant **optionnel** dans `createAgent()` (default: `wallet.publicKey`)
- ✅ Suppression de `transferAdmin()` → `transferOwner()` à la place
- ✅ Suppression du champ `authority` dans `ProgramStateAccount` (zero-admin)

**New Features**:
- ✅ `transferOwner()` - Transfer ownership to another address
- ✅ Support pour définir la mémoire à la création (`memoryMode`, `memoryPtr`, `memoryHash`)
- ✅ `hasStaking` par défaut à `true`
- ✅ `card_uri` et `card_hash` maintenant **obligatoires**

**Improvements**:
- ✅ Meilleure gestion des PDAs pour agent-staking
- ✅ Support pour `agent-platform` (programme fusionné)
- ✅ Documentation complète avec exemples
- ✅ Types TypeScript améliorés

### v2.0.0 (2025-10-08)

- ✅ Support SPL tokens complet
- ✅ Ajout de `initStakeAccount()` et `stakeTokens()` séparés
- ✅ Suppression de `init_if_needed` (plus fiable)
- ✅ Fee model linéaire implémenté
- ✅ CPI pour validation du flag `HAS_STAKING`

### v1.0.0 (2025-10-05)

- ✅ Version initiale
- ✅ Agent Registry fonctionnel
- ✅ Support book-keeping pour staking

---

## 📄 License

MIT

---

## 🤝 Contributing

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📞 Support

- 📧 Email: contact@pipeline.app
- 🐦 Twitter: [@pipeline_app](https://twitter.com/pipeline_app)
- 💬 Discord: [Join our Discord](https://discord.gg/pipeline)
- 📚 Docs: [https://docs.pipeline.app](https://docs.pipeline.app)

---

## 🔗 Liens Utiles

- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- [Agent Registry Program](https://explorer.solana.com/address/59Z648TXaaZM7j3RrPpVAUQxdn9K42kaAFBbMFbDiops?cluster=devnet)
- [Agent Staking Program](https://explorer.solana.com/address/FE5kcoY1CsnAFak5PBBUy689hRKvpE2261C1GaWSbJak?cluster=devnet)
- [Agent Platform (Merged)](https://explorer.solana.com/address/3TNdmF3EC9yrJjm5fxfFrrBxur5ntiuoByCqYSgtrEbw?cluster=devnet)

---

**Made with ❤️ by the Pipeline Team**
