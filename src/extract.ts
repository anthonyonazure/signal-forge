import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Chunk, Signal } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedSystemPrompt: string | null = null;
async function loadSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const promptPath = resolve(__dirname, '..', 'prompts', 'extract-signals.md');
  cachedSystemPrompt = await readFile(promptPath, 'utf8');
  return cachedSystemPrompt;
}

const RECORD_SIGNALS_TOOL: Anthropic.Tool = {
  name: 'record_signals',
  description:
    'Record all signals extracted from the chunk. Call exactly once per chunk, even if no signals were found (pass an empty array).',
  input_schema: {
    type: 'object',
    properties: {
      signals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['finding', 'recommendation', 'action', 'statement'],
            },
            text: {
              type: 'string',
              description: 'Verbatim quote from the source. Must appear exactly in the input.',
            },
            rationale: {
              type: 'string',
              description: 'One short sentence explaining why this is a signal of the given type. Max 20 words.',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Clarity of the signal: 0.9+ for explicit, 0.6-0.8 for indirect, below 0.5 for heavily hedged.',
            },
            speaker: {
              type: 'string',
              description: 'Speaker or author when explicitly attributed. Omit otherwise.',
            },
          },
          required: ['type', 'text', 'rationale', 'confidence'],
        },
      },
    },
    required: ['signals'],
  },
};

export interface ExtractOptions {
  client: Anthropic;
  model: string;
}

export async function extractFromChunk(chunk: Chunk, opts: ExtractOptions): Promise<Signal[]> {
  const systemPrompt = await loadSystemPrompt();

  const response = await opts.client.messages.create({
    model: opts.model,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [RECORD_SIGNALS_TOOL],
    tool_choice: { type: 'tool', name: 'record_signals' },
    messages: [
      {
        role: 'user',
        content: `Extract signals from the following chunk. Chunk index: ${chunk.index}.\n\n---\n${chunk.text}\n---`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'record_signals'
  );

  if (!toolUse) {
    throw new Error(`No record_signals tool call in response for chunk ${chunk.index}`);
  }

  const input = toolUse.input as { signals: Signal[] };
  return input.signals;
}
