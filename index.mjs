// Veida GitHub Action. Plain node, no dependencies: inputs come from INPUT_* env vars,
// outputs go to $GITHUB_OUTPUT. Runs on Veida's anonymous free tier, so there is no key.
import fs from 'node:fs';
import path from 'node:path';
import { generate } from './client.mjs';

const input = (name) => (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim();

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  console.log(`${name}=${value}`);
}

try {
  const { url } = await generate(input('prompt'), {
    aspectRatio: input('aspect-ratio') || '1:1',
    timeoutMs: (Number(input('timeout-minutes')) || 10) * 60_000,
  });
  setOutput('url', url);
  const out = input('output-path');
  if (out) {
    const target = path.resolve(process.env.GITHUB_WORKSPACE || '.', out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
    setOutput('path', target);
  }
} catch (err) {
  console.log(`::error::${err.message || err}`);
  process.exit(1);
}
