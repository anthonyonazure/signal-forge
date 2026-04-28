import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { simpleParser } from 'mailparser';

export async function ingest(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return readFile(path, 'utf8');
  }

  if (ext === '.pdf') {
    return ingestPdf(path);
  }

  if (ext === '.eml') {
    return ingestEml(path);
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

async function ingestPdf(path: string): Promise<string> {
  const buf = await readFile(path);
  const { default: pdfParse } = await import('pdf-parse');
  const result = await pdfParse(buf);
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
  const html = typeof parsed.html === 'string' ? parsed.html : '';
  parts.push(parsed.text ?? html.replace(/<[^>]+>/g, '') ?? '');

  return parts.join('\n');
}

export function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}
