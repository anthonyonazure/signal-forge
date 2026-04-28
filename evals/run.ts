import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { ingest, normalize } from '../src/ingest.js';
import { extract } from '../src/pipeline.js';
import type { LocatedSignal, SignalType } from '../src/types.js';

interface ExpectedSignal {
  type: SignalType;
  textContains: string;
}

interface GoldFile {
  documentId: string;
  expectedSignals: ExpectedSignal[];
}

interface EvalResult {
  fixture: string;
  precision: number;
  recall: number;
  f1: number;
  matched: number;
  expected: number;
  extracted: number;
  missed: ExpectedSignal[];
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const fixturesDir = resolve(import.meta.dirname, 'fixtures');
  const files = await readdir(fixturesDir);
  const sources = files.filter((f) => !f.endsWith('.gold.json'));

  const results: EvalResult[] = [];

  for (const file of sources) {
    const sourcePath = resolve(fixturesDir, file);
    const goldPath = resolve(fixturesDir, file.replace(/\.[^.]+$/, '.gold.json'));

    const raw = await ingest(sourcePath);
    const source = normalize(raw);
    const gold: GoldFile = JSON.parse(await readFile(goldPath, 'utf8'));

    console.error(`\n[eval] ${file} — extracting...`);
    const result = await extract(basename(file), source, { apiKey });

    const matchedExpected = new Set<number>();
    const matchedExtracted = new Set<number>();

    gold.expectedSignals.forEach((exp, i) => {
      const hitIdx = result.signals.findIndex(
        (s, j) =>
          !matchedExtracted.has(j) &&
          s.type === exp.type &&
          s.text.toLowerCase().includes(exp.textContains.toLowerCase())
      );
      if (hitIdx !== -1) {
        matchedExpected.add(i);
        matchedExtracted.add(hitIdx);
      }
    });

    const matched = matchedExpected.size;
    const expected = gold.expectedSignals.length;
    const extracted = result.signals.length;
    const precision = extracted > 0 ? matched / extracted : 0;
    const recall = expected > 0 ? matched / expected : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const missed = gold.expectedSignals.filter((_, i) => !matchedExpected.has(i));

    results.push({ fixture: file, precision, recall, f1, matched, expected, extracted, missed });
  }

  console.log('\n=== Eval Results ===\n');
  for (const r of results) {
    console.log(`${r.fixture}`);
    console.log(`  precision: ${r.precision.toFixed(3)}`);
    console.log(`  recall:    ${r.recall.toFixed(3)}`);
    console.log(`  f1:        ${r.f1.toFixed(3)}`);
    console.log(`  matched/expected/extracted: ${r.matched}/${r.expected}/${r.extracted}`);
    if (r.missed.length > 0) {
      console.log(`  missed:`);
      for (const m of r.missed) {
        console.log(`    [${m.type}] "${m.textContains}"`);
      }
    }
    console.log();
  }

  const macroF1 = results.reduce((sum, r) => sum + r.f1, 0) / results.length;
  console.log(`Macro F1: ${macroF1.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
