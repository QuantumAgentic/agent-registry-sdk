# Agent Registry SDK (Solana + Anchor)

A small, typed client SDK to interact with the on-chain Agent Registry program (one PDA per agent: `seeds = ["agent", agentWallet]`).

- Program ID: read from the embedded IDL
- Default RPC: `https://api.devnet.solana.com` (you can pass your own)
- Build locally: `npm i && npm run build`

## Install

```bash
npm i @pipeline/agent-registry-sdk
```

## Quick start

```ts
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import {
  DEFAULT_RPC,
  makeConnection,
  getProgram,
  deriveAgentPda,
  createAgent,
  setCard,
  setMemory,
  lockMemory,
  setActive,
  closeAgent,
  transferAdmin,
  hashCardJcs,
  fetchAgentByWallet,
  listAgents
} from "@pipeline/agent-registry-sdk";

// Connection & provider (use your RPC if needed)
const connection = makeConnection(/* YOUR_RPC_URL or omit for devnet */);
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, wallet, {});

// Create an agent entry (PDA derived from agentWallet)
const agentWallet = Keypair.generate().publicKey;
const agentPda = await createAgent({ provider, agentWallet });

// Set the Agent Card (off-chain JSON referenced by URI + its SHA-256 over JCS)
const cardJson = { schema: "agent-card-v1", name: "Nightfall" };
const cardHash = await hashCardJcs(cardJson);
await setCard({ provider, agentPda, cardUri: "https://example.com/card.json", cardHash });

// Set memory pointer (Url = 3) with required content hash
await setMemory({
  provider,
  agentPda,
  mode: 3, // Url
  ptr: new TextEncoder().encode("https://example.com/manifest.json"),
  hash: cardHash,
});

// Lock memory (irreversible)
await lockMemory(provider, agentPda);

// Read back
const found = await fetchAgentByWallet(provider, agentWallet);
const list = await listAgents(provider, { activeOnly: true });
```

## RPC and provider
- Default RPC: `DEFAULT_RPC = https://api.devnet.solana.com`
- Create your own connection: `makeConnection(rpcUrl?)`
- Bring your own `AnchorProvider` if you already manage wallet/connection

## API (write)
- `createAgent({ provider, agentWallet, cardUri?, cardHash? })`
- `setCard({ provider, agentPda, cardUri, cardHash })`
- `setMemory({ provider, agentPda, mode, ptr, hash? })`
- `lockMemory(provider, agentPda)`
- `setActive(provider, agentPda, isActive)`
- `closeAgent(provider, agentPda, recipient)`
- `transferAdmin(provider, agentPda, newAdmin)`

Client-side guards applied:
- Length limits: `cardUri ≤ 96 bytes`, `ptr ≤ 96 bytes`
- Memory mode truth table:
  - None (0): `ptr.length == 0` and `hash == null`
  - Cid (1): `ptr.length > 0` and `hash == null`
  - Ipns/Url/Manifest (2/3/4): `ptr.length > 0` and `hash.length == 32`
  - Url (3): `ptr` (decoded as string) must start with `https://`

## API (read)
- `fetchAgentByPda(provider, agentPda) → AgentAccount | null`
- `fetchAgentByWallet(provider, agentWallet) → { pda, account } | null`
- `listAgents(provider, { admin?, activeOnly?, limit? }) → Array<{ pubkey, account }>`

Reads use `getProgramAccounts` filters (no SOL cost). RPC rate limits may apply.

## Utilities
- `hashCardJcs(obj|string) → Promise<Uint8Array>`
  - RFC 8785 JCS canonicalization (`canonicalize`) + SHA-256
  - Browser first (WebCrypto), Node fallback (`crypto`)
- `deriveAgentPda(agentWallet)`
- `getProgram(provider)` returns an Anchor `Program` bound to the embedded IDL

## Memory modes reference
```
0 None      -> ptr empty, no hash
1 Cid       -> ptr required, no hash
2 Ipns      -> ptr required, 32-byte hash required
3 Url       -> ptr must start with https://, 32-byte hash required
4 Manifest  -> ptr required, 32-byte hash required
```

## Off-chain registry
- Keep a simple off-chain index (DB) of `{ agent_wallet, card_uri, card_hash, is_active }`
- Validate integrity client-side by recomputing `card_hash` (JCS+SHA-256)
- Stream program events or rescan PDAs periodically

## License
MIT
