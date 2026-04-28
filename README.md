# signal-forge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org)
[![Built with Claude](https://img.shields.io/badge/built%20with-Claude-cc785c)](https://anthropic.com)

**Robust extraction of structured signals from messy unstructured text.**

Most "extract X from documents" pipelines die on the same rocks: regex is too brittle, deterministic parsers can't handle variation, and naive LLM prompts produce inconsistent output that can't be linked back to source. signal-forge is a hybrid approach — LLM extraction with constrained tool-use schemas, char-offset linking back to source text, and an eval harness so you can measure recall before you trust the output.

## What it does

Takes messy real-world documents — PDFs, emails, audit reports, clinical notes, regulatory filings — and produces structured JSON that downstream systems can act on. Every extracted signal is linked to the exact character span in the source, so hallucinations are caught and reviewers can verify the quote in one click.

Out of the box, it extracts four signal types:

| Type | What it captures |
|------|------------------|
| `finding` | Observations, audit results, clinical assessments, things that were determined |
| `recommendation` | Suggestions, advice — direct *and* indirect ("It would be prudent to...") |
| `action` | Things done, planned, or formally committed to |
| `statement` | Significant declarative claims — policy positions, holdings, regulatory citations |

## Sample output

Run on a representative OIG audit memo (`evals/fixtures/sample-oig-excerpt.txt`):

```json
{
  "documentId": "sample-oig-excerpt.txt",
  "stats": { "chunks": 1, "totalExtracted": 12, "located": 12, "dropped": 0, "deduped": 0 },
  "signals": [
    {
      "type": "finding",
      "text": "in 18 of 90 sampled transactions (20%), required market research documentation was either missing or inadequate to support the contracting officer's price determination...",
      "confidence": 0.97,
      "matchQuality": "exact"
    },
    {
      "type": "recommendation",
      "text": "Recommendation 2: Establish a quarterly file review process for all sole-source awards over $1 million to verify J&A completeness before contract award.",
      "confidence": 0.99,
      "matchQuality": "exact"
    },
    {
      "type": "action",
      "text": "The office has committed to issuing updated market research guidance by March 31, 2025",
      "confidence": 0.99,
      "matchQuality": "exact"
    }
  ]
}
```

Full output (12 signals, all exact-matched to source spans): [`docs/assets/sample-output.json`](docs/assets/sample-output.json)

Eval results on the same fixture:

```
$ pnpm eval

sample-oig-excerpt.txt
  precision: 0.727
  recall:    1.000
  f1:        0.842
  matched/expected/extracted: 8/8/11

Macro F1: 0.842
```

Recall is perfect — every gold-labeled signal was found. Precision is 0.727 because the model also extracted three additional signals not in the gold set (e.g., the OIG's own follow-up commitment, the Administrator's concurrence, and a header-level "three significant deficiencies" finding). Whether to call those false positives or under-labeled gold depends on your downstream use case — for a triage queue, the extras are useful; for strict matching, you'd tighten the gold set or filter on confidence.

## How it works

```
PDF / email / report
        |
        v
  ingest       (OCR-aware, paragraph-preserving)
        |
        v
  chunk        (overlap-aware, max ~3500 tokens)
        |
        v
  extract      (Claude w/ tool-use schema, prompt-cached system block)
        |
        v
  link         (locate each extracted signal in source via fuzzy span match)
        |
        v
  validate     (drop signals without locatable spans, dedupe near-duplicates)
        |
        v
  structured JSON
```

The extraction step uses Anthropic tool use to constrain output to a JSON schema — the model can only emit valid `Signal[]`. Prompt caching is enabled on the system block, so re-runs across many documents are cheap.

## Why this approach

- **Regex fails on indirect speech.** "It may be prudent to consider revising..." is a recommendation. "We continue to find..." is a finding. Lexical patterns can't catch all the ways a thing gets said.
- **Naive LLM prompts hallucinate.** Models cheerfully invent text that isn't in the source. signal-forge defeats this with post-hoc span matching: if we can't locate the extracted signal char-by-char in the source, we drop it.
- **Free-form output is unusable.** Tool-use forcing eliminates the entire "I asked for JSON and got prose with JSON in it" failure mode.

Detailed design rationale: [`docs/approach.md`](docs/approach.md)

## Quickstart

```bash
pnpm install
cp .env.example .env  # add ANTHROPIC_API_KEY
pnpm extract evals/fixtures/sample-oig-excerpt.txt
pnpm eval
```

## Tune for your domain

The approach generalizes — clinical notes, legal opinions, compliance reports, customer support transcripts. To adapt:

1. **Edit signal taxonomy** in `src/types.ts` — add domain types like `adverse_event`, `regulatory_citation`, `holding`.
2. **Edit the system prompt** at `prompts/extract-signals.md` — domain examples live here.
3. **Add labeled fixtures** to `evals/fixtures/` — format matches `sample-oig-excerpt.gold.json`. Re-run `pnpm eval` to measure your changes.

## Status

Production-ready scaffold. End-to-end runnable on text input. PDF ingestion is stubbed — drop in `pdf-parse`, Azure Document Intelligence, or Mistral OCR per your needs (the call site is one function in `src/ingest.ts`).

## License

MIT
