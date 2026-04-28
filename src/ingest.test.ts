import { describe, it, expect } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ingest, normalize } from './ingest.js';

describe('ingest', () => {
  it('reads .txt files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sf-'));
    try {
      const path = join(dir, 'doc.txt');
      await writeFile(path, 'Plain text content.');
      const result = await ingest(path);
      expect(result).toBe('Plain text content.');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reads .md files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sf-'));
    try {
      const path = join(dir, 'doc.md');
      await writeFile(path, '# Heading\n\nBody.');
      const result = await ingest(path);
      expect(result).toContain('Heading');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('parses .eml files into a structured form', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sf-'));
    try {
      const path = join(dir, 'msg.eml');
      const eml = [
        'From: alice@example.com',
        'To: bob@example.com',
        'Subject: Audit follow-up',
        'Date: Mon, 1 Jan 2024 10:00:00 +0000',
        '',
        'Findings indicate three deficiencies in the procurement process.',
      ].join('\r\n');
      await writeFile(path, eml);
      const result = await ingest(path);
      expect(result).toContain('Subject: Audit follow-up');
      expect(result).toContain('three deficiencies');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws on unsupported types', async () => {
    await expect(ingest('/tmp/unknown.docx')).rejects.toThrow(/Unsupported/);
  });
});

describe('normalize', () => {
  it('converts CRLF to LF', () => {
    expect(normalize('a\r\nb')).toBe('a\nb');
  });

  it('collapses 3+ blank lines to 2', () => {
    expect(normalize('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips trailing whitespace before newlines', () => {
    expect(normalize('a   \nb')).toBe('a\nb');
  });

  it('replaces non-breaking spaces with regular spaces', () => {
    expect(normalize('a b')).toBe('a b');
  });
});
