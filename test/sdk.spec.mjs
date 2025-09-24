import { strict as assert } from 'node:assert';
import { Keypair, PublicKey } from '@solana/web3.js';
import * as sdk from '../dist/index.js';

describe('agent-registry-sdk (dist)', () => {
  it('hashCardJcs produces 32 bytes and is stable', async () => {
    const h1 = await sdk.hashCardJcs({ b: 2, a: 1 });
    const h2 = await sdk.hashCardJcs({ a: 1, b: 2 });
    assert.equal(h1.length, 32);
    assert.equal(Buffer.from(h1).toString('hex'), Buffer.from(h2).toString('hex'));
  });

  it('deriveAgentPda deterministic', () => {
    const kp = Keypair.generate();
    const [p1] = sdk.deriveAgentPda(kp.publicKey);
    const [p2] = sdk.deriveAgentPda(new PublicKey(kp.publicKey.toBytes()));
    assert.equal(p1.toBase58(), p2.toBase58());
  });
});
