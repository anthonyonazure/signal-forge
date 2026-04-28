import type { Signal } from './types.js';

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const MAX_TEXT_CHARS = 5000;
const MAX_RATIONALE_CHARS = 400;
const MAX_SPEAKER_CHARS = 200;

function clean(s: string, max: number): string {
  return s.replace(CONTROL_CHARS, '').slice(0, max);
}

export function sanitizeSignal(s: Signal): Signal {
  return {
    ...s,
    text: clean(s.text, MAX_TEXT_CHARS),
    rationale: clean(s.rationale, MAX_RATIONALE_CHARS),
    speaker: s.speaker !== undefined ? clean(s.speaker, MAX_SPEAKER_CHARS) : undefined,
  };
}
