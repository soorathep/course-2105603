// Lab P6 Graduate step E: two-parameter Margules fitted to G^E/RT of 2-propanol + water at 60 kPa by linear least squares.
import * as ac from './activity.js';
import { statusLine, completeness, incompleteNote } from './aicomplete.js?v=2';
const $ = (id) => document.getElementById(id);
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const g = (v) => (Number.isFinite(v) ? Number(v).toPrecision(6) : '—');
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'], OUT = ['ai-a12', 'ai-a21', 'ai-g1', 'ai-g2', 'ai-l03'];
function csv() { const p = data.properties, l = ['P_kPa,T_K,x1,y1']; for (const r of data.datasets[0].rows) l.push([r.PkPa, r.T, r.x, r.y].join(',')); l.push('# Antoine log10(P/bar) = A - B/(T/K + C): 2-propanol A=' + p[0].A + ' B=' + p[0].B + ' C=' + p[0].C + ' range ' + p[0].rangeK.join('-') + ' K; water A=' + p[1].A + ' B=' + p[1].B + ' C=' + p[1].C + ' range ' + p[1].rangeK.join('-') + ' K. Use only rows with 0 < x1 < 1 and T inside both ranges.'); l.push('# ' + data.journal + ', doi ' + data.doi); return l.join('\n') + '\n'; }
function download() { const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' })), a = document.createElement('a'); a.href = url; a.download = 'labP6-ipa-water-60kPa.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function run() {
  try {
    if (!data) throw new Error('The data are not loaded yet.');
    const E = ac.experimental(data.datasets[0], data.properties), f = ac.fit('m2', E, 0.3, 'gE'), [A12, A21] = f.p, l03 = ac.lnGamma('m2', f.p, 0.3)[0], checks = [];
    const add = (name, lab, y, tol, why) => { if (!Number.isFinite(y)) return; const ok = Math.abs(y - lab) <= tol; checks.push({ name, lab: g(lab), yours: g(y), ok, why: ok ? '' : why(y) }); };
    add('A₁₂', A12, num('ai-a12'), 2e-3, (y) => (Math.abs(y - A21) < 2e-3 ? 'A₁₂ and A₂₁ are swapped: A₁₂ is the intercept at x₁ = 0 (ln γ₁∞).' : 'Check the data filter (0 < x₁ < 1, T inside both Antoine ranges) and that log10 Antoine gives bar.'));
    add('A₂₁', A21, num('ai-a21'), 2e-3, (y) => (Math.abs(y - A12) < 2e-3 ? 'A₁₂ and A₂₁ are swapped.' : 'Check the regression of G^E/(RT x₁x₂) on x₁ and x₂ with no extra intercept.'));
    add('γ₁∞', Math.exp(A12), num('ai-g1'), 5e-3 * Math.exp(A12), (y) => (Math.abs(y - A12) < 1e-3 ? 'You reported ln γ₁∞.' : 'γ₁∞ = exp(A₁₂).'));
    add('γ₂∞', Math.exp(A21), num('ai-g2'), 5e-3 * Math.exp(A21), (y) => (Math.abs(y - A21) < 1e-3 ? 'You reported ln γ₂∞.' : 'γ₂∞ = exp(A₂₁).'));
    add('ln γ₁ at x₁ = 0.3', l03, num('ai-l03'), 2e-3, () => 'ln γ₁ = x₂²[A₁₂ + 2(A₂₁ − A₁₂)x₁].');
    if (!checks.length) throw new Error('Enter at least one output from your code.');
    last = { checks: checks.map((x) => ({ name: x.name, ok: x.ok })) };
    $('ai-out').innerHTML = checks.map((x) => `<tr><th scope="row">${x.name}</th><td>${x.lab}</td><td>${x.yours}</td><td class="${x.ok ? '' : 'warn'}">${x.ok ? 'agrees' : 'check'}</td><td style="text-align:left">${x.why}</td></tr>`).join('');
    $('ai-status').textContent = statusLine(checks.length, checks.filter((x) => !x.ok).length, OUT); $('ai-results').hidden = false;
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message + incompleteNote(OUT); }
}
function state() { const s = { result: last, completeness: completeness(OUT) }; for (const id of [...TEXT, ...OUT]) s[id] = $(id)?.value ?? ''; return s; }
function restore(s) { if (!s) return; for (const id of [...TEXT, ...OUT]) if (typeof s[id] === 'string' && $(id)) $(id).value = s[id]; if (s.result) run(); }
async function init() {
  if (!$('ai-run')) return;
  try { data = await (await fetch(new URL('../../labs/assets/ipa-water.json', import.meta.url))).json(); $('ai-run').disabled = false; $('ai-csv').disabled = false; } catch { $('ai-status').textContent = 'The data could not be loaded.'; }
  $('ai-run').addEventListener('click', run); $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; try { restore(JSON.parse(await file.text()).aiCode); } catch { /* reported by the lab */ } });
  window.aiCode = { state, run, csv };
}
init();
