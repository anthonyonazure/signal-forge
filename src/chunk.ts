import type { Chunk } from './types.js';

const CHARS_PER_TOKEN = 4;

export interface ChunkOptions {
  maxTokens: number;
  overlapTokens: number;
}

export function chunk(text: string, opts: ChunkOptions): Chunk[] {
  const maxChars = opts.maxTokens * CHARS_PER_TOKEN;
  const overlapChars = opts.overlapTokens * CHARS_PER_TOKEN;

  if (text.length <= maxChars) {
    return [{ index: 0, start: 0, end: text.length, text }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const tentativeEnd = Math.min(start + maxChars, text.length);
    const end = tentativeEnd === text.length ? tentativeEnd : findBoundary(text, tentativeEnd);

    chunks.push({
      index,
      start,
      end,
      text: text.slice(start, end),
    });

    if (end === text.length) break;
    start = Math.max(end - overlapChars, start + 1);
    index += 1;
  }

  return chunks;
}

function findBoundary(text: string, target: number): number {
  const window = 400;
  const lo = Math.max(0, target - window);

  const paragraphBreak = text.lastIndexOf('\n\n', target);
  if (paragraphBreak > lo) return paragraphBreak + 2;

  const sentenceBreak = text.lastIndexOf('. ', target);
  if (sentenceBreak > lo) return sentenceBreak + 2;

  const lineBreak = text.lastIndexOf('\n', target);
  if (lineBreak > lo) return lineBreak + 1;

  return target;
}
