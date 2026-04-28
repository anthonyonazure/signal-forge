import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

export async function ingest(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return readFile(path, 'utf8');
  }

  if (ext === '.pdf') {
    throw new Error(
      'PDF ingestion not implemented in scaffold. Add pdf-parse or Azure Document Intelligence here.'
    );
  }

  if (ext === '.eml') {
    throw new Error(
      'EML ingestion not implemented in scaffold. Use mailparser or similar.'
    );
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}
