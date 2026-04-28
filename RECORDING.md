# Recording the demo Loom

Target: 60-90 second screencast embedded in the README near the top.

## Setup

1. Deploy the live demo first (`vercel --prod` from the repo root, set `ANTHROPIC_API_KEY` env var). Get the URL.
2. Open Loom, set output to 1080p, mic on.
3. Have the demo URL open and ready.
4. Have the GitHub repo URL open in a second tab (you'll show it briefly).

## Script

**[0-10s] What and why.** Open with the deployed demo page already loaded.

> "This is signal-forge. It pulls structured findings, recommendations, and actions out of messy real-world documents — audit reports, clinical notes, legal opinions — and links every signal back to the exact source span so you can audit the model's work."

**[10-30s] Run the example.** Click "Load example (OIG audit memo)" then "Extract signals."

> "I'll load a sample audit memo and run it. Behind the scenes Claude is given the chunk under a constrained tool-use schema — it can't emit anything other than valid `Signal[]` records. After extraction, every signal is matched character-by-character against the source. If we can't locate it, we drop it. That's the hallucination defense."

**[30-50s] Walk one signal.** Point at one of the rendered signals.

> "Here's a finding. Confidence 0.97, exact match in the source. The span tells me where it came from — a downstream UI can highlight it. Here's a recommendation. Same shape. Here's an action with an attributed speaker."

**[50-70s] Show the GitHub side.** Tab over to the repo.

> "The whole pipeline is in TypeScript — chunk, extract, link, dedupe. Thirty-one unit tests. CI runs on every push. The eval harness against a labeled fixture currently scores recall 1.0, precision 0.73, F1 0.84. Tuning by measurement, not vibes."

**[70-90s] Close.**

> "Approach doc and full code linked below. If you've got documents that need this kind of extraction and your current pipeline is brittle regex or unconstrained LLM prompts, let's talk."

## After recording

1. Trim front and back silence in Loom.
2. Set thumbnail to the moment after extraction renders (visually rich).
3. Copy the share URL.
4. Update README — replace the `Watch the 90s walkthrough →` placeholder with the real URL.
5. Update the embedded image: copy the Loom video thumbnail (right-click → Copy image), upload to `docs/assets/loom-thumb.png`, link it to the Loom URL.
