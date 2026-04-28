import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { simpleParser } from 'mailparser';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 500;
export const PDF_PARSE_TIMEOUT_MS = 60_000;

async function checkSize(path: string): Promise<void> {
  const s = await stat(path);
  if (s.size > MAX_FILE_BYTES) {
    throw new Error(
      `File ${path} is ${s.size} bytes; max ${MAX_FILE_BYTES}. Increase MAX_FILE_BYTES if intentional.`
    );
  }
}

export async function ingest(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();
  await checkSize(path);

  if (ext === '.txt' || ext === '.md') {
    return readFile(path, 'utf8');
  }
  if (ext === '.pdf') return ingestPdf(path);
  if (ext === '.eml') return ingestEml(path);
  throw new Error(`Unsupported file type: ${ext}`);
}

async function ingestPdf(path: string): Promise<string> {
  const buf = await readFile(path);
  const { default: pdfParse } = await import('pdf-parse');

  const parsePromise = pdfParse(buf, { max: MAX_PDF_PAGES });
  const timeoutPromise = new Promise<never>((_, reject) => {
    const t = setTimeout(
      () => reject(new Error(`PDF parse exceeded ${PDF_PARSE_TIMEOUT_MS}ms`)),
      PDF_PARSE_TIMEOUT_MS
    );
    t.unref?.();
  });

  const result = await Promise.race([parsePromise, timeoutPromise]);
  return result.text;
}

async function ingestEml(path: string): Promise<string> {
  const raw = await readFile(path);
  const parsed = await simpleParser(raw);

  const parts: string[] = [];
  if (parsed.from) parts.push(`From: ${parsed.from.text}`);
  if (parsed.to) {
    const toText = Array.isArray(parsed.to) ? parsed.to.map((t) => t.text).join(', ') : parsed.to.text;
    parts.push(`To: ${toText}`);
  }
  if (parsed.subject) parts.push(`Subject: ${parsed.subject}`);
  if (parsed.date) parts.push(`Date: ${parsed.date.toISOString()}`);
  parts.push('');
  if (parsed.text) {
    parts.push(parsed.text);
  } else if (typeof parsed.html === 'string') {
    const stripped = parsed.html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '');
    parts.push(stripped);
  }

  return parts.join('\n');
}

export function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}
