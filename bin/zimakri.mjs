#!/usr/bin/env node
import { init } from '../src/init.mjs';

const cmd = process.argv[2];
if (cmd === 'init' || !cmd) {
  const { did, created } = init(process.cwd());
  console.log(`Zimakri agent initialised. DID: ${did}`);
  console.log(created.length ? `Created: ${created.join(', ')}` : 'Nothing to create (already initialised).');
  console.log('Next: edit soul.md and lax-offer.json, then publish your offer.');
} else {
  console.error(`unknown command: ${cmd}\nusage: npx zimakri init`);
  process.exit(2);
}
