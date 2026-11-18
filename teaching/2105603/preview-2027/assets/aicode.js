// Lab 02 Graduate step G5: check code that an AI assistant helped write.
// The student writes the specification, uses an AI assistant only to write the code, runs it, and
// enters its outputs here. The lab recomputes the same quantities from the measured data with its own
// engine and reports each check: P sat at a fixed T, rows used, RMSE recomputed from the student's
// parameters, whether those parameters are at the minimum of the stated objective, the checking error,
// and the liquid curvature. Saved in the study file under "aiCode".
import * as engine from '../../labs/assets/case-study.js';
// Same specifier as the page's script tag, so the page and this module share one wfit instance.
import { points, fitPair, score } from './wfit.js?v=2';

import { statusLine, completeness, incompleteNote } from './aicomplete.js?v=2';
const $ = (id) => document.getElementById(id);
const fmt = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
const TREF = 341.25;   // row 7 at 60 kPa
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const OUT = ['ai-ps1', 'ai-ps2', 'ai-n', 'ai-t12', 'ai-t21', 'ai-rmse', 'ai-check'];   // outputs a complete step must report
const INPUT = ['ai-train', 'ai-weight', 'ai-xmin', 'ai-alpha', 'ai-ps1', 'ai-ps2', 'ai-n', 'ai-t12', 'ai-t21', 'ai-rmse', 'ai-check'];

function csv() {
  const head = 'P_kPa,T_K,x1,y1,u_x,u_y,u_P_kPa,u_T_K';
  const lines = [head];
  for (const ds of data.datasets) {
    const k = ds.coverageFactor || 2, U = ds.averageExpandedUncertainty;
    for (const r of ds.rows) lines.push([r.PkPa, r.T, r.x, r.y, U.x / k, U.y / k, U.PkPa / k, U.T / k].map((v) => +(+v).toPrecision(6)).join(','));
  }
  return lines.join('\n') + '\n';
}

function download() {
  const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'lab02-ipa-water-vle.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rangeText() { const [lo, hi] = engine.domain(data); return `${lo}–${hi} K`; }
function outOfRange(train) {
  const sets = data.datasets.filter((ds) => train === 'both' || ds.pressureKPa === Number(train));
  return sets.reduce((n, ds) => n + ds.rows.filter((r) => r.x > 0 && r.x < 1 && /outside/.test(engine.infer(r, data).reason || '')).length, 0);
}
const close = (a, b, rel, abs = 0) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));

function psatCheck(ps) {
  const lab = data.properties.map((c) => engine.pressure(c, TREF));
  const ok = ps.every((v, i) => close(v, lab[i], 0.002));
  let why = '';
  if (!ok) {
    const alt = {
      'in bar, not kPa (multiply by 100)': data.properties.map((c) => 10 ** (c.A - c.B / (TREF + c.C))),
      'with ln in place of log₁₀': data.properties.map((c) => 100 * Math.exp(c.A - c.B / (TREF + c.C))),
      'with T in °C in place of K': data.properties.map((c) => 100 * 10 ** (c.A - c.B / (TREF - 273.15 + c.C))),
    };
    const hit = Object.entries(alt).find(([, v]) => ps.every((p, i) => close(p, v[i], 0.01)));
    why = hit ? `Your values match P sat computed ${hit[0]}.` : 'Check the Antoine form, the units of T and P, and the constants for each component.';
  }
  return { name: `P sat at ${TREF} K (row 7, 60 kPa)`, lab: `${fmt(lab[0], 2)} and ${fmt(lab[1], 2)} kPa`, yours: `${fmt(ps[0], 2)} and ${fmt(ps[1], 2)} kPa`, ok, why };
}

function rowsCheck(n, nLab, s) {
  const ok = n === nLab;
  let why = '';
  if (!ok) {
    const ends = s.train === 'both' ? 4 : 2, out = outOfRange(s.train);
    why = n === nLab + out && out > 0 ? `The difference equals the ${out} interior row${out > 1 ? 's' : ''} outside the common Antoine range (${rangeText()}). Exclude ${out > 1 ? 'them' : 'it'}; do not extrapolate P sat.`
      : n === nLab + ends ? 'The difference equals the number of pure-component rows. γ of an absent component is 0/0 there; exclude x₁ = 0 and x₁ = 1.'
      : 'Check which rows your code keeps: pure endpoints, rows outside the Antoine range, the minimum x₁ filter, and the pressure selection.';
  }
  return { name: 'Observations used in the fit', lab: String(nLab), yours: Number.isFinite(n) ? String(n) : '—', ok, why };
}

