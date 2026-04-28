import type { LocatedSignal } from './types.js';

export function dedupe(signals: LocatedSignal[]): { kept: LocatedSignal[]; dropped: number } {
  const sorted = [...signals].sort((a, b) => a.span.start - b.span.start);
  const kept: LocatedSignal[] = [];
  let dropped = 0;

  for (const signal of sorted) {
    const overlap = kept.find(
      (k) =>
        k.type === signal.type &&
        spansOverlap(k.span, signal.span, 0.6)
    );
    if (overlap) {
      dropped += 1;
      if (signal.confidence > overlap.confidence) {
        kept[kept.indexOf(overlap)] = signal;
      }
    } else {
      kept.push(signal);
    }
  }

  return { kept, dropped };
}

function spansOverlap(a: { start: number; end: number }, b: { start: number; end: number }, threshold: number): boolean {
  const overlapStart = Math.max(a.start, b.start);
  const overlapEnd = Math.min(a.end, b.end);
  if (overlapEnd <= overlapStart) return false;
  const overlapLen = overlapEnd - overlapStart;
  const minLen = Math.min(a.end - a.start, b.end - b.start);
  return overlapLen / minLen >= threshold;
}
