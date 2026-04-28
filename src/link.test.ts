import { describe, it, expect } from 'vitest';
import { locate } from './link.js';
import type { Signal } from './types.js';

const SIG: Signal = {
  type: 'finding',
  text: 'audit testing identified misclassified expenses',
  rationale: 'finding rationale',
  confidence: 0.9,
};

describe('locate', () => {
  it('exact match returns matchQuality=exact', () => {
    const source = 'In Q3 the audit testing identified misclassified expenses across two divisions.';
    const result = locate(SIG, source, 0);
    expect(result).not.toBeNull();
    expect(result!.matchQuality).toBe('exact');
    expect(source.slice(result!.span.start, result!.span.end)).toBe(SIG.text);
  });

  it('fuzzy match handles whitespace variation', () => {
    const source = 'The audit  testing\n  identified\tmisclassified expenses across the period.';
    const result = locate(SIG, source, 0);
    expect(result).not.toBeNull();
    expect(result!.matchQuality).toBe('fuzzy');
  });

  it('returns null for unfindable text', () => {
    const source = 'This document discusses something completely unrelated.';
    const result = locate(SIG, source, 0);
    expect(result).toBeNull();
  });

  it('shifts span by chunk offset', () => {
    const source = 'audit testing identified misclassified expenses are documented.';
    const result = locate(SIG, source, 1000);
    expect(result).not.toBeNull();
    expect(result!.span.start).toBeGreaterThanOrEqual(1000);
  });

  it('rejects hallucinated text that only matches a short prefix', () => {
    const sig: Signal = {
      type: 'finding',
      text: 'In Q3 the auditors documented three control weaknesses with substantial follow-up impact described in the appendix',
      rationale: 'r',
      confidence: 0.8,
    };
    const source = 'In Q3 the auditors documented three control weaknesses with material risk that may require remediation.';
    const result = locate(sig, source, 0);
    expect(result).toBeNull();
  });
});
