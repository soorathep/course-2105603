// Lab 05 Graduate step E: check code that an AI assistant helped write.
// The student writes the specification, uses an AI assistant only to write the code, runs it, and enters
// its outputs. The lab recomputes from the measured tie line and from the student's tau with the course
// stability engine: the isoactivity residual, the lab's own fit, the binodal, the spinodal and the
// tangent-plane distance at a stated feed. Saved in the study file under "aiCode".
import * as engine from '../../labs/assets/stability.js';
import { fitSummary, measuredRows } from './lle-graduate.js';

const $ = (id) => document.getElementById(id);
const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const INPUT = ['ai-T', 'ai-alpha', 'ai-t12', 'ai-t21', 'ai-xa', 'ai-xb', 'ai-s1', 'ai-s2', 'ai-z', 'ai-tpd', 'ai-w'];

function csv() {
  const lines = ['T_K,x1_alpha,x1_beta,U_x1_alpha,U_x1_beta'];
  for (const r of data.rows) lines.push([r.T, r.xAlpha, r.xBeta, r.expandedUncertaintyAlpha, r.expandedUncertaintyBeta].join(','));
  return lines.join('\n') + '\n';
}
function download() {
  const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'lab05-cyclohexane-methanol-lle.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isoRes = (p, a, b) => { const ma = engine.chemicalPotentials(a, p), mb = engine.chemicalPotentials(b, p); return Math.max(...ma.map((v, i) => Math.abs(v - mb[i]))); };
const params = (alpha, t12, t21) => engine.parameters({ model: 'nrtl', alpha, tau12: t12, tau21: t21 });

function run() {
  try {
    if (!data) throw new Error('The measured data are not loaded yet.');
    const T = Number($('ai-T').value), alpha = num('ai-alpha'), tau = [num('ai-t12'), num('ai-t21')], z = num('ai-z');
    const row = data.rows.find((r) => Math.abs(r.T - T) < 1e-8);
    if (!row) throw new Error('Choose the temperature of the tie line your code used.');
    if (!(alpha >= 0.1 && alpha <= 0.6)) throw new Error('Enter the α your code held fixed, between 0.1 and 0.6.');
    if (!tau.every(Number.isFinite)) throw new Error('Enter τ₁₂ and τ₂₁ from your code.');
    if (!(z > 0 && z < 1)) throw new Error('Enter the feed z₁ used for the TPD, between 0 and 1.');
    let p;
    try { p = params(alpha, tau[0], tau[1]); } catch { throw new Error('This lab checks τ between −2 and 6. Values outside that range usually mean a different model or units.'); }
    const ref = fitSummary(measuredRows(data, T), alpha);
    const checks = [];

    // 1. Isoactivity at the measured tie line
    const r = isoRes(p, row.xAlpha, row.xBeta);
    let why = '';
    if (r > 5e-4) {
      let swapped = Infinity;
      try { swapped = isoRes(params(alpha, tau[1], tau[0]), row.xAlpha, row.xBeta); } catch { /* outside range */ }
      why = swapped < 5e-4 ? 'Your τ₁₂ and τ₂₁ satisfy the tie line only when swapped. Component 1 is cyclohexane; check the numbering in the NRTL equations and in the data columns.'
        : 'Your τ does not make x₁γ₁ and x₂γ₂ equal in the two measured liquids. Check that the residuals are ln(xᵢγᵢ) differences for both components, with the measured compositions at this T.';
    }
    checks.push({ name: `Isoactivity at the measured tie line (${row.xAlpha} and ${row.xBeta}), max |Δ ln xᵢγᵢ| from your τ`, lab: '< 5e-4 (rounding of τ)', yours: r.toExponential(1), ok: r <= 5e-4, why });

    // 2. Same parameters as the lab fit
    const dz = Math.hypot(tau[0] - ref.tau12, tau[1] - ref.tau21), same = dz <= 2e-3;
    checks.push({ name: `Same τ as the lab fit at ${T} K, α = ${alpha}`, lab: `${fmt(ref.tau12, 4)}, ${fmt(ref.tau21, 4)}${ref.objective > 1e-8 ? ' (no exact fit)' : ''}`, yours: `${fmt(tau[0], 4)}, ${fmt(tau[1], 4)}`, ok: same,
      why: same ? '' : r <= 5e-4 ? 'Your τ also satisfies the tie line, so the equations have another root. Use the TPD row below: a root whose tie line is not globally stable is not an equilibrium.' : 'Fix the isoactivity residual first.' });

    // 3. Binodal from the student's tau
    const xa = num('ai-xa'), xb = num('ai-xb');
    let gaps = [];
    try { gaps = engine.coexistenceGaps(p); } catch { /* reported below */ }
    if ([xa, xb].every(Number.isFinite)) {
      const g = gaps.slice().sort((a, b) => Math.hypot(a.xAlpha - xa, a.xBeta - xb) - Math.hypot(b.xAlpha - xa, b.xBeta - xb))[0];
      const trivial = Math.abs(xa - xb) < 1e-3;
      const ok = !trivial && g && Math.abs(g.xAlpha - xa) <= 1e-3 && Math.abs(g.xBeta - xb) <= 1e-3;
      checks.push({ name: 'Binodal solved from your τ', lab: g ? `${fmt(g.xAlpha)} and ${fmt(g.xBeta)}` : 'no split', yours: `${fmt(xa)} and ${fmt(xb)}`, ok,
        why: ok ? '' : trivial ? 'Both phases have the same composition: the trivial solution. Any single composition satisfies the isoactivity equations. Start the solver on opposite sides of the spinodal, or reject solutions with x₁ᵅ ≈ x₁ᵝ.' : 'Check the starting values and that the solver converged; compare with the measured tie line.' });
    }

    // 4. Spinodal
    const s1 = num('ai-s1'), s2 = num('ai-s2');
    if ([s1, s2].every(Number.isFinite)) {
      const roots = engine.spinodals(p).roots;
      const ok = roots.length === 2 && Math.abs(Math.min(s1, s2) - roots[0]) <= 1e-3 && Math.abs(Math.max(s1, s2) - roots[1]) <= 1e-3;
      checks.push({ name: 'Spinodal from your τ (zero liquid curvature)', lab: roots.length ? roots.map((v) => fmt(v)).join(' and ') : 'none', yours: `${fmt(s1)} and ${fmt(s2)}`, ok,
        why: ok ? '' : 'Check the second derivative of Δg_mix/RT, including the ideal term 1/(x₁x₂), and the step size if it is taken numerically.' });
    }

    // 5. TPD at the feed
    const tpdYou = num('ai-tpd'), wYou = num('ai-w');
    if (Number.isFinite(tpdYou)) {
      const t = engine.tpd(p, z), neg = t.minimum < -1e-6;
      const ok = Math.abs(tpdYou - t.minimum) <= Math.max(1e-4, 0.01 * Math.abs(t.minimum)) && (!neg || !Number.isFinite(wYou) || Math.abs(wYou - t.w) <= 5e-3);
      const local = neg && Math.abs(tpdYou) < 1e-6;
      const curv = z * (1 - z) * engine.curvature(z, p);
      checks.push({ name: `Minimum tangent-plane distance at z₁ = ${z}`, lab: `${fmt(t.minimum, 5)} at w₁ = ${fmt(t.w)}`, yours: `${fmt(tpdYou, 5)}${Number.isFinite(wYou) ? ` at w₁ = ${fmt(wYou)}` : ''}`, ok,
        why: ok ? '' : local ? `Your search returned TPD = 0, the trivial stationary point w = z. The feed has positive curvature (${fmt(curv, 3)}) and is metastable: a local search from the feed cannot see the minimum near w₁ = ${fmt(t.w, 2)}. Scan the whole interval or use several starts.` : 'Check the TPD expression against the note, the reference feed term, and that the search covers 0 < w₁ < 1.' });
    }

    // 6. Model check: is the measured tie line globally stable under the student's tau?
    const tp = [row.xAlpha, row.xBeta].map((x) => engine.tpd(p, x).minimum), stable = tp.every((v) => v >= -1e-6);
    checks.push({ name: 'Measured tie line is globally stable under your τ (TPD ≥ 0 at both liquids)', lab: 'TPD ≥ 0', yours: tp.map((v) => fmt(v, 5)).join(' and '), ok: stable, kind: 'model',
      why: stable ? '' : 'Under your τ, a composition other than the two measured liquids has lower Gibbs energy, so this τ does not describe the measured equilibrium.' });

    last = { T, alpha, z, tau, ref: { tau12: ref.tau12, tau21: ref.tau21, objective: ref.objective }, checks };
    render(last);
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message; }
}

function render(res) {
  $('ai-out').innerHTML = res.checks.map((c) => `<tr><th scope="row">${c.name}</th><td>${c.lab}</td><td>${c.yours}</td><td class="${c.ok ? '' : 'warn'}">${c.ok ? 'agrees' : c.kind === 'model' ? 'model limit' : 'check'}</td><td style="text-align:left">${c.why}</td></tr>`).join('');
  const code = res.checks.filter((c) => c.kind !== 'model'), bad = code.filter((c) => !c.ok).length;
  const limit = res.checks.some((c) => c.kind === 'model' && !c.ok) ? ' Your τ also fails the global stability check at the measured tie line.' : '';
  $('ai-status').textContent = (bad ? `${bad} of ${code.length} code checks disagree with the lab. Find the cause in the code, fix it, rerun, and enter the new outputs.` : `All ${code.length} code checks agree. Now explain what the checks do not establish.`) + limit;
  $('ai-results').hidden = false;
}

function state() {
  const s = { result: last };
  for (const id of [...TEXT, ...INPUT]) s[id] = $(id)?.value ?? '';
  return s;
}
function restore(s) {
  if (!s) return;
  for (const id of [...TEXT, ...INPUT]) if (typeof s[id] === 'string' && $(id)) $(id).value = s[id];
  if (s.result) run();
}

async function init() {
  if (!$('ai-run')) return;
  try {
    const response = await fetch(new URL('../../labs/assets/cyclohexane-methanol-lle.json', import.meta.url));
    data = await response.json();
    $('ai-T').innerHTML = data.rows.map((r) => `<option value="${r.T}"${r.T === 298.15 ? ' selected' : ''}>${r.T} K · ${r.xAlpha} / ${r.xBeta}</option>`).join('');
    $('ai-run').disabled = false; $('ai-csv').disabled = false;
  } catch { $('ai-status').textContent = 'The measured data could not be loaded.'; }
  $('ai-run').addEventListener('click', run);
  $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const rec = JSON.parse(await file.text()); restore(rec.aiCode); } catch { /* the lab reports invalid files */ }
  });
  window.aiCode = { state, run, csv };
}
init();
