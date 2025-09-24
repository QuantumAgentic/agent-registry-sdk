# Agent Registry SDK (Solana + Anchor)

SDK pour interagir avec le programme Agent Registry (PDA: ["agent", agent_wallet]).

- Programme ID: lu depuis l'IDL incluse
- Cluster par défaut: `https://api.devnet.solana.com` (vous pouvez fournir votre RPC)
- Build: `npm i && npm run build`

## Installation

```bash
npm i @pipeline/agent-registry-sdk
```

## Usage de base

```ts
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import {
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

const connection = makeConnection(); // ou makeConnection(YOUR_RPC_URL)
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, wallet, {});

// Création d'un agent
const agentWallet = Keypair.generate().publicKey;
const agentPda = await createAgent({ provider, agentWallet });

// Card
const card = { schema: "agent-card-v1", name: "Nightfall" };
const cardHash = await hashCardJcs(card);
await setCard({ provider, agentPda, cardUri: "https://example.com/card.json", cardHash });

// Mémoire (Url = 3)
await setMemory({ provider, agentPda, mode: 3, ptr: new TextEncoder().encode("https://example.com/manifest.json"), hash: cardHash });
await lockMemory(provider, agentPda);

// Lire
const found = await fetchAgentByWallet(provider, agentWallet);
const list = await listAgents(provider, { activeOnly: true });
```

## Notes
- `hashCardJcs` applique JCS + SHA-256 (WebCrypto si dispo, sinon Node crypto).
- Les helpers `setCard`/`setMemory` valident la table de vérité (tailles, https:// pour Url, etc.).
- Les lectures utilisent `getProgramAccounts` avec filtres memcmp (pas de coût on-chain, dépend du RPC).

## Licence
MIT
