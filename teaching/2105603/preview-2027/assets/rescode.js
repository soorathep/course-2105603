// Lab P3 Graduate step E: check code that an AI assistant helped write.
// The CO2 compressor (300 K, 30 → 100 bar, isentropic) with Peng–Robinson and the Shomate ideal gas.
// The lab recomputes the inlet Z, H^R and S^R, the outlet temperature and the work. Saved under "aiCode".
import * as rs from './residual.js';
import { statusLine, completeness, incompleteNote } from './aicomplete.js?v=2';
const $ = (id) => document.getElementById(id);
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const g = (v, d = 6) => (Number.isFinite(v) ? Number(v).toPrecision(d) : '—');
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const OUT = ['ai-z1', 'ai-hr1', 'ai-sr1', 'ai-t2', 'ai-w'];

function run() {
  try {
    if (!data) throw new Error('The reference data are not loaded yet.');
    const fl = data.fluids.co2, r1 = rs.cubicResidual('pr', fl, 300, 30, 'gibbs'), pr = rs.process(data, 'comp_co2', 'pr', 'shomate'), ig = rs.process(data, 'comp_co2', 'ideal', 'shomate');
    const checks = [];
    const add = (name, lab, yours, ok, why) => { if (!Number.isFinite(yours)) return; checks.push({ name, lab: g(lab), yours: g(yours), ok, why: ok ? '' : why }); };
    const z = num('ai-z1'); add('Z of the vapor at 300 K, 30 bar', r1.Z, z, Math.abs(z - r1.Z) <= 5e-4 * r1.Z, r1.roots.length > 1 ? 'Check the root: at 30 bar this cubic has ' + r1.roots.length + ' real roots; the vapor is the largest.' : 'Check A and B with P in Pa and the cubic coefficients.');
    const h = num('ai-hr1'); add('H^R at the inlet / (J/mol)', r1.HR, h, Math.abs(h - r1.HR) <= 2e-3 * Math.abs(r1.HR) + 0.5,
      Math.abs(h + r1.HR) < 2e-3 * Math.abs(r1.HR) + 0.5 ? 'The sign is reversed: H^R = H − H^ig is negative for an attracting gas.' : Math.abs(h - (r1.Z - 1 - r1.q * r1.I) * rs.R * 300) < 1 ? 'Your H^R omits the d ln α/d ln T_r term: that is H^R for constant a, not for a(T).' : Math.abs(h / r1.HR - 1 / (rs.R * 300)) < 1e-3 ? 'You reported H^R/RT, not H^R.' : 'Check H^R/RT = Z − 1 + (d ln α/d ln T_r − 1) q I and d ln α/d ln T_r = −m√T_r/[1 + m(1 − √T_r)].');
    const s = num('ai-sr1'); add('S^R at the inlet / (J/(mol K))', r1.SR, s, Math.abs(s - r1.SR) <= 2e-3 * Math.abs(r1.SR) + 1e-3,
      Math.abs(s - r1.SR / rs.R) < 1e-3 ? 'You reported S^R/R, not S^R.' : 'Check S^R/R = ln(Z − β) + (d ln α/d ln T_r) q I, with the same root as for H^R.');
    const t2 = num('ai-t2'); add('Outlet temperature / K', pr.T2, t2, Math.abs(t2 - pr.T2) <= 0.05,
      Math.abs(t2 - ig.T2) < 0.5 ? 'Your outlet equals the ideal-gas outlet: the residual entropies are missing from S₂ = S₁.' : 'Check that S^ig includes −R ln(P/1 bar), that S^R is evaluated at both ends, and that the solver brackets the root (300 to 500 K).');
    const w = num('ai-w'); add('Work ΔH / (J/mol)', pr.W, w, Math.abs(w - pr.W) <= 2e-3 * pr.W,
      Math.abs(w - ig.W) < 5 ? 'Your work equals the ideal-gas work: add H₂^R − H₁^R.' : Math.abs(w - pr.W / 1000) < 0.01 ? 'You reported kJ/mol.' : 'Check ΔH = ΔH^ig + H₂^R − H₁^R with the Shomate H from 300 K to your outlet T.');
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
  try { data = await (await fetch(new URL('../../labs/assets/p3-residual-nist.json', import.meta.url))).json(); $('ai-run').disabled = false; }
  catch { $('ai-status').textContent = 'The reference data could not be loaded.'; }
  $('ai-run').addEventListener('click', run);
  $('import-study')?.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; try { restore(JSON.parse(await file.text()).aiCode); } catch { /* the lab reports invalid files */ } });
  window.aiCode = { state, run };
}
init();
