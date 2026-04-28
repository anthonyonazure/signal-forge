# signal-forge

Robust extraction of structured signals from messy unstructured text.

Most "extract X from documents" pipelines die on the same rocks: regex is too brittle, deterministic parsers can't handle variation, and naive LLM prompts produce inconsistent output that can't be linked back to source. signal-forge is a hybrid approach — LLM extraction with constrained tool-use schemas, char-offset linking back to source text, and an eval harness so you can measure recall before you trust the output.

## What it extracts

Out of the box, signal-forge extracts four signal types from documents:

- **finding** — what was observed or determined
- **recommendation** — what someone is suggesting
- **action** — what was done or what should be done
- **statement** — significant declarative claims (clinical, operational, regulatory)

Each signal is returned with its source span (character offsets), the speaker/author when inferrable, a confidence score, and a short rationale.

## How it works

```
PDF / email / report
        |
        v
  ingest (OCR-aware, paragraph-preserving)
        |
        v
  chunk (overlap-aware, max ~3500 tokens)
        |
        v
  extract (Claude w/ tool-use schema, prompt-cached system block)
        |
        v
  link (locate each extracted signal in source via fuzzy span match)
        |
        v
  validate (reject signals without locatable spans, dedupe near-duplicates)
        |
        v
  structured JSON
```

The extraction step uses Anthropic tool use to constrain output to a JSON schema — the model can only emit valid `Signal[]`. Prompt caching is enabled on the system block so re-runs across many documents are cheap.

## Why not just regex / rules?

Tried. They fail on:
- Indirect recommendations ("It may be prudent to consider...")
- Findings buried in subordinate clauses
- Mixed register (formal report → informal email thread → table)
- Paraphrased restatements where the same finding appears three different ways

Why not naive LLM prompts? Two failure modes:
1. **Hallucinated signals** — the model invents text that isn't in the source. Solved here by post-hoc span matching: if we can't locate the signal in the source, we drop it.
2. **Inconsistent schema** — free-form output is hard to consume downstream. Solved with tool-use forcing.

## Quickstart

```bash
pnpm install
cp .env.example .env  # add ANTHROPIC_API_KEY
pnpm extract evals/fixtures/sample-oig-excerpt.txt
```

Run the eval suite:

```bash
pnpm eval
```

Reports precision, recall, and F1 against gold-labeled fixtures.

## Status

This is a portfolio scaffold demonstrating the approach. It's runnable end-to-end on text input, with PDF ingestion stubbed (drop in `pdf-parse` or Azure Document Intelligence per your needs). The eval harness ships with one labeled fixture; add your own under `evals/fixtures/` to measure on your domain.

## License

MIT
