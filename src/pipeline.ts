import Anthropic from '@anthropic-ai/sdk';
import { chunk } from './chunk.js';
import { extractFromChunk } from './extract.js';
import { locate } from './link.js';
import { dedupe } from './dedupe.js';
import { sanitizeSignal } from './sanitize.js';
import type { ExtractionResult, LocatedSignal, Signal } from './types.js';

export interface PipelineOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  overlapTokens?: number;
}

export async function extract(
  documentId: string,
  source: string,
  opts: PipelineOptions
): Promise<ExtractionResult> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const model = opts.model ?? 'claude-sonnet-4-6';
  const maxTokens = opts.maxTokens ?? 3500;
  const overlapTokens = opts.overlapTokens ?? 300;

  const chunks = chunk(source, { maxTokens, overlapTokens });

  const located: LocatedSignal[] = [];
  const unlocated: Signal[] = [];
  let totalExtracted = 0;

  for (const c of chunks) {
    const rawSignals = await extractFromChunk(c, { client, model });
    const signals = rawSignals.map(sanitizeSignal);
    totalExtracted += signals.length;

    for (const signal of signals) {
      const loc = locate(signal, c.text, c.start);
      if (loc) {
        located.push(loc);
      } else {
        unlocated.push(signal);
      }
    }
  }

  const { kept, dropped } = dedupe(located);

  return {
    documentId,
    signals: kept,
    unlocatedSignals: unlocated,
    stats: {
      chunks: chunks.length,
      totalExtracted,
      located: located.length,
      dropped: located.length - kept.length + unlocated.length,
      deduped: dropped,
    },
  };
}
