/** Lab P5 · 2027 preview page module: partial molar volumes and component fugacity coefficients. */
import * as mx from './mixture.js';
import { palette as c } from '../../labs/assets/palette.js';
import { withStudent, studentFileName } from './student.js';

const SCHEMA = 'skh-thermo-p5-mixture-study/1';
const $ = (id) => document.getElementById(id);
const num = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { maximumSignificantDigits: d }).replace(/^-/, '−'));
const fix = (v, d = 3) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-/, '−'));
const signed = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d));
const pct = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? 100 * (a - b) / Math.abs(b) : null);
const RULES = { arith: 'Arithmetic mean', geom: 'Geometric mean', pitzer: 'Pitzer–Prausnitz', pr: 'Peng–Robinson implied' };
const NOTE_IDS = { concept1: 'note-concept1', concept2: 'note-concept2', concept3: 'note-concept3', ord: 'note-ord', b12: 'note-b12', lr: 'note-lr', decision: 'note-decision' };
let data = null, L = null;
const study = { inputs: null, res: null, cases: [], ord: null, b12: null, lr: null };

function cell(t, html = false) { const td = document.createElement('td'); if (html) td.innerHTML = t; else td.textContent = t; return td; }
function li(h) { const e = document.createElement('li'); e.innerHTML = h; return e; }
const G = () => data.gas, T = 298.15;
const nameOf = (k) => (k === 'co2' ? 'CO₂' : G().fluids[k].name.toLowerCase());

