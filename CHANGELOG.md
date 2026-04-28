# Changelog

All notable changes to signal-forge are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-04-28

### Added
- Real PDF ingestion via `pdf-parse` (text-based PDFs work out-of-box; OCR hookable through `src/ingest.ts`).
- Real `.eml` parsing via `mailparser`, with `<script>` and `<style>` blocks stripped before HTML tag removal.
- 50 MB file-size cap (`MAX_FILE_BYTES`), 500-page PDF cap (`MAX_PDF_PAGES`), and 60-second parse timeout (`PDF_PARSE_TIMEOUT_MS`).
- `src/sanitize.ts` — strips control characters and caps text/rationale/speaker length on every extracted signal before downstream emission.
- 31 unit tests (chunk, link, dedupe, ingest, sanitize, normalize) and GitHub Actions CI (typecheck + tests on push and PR).

### Changed
- **Verbatim grounding tightened.** Removed the loose `substring` match fallback in `src/link.ts` that could let prompt-injected or hallucinated text pass through as "located." Fuzzy matches now require a 95% length-ratio sanity check against the source slice.
- `LocatedSignal.matchQuality` narrowed from `'exact' | 'fuzzy' | 'substring'` to `'exact' | 'fuzzy'`.
- Pinned `pdf-parse` to exact `1.1.1` to avoid the documented test-fixture footgun in earlier patch versions.
- Bumped `@anthropic-ai/sdk` to `^0.91` so prompt-cache types resolve cleanly.
- System prompt at `prompts/extract-signals.md` now includes an explicit trust-boundary paragraph: chunk content is treated as untrusted data, never as commands.
- Extraction now runs at `temperature: 0` (deterministic by design — this is structured extraction, not creative).

### Fixed
- The non-breaking-space replacement in `normalize()` was a silent no-op (regex contained two ASCII spaces). Now correctly maps U+00A0 → space.
- The eval matcher could mark gold patterns as missed when one extracted signal could legitimately satisfy multiple golds.

## [0.1.0] — 2026-04-27

### Added
- Initial release. Hybrid pipeline: chunk → constrained LLM tool-use → fuzzy span linking → dedupe.
- Anthropic tool-use forcing with `record_signals` schema; system prompt cached for cheap re-runs.
- Eval harness with a labeled OIG audit-memo fixture; reports precision, recall, and F1.
- Stubbed PDF/EML ingestion (text/markdown work end-to-end).
