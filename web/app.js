const $ = (id) => document.getElementById(id);

const EXAMPLE_TEXT = `MEMORANDUM FOR THE ADMINISTRATOR

FROM: Office of Inspector General
SUBJECT: Review of Procurement Controls in the Regional Office, FY2024

Findings

Our testing identified three significant deficiencies in the procurement process.

First, in 18 of 90 sampled transactions (20%), required market research documentation was either missing or inadequate to support the contracting officer's price determination. This represents a material weakness in the office's compliance with FAR Part 10.

Second, the office's contract files for sole-source awards over $1 million did not consistently include the justification and approval documentation required by FAR 6.303.

Third, segregation of duties controls were not consistently enforced. In 7 transactions, the same individual served as both the requisitioner and the contracting officer's technical representative.

Recommendations

Recommendation 1: Issue updated guidance to all contracting officers reinforcing the FAR Part 10 market research documentation requirements.

Recommendation 2: Establish a quarterly file review process for all sole-source awards over $1 million.

Recommendation 3: Update the office's procurement standard operating procedure to formally prohibit the dual role of requisitioner and COTR on the same transaction.

Management Response

The Administrator concurred with all three recommendations. The office has committed to issuing updated market research guidance by March 31, 2025.`;

$('example').addEventListener('click', () => {
  $('text').value = EXAMPLE_TEXT;
});

$('submit').addEventListener('click', async () => {
  const text = $('text').value.trim();
  if (!text) {
    setStatus('Paste some text first.', true);
    return;
  }
  if (text.length > 12_000) {
    setStatus(`Input is ${text.length} chars; demo cap is 12,000.`, true);
    return;
  }

  setBusy(true);
  setStatus('Extracting...');
  $('results').classList.add('hidden');

  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${err ? `: ${err}` : ''}`);
    }
    const data = await res.json();
    render(data);
    setStatus(`Done in ${data.elapsedMs}ms.`);
  } catch (err) {
    setStatus(`Error: ${err.message}`, true);
  } finally {
    setBusy(false);
  }
});

function setBusy(busy) {
  $('submit').disabled = busy;
  $('example').disabled = busy;
}

function setStatus(msg, isError = false) {
  const el = $('status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

function render(result) {
  const { signals, stats, unlocatedSignals } = result;
  $('results').classList.remove('hidden');
  $('stats').textContent = `${stats.chunks} chunk${stats.chunks === 1 ? '' : 's'} · ${signals.length} signals located · ${unlocatedSignals.length} dropped (no span match) · ${stats.deduped} deduped`;

  const list = $('signal-list');
  list.innerHTML = '';
  if (signals.length === 0) {
    list.innerHTML = '<li><div class="signal-text">No signals found in the input.</div></li>';
    return;
  }

  for (const s of signals) {
    const li = document.createElement('li');
    li.className = s.type;

    const header = document.createElement('div');
    header.className = 'signal-header';
    header.innerHTML = `
      <span class="signal-type">${escape(s.type)}</span>
      <span class="signal-conf">conf ${s.confidence.toFixed(2)}</span>
      <span class="signal-quality">match: ${escape(s.matchQuality)}</span>
      ${s.speaker ? `<span>· ${escape(s.speaker)}</span>` : ''}
    `;

    const text = document.createElement('div');
    text.className = 'signal-text';
    text.textContent = s.text;

    const rationale = document.createElement('div');
    rationale.className = 'signal-rationale';
    rationale.textContent = s.rationale;

    const span = document.createElement('div');
    span.className = 'signal-span';
    span.textContent = `span: [${s.span.start}, ${s.span.end}]`;

    li.append(header, text, rationale, span);
    list.append(li);
  }
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