function readInputs() { return { order: Number($('order').value), x: Number($('xeth').value), pair: $('pair').value, rule: $('rule').value, k12: Number($('k12').value), P: Number($('pres').value), y1: Number($('y1').value) }; }
function applyInputs(i) { $('order').value = String(i.order); $('xeth').value = String(i.x); $('pair').value = i.pair; $('rule').value = i.rule; $('k12').value = String(i.k12); $('pres').value = String(i.P); $('y1').value = String(i.y1); }
function validInputs(i) { return i && [1, 2, 3, 4, 5].includes(i.order) && i.x > 0 && i.x < 1 && G().pairs[i.pair] && RULES[i.rule] && i.k12 >= -0.3 && i.k12 <= 0.5 && i.P > 0 && i.P <= 60 && i.y1 >= 0 && i.y1 <= 1; }
function showError(msg) {
  const box = $('form-error');
  if (!msg) { box.hidden = true; box.replaceChildren(); return; }
  box.replaceChildren(Object.assign(document.createElement('p'), { textContent: msg })); box.hidden = false; box.focus();
}
function gasState(i, rule = i.rule, k12 = i.k12, P = i.P, y1 = i.y1) {
  const pr = G().pairs[i.pair], f1 = G().fluids[pr.i], f2 = G().fluids[pr.j], B11 = f1.B298, B22 = f2.B298, B12r = mx.b12Rule(rule, pr, G().fluids, T, k12);
  return { pr, f1, f2, B11, B22, meas: mx.virialMix(B11, B22, pr.B12, T, P, y1), rule: mx.virialMix(B11, B22, B12r, T, P, y1), B12r, prm: mx.prMix(f1, f2, T, P, y1, k12), pr0: mx.prMix(f1, f2, T, P, y1, 0) };
}
function evaluate(i) {
  const fit = mx.rkFit(L.pts, i.order);
  return { fit, part: mx.partials(fit.coef, L.V0, i.x), inf: mx.infiniteDilution(fit.coef, L.V0), gd: mx.gibbsDuhem(fit.coef, L.V0, i.x), gas: gasState(i) };
}
function calculate({ quiet = false } = {}) {
  if (!data) return false;
  const i = readInputs();
  if (!validInputs(i)) { showError('Check the inputs: x between 0 and 1, k12 between −0.3 and 0.5, P up to 60 bar, y1 between 0 and 1.'); return false; }
  showError(''); study.inputs = i; study.res = evaluate(i);
  $('diagram-panel').hidden = false;
  renderLiquid(); renderGas(); renderPaper(); renderChart();
  for (const id of ['save-case', 'run-ord', 'run-b12', 'run-lr', 'export-study']) $(id).disabled = false;
  const g = study.res.gas;
  $('graduate-baseline').textContent = 'Current: ' + i.order + ' Redlich–Kister terms, V̄∞ ethanol ' + fix(study.res.inf.V1, 2) + ' cm³/mol · ' + nameOf(g.pr.i) + ' + ' + nameOf(g.pr.j) + ' at ' + num(i.P, 4) + ' bar, y₁ = ' + num(i.y1, 3) + ': φ̂₁ ' + fix(Math.exp(g.meas.lnphi1), 4) + ' (measured B₁₂), ' + fix(Math.exp(g.meas.lr1), 4) + ' (Lewis–Randall).';
  if (!quiet) $('status').textContent = 'Calculated. Add the result to the comparison before changing a setting.';
  return true;
}
function renderLiquid() {
  const i = study.inputs, { fit, part, inf } = study.res;
  $('result-placeholder').hidden = true; $('results').hidden = false;
  $('result-phase').textContent = 'Ethanol + water, ' + i.order + ' term' + (i.order > 1 ? 's' : '') + ' · ' + nameOf(study.res.gas.pr.i) + ' + ' + nameOf(study.res.gas.pr.j);
  $('phase-interpretation').textContent = 'Fit RMS residual ' + fix(fit.rms, 4) + ' cm³/mol with ' + fit.dof + ' degrees of freedom. A = ' + fit.coef.map((a) => fix(a, 4)).join(', ') + ' cm³/mol.';
  $('ve-body').replaceChildren(...L.pts.map((p, k) => { const tr = document.createElement('tr'); tr.append(cell(fix(p.x, 4)), cell(fix(p.VE, 3)), cell(fix(mx.veRK(fit.coef, p.x), 3)), cell(signed(fit.res[k], 3))); return tr; }));
  $('result-partials').textContent = 'x = ' + num(i.x, 3) + ': V̄ ethanol ' + fix(part.V1, 3) + ', V̄ water ' + fix(part.V2, 3) + ' · infinite dilution: ethanol ' + fix(inf.V1, 2) + ', water ' + fix(inf.V2, 2) + ' · pure: ' + fix(L.V0[0], 2) + ', ' + fix(L.V0[1], 2) + ' cm³/mol';
}
function renderGas() {
  const i = study.inputs, g = study.res.gas, rows = [
    ['Virial, measured B₁₂', g.pr.B12, g.meas.delta, g.meas.lnphi1, g.meas.lnphi2, g.meas.Z],
    ['Virial, ' + RULES[i.rule] + (i.rule === 'pitzer' || i.rule === 'pr' ? ', k₁₂ = ' + i.k12 : ''), g.B12r, g.rule.delta, g.rule.lnphi1, g.rule.lnphi2, g.rule.Z],
    ['Lewis–Randall (pure-component φᵢ)', (g.B11 + g.B22) / 2, 0, g.meas.lr1, g.meas.lr2, null],
    ['Peng–Robinson, k₁₂ = 0', null, null, g.pr0.lnphi1, g.pr0.lnphi2, g.pr0.Z],
    ['Peng–Robinson, k₁₂ = ' + i.k12, null, null, g.prm.lnphi1, g.prm.lnphi2, g.prm.Z]];
  $('gas-title').textContent = nameOf(g.pr.i) + ' (1) + ' + nameOf(g.pr.j) + ' (2) at 298.15 K, ' + num(i.P, 4) + ' bar, y₁ = ' + num(i.y1, 3);
  const ref1 = Math.exp(g.meas.lnphi1), ref2 = Math.exp(g.meas.lnphi2);
  $('gas-body').replaceChildren(...rows.map(([name, b12, d, l1, l2, Z], k) => { const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = name;
    const p1 = Math.exp(l1), p2 = Math.exp(l2);
    tr.append(th, cell(b12 == null ? '—' : fix(b12, 1)), cell(d == null ? '—' : fix(d, 1)), cell(fix(p1, 4) + (k ? ' (' + signed(pct(p1, ref1), 2) + '%)' : '')), cell(fix(p2, 4) + (k ? ' (' + signed(pct(p2, ref2), 2) + '%)' : '')), cell(Z == null ? '—' : fix(Z, 4))); return tr; }));
  const pred = $('prediction').value;
  if (pred && i.pair === 'co2-methane') { const r = pct(Math.exp(g.meas.lnphi1), Math.exp(g.meas.lr1)), act = r > 1 ? 'higher' : r < -1 ? 'lower' : 'same';
    $('prediction-feedback').textContent = pred === act ? 'Your prediction matches: φ̂ of CO₂ is ' + signed(r, 1) + '% from pure CO₂ at this y₁.' : 'φ̂ of CO₂ is ' + signed(r, 1) + '% from pure CO₂ at this y₁. Question C in Step 4 explains why.'; }
  else $('prediction-feedback').textContent = pred ? 'Choose CO₂ + methane to check your prediction.' : '';
}
function renderPaper() {
  const i = study.inputs, { fit, part, gd } = study.res, g = study.res.gas, k = i.P * 1e5 / (mx.R * T) * 1e-6;
  $('calc-steps').replaceChildren(
    li('At x = ' + num(i.x, 3) + ': V<sup>E</sup> = ' + fix(mx.veRK(fit.coef, i.x), 4) + ' cm³/mol, V = xV₁* + (1 − x)V₂* + V<sup>E</sup> = ' + fix(part.V, 4) + ', dV/dx = V₁* − V₂* + dV<sup>E</sup>/dx = ' + fix(part.dV, 4) + ' cm³/mol.'),
    li('V̄<sub>ethanol</sub> = V + (1 − x)dV/dx = ' + fix(part.V1, 4) + '; V̄<sub>water</sub> = V − x dV/dx = ' + fix(part.V2, 4) + ' cm³/mol. Check: xV̄₁ + (1 − x)V̄₂ = ' + fix(i.x * part.V1 + (1 - i.x) * part.V2, 4) + ' = V.'),
    li('Gibbs–Duhem: x dV̄₁/dx + (1 − x) dV̄₂/dx = ' + num(i.x, 3) + ' × ' + fix(gd.dV1, 4) + ' + ' + num(1 - i.x, 3) + ' × ' + fix(gd.dV2, 4) + ' = ' + gd.lhs.toExponential(1) + ' cm³/mol.'),
    li('Gas: δ₁₂ = 2B₁₂ − B₁₁ − B₂₂ = 2(' + fix(g.pr.B12, 1) + ') − (' + fix(g.B11, 2) + ') − (' + fix(g.B22, 2) + ') = ' + fix(g.meas.delta, 2) + ' cm³/mol; P/RT = ' + k.toExponential(4) + ' mol/cm³.'),
    li('ln φ̂₁ = (P/RT)[B₁₁ + y₂²δ₁₂] = ' + k.toExponential(4) + ' × [' + fix(g.B11, 2) + ' + ' + num((1 - i.y1) ** 2, 4) + ' × ' + fix(g.meas.delta, 2) + '] = ' + fix(g.meas.lnphi1, 5) + ', φ̂₁ = ' + fix(Math.exp(g.meas.lnphi1), 4) + '; Lewis–Randall φ₁ = exp(B₁₁P/RT) = ' + fix(Math.exp(g.meas.lr1), 4) + '.'),
  );
}
async function renderChart() {
  if (!study.res) return;
  if (!window.Plotly) { setTimeout(renderChart, 200); return; }
  const i = study.inputs, view = $('view').value, xs = Array.from({ length: 199 }, (_, k) => (k + 1) / 200), A = study.res.fit.coef, traces = []; let xT, yT;
  if (view === 've') {
    traces.push({ x: L.pts.map((p) => p.x), y: L.pts.map((p) => p.VE), name: 'Measured (Pires et al., 2007)', mode: 'markers', marker: { color: c.teal, size: 8 } });
    traces.push({ x: xs, y: xs.map((x) => mx.veRK(A, x)), name: i.order + '-term Redlich–Kister fit', mode: 'lines', line: { color: c.amber, width: 2.5 } });
    const s = mx.dveRK(A, i.x), v = mx.veRK(A, i.x); traces.push({ x: [0, 1], y: [v - s * i.x, v + s * (1 - i.x)], name: 'Tangent at x (V^E form)', mode: 'lines', line: { color: c.graphite, width: 1.5, dash: 'dash' } });
    xT = 'Ethanol mole fraction x'; yT = 'Excess volume V^E / (cm³/mol)';
    $('chart-note').textContent = 'The tangent to V^E meets x = 0 at V̄_water − V_water* and x = 1 at V̄_ethanol − V_ethanol*. Outside the measured range (x below 0.095 or above 0.90) the curve is the fit, not data.';
  } else if (view === 'vbar') {
    traces.push({ x: xs, y: xs.map((x) => mx.partials(A, L.V0, x).V1 - L.V0[0]), name: 'V̄ ethanol − V*', mode: 'lines', line: { color: c.amber, width: 2.5 } });
    traces.push({ x: xs, y: xs.map((x) => mx.partials(A, L.V0, x).V2 - L.V0[1]), name: 'V̄ water − V*', mode: 'lines', line: { color: c.teal, width: 2.5 } });
    xT = 'Ethanol mole fraction x'; yT = 'Partial molar volume − pure V* / (cm³/mol)';
    $('chart-note').textContent = 'Where one curve rises the other falls: Gibbs–Duhem. The ends are infinite-dilution values, extrapolated beyond the data.';
  } else {
    const ys = Array.from({ length: 51 }, (_, k) => k / 50), g = (y) => gasState(i, i.rule, i.k12, i.P, y);
    traces.push({ x: ys, y: ys.map((y) => Math.exp(g(y).meas.lnphi1)), name: 'Virial, measured B₁₂', mode: 'lines', line: { color: c.teal, width: 2.8 } });
    traces.push({ x: ys, y: ys.map((y) => Math.exp(g(y).rule.lnphi1)), name: 'Virial, ' + RULES[i.rule], mode: 'lines', line: { color: c.rust, width: 2 } });
    traces.push({ x: ys, y: ys.map(() => Math.exp(g(0).meas.lr1)), name: 'Lewis–Randall', mode: 'lines', line: { color: c.graphite, width: 1.6, dash: 'dash' } });
    traces.push({ x: ys, y: ys.map((y) => Math.exp(g(y).prm.lnphi1)), name: 'Peng–Robinson, k₁₂ = ' + i.k12, mode: 'lines', line: { color: c.amber, width: 2 } });
    xT = 'y₁ (' + nameOf(G().pairs[i.pair].i) + ')'; yT = 'φ̂₁';
    $('chart-note').textContent = 'At y₁ → 1 every model meets pure component 1. The gap at y₁ → 0 is (P/RT)δ₁₂ in ln φ̂₁.';
  }
  const layout = { margin: { l: 80, r: 16, t: 16, b: 56 }, font: { family: 'Source Sans 3, sans-serif', size: 13, color: c.ink }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', showlegend: false, hovermode: 'closest',
    xaxis: { title: { text: xT }, range: [0, 1], zeroline: false, linecolor: c.graphite, gridcolor: c.mist }, yaxis: { title: { text: yT }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist } };
  try { await window.Plotly.react('mix-chart', traces, layout, { responsive: true, displayModeBar: false }); } catch { /* numbers are in Step 2 */ }
  $('chart-legend').replaceChildren(...traces.map((t) => { const sp = document.createElement('span'), e = document.createElement('i'); e.style.borderColor = t.marker?.color || t.line.color; if (t.mode === 'markers') e.className = 'legend-dot'; else e.style.borderTopStyle = t.line.dash ? 'dashed' : 'solid'; sp.append(e, document.createTextNode(t.name)); return sp; }));
}
/* ---------- Graduate investigations ---------- */
function runOrd() {
  const rows = [1, 2, 3, 4, 5].map((n) => { const f = mx.rkFit(L.pts, n), p = mx.partials(f.coef, L.V0, 0.5), inf = mx.infiniteDilution(f.coef, L.V0); return { n, dof: f.dof, rms: f.rms, v1: p.V1, v2: p.V2, i1: inf.V1, i2: inf.V2 }; });
  study.ord = rows;
  $('ord-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(String(r.n)), cell(String(r.dof)), cell(fix(r.rms, 4)), cell(fix(r.v1, 3) + ', ' + fix(r.v2, 3)), cell(fix(r.i1, 2)), cell(fix(r.i2, 2))); return tr; }));
  $('ord-wrap').hidden = false;
  const s = (k) => Math.max(...rows.slice(1).map((r) => r[k])) - Math.min(...rows.slice(1).map((r) => r[k]));
  $('ord-status').textContent = 'For 2–5 terms, V̄ ethanol at x = 0.5 spans ' + fix(s('v1'), 3) + ' cm³/mol, while V̄∞ of ethanol in water spans ' + fix(s('i1'), 2) + ' cm³/mol.';
}
function runB12() {
  const rows = []; const fl = G().fluids;
  for (const [k, pr] of Object.entries(G().pairs)) {
    const fitK = (fn) => { let lo = -0.3, hi = 0.5; for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (fn(m) < pr.B12) lo = m; else hi = m; } return (lo + hi) / 2; };
    rows.push({ k, pr, arith: mx.b12Rule('arith', pr, fl, T), geom: mx.b12Rule('geom', pr, fl, T), pit: mx.b12Pitzer(fl[pr.i], fl[pr.j], T, 0).B, prb: mx.b12PR(fl[pr.i], fl[pr.j], T, 0), kp: fitK((m) => mx.b12Pitzer(fl[pr.i], fl[pr.j], T, m).B), kr: fitK((m) => mx.b12PR(fl[pr.i], fl[pr.j], T, m)) });
  }
  study.b12 = rows.map(({ pr, ...r }) => r);
  const e = (v, m) => fix(v, 1) + ' (' + signed(pct(v, m)) + '%)';
  $('b12-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(nameOf(r.pr.i) + ' + ' + nameOf(r.pr.j)), cell(fix(r.pr.B12, 1) + ' ± ' + r.pr.u), cell(e(r.arith, r.pr.B12)), cell(e(r.geom, r.pr.B12)), cell(e(r.pit, r.pr.B12)), cell(e(r.prb, r.pr.B12)), cell(fix(r.kp, 3) + ', ' + fix(r.kr, 3))); return tr; }));
  $('b12-wrap').hidden = false;
  $('b12-status').textContent = 'Fitted k₁₂: Pitzer ' + rows.map((r) => fix(r.kp, 3)).join(', ') + '; Peng–Robinson ' + rows.map((r) => fix(r.kr, 3)).join(', ') + ' (pairs in table order).';
}
function runLr() {
  const i = study.inputs, rows = [];
  for (const P of [10, 30, 60]) for (const y of [0.01, 0.1, 0.3, 0.5, 0.7, 0.9]) { const g = gasState(i, i.rule, i.k12, P, y), m = Math.exp(g.meas.lnphi1); rows.push({ P, y, m, lr: pct(Math.exp(g.meas.lr1), m), pr0: pct(Math.exp(g.pr0.lnphi1), m), prk: pct(Math.exp(g.prm.lnphi1), m) }); }
  study.lr = { pair: i.pair, k12: i.k12, rows };
  $('lr-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(String(r.P)), cell(num(r.y, 2)), cell(fix(r.m, 4)), cell(signed(r.lr, 2)), cell(signed(r.pr0, 2)), cell(signed(r.prk, 2))); return tr; }));
  $('lr-wrap').hidden = false;
  const worst = rows.reduce((b, r) => (Math.abs(r.lr) > Math.abs(b.lr) ? r : b)), ok = rows.filter((r) => Math.abs(r.lr) <= 1);
  $('lr-status').textContent = 'Largest Lewis–Randall error ' + signed(worst.lr, 2) + '% at ' + worst.P + ' bar and y₁ = ' + worst.y + '. Within 1% at ' + ok.length + ' of ' + rows.length + ' points.';
}
/* ---------- Save, restore ---------- */
function notes() { return Object.fromEntries(Object.entries(NOTE_IDS).map(([k, id]) => [k, $(id).value])); }
function summary(i, r) { return { vinf: r.inf.V1, phim: Math.exp(r.gas.meas.lnphi1), philr: Math.exp(r.gas.meas.lr1), b12r: r.gas.B12r, b12m: r.gas.pr.B12 }; }
function saveCase() {
  if (!study.res) return;
  const name = $('case-name').value.trim() || 'Case ' + (study.cases.length + 1);
  study.cases.push({ name, inputs: { ...study.inputs }, summary: summary(study.inputs, study.res) }); renderCases();
  $('status').textContent = 'Saved “' + name + '”. Change one setting, calculate, then save the next case.';
}
function renderCases() {
  $('comparison-empty').hidden = study.cases.length > 0; $('comparison-table-wrap').hidden = !study.cases.length;
  $('comparison-body').replaceChildren(...study.cases.map((s) => {
    const tr = document.createElement('tr'), m = s.summary, pr = G().pairs[s.inputs.pair];
    tr.append(cell(s.name), cell(s.inputs.order + ' terms, ' + fix(m.vinf, 2)), cell(nameOf(pr.i) + ' + ' + nameOf(pr.j) + ', ' + s.inputs.P + ' bar, ' + s.inputs.y1), cell(fix(m.phim, 4) + ' / ' + fix(m.philr, 4)), cell(RULES[s.inputs.rule] + ' ' + fix(m.b12r, 1) + ' / ' + fix(m.b12m, 1)));
    const td = document.createElement('td'), b = document.createElement('button');
    b.type = 'button'; b.className = 'secondary-button'; b.textContent = 'Reopen'; b.setAttribute('aria-label', 'Reopen ' + s.name);
    b.addEventListener('click', () => { applyInputs(s.inputs); $('case-name').value = s.name; calculate({ quiet: true }); $('status').textContent = 'Reopened and recalculated “' + s.name + '”.'; $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    td.append(b); tr.append(td); return tr;
  }));
}
function loadCase(k) {
  const pr = G().pairs[k]; if (!pr) return;
  applyInputs({ ...readInputs(), pair: k, rule: 'arith', k12: 0, P: 30, y1: 0.05 });
  $('case-name').value = nameOf(pr.i).replace(/^./, (s) => s.toUpperCase()) + ' + ' + nameOf(pr.j);
  for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === k));
  $('status').textContent = $('case-name').value + ' loaded. Make a prediction, then press Calculate both parts.';
}
function evidenceCheck() {
  const n = notes(), issues = [];
  if (!study.ord) issues.push('Compare fit orders (A).');
  if (!study.b12) issues.push('Compare the rules (B).');
  if (!study.lr) issues.push('Map the component fugacity (C).');
  for (const [k, label] of [['ord', 'Claim 1'], ['b12', 'Claim 2'], ['lr', 'Claim 3'], ['decision', 'the decision']]) if ((n[k] || '').trim().length < 40) issues.push('Write ' + label + ' with numbers.');
  return { complete: !issues.length, issues };
}
function exportStudy() {
  const record = { schema: SCHEMA, engineVersion: mx.MIX_VERSION, dataVersion: data.version, savedAt: new Date().toISOString(),
    inputs: study.inputs || readInputs(), prediction: $('prediction').value, caseName: $('case-name').value, cases: study.cases, view: $('view').value,
    notes: notes(), reflection: $('reflection').value, investigations: { ord: Boolean(study.ord), b12: Boolean(study.b12), lr: Boolean(study.lr) }, aiCode: window.aiCode?.state() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(withStudent(record), null, 2)], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = studentFileName('labP5-mixture-study.json'); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Study downloaded. Open it later to restore the cases, settings and notes.';
}
async function openStudy(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 3e6) throw new Error('The file is larger than a Lab P5 study.');
    const rec = JSON.parse(await file.text());
    if (rec.schema !== SCHEMA) throw new Error('This file is not a Lab P5 study.');
    if (!validInputs(rec.inputs)) throw new Error('The saved inputs are invalid.');
    applyInputs(rec.inputs); $('prediction').value = ['lower', 'same', 'higher'].includes(rec.prediction) ? rec.prediction : ''; $('case-name').value = typeof rec.caseName === 'string' ? rec.caseName.slice(0, 80) : '';
    $('view').value = ['ve', 'vbar', 'phi'].includes(rec.view) ? rec.view : 've';
    for (const [k, id] of Object.entries(NOTE_IDS)) $(id).value = typeof rec.notes?.[k] === 'string' ? rec.notes[k] : '';
    $('reflection').value = typeof rec.reflection === 'string' ? rec.reflection : '';
    study.cases = (Array.isArray(rec.cases) ? rec.cases : []).slice(0, 60).filter((s) => validInputs(s?.inputs) && typeof s.name === 'string').map((s) => ({ name: s.name.slice(0, 80), inputs: { ...s.inputs }, summary: summary(s.inputs, evaluate(s.inputs)) }));
    renderCases(); calculate({ quiet: true });
    if (rec.investigations?.ord) runOrd();
    if (rec.investigations?.b12) runB12();
    if (rec.investigations?.lr) runLr();
    $('status').textContent = 'Study reopened. ' + study.cases.length + ' saved cases and the investigations were recalculated from the saved inputs.';
  } catch (error) { $('status').textContent = 'The study could not be opened: ' + error.message; }
  finally { event.target.value = ''; }
}
async function init() {
  try { data = await (await fetch(new URL('../../labs/assets/p5-mixtures.json', import.meta.url))).json(); L = mx.liquidPoints(data.liquid); }
  catch { $('status').textContent = 'The data could not be loaded.'; return; }
  for (const b of document.querySelectorAll('[data-case]')) b.addEventListener('click', () => loadCase(b.dataset.case));
  $('calculate').addEventListener('click', () => calculate());
  $('mix-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('view').addEventListener('change', renderChart);
  $('save-case').addEventListener('click', saveCase);
  $('run-ord').addEventListener('click', runOrd); $('run-b12').addEventListener('click', runB12); $('run-lr').addEventListener('click', runLr);
  $('check-evidence').addEventListener('click', () => { const r = evidenceCheck(); $('evidence-status').textContent = r.complete ? 'All sections and calculations are present. Scientific reasoning still needs instructor review.' : r.issues.join(' '); });
  $('export-study').addEventListener('click', exportStudy); $('import-study').addEventListener('change', openStudy);
  loadCase('co2-methane');
}
init();
