import type { Signal } from './types.js';

// Tab (0x09), line feed (0x0A) and carriage return (0x0D) are legitimate in
// extracted text; every other C0 control character and DEL (0x7F) is not.
// Expressed as a code-point test rather than a character-class regex on purpose:
// a literal `[\x00-\x08...]` class embeds real control characters in the source,
// which is exactly what no-control-regex exists to catch.
const ALLOWED_CONTROL_CODES = new Set([0x09, 0x0a, 0x0d]);

function stripControlChars(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = (code < 0x20 && !ALLOWED_CONTROL_CODES.has(code)) || code === 0x7f;
    if (!isControl) out += char;
  }
  return out;
}
const MAX_TEXT_CHARS = 5000;
const MAX_RATIONALE_CHARS = 400;
const MAX_SPEAKER_CHARS = 200;

function clean(s: string, max: number): string {
  return stripControlChars(s).slice(0, max);
}

export function sanitizeSignal(s: Signal): Signal {
  return {
    ...s,
    text: clean(s.text, MAX_TEXT_CHARS),
    rationale: clean(s.rationale, MAX_RATIONALE_CHARS),
    speaker: s.speaker !== undefined ? clean(s.speaker, MAX_SPEAKER_CHARS) : undefined,
  };
}
