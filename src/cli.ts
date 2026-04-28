#!/usr/bin/env node
import 'dotenv/config';
import { basename } from 'node:path';
import { ingest, normalize } from './ingest.js';
import { extract } from './pipeline.js';

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: signal-forge <path-to-document>');
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const raw = await ingest(path);
  const source = normalize(raw);

  const result = await extract(basename(path), source, {
    apiKey,
    model: process.env.SIGNAL_FORGE_MODEL,
    maxTokens: process.env.SIGNAL_FORGE_CHUNK_TOKENS
      ? Number(process.env.SIGNAL_FORGE_CHUNK_TOKENS)
      : undefined,
    overlapTokens: process.env.SIGNAL_FORGE_CHUNK_OVERLAP
      ? Number(process.env.SIGNAL_FORGE_CHUNK_OVERLAP)
      : undefined,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
