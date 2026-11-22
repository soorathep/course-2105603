// Lab P4 Graduate step E: check code that an AI assistant helped write.
// Propane at 300 K with Peng–Robinson: the equation's vapor pressure by equal ln φ, φ^sat, the saturated liquid volume,
// and the Poynting estimate of the liquid fugacity at 50 bar with the equation's own V^L and φ^sat. Saved under "aiCode".
import * as fg from './fugacity.js';
import { statusLine, completeness, incompleteNote } from './aicomplete.js?v=2';
const $ = (id) => document.getElementById(id);
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const g = (v, d = 6) => (Number.isFinite(v) ? Number(v).toPrecision(d) : '—');
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const OUT = ['ai-psat', 'ai-phi', 'ai-vl', 'ai-f50'];

function run() {
  try {
    if (!data) throw new Error('The reference data are not loaded yet.');
    const fl = data.fluids.propane, T = 300, s = fg.satEos('pr', fl, T), ref = fg.satRef(data, 'propane', T);
    const f50 = s.phi * s.P * Math.exp(s.VL * 1e-6 * (50 - s.P) * 1e5 / (fg.R * T)), checks = [];
    const add = (name, lab, yours, tol, why) => { if (!Number.isFinite(yours)) return; const ok = Math.abs(yours - lab) <= tol * Math.abs(lab); checks.push({ name, lab: g(lab), yours: g(yours), ok, why: ok ? '' : why(yours) }); };
    add('Vapor pressure of PR at 300 K / bar', s.P, num('ai-psat'), 1e-4, (y) => (Math.abs(y - ref.P) < 0.01 * ref.P && Math.abs(y - s.P) > 1e-3 ? 'Your value is close to the NIST vapor pressure, not to the equation\'s own. Solve ln φ^L = ln φ^V with PR; do not start from or return the reference.' : Math.abs(y - s.spinodal[1].P) < 0.05 ? 'You returned the upper spinodal pressure: the bracket edge, not the root.' : 'Check ln φ = Z − 1 − ln(Z − B) − (A/(2√2 B)) ln[(Z + (1 + √2)B)/(Z + (1 − √2)B)] for each root, and that the two roots are the smallest and largest real roots.'));
    add('φ^sat', s.phi, num('ai-phi'), 5e-4, (y) => (Math.abs(y - s.lnphiV) < 1e-3 ? 'You reported ln φ, not φ.' : 'Check that φ^sat is exp(ln φ) at your vapor pressure, the same for both roots.'));
    add('Saturated liquid volume / (cm³/mol)', s.VL, num('ai-vl'), 5e-4, (y) => (Math.abs(y - s.VV) < 0.01 * s.VV ? 'You reported the vapor volume.' : Math.abs(y / s.VL - 1e-6) < 1e-7 ? 'Your volume is in m³/mol.' : 'Check V = Z^L RT/P with P in Pa, then convert to cm³/mol.'));
    add('Liquid fugacity at 50 bar, Poynting / bar', f50, num('ai-f50'), 1e-3, (y) => (Math.abs(y - s.phi * s.P) < 1e-3 * s.P ? 'Your value omits the Poynting factor: it equals f^sat.' : Math.abs(y - s.phi * s.P * Math.exp(s.VL * 1e-6 * 50e5 / (fg.R * T))) < 1e-3 * f50 ? 'Your exponent uses P instead of P − P^sat.' : 'Check exp[V^L(P − P^sat)/RT] with V^L in m³/mol and pressures in Pa.'));
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
  try { data = await (await fetch(new URL('../../labs/assets/p4-fugacity-nist.json', import.meta.url))).json(); $('ai-omega').textContent = String(data.fluids.propane.omega); $('ai-run').disabled = false; }
  catch { $('ai-status').textContent = 'The reference data could not be loaded.'; }
  $('ai-run').addEventListener('click', run);
  $('import-study')?.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; try { restore(JSON.parse(await file.text()).aiCode); } catch { /* the lab reports invalid files */ } });
  window.aiCode = { state, run };
}
init();
