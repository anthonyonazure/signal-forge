import { extract as runExtract } from '../src/pipeline.js';
import { normalize } from '../src/ingest.js';

const MAX_INPUT_CHARS = 12_000;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_HOUR = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_HOUR) return false;
  bucket.count += 1;
  return true;
}

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface Res {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'demo not configured' });
    return;
  }

  const ipHeader = req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'] ?? 'unknown';
  const ip = String(Array.isArray(ipHeader) ? ipHeader[0] : ipHeader).split(',')[0].trim();
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: `rate limit: ${RATE_LIMIT_PER_HOUR} extractions per hour per IP` });
    return;
  }

  const body = (req.body ?? {}) as { text?: unknown };
  if (typeof body.text !== 'string') {
    res.status(400).json({ error: 'body must be { text: string }' });
    return;
  }
  if (body.text.length === 0) {
    res.status(400).json({ error: 'text is empty' });
    return;
  }
  if (body.text.length > MAX_INPUT_CHARS) {
    res.status(413).json({ error: `text exceeds ${MAX_INPUT_CHARS} chars (got ${body.text.length})` });
    return;
  }

  const source = normalize(body.text);
  const start = Date.now();
  try {
    const result = await runExtract('demo', source, { apiKey });
    res.status(200).json({ ...result, elapsedMs: Date.now() - start });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'extraction failed';
    res.status(500).json({ error: message });
  }
}
