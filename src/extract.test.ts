import { describe, it, expect } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { extractFromChunk } from './extract.js';
import type { Chunk, Signal } from './types.js';

type CreateParams = Anthropic.MessageCreateParamsNonStreaming;

/**
 * extractFromChunk takes its Anthropic client as a parameter, so the request it
 * builds and the response it parses can both be exercised without a network
 * call. The stub records the last request so the tests can assert on it.
 */
function stubClient(content: Anthropic.ContentBlock[]): {
  client: Anthropic;
  lastRequest: () => CreateParams | undefined;
} {
  let seen: CreateParams | undefined;
  const client = {
    messages: {
      create: (params: CreateParams) => {
        seen = params;
        return Promise.resolve({ content } as Anthropic.Message);
      },
    },
  } as unknown as Anthropic;
  return { client, lastRequest: () => seen };
}

function toolUseBlock(signals: Signal[]): Anthropic.ContentBlock {
  return {
    type: 'tool_use',
    id: 'toolu_test',
    name: 'record_signals',
    input: { signals },
  } as Anthropic.ContentBlock;
}

const CHUNK: Chunk = { index: 3, start: 120, end: 160, text: 'Finding: controls were weak.' };

const SIGNAL: Signal = {
  type: 'finding',
  text: 'controls were weak',
  rationale: 'states a deficiency',
  confidence: 0.9,
};

describe('extractFromChunk', () => {
  it('returns the signals recorded by the tool call', async () => {
    const { client } = stubClient([toolUseBlock([SIGNAL])]);
    const signals = await extractFromChunk(CHUNK, { client, model: 'test-model' });
    expect(signals).toEqual([SIGNAL]);
  });

  it('returns an empty array when the model recorded no signals', async () => {
    const { client } = stubClient([toolUseBlock([])]);
    expect(await extractFromChunk(CHUNK, { client, model: 'test-model' })).toEqual([]);
  });

  it('throws when the response contains no record_signals tool call', async () => {
    const { client } = stubClient([{ type: 'text', text: 'no tool call' } as Anthropic.ContentBlock]);
    await expect(extractFromChunk(CHUNK, { client, model: 'test-model' })).rejects.toThrow(
      /No record_signals tool call in response for chunk 3/
    );
  });

  it('ignores tool calls for other tools', async () => {
    const other = { ...toolUseBlock([SIGNAL]), name: 'something_else' } as Anthropic.ContentBlock;
    const { client } = stubClient([other]);
    await expect(extractFromChunk(CHUNK, { client, model: 'test-model' })).rejects.toThrow(
      /No record_signals tool call/
    );
  });

  it('picks the record_signals block out of a mixed response', async () => {
    const { client } = stubClient([
      { type: 'text', text: 'thinking out loud' } as Anthropic.ContentBlock,
      toolUseBlock([SIGNAL]),
    ]);
    expect(await extractFromChunk(CHUNK, { client, model: 'test-model' })).toEqual([SIGNAL]);
  });

  it('sends the requested model, a deterministic temperature and a token ceiling', async () => {
    const { client, lastRequest } = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client, model: 'claude-test-1' });
    const req = lastRequest();
    expect(req?.model).toBe('claude-test-1');
    expect(req?.temperature).toBe(0);
    expect(req?.max_tokens).toBe(4096);
  });

  it('sends the system prompt as a cacheable block', async () => {
    const { client, lastRequest } = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client, model: 'test-model' });
    const system = lastRequest()?.system;
    expect(Array.isArray(system)).toBe(true);
    const block = Array.isArray(system) ? system[0] : undefined;
    expect(block?.type).toBe('text');
    expect(block?.cache_control).toEqual({ type: 'ephemeral' });
    expect(typeof block?.text === 'string' && block.text.length > 0).toBe(true);
  });

  it('forces the record_signals tool rather than leaving the choice open', async () => {
    const { client, lastRequest } = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client, model: 'test-model' });
    const req = lastRequest();
    expect(req?.tool_choice).toEqual({ type: 'tool', name: 'record_signals' });
    expect(req?.tools).toHaveLength(1);
    expect(req?.tools?.[0]?.name).toBe('record_signals');
  });

  it('declares a schema the model must fill in completely', async () => {
    const { client, lastRequest } = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client, model: 'test-model' });
    const tool = lastRequest()?.tools?.[0] as Anthropic.Tool | undefined;
    const schema = tool?.input_schema;
    expect(schema?.type).toBe('object');
    expect(schema?.required).toEqual(['signals']);

    const props = schema?.properties as Record<string, unknown> | undefined;
    const signals = props?.signals as { type?: string; items?: Record<string, unknown> } | undefined;
    expect(signals?.type).toBe('array');

    const items = signals?.items;
    expect(items?.type).toBe('object');
    expect(items?.required).toEqual(['type', 'text', 'rationale', 'confidence']);

    const itemProps = items?.properties as Record<string, Record<string, unknown>> | undefined;
    expect(itemProps?.type?.enum).toEqual(['finding', 'recommendation', 'action', 'statement']);
    expect(itemProps?.text?.type).toBe('string');
    expect(itemProps?.rationale?.type).toBe('string');
    expect(itemProps?.confidence?.type).toBe('number');
    expect(itemProps?.confidence?.minimum).toBe(0);
    expect(itemProps?.confidence?.maximum).toBe(1);
    expect(itemProps?.speaker?.type).toBe('string');
  });

  it('gives the model the chunk text and its index', async () => {
    const { client, lastRequest } = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client, model: 'test-model' });
    const messages = lastRequest()?.messages;
    expect(messages).toHaveLength(1);
    expect(messages?.[0]?.role).toBe('user');
    const content = messages?.[0]?.content;
    // The prompt is built as a single string; assert that rather than
    // stringifying a block array, which would say nothing useful.
    expect(typeof content).toBe('string');
    const prompt = typeof content === 'string' ? content : '';
    expect(prompt).toContain('Chunk index: 3');
    expect(prompt).toContain(CHUNK.text);
  });

  it('reuses the cached system prompt across calls', async () => {
    const first = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client: first.client, model: 'test-model' });
    const second = stubClient([toolUseBlock([])]);
    await extractFromChunk(CHUNK, { client: second.client, model: 'test-model' });

    const firstSystem = first.lastRequest()?.system;
    const secondSystem = second.lastRequest()?.system;
    const firstText = Array.isArray(firstSystem) ? firstSystem[0]?.text : undefined;
    const secondText = Array.isArray(secondSystem) ? secondSystem[0]?.text : undefined;
    expect(secondText).toBe(firstText);
  });
});