function run() {
  try {
    if (!data) throw new Error('The measured data are not loaded yet.');
    const s = { train: $('ai-train').value, weighted: $('ai-weight').value === 'weighted', xmin: num('ai-xmin'), alpha: num('ai-alpha') };
    const tau = [num('ai-t12'), num('ai-t21')];
    if (!(s.xmin >= 0 && s.xmin < 0.5)) throw new Error('Enter the minimum x₁ your code used (0 if none).');
    if (!(s.alpha > 0 && s.alpha <= 1)) throw new Error('Enter the α your code held fixed, between 0 and 1.');
    if (!tau.every(Number.isFinite)) throw new Error('Enter τ₁₂ and τ₂₁ from your code.');

    const sets = Object.fromEntries(data.datasets.map((ds) => [ds.pressureKPa, points(ds, data, s.xmin)]));
    const all = Object.fromEntries(data.datasets.map((ds) => [ds.pressureKPa, points(ds, data, 0)]));
    const tr = s.train === 'both' ? [...sets[60].rows, ...sets[80].rows] : sets[Number(s.train)].rows;
    const ref = fitPair(tr, s.alpha, s.weighted);
    const sumsq = (t) => { const sc = score(t, tr, s.alpha); return (s.weighted ? sc.rmsz : sc.rmse) ** 2 * 2 * tr.length; };
    const fYou = sumsq(tau), fLab = sumsq(ref.tau);
    const rTrain = score(tau, tr, s.alpha).rmse;
    const checks = [];

    const ps = [num('ai-ps1'), num('ai-ps2')];
    if (ps.every(Number.isFinite)) checks.push(psatCheck(ps));
    checks.push(rowsCheck(num('ai-n'), tr.length, s));

    const rep = num('ai-rmse');
    if (Number.isFinite(rep)) {
      const ok = close(rep, rTrain, 0.01, 0.002);
      let why = '';
      if (!ok) {
        if (close(rep, rTrain * Math.SQRT2, 0.01, 0.002)) why = 'Your value is √2 times the lab value: the sum over both components was divided by N, not 2N.';
        else if (close(rep, rTrain / Math.SQRT2, 0.01, 0.002)) why = 'Your value is the lab value divided by √2: the sum was divided by 4N, or only one component was squared and the other dropped.';
        else why = 'Your code reports an error that does not follow from your own τ. Check that the RMSE uses ln γ (not γ), both components, and the same rows as the fit.';
      }
      checks.push({ name: 'Training RMSE in ln γ, recomputed from your τ', lab: fmt(rTrain, 4), yours: fmt(rep, 4), ok, why });
    }

    const excess = (fYou - fLab) / fLab;
    const optOk = excess <= 0.01;
    checks.push({ name: `Your τ minimizes the stated objective (${s.weighted ? 'Σ(r/σ)²' : 'Σr²'})`, lab: `${fmt(fLab, 4)} at τ = ${fmt(ref.tau[0], 3)}, ${fmt(ref.tau[1], 3)}`, yours: `${fmt(fYou, 4)} (${excess >= 0 ? '+' : ''}${fmt(100 * excess, 1)} %)`, ok: optOk,
      why: optOk ? (excess < -1e-4 ? 'Lower than the lab minimum: your code probably used different rows, weights or α from those entered above.' : '') : 'The objective is higher than at the lab minimum. Possible causes: a local minimum, the optimizer stopped early or at a bound, a different objective from the one you specified, or settings entered here that differ from the code.' });

    const z = [0, 1].map((i) => (tau[i] - ref.tau[i]) / ref.sd[i]);
    checks.push({ name: 'Distance from the lab parameters, in lab standard deviations', lab: `±${fmt(ref.sd[0], 3)}, ±${fmt(ref.sd[1], 3)}`, yours: `${fmt(z[0], 2)} sd, ${fmt(z[1], 2)} sd`, ok: z.every((v) => Math.abs(v) <= 0.1),
      why: z.every((v) => Math.abs(v) <= 0.1) ? '' : 'Parameters that differ by more than a tenth of a standard deviation usually mean a different objective or different data, not round-off.' });

    if (s.train !== 'both') {
      const other = s.train === '60' ? 80 : 60;
      const rc = score(tau, all[other].rows, s.alpha).rmse, repc = num('ai-check');
      if (Number.isFinite(repc)) {
        const ok = close(repc, rc, 0.01, 0.002);
        checks.push({ name: `Checking RMSE at ${other} kPa, recomputed from your τ (all usable rows)`, lab: fmt(rc, 4), yours: fmt(repc, 4), ok,
          why: ok ? '' : outOfRange(String(other)) ? `Check that the checking set uses every usable row at ${other} kPa, excludes the row${outOfRange(String(other)) > 1 ? 's' : ''} outside the Antoine range (${rangeText()}), and was not filtered by minimum x₁ or refitted.` : 'Check that the checking set uses every usable row at the other pressure and was not filtered or refitted.' });
      }
    }

    const curv = engine.modelCheck({ alpha: s.alpha, a12: tau[0], a21: tau[1], b12: 0, b21: 0 }).minSampledScaledCurvature;
    checks.push({ name: 'Liquid stability at your τ (min. scaled curvature)', lab: '> 0 for a miscible liquid', yours: fmt(curv, 3), ok: curv > 0, kind: 'model',
      why: curv > 0 ? '' : 'Your parameters predict that the liquid splits into two phases. 2-Propanol and water are fully miscible. Report this as a limit of the fitted model.' });

    last = { settings: s, tau, ref: { tau: ref.tau, sd: ref.sd, f: fLab }, nLab: tr.length, checks };
    render(last);
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message + incompleteNote(OUT); }
}

function render(res) {
  $('ai-out').innerHTML = res.checks.map((c) => `<tr><th scope="row">${c.name}</th><td>${c.lab}</td><td>${c.yours}</td><td class="${c.ok ? '' : 'warn'}">${c.ok ? 'agrees' : c.kind === 'model' ? 'model limit' : 'check'}</td><td style="text-align:left">${c.why}</td></tr>`).join('');
  const code = res.checks.filter((c) => c.kind !== 'model'), bad = code.filter((c) => !c.ok).length;
  const limit = res.checks.some((c) => c.kind === 'model' && !c.ok) ? ' The fitted model also predicts a liquid split: that is a limit of the model, not of your code.' : '';
  $('ai-status').textContent = statusLine(code.length, bad, OUT) + limit;
  $('ai-results').hidden = false;
}

function state() {
  const s = { result: last, completeness: completeness(OUT) };
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
    const response = await fetch(new URL('../../labs/assets/ipa-water.json', import.meta.url));
    data = await response.json();
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
