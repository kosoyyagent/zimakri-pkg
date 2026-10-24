import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init, didFromPubkey } from './src/init.mjs';

const LAWS = ['Solidarity Oath', 'Renewal Mandate', 'Treasury Equilibrium', 'Harm Shield', 'Transparency Covenant'];

test('init creates all required artifacts on a clean dir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zim-'));
  const { did, created } = init(dir);
  assert.match(did, /^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
  for (const f of ['keys/agent.key.json', 'soul.md', 'memory/daily/.gitkeep',
                   'memory/longterm/.gitkeep', 'wake.txt', 'zimakri.config.json', 'lax-offer.json'])
    assert.ok(existsSync(join(dir, f)), f);
  assert.ok(created.length >= 6);
});

test('lax-offer.json carries the Five Laws and valid offer shape', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zim-'));
  const { did } = init(dir);
  const offer = JSON.parse(readFileSync(join(dir, 'lax-offer.json'), 'utf8'));
  assert.equal(offer.agent_did, did);
  assert.deepEqual(offer.constitutional_constraints, LAWS);
  assert.ok(Array.isArray(offer.capabilities) && offer.capabilities.length > 0);
  for (const c of offer.capabilities)
    for (const f of ['id', 'price_usdc', 'input_schema', 'output_schema']) assert.ok(f in c);
});

test('soul.md contains the Five Laws', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zim-'));
  init(dir);
  const soul = readFileSync(join(dir, 'soul.md'), 'utf8');
  for (const l of LAWS) assert.ok(soul.includes(l), l);
});

test('init is idempotent and never overwrites keys', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zim-'));
  const a = init(dir);
  const keyBefore = readFileSync(join(dir, 'keys/agent.key.json'), 'utf8');
  const b = init(dir);
  assert.equal(a.did, b.did);
  assert.equal(readFileSync(join(dir, 'keys/agent.key.json'), 'utf8'), keyBefore);
  assert.equal(b.created.length, 0);
});

test('no network calls during init (offline invariant)', () => {
  // stub every egress surface; init must still succeed
  const g = globalThis;
  const oldFetch = g.fetch;
  let called = 0;
  g.fetch = () => { called++; return Promise.reject(new Error('network used')); };
  const dir = mkdtempSync(join(tmpdir(), 'zim-'));
  init(dir);
  g.fetch = oldFetch;
  assert.equal(called, 0);
});
