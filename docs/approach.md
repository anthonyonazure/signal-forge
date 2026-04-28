# Approach

This doc explains the design choices behind signal-forge. If you're evaluating whether this approach fits your domain, read this first.

## The problem

You have a corpus of inconsistently formatted documents — PDFs, emails, scanned reports, mixed structured/unstructured. You need to pull out specific kinds of statements (findings, recommendations, actions) reliably enough to drive a downstream system: a dashboard, a triage queue, a regulatory tracker.

Three things make this hard:

1. **Lexical variation.** The same recommendation can be phrased a dozen ways. Regex catches one. The eleventh slips through.
2. **Indirect speech.** "It would be prudent to consider revising..." is a recommendation. So is a single bolded word. So is a sentence that starts "We continue to find...".
3. **Hallucination risk.** A naive LLM prompt will confidently produce signals that aren't in the source. Downstream consumers can't tell, and the cost of acting on a hallucination compounds.

## The four design choices

### 1. Constrained tool-use, not free-form generation

Instead of asking the model "extract findings as JSON," we expose a tool called `record_signals` whose input schema is a strict `Signal[]` JSON schema. The model can only emit valid records. This eliminates the entire class of "I asked for JSON and got prose with JSON in it" failures.

Tradeoff: tool use adds a few hundred tokens to the request. Worth it.

### 2. Post-hoc source span linking

After extraction, every signal's `text` field is searched against the source document. We accept exact matches, then near-fuzzy matches (Levenshtein under threshold), then short-substring matches. Anything that can't be located is dropped.

This is the single most important step. It catches:
- Hallucinated signals (model fabricated text)
- Paraphrased signals where the model rewrote rather than quoted
- Signals from a chunk-overlap region that appear twice

The span isn't just for validation — it's also returned to the caller so downstream UIs can highlight the source text.

### 3. Per-chunk extraction with overlap

Documents are chunked at ~3500 tokens with ~300 tokens of overlap. Each chunk is extracted independently. The dedupe step at the end catches signals that appear in both halves of an overlap.

Why not just send the whole document? Three reasons:
- Long-context attention degrades on extraction tasks (well documented; pick your favorite eval).
- Cost — extracting 100 documents at 200k tokens each is wasteful when most signals are local.
- Failure isolation — a malformed chunk doesn't poison the whole document.

### 4. Eval harness on day one

The repo ships with `pnpm eval` from commit one. There is one labeled fixture. The point is the *shape*: any change to the prompt, the schema, the chunker, or the model is measurable. You should never tune extraction quality by vibes.

## What this approach can't do

- **Cross-document reasoning.** signal-forge is per-document. If a finding in doc A contradicts a recommendation in doc B, neither chunk knows about the other. That's a downstream concern.
- **Numerical reasoning.** If your signals are "extract every dollar amount and sum them," use a different tool.
- **Real-time.** Each chunk is one API call. Throughput is bound by Anthropic rate limits.

## What to tune for your domain

1. **Signal taxonomy.** Edit `src/types.ts` — add domain-specific types (e.g., `adverse_event`, `regulatory_citation`). The schema in `src/extract.ts` is generated from this.
2. **The system prompt.** `prompts/extract-signals.md` defines what counts as each signal type. This is where domain expertise lives. For a clinical corpus, you'd add examples of clinical findings; for a legal corpus, examples of holdings vs. dicta.
3. **Chunk size.** Larger chunks = more context per call, fewer total calls, more risk of missed signals at the bottom. Default 3500 tokens is conservative.
4. **Confidence threshold.** Default returns everything. For a triage queue, filter to `confidence >= 0.7`. For a "no false negatives" use case (regulatory), accept everything and queue low-confidence items for human review.

## Failure modes to watch

- **Schema drift.** If you add a new signal type to `types.ts` without updating the prompt, the model won't know when to use it. Both files are the spec.
- **Span match failures on heavily formatted text.** PDFs with tables, multi-column layouts, or OCR artifacts can produce source text where signals exist semantically but can't be located char-by-char. Mitigation: pre-process to normalize whitespace; relax the fuzzy match threshold.
- **Chunk boundary signals.** A signal split across two chunks won't be extracted. Overlap mitigates this; you can tune overlap up if you see this failure mode in evals.
