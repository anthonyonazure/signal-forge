import type { LocatedSignal, Signal, Span } from './types.js';

export function locate(signal: Signal, source: string, chunkOffset: number): LocatedSignal | null {
  const exact = source.indexOf(signal.text);
  if (exact !== -1) {
    return {
      ...signal,
      span: shift({ start: exact, end: exact + signal.text.length }, chunkOffset),
      matchQuality: 'exact',
    };
  }

  const normalizedTarget = normalize(signal.text);
  const normalizedSource = normalize(source);
  const normalizedHit = normalizedSource.indexOf(normalizedTarget);
  if (normalizedHit !== -1) {
    const span = mapNormalizedSpan(source, normalizedSource, normalizedHit, normalizedTarget.length);
    if (span && verifyFuzzy(source, span, signal.text)) {
      return { ...signal, span: shift(span, chunkOffset), matchQuality: 'fuzzy' };
    }
  }

  return null;
}

function verifyFuzzy(source: string, span: Span, target: string): boolean {
  const sliced = source.slice(span.start, span.end);
  const a = normalize(sliced);
  const b = normalize(target);
  if (a === b) return true;
  if (a.length === 0 || b.length === 0) return false;
  const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return ratio >= 0.95;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function mapNormalizedSpan(
  original: string,
  normalized: string,
  normStart: number,
  normLen: number
): Span | null {
  let oIdx = 0;
  let nIdx = 0;
  let spanStart = -1;
  let spanEnd = -1;

  while (oIdx < original.length && nIdx <= normStart + normLen) {
    const oChar = original[oIdx];
    const nChar = normalized[nIdx];
    if (!oChar) break;

    const oNorm = oChar.toLowerCase();
    if (/\s/.test(oChar)) {
      if (oIdx > 0 && /\s/.test(original[oIdx - 1] ?? '')) {
        oIdx += 1;
        continue;
      }
      if (nChar === ' ') {
        if (nIdx === normStart) spanStart = oIdx;
        nIdx += 1;
      }
      oIdx += 1;
      continue;
    }

    if (oNorm === nChar) {
      if (nIdx === normStart) spanStart = oIdx;
      nIdx += 1;
      oIdx += 1;
      if (nIdx === normStart + normLen) {
        spanEnd = oIdx;
        break;
      }
    } else {
      oIdx += 1;
    }
  }

  if (spanStart === -1 || spanEnd === -1) return null;
  return { start: spanStart, end: spanEnd };
}

function shift(span: Span, offset: number): Span {
  return { start: span.start + offset, end: span.end + offset };
}
