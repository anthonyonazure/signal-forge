import { describe, it, expect } from 'vitest';
import { chunk } from './chunk.js';

describe('chunk', () => {
  it('returns single chunk for short input', () => {
    const text = 'Short text under chunk size.';
    const result = chunk(text, { maxTokens: 1000, overlapTokens: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(text);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(text.length);
  });

  it('splits long input into multiple chunks with overlap', () => {
    const para = 'Sentence one. Sentence two. Sentence three. ';
    const text = para.repeat(200);
    const result = chunk(text, { maxTokens: 100, overlapTokens: 20 });
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].start).toBe(0);
    expect(result[result.length - 1].end).toBe(text.length);
  });

  it('chunks have overlap (next start < previous end)', () => {
    const para = 'Sentence one. Sentence two. Sentence three. ';
    const text = para.repeat(200);
    const result = chunk(text, { maxTokens: 100, overlapTokens: 20 });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeLessThan(result[i - 1].end);
    }
  });

  it('prefers paragraph break boundaries when available', () => {
    const text = 'A'.repeat(200) + '\n\n' + 'B'.repeat(200);
    const result = chunk(text, { maxTokens: 60, overlapTokens: 10 });
    const firstChunkEnd = result[0].text;
    expect(firstChunkEnd.endsWith('\n\n') || firstChunkEnd.endsWith('A')).toBe(true);
  });

  it('chunks cover the full input', () => {
    const text = 'word '.repeat(2000);
    const result = chunk(text, { maxTokens: 200, overlapTokens: 30 });
    const reconstructed = result.map((c) => c.text).join('');
    expect(reconstructed.length).toBeGreaterThanOrEqual(text.length);
  });
});
