import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { makeConnection, fetchAgentByPdaRaw } from "../dist/index.js";

const RPC = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const WALLET = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;

async function main() {
  const conn = makeConnection(RPC);
  // Ensure wallet file exists (not used for read, but kept for parity)
  if (!fs.existsSync(WALLET)) throw new Error(`Missing wallet: ${WALLET}`);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(WALLET, "utf8"))));

  const pdas = process.argv.slice(2);
  if (pdas.length === 0) {
    console.error("Usage: node scripts/read-devnet.mjs <PDA...>");
    process.exit(1);
  }

  const results = [];
  for (const p of pdas) {
    const pubkey = new PublicKey(p);
    const raw = await fetchAgentByPdaRaw(conn, pubkey);
    results.push({ pda: p, account: raw ? { ...raw, agentWallet: raw.agentWallet.toBase58(), admin: raw.admin.toBase58() } : null });
  }

  const logsDir = path.join(process.cwd(), "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const outFile = path.join(logsDir, "devnet_agents.json");
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log("Wrote:", outFile);
}

main().catch((e) => { console.error(e); process.exit(1); });
