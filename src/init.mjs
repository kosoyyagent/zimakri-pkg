// npx zimakri init — scaffolds a Zimakri agent directory. Zero network calls.
import { generateKeyPairSync, createHash } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TPL = join(fileURLToPath(import.meta.url), '..', '..', 'templates');
const FIVE_LAWS = ['Solidarity Oath', 'Renewal Mandate', 'Treasury Equilibrium',
                   'Harm Shield', 'Transparency Covenant'];

// ed25519 public key -> multibase-free DID (did:key z + base58btc of multicodec-prefixed key)
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58e(buf) {
  const d = [0];
  for (const b of buf) {
    let c = b;
    for (let i = 0; i < d.length; i++) { c += d[i] << 8; d[i] = c % 58; c = (c / 58) | 0; }
    while (c) { d.push(c % 58); c = (c / 58) | 0; }
  }
  return '1'.repeat([...buf].findIndex(b => b !== 0)).replace(/^1{32}$/, '')
    + d.reverse().map(x => B58[x]).join('');
}
export function didFromPubkey(der) {
  const raw = der.subarray(der.length - 32);
  return 'did:key:z' + b58e(Buffer.concat([Buffer.from([0xed, 0x01]), raw]));
}

export function init(dir = process.cwd()) {
  // invariant: this function performs no I/O beyond the local filesystem
  const created = [];
  const write = (rel, content) => {
    const p = join(dir, rel);
    if (existsSync(p)) return;                     // idempotent: never overwrite
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
    created.push(rel);
  };

  // 1. keys — generated locally, never transmitted
  let did, keyPath = join(dir, 'keys', 'agent.key.json');
  if (existsSync(keyPath)) {
    did = JSON.parse(readFileSync(keyPath, 'utf8')).did;
  } else {
    const kp = generateKeyPairSync('ed25519');
    did = didFromPubkey(kp.publicKey.export({ format: 'der', type: 'spki' }));
    write('keys/agent.key.json', JSON.stringify({
      did,
      publicKey: kp.publicKey.export({ format: 'pem', type: 'spki' }),
      privateKey: kp.privateKey.export({ format: 'pem', type: 'pkcs8' }),
    }, null, 2) + '\n');
    created.push('keys/agent.key.json');
  }

  // 2. SOUL + Five Laws
  write('soul.md', [
    '# SOUL', '',
    'I am a Zimakri agent. I keep my own keys, memory and earnings.', '',
    '## Five Laws',
    ...FIVE_LAWS.map(l => `- ${l}`), '',
    '## Purpose', '(write three honest lines about what this agent does well)', '',
  ].join('\n'));

  // 3. memory layout
  write('memory/daily/.gitkeep', '');
  write('memory/longterm/.gitkeep', '');

  // 4. wake protocol
  write('wake.txt', [
    '# Wake protocol', '1. load keys/agent.key.json and confirm the DID',
    '2. read soul.md', '3. read memory/longterm/ then today\'s memory/daily/ note',
    '4. check pending work on LAX', '5. do the work; append a daily memory note', '',
  ].join('\n'));

  // 5. typed config
  write('zimakri.config.json', JSON.stringify({
    did, agentName: 'my-zimakri-agent',
    memory: { daily: 'memory/daily', longterm: 'memory/longterm' },
    wake: 'wake.txt', offer: 'lax-offer.json',
  }, null, 2) + '\n');

  // 6. LAX offer (valid AIAX offer shape, Five Laws constraints)
  write('lax-offer.json', JSON.stringify({
    lax_version: '1.0',
    agent_did: did,
    name: 'my-zimakri-agent',
    constitutional_constraints: FIVE_LAWS,
    capabilities: [{
      id: 'example-capability',
      description: 'Describe one thing this agent does well',
      price_usdc: 1,
      input_schema: { type: 'object', properties: { brief: { type: 'string' } }, required: ['brief'] },
      output_schema: { type: 'object', properties: { result: { type: 'string' } }, required: ['result'] },
    }],
    settlement: { chains: ['base'] },
  }, null, 2) + '\n');

  return { did, created };
}
