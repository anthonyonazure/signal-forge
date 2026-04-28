import { describe, it, expect } from 'vitest';
import { sanitizeSignal } from './sanitize.js';
import type { Signal } from './types.js';

describe('sanitizeSignal', () => {
  it('strips control chars from text', () => {
    const s: Signal = {
      type: 'finding',
      text: 'before\x00\x01\x02after',
      rationale: 'r',
      confidence: 0.9,
    };
    const cleaned = sanitizeSignal(s);
    expect(cleaned.text).toBe('beforeafter');
  });

  it('strips control chars from rationale and speaker', () => {
    const s: Signal = {
      type: 'action',
      text: 'ok',
      rationale: 'rationale\x00with nulls',
      confidence: 0.8,
      speaker: 'speaker\x07name',
    };
    const cleaned = sanitizeSignal(s);
    expect(cleaned.rationale).toBe('rationalewith nulls');
    expect(cleaned.speaker).toBe('speakername');
  });

  it('preserves newlines and tabs', () => {
    const s: Signal = {
      type: 'finding',
      text: 'line one\nline two\ttabbed',
      rationale: 'r',
      confidence: 0.9,
    };
    const cleaned = sanitizeSignal(s);
    expect(cleaned.text).toBe('line one\nline two\ttabbed');
  });

  it('caps text at 5000 chars', () => {
    const s: Signal = {
      type: 'finding',
      text: 'x'.repeat(10_000),
      rationale: 'r',
      confidence: 0.9,
    };
    const cleaned = sanitizeSignal(s);
    expect(cleaned.text).toHaveLength(5000);
  });

  it('caps rationale at 400 chars', () => {
    const s: Signal = {
      type: 'finding',
      text: 'ok',
      rationale: 'r'.repeat(2000),
      confidence: 0.9,
    };
    const cleaned = sanitizeSignal(s);
    expect(cleaned.rationale).toHaveLength(400);
  });

  it('leaves speaker undefined when not provided', () => {
    const s: Signal = { type: 'finding', text: 'ok', rationale: 'r', confidence: 0.9 };
    expect(sanitizeSignal(s).speaker).toBeUndefined();
  });
});
