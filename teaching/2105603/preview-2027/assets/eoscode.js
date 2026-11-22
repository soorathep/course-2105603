// Lab P2 Graduate step E: check code that an AI assistant helped write.
// The student writes the specification, uses an assistant only to write code, runs it and enters the outputs.
// The lab recomputes the Peng–Robinson constants and roots for CO2 at 280 K, B = b − a/RT, and the fitted B
// of methane at 300 K with the student's density limit. Saved in the study file under "aiCode".
import * as eos from './eos.js';
import { statusLine, completeness, incompleteNote } from './aicomplete.js?v=2';
const $ = (id) => document.getElementById(id);
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const g = (v, d = 6) => (Number.isFinite(v) ? Number(v).toPrecision(d) : '—');
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const OUT = ['ai-a', 'ai-b', 'ai-zv', 'ai-zl', 'ai-z100', 'ai-bpr', 'ai-bfit'];
const INPUT = [...OUT, 'ai-rho'];

function csv() {
  const lines = ['fluid,T_K,P_bar,Z,rho_mol_per_L,phase'];
  for (const k of ['ch4_300', 'co2_280']) {
    const cs = data.cases[k];
    for (let i = 0; i < cs.P.length; i++) lines.push([cs.fluid, cs.T, cs.P[i], cs.Z[i], (cs.P[i] * 1e5 / (cs.Z[i] * eos.R * cs.T) / 1000).toPrecision(10), { v: 'vapor', l: 'liquid', s: 'supercritical' }[cs.phase[i]]].join(','));
  }
  return lines.join('\n') + '\n';
}
function download() {
  const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' })), a = document.createElement('a');
  a.href = url; a.download = 'labP2-nist-isotherms.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const rel = (y, x) => Math.abs(y - x) / Math.abs(x);

function run() {
  try {
    if (!data) throw new Error('The reference data are not loaded yet.');
    const fl = data.fluids.co2, T = 280, p = eos.params('pr', fl, T), checks = [];
    const add = (name, lab, yours, tol, why, fmt = (v) => g(v)) => { if (!Number.isFinite(yours)) return; const ok = rel(yours, lab) <= tol; checks.push({ name, lab: fmt(lab), yours: fmt(yours), ok, why: ok ? '' : why(yours, lab) }); };
    add('a(T) of Peng–Robinson for CO₂ at 280 K / (Pa m⁶/mol²)', p.a, num('ai-a'), 5e-4, (y, x) => (Math.abs(y / x - 1 / p.alpha) < 0.01 ? 'Your a equals the value at T_c: α(T_r) is missing.' : Math.abs(y / x - 1e-10) < 1e-12 || Math.abs(y / x - 1e10) < 1 ? 'A factor of 10¹⁰: P_c in bar instead of Pa, applied twice?' : Math.abs(y / x - 1e5) < 10 || Math.abs(y / x - 1e-5) < 1e-6 ? 'A factor of 10⁵: P_c in bar instead of Pa.' : 'Check m(ω) = 0.37464 + 1.54226ω − 0.26992ω², α = [1 + m(1 − √T_r)]², Ω_a = 0.45724 and ω.'));
    add('b of Peng–Robinson for CO₂ / (m³/mol)', p.b, num('ai-b'), 5e-4, (y, x) => (Math.abs(y / x - 0.08664 / 0.0778) < 0.002 ? 'Your b uses the SRK constant 0.08664; PR uses 0.07780.' : Math.abs(y / x - 1e5) < 10 ? 'A factor of 10⁵: P_c in bar instead of Pa.' : Math.abs(y / x - 1e6) < 10 ? 'Your b is in cm³/mol; the step asks for m³/mol.' : 'Check b = 0.07780 RT_c/P_c with SI units.'));
    const r30 = eos.roots('pr', fl, T, 30).roots, r100 = eos.roots('pr', fl, T, 100).roots;
    add('Vapor root at 30 bar (largest real Z > B)', r30[r30.length - 1].Z, num('ai-zv'), 5e-4, (y) => (Math.abs(y - r30[1].Z) < 1e-3 ? 'You returned the middle root, which is mechanically unstable. Sort the real roots and take the largest.' : Math.abs(y - r30[0].Z) < 1e-3 ? 'You returned the liquid root as the vapor.' : 'Check A = aP/(RT)² and B = bP/RT with P in Pa, and the cubic coefficients.'));
    add('Liquid root at 30 bar (smallest real Z > B)', r30[0].Z, num('ai-zl'), 5e-4, (y) => (Math.abs(y - r30[1].Z) < 1e-3 ? 'You returned the middle root. Take the smallest real root with Z > B.' : Math.abs(y - r30[r30.length - 1].Z) < 1e-3 ? 'You returned the vapor root as the liquid.' : 'Check the coefficients and that complex roots are discarded by their imaginary part, not by rounding.'));
    add('Z at 100 bar (one real root)', r100[0].Z, num('ai-z100'), 5e-4, () => 'At 100 bar this cubic has one real root. Taking the real part of a complex root gives a wrong value; filter by |Im Z| < 10⁻⁹ first.');
    const bpr = eos.bCubic('pr', fl, T);
    add('B = b − a/RT of PR at 280 K / (cm³/mol)', bpr, num('ai-bpr'), 5e-4, (y, x) => (Math.abs(y / x - 1e-6) < 1e-8 ? 'Your B is in m³/mol; multiply by 10⁶ for cm³/mol.' : 'Check a/RT with a in Pa m⁶/mol² and R in J/(mol K): the result is m³/mol.'));
    const rho = num('ai-rho'), bf = Number.isFinite(rho) ? eos.fitB(data.cases.ch4_300, data.fluids.methane, rho) : null;
    if (Number.isFinite(num('ai-bfit'))) {
      if (!bf) throw new Error('Enter the highest density used in your fit, between 0.2 and 3 mol/L.');
      add(`B fitted to methane at 300 K, gas points with ρ ≤ ${rho} mol/L (${bf.n} points) / (cm³/mol)`, bf.B, num('ai-bfit'), 2e-3, (y, x) => (Math.abs(y - bf.C) < Math.abs(0.2 * bf.C) ? 'You reported the slope C, not the intercept B.' : Math.abs(y / x - 1e-3) < 1e-4 || Math.abs(y / x - 1e3) < 10 ? 'A factor of 1000: ρ in mol/L and B in cm³/mol need ρ in mol/cm³ in (Z − 1)/ρ.' : 'Check that (Z − 1)/ρ is fitted against ρ, that only points with ρ ≤ your limit enter, and that the intercept is B.'));
    }
    if (!checks.length) throw new Error('Enter at least one output from your code.');
    last = { rho, checks: checks.map((c) => ({ name: c.name, ok: c.ok })) };
    $('ai-out').innerHTML = checks.map((c) => `<tr><th scope="row">${c.name}</th><td>${c.lab}</td><td>${c.yours}</td><td class="${c.ok ? '' : 'warn'}">${c.ok ? 'agrees' : 'check'}</td><td style="text-align:left">${c.why}</td></tr>`).join('');
    $('ai-status').textContent = statusLine(checks.length, checks.filter((c) => !c.ok).length, OUT);
    $('ai-results').hidden = false;
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message + incompleteNote(OUT); }
}

function state() { const s = { result: last, completeness: completeness(OUT) }; for (const id of [...TEXT, ...INPUT]) s[id] = $(id)?.value ?? ''; return s; }
function restore(s) { if (!s) return; for (const id of [...TEXT, ...INPUT]) if (typeof s[id] === 'string' && $(id)) $(id).value = s[id]; if (s.result) run(); }

async function init() {
  if (!$('ai-run')) return;
  try {
    data = await (await fetch(new URL('../../labs/assets/p2-eos-nist.json', import.meta.url))).json();
    $('ai-omega').textContent = String(data.fluids.co2.omega);
    $('ai-run').disabled = false; $('ai-csv').disabled = false;
  } catch { $('ai-status').textContent = 'The reference data could not be loaded.'; }
  $('ai-run').addEventListener('click', run); $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; try { restore(JSON.parse(await file.text()).aiCode); } catch { /* the lab reports invalid files */ } });
  window.aiCode = { state, run, csv };
}
init();
