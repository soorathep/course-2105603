// Lab P5 Graduate step E: check code that an AI assistant helped write.
// Three Redlich–Kister terms fitted to V^E of ethanol (1) + water (2) at 298.15 K, partial molar volumes at x1 = 0.5,
// and the partial molar volume of ethanol at infinite dilution. Saved in the study file under "aiCode".
import * as mx from './mixture.js';
import { statusLine, completeness, incompleteNote } from './aicomplete.js?v=2';
const $ = (id) => document.getElementById(id);
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const g = (v, d = 6) => (Number.isFinite(v) ? Number(v).toPrecision(d) : '—');
let data = null, L = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const OUT = ['ai-a0', 'ai-a1', 'ai-a2', 'ai-v1', 'ai-v2', 'ai-vinf'];

function csv() {
  const q = data.liquid, lines = ['x_water,x_ethanol,density_g_per_cm3,VE_reported_cm3_per_mol'];
  q.xWater.forEach((xw, k) => lines.push([xw, (1 - xw).toFixed(4), q.rho[k], q.VEreported[k]].join(',')));
  lines.push('# pure densities at 298.15 K: ethanol ' + q.rhoPure[0] + ', water ' + q.rhoPure[1] + ' g/cm3; M ethanol ' + q.M[0] + ', water ' + q.M[1] + ' g/mol');
  lines.push('# ' + q.source);
  return lines.join('\n') + '\n';
}
function download() { const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' })), a = document.createElement('a'); a.href = url; a.download = 'labP5-ethanol-water-densities.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

function run() {
  try {
    if (!data) throw new Error('The data are not loaded yet.');
    const f = mx.rkFit(L.pts, 3), A = f.coef, p = mx.partials(A, L.V0, 0.5), inf = mx.infiniteDilution(A, L.V0), checks = [];
    const add = (name, lab, yours, tol, why) => { if (!Number.isFinite(yours)) return; const ok = Math.abs(yours - lab) <= tol; checks.push({ name, lab: g(lab), yours: g(yours), ok, why: ok ? '' : why(yours) }); };
    const flip = (k, y) => Math.abs(y + A[k]) <= 2e-3 && Math.abs(A[k]) > 1e-3;
    ['ai-a0', 'ai-a1', 'ai-a2'].forEach((id, k) => add('A' + k + ' / (cm³/mol)', A[k], num(id), 2e-3, (y) => (k % 2 === 1 && flip(k, y) ? 'The sign of A' + k + ' is reversed: your basis uses (x₂ − x₁) or x₁ = water. The step asks for (x₁ − x₂) with x₁ = ethanol.' : Math.abs(y - mx.rkFit(L.pts, k + 1).coef[k]) < 1e-3 ? 'This matches a fit with fewer terms. Fit A₀, A₁, A₂ together.' : 'Check V^E from the densities (M of the mixture over ρ, minus the ideal volume) and the basis x₁x₂(x₁ − x₂)^k.')));
    add('V̄ ethanol at x₁ = 0.5 / (cm³/mol)', p.V1, num('ai-v1'), 5e-3, (y) => (Math.abs(y - p.V2) < 0.01 ? 'You entered V̄ of water.' : 'Check V̄₁ = V + x₂ dV/dx₁, with dV/dx₁ including V₁* − V₂*.'));
    add('V̄ water at x₁ = 0.5 / (cm³/mol)', p.V2, num('ai-v2'), 5e-3, () => 'Check V̄₂ = V − x₁ dV/dx₁.');
    add('V̄∞ of ethanol in water / (cm³/mol)', inf.V1, num('ai-vinf'), 5e-3, (y) => (Math.abs(y - (L.V0[0] + A[0] + A[1] + A[2])) < 0.01 ? 'Your limit is at x₁ → 1. Ethanol at infinite dilution in water is x₁ → 0, where (x₁ − x₂)^k → (−1)^k.' : 'Check V̄₁∞ = V₁* + A₀ − A₁ + A₂.'));
    if (!checks.length) throw new Error('Enter at least one output from your code.');
    last = { checks: checks.map((x) => ({ name: x.name, ok: x.ok })) };
    $('ai-out').innerHTML = checks.map((x) => `<tr><th scope="row">${x.name}</th><td>${x.lab}</td><td>${x.yours}</td><td class="${x.ok ? '' : 'warn'}">${x.ok ? 'agrees' : 'check'}</td><td style="text-align:left">${x.why}</td></tr>`).join('');
    $('ai-status').textContent = statusLine(checks.length, checks.filter((x) => !x.ok).length, OUT);
    $('ai-results').hidden = false;
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message + incompleteNote(OUT); }
}
function state() { const s = { result: last, completeness: completeness(OUT) }; for (const id of [...TEXT, ...OUT]) s[id] = $(id)?.value ?? ''; return s; }
function restore(s) { if (!s) return; for (const id of [...TEXT, ...OUT]) if (typeof s[id] === 'string' && $(id)) $(id).value = s[id]; if (s.result) run(); }
async function init() {
  if (!$('ai-run')) return;
  try { data = await (await fetch(new URL('../../labs/assets/p5-mixtures.json', import.meta.url))).json(); L = mx.liquidPoints(data.liquid); $('ai-run').disabled = false; $('ai-csv').disabled = false; }
  catch { $('ai-status').textContent = 'The data could not be loaded.'; }
  $('ai-run').addEventListener('click', run); $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; try { restore(JSON.parse(await file.text()).aiCode); } catch { /* the lab reports invalid files */ } });
  window.aiCode = { state, run, csv };
}
init();
