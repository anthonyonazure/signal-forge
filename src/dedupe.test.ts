import { describe, it, expect } from 'vitest';
import { dedupe } from './dedupe.js';
import type { LocatedSignal } from './types.js';

function sig(type: LocatedSignal['type'], start: number, end: number, conf: number, text = 'x'): LocatedSignal {
  return {
    type,
    text,
    rationale: 'r',
    confidence: conf,
    span: { start, end },
    matchQuality: 'exact',
  };
}

describe('dedupe', () => {
  it('keeps single signal unchanged', () => {
    const result = dedupe([sig('finding', 0, 100, 0.9)]);
    expect(result.kept).toHaveLength(1);
    expect(result.dropped).toBe(0);
  });

  it('drops near-duplicate same-type overlapping signals', () => {
    const result = dedupe([
      sig('finding', 0, 100, 0.9),
      sig('finding', 10, 95, 0.7),
    ]);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0].confidence).toBe(0.9);
    expect(result.dropped).toBe(1);
  });

  it('keeps higher confidence on overlap', () => {
    const result = dedupe([
      sig('finding', 0, 100, 0.6),
      sig('finding', 10, 95, 0.95),
    ]);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0].confidence).toBe(0.95);
  });

  it('different types do not dedupe even when overlapping', () => {
    const result = dedupe([
      sig('finding', 0, 100, 0.9),
      sig('recommendation', 10, 95, 0.9),
    ]);
    expect(result.kept).toHaveLength(2);
    expect(result.dropped).toBe(0);
  });

  it('non-overlapping spans both kept', () => {
    const result = dedupe([
      sig('finding', 0, 50, 0.9),
      sig('finding', 100, 150, 0.9),
    ]);
    expect(result.kept).toHaveLength(2);
  });

  it('partial overlap below threshold both kept', () => {
    const result = dedupe([
      sig('finding', 0, 100, 0.9),
      sig('finding', 80, 200, 0.9),
    ]);
    expect(result.kept).toHaveLength(2);
  });
});
