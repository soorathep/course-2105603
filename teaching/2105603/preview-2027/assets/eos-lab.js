/** Lab P2 · 2027 preview page module: equations of state against reference isotherms. */
import * as eos from './eos.js';
import { palette as c } from '../../labs/assets/palette.js';
import { withStudent, studentFileName } from './student.js';

const SCHEMA = 'skh-thermo-p2-eos-study/1';
const $ = (id) => document.getElementById(id);
const num = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { maximumSignificantDigits: d }).replace(/^-/, '−'));
const fix = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-/, '−'));
const signed = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d));
const sci = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : v.toExponential(d - 1).replace('e', ' × 10^').replace(/\^\+?(-?)(\d+)/, (_, s, e) => '<sup>' + (s ? '−' : '') + e + '</sup>').replace(/^-/, '−'));
const MODEL_LIST = ['ideal', 'virial', 'vdw', 'rk', 'srk', 'pr'];
const LABEL = { ideal: 'Ideal gas', virial: 'Virial, Pitzer B', vdw: 'van der Waals', rk: 'Redlich–Kwong', srk: 'Soave–Redlich–Kwong', pr: 'Peng–Robinson' };
const COLOR = { ideal: c.graphite, virial: c.plum, vdw: c.sage, rk: c.skyblue, srk: c.rust, pr: c.amber };
const RULES = ['label', 'gibbs', 'largest', 'smallest'];
const NOTE_IDS = { concept1: 'note-concept1', concept2: 'note-concept2', concept3: 'note-concept3', b: 'note-b', csp: 'note-csp', sat: 'note-sat', decision: 'note-decision' };
const INSPECT = { ch4_300: 100, co2_280: 30, c3_300: 5, h2o_500: 10 };
let data = null;
const study = { inputs: null, res: null, cases: [], b: null, csp: null, sat: null };

function cell(t, html = false) { const td = document.createElement('td'); if (html) td.innerHTML = t; else td.textContent = t; return td; }
function li(h) { const e = document.createElement('li'); e.innerHTML = h; return e; }
const cs = (k) => data.cases[k];
const fl = (k) => data.fluids[cs(k).fluid];
const phaseName = (p) => ({ v: 'vapor', l: 'liquid', s: 'supercritical' }[p]);
const defaultInspect = (k) => INSPECT[k] ?? Math.round(fl(k).Pc * 10) / 10;

function readInputs() { return { case: $('case').value, model: $('model').value, rule: $('rule').value, shift: $('shift').value, pinspect: Number($('pinspect').value) }; }
function applyInputs(i) { $('case').value = i.case; $('model').value = i.model; $('rule').value = i.rule; $('shift').value = i.shift; $('pinspect').value = String(i.pinspect); syncShift(); }
function validInputs(i) { return i && data.cases[i.case] && eos.CUBIC.includes(i.model) && RULES.includes(i.rule) && ['none', 'sat'].includes(i.shift) && i.pinspect > 0 && i.pinspect <= 700; }
function syncShift() { const sub = Boolean(cs($('case').value).sat); $('shift').querySelector('[value="sat"]').disabled = !sub; if (!sub) $('shift').value = 'none'; }

function showError(msg) {
  const box = $('form-error');
  if (!msg) { box.hidden = true; box.replaceChildren(); return; }
  box.replaceChildren(Object.assign(document.createElement('p'), { textContent: msg })); box.hidden = false; box.focus();
}

/** All model comparisons for one set of inputs. */
function evaluate(i) {
  const k = cs(i.case), f = fl(i.case), shifts = {}, out = {};
  for (const m of eos.CUBIC) shifts[m] = i.shift === 'sat' && k.sat ? eos.translation(m, f, k).c : 0;
  for (const m of MODEL_LIST) out[m] = eos.compare(m, f, k, { rule: i.rule, shift: shifts[m] || 0 });
  const B = { virial: eos.bPitzer(f, k.T).B }; for (const m of eos.CUBIC) B[m] = eos.bCubic(m, f, k.T);
  return { out, shifts, B, fit: eos.fitB(k, f, 1) };
}

function calculate({ quiet = false } = {}) {
  if (!data) return false;
  const i = readInputs();
  if (!(i.pinspect > 0 && i.pinspect <= 700)) { showError('Enter an inspection pressure between 0.1 and 700 bar.'); return false; }
  showError('');
  study.inputs = i; study.res = evaluate(i);
  $('diagram-panel').hidden = false;
  renderResult(); renderRoots(); renderPaper(); renderChart();
  for (const id of ['save-case', 'run-b', 'run-csp', 'run-sat', 'export-study']) $(id).disabled = false;
  const r = study.res.out[i.model];
  $('graduate-baseline').textContent = 'Current isotherm: ' + cs(i.case).label + ' · ' + eos.MODELS[i.model].name + ': mean |error| ' + fix(r.aadGas) + '% for ρ ≤ ρc and ' + fix(r.aadDense) + '% for ρ > ρc.';
  if (!quiet) $('status').textContent = 'Calculated. Add the result to the comparison before changing a setting.';
  return true;
}

function renderResult() {
  const i = study.inputs, k = cs(i.case), f = fl(i.case), { out, B, fit, shifts } = study.res;
  $('result-placeholder').hidden = true; $('results').hidden = false;
  $('result-phase').textContent = k.label.replace(/ \(.*\)$/, '');
  const pr = out.pr, srk = out.srk;
  $('phase-interpretation').textContent = 'T = ' + num(k.T, 6) + ' K (T_r = ' + num(k.T / f.Tc, 3) + '), ω = ' + num(f.omega, 4) + ', ρc = ' + num(f.rhoc, 4) + ' mol/L. ' + (k.sat ? 'Subcritical: vapor up to ' + num(k.sat.P, 5) + ' bar, liquid above. ' : 'Supercritical: one fluid phase, gas-like at low P and liquid-like density at high P. ')
    + 'Peng–Robinson: ' + fix(pr.aadGas) + '% below ρc, ' + fix(pr.aadDense) + '% above. ' + (pr.aadDense != null && pr.aadDense > 3 * (pr.aadGas || 0.1) ? 'The dense region carries most of the error.' : '');
  const p = $('prediction').value, e = pr.aadDense, actual = e == null ? null : e < 2 ? 'low' : e <= 10 ? 'mid' : 'high';
  $('prediction-feedback').textContent = p && actual ? (p === actual ? 'Your prediction matches: ' + fix(e) + '% at the dense points.' : 'The dense-point error is ' + fix(e) + '% here. Question A in Step 4 explains the pattern.') : p && e == null ? 'This isotherm has no points above ρc.' : '';
  $('sum-body').replaceChildren(...MODEL_LIST.map((m) => {
    const r = out[m], tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = LABEL[m] + (m === i.model ? ' *' : '');
    tr.append(th, cell(fix(r.aadGas)), cell(m === 'virial' ? 'not applied' : fix(r.aadDense)), cell(fix(r.maxErr)), cell(m === 'ideal' ? '0' : fix(B[m], 1))); return tr;
  }));
  const sh = eos.CUBIC.filter((m) => shifts[m]).map((m) => LABEL[m] + ' ' + num(shifts[m], 4)).join(', ');
  $('sum-note').textContent = '* used for the roots and the paper check. ' + (sh ? 'Volume shift c / (cm³/mol): ' + sh + '. ' : '') + 'B from the reference data (gas points up to 1 mol/L): ' + (fit ? fix(fit.B, 1) + ' cm³/mol from ' + fit.n + ' points.' : 'not enough gas points.') + ' Root rule: ' + $('rule').selectedOptions[0].textContent.toLowerCase() + '.';
  // selected points
  const pts = selectedPoints(k, f);
  $('pt-body').replaceChildren(...pts.map((j) => {
    const tr = document.createElement('tr'); tr.append(cell(num(k.P[j], 5)), cell(phaseName(k.phase[j])), cell(num(k.Z[j], 5)));
    for (const m of ['pr', 'srk', 'rk', 'vdw', 'virial']) { const q = out[m].pts[j]; tr.append(cell(q.Z == null ? '—' : num(q.Z, 4) + ' (' + signed(q.err) + '%)')); }
    return tr;
  }));
}

function selectedPoints(k, f) {
  const near = (P, ph) => { let b = -1; for (let j = 0; j < k.P.length; j++) if ((!ph || k.phase[j] === ph) && (b < 0 || Math.abs(k.P[j] - P) < Math.abs(k.P[b] - P))) b = j; return b; };
  let list;
  if (k.sat) { const ps = k.sat.P, top = k.P[k.P.length - 1]; list = [near(k.P[0], 'v'), near(ps / 2, 'v'), near(ps, 'v'), near(ps, 'l'), near((ps + top) / 2, 'l'), near(top, 'l')]; }
  else if (k.T / f.Tc > 1.2) list = [10, 50, 100, 150, 200, 250].map((P) => near(P));
  else list = [0.1, 0.5, 1, 1.5, 2, 3].map((r) => near(r * f.Pc));
  return [...new Set(list)].filter((j) => j >= 0);
}

function renderRoots() {
  const i = study.inputs, k = cs(i.case), f = fl(i.case), P = i.pinspect, R = eos.roots(i.model, f, k.T, P), ref = eos.zAt(k, P);
  const phase = Math.abs(ref.P - P) < 1e-6 ? ref.phase : (k.sat ? (P < k.sat.P ? 'v' : 'l') : 's');
  const used = eos.choose(R.roots, i.rule, phase);
  $('root-title').textContent = 'Roots of ' + eos.MODELS[i.model].name + ' at ' + num(P, 5) + ' bar';
  $('root-body').replaceChildren(...R.roots.map((r, j) => {
    const dPdV = (eos.pressure(i.model, f, k.T, r.V * (1 + 1e-6)) - eos.pressure(i.model, f, k.T, r.V * (1 - 1e-6)));
    const name = R.roots.length === 1 ? 'only real root' : j === 0 ? 'smallest (liquid-like)' : j === R.roots.length - 1 ? 'largest (vapor-like)' : 'middle';
    const tr = document.createElement('tr'); tr.append(cell(name), cell(num(r.Z, 6)), cell(num(r.V, 5)), cell(num(r.gR, 5)), cell(dPdV < 0 ? 'negative: stable' : 'positive: unstable'), cell(r === used ? '✓' : '')); return tr;
  }));
  const sp = k.T < f.Tc ? eos.spinodals(i.model, f, k.T) : [];
  $('result-window').textContent = sp.length === 2 ? num(sp[0].P, 5) + ' to ' + num(sp[1].P, 5) + (sp[0].P < 0 ? ' (the lower spinodal is a negative pressure: the liquid root exists down to P → 0)' : '') : 'none: T is above T_c, so the cubic has one real root at every pressure';
}

function renderPaper() {
  const i = study.inputs, k = cs(i.case), f = fl(i.case), P = i.pinspect, R = eos.roots(i.model, f, k.T, P), p = R.p, q = R.k, M = eos.MODELS[i.model], ref = eos.zAt(k, P);
  const alphaLine = i.model === 'vdw' ? 'α = 1' : i.model === 'rk' ? 'α = T<sub>r</sub><sup>−1/2</sup> = ' + num(p.alpha, 6) : 'm = ' + num(p.m, 6) + ' from ω = ' + num(f.omega, 5) + ', α = [1 + m(1 − √T<sub>r</sub>)]² = ' + num(p.alpha, 6);
  const used = eos.choose(R.roots, i.rule, Math.abs(ref.P - P) < 1e-6 ? ref.phase : (k.sat ? (P < k.sat.P ? 'v' : 'l') : 's'));
  $('calc-steps').replaceChildren(
    li('T<sub>r</sub> = ' + num(k.T, 6) + '/' + num(f.Tc, 7) + ' = ' + num(p.Tr, 5) + '; ' + alphaLine + '.'),
    li('a = ' + num(M.Omega_a, 5) + ' R²T<sub>c</sub>²/P<sub>c</sub> × α = ' + num(p.a, 6) + ' Pa m⁶/mol²; b = ' + num(M.Omega_b, 5) + ' RT<sub>c</sub>/P<sub>c</sub> = ' + sci(p.b, 5) + ' m³/mol (P<sub>c</sub> in Pa).'),
    li('A = aP/(RT)² = ' + num(q.A, 6) + ' and B = bP/RT = ' + num(q.B, 6) + ' at P = ' + num(P, 5) + ' bar = ' + num(P * 1e5, 6) + ' Pa.'),
    li('Z³ + (' + num(q.c2, 6) + ')Z² + (' + num(q.c1, 6) + ')Z + (' + num(q.c0, 6) + ') = 0, with ε = ' + num(p.eps, 5) + ', σ = ' + num(p.sig, 5) + '.'),
    li('Real roots with Z &gt; B: ' + R.roots.map((r) => num(r.Z, 6)).join(', ') + '. Used: Z = ' + num(used.Z, 6) + ', V = ZRT/P = ' + num(used.V, 5) + ' cm³/mol.'),
    li('Reference at ' + num(ref.P, 5) + ' bar (' + phaseName(ref.phase) + '): Z = ' + num(ref.Z, 6) + '. Error ' + (Math.abs(ref.P - P) < 1e-6 ? signed(100 * (used.Z - ref.Z) / ref.Z, 2) + '%.' : 'not computed: choose a tabulated pressure to compare directly.')),
  );
}

function plotLayout(xTitle, yTitle) {
  return { margin: { l: 70, r: 16, t: 16, b: 56 }, font: { family: 'Source Sans 3, sans-serif', size: 13, color: c.ink }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', showlegend: false, hovermode: 'closest',
    xaxis: { title: { text: xTitle }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist }, yaxis: { title: { text: yTitle }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist } };
}
function legend(id, traces) {
  $(id).replaceChildren(...traces.map((t) => { const sp = document.createElement('span'), e = document.createElement('i'); e.style.borderColor = t.marker?.color || t.line.color; if (t.mode === 'markers') e.className = 'legend-dot'; else e.style.borderTopStyle = t.line?.dash ? 'dashed' : 'solid'; sp.append(e, document.createTextNode(t.name)); return sp; }));
}
async function renderChart() {
  if (!study.res) return;
  if (!window.Plotly) { setTimeout(renderChart, 200); return; }
  const i = study.inputs, k = cs(i.case), view = $('view').value, show = [...document.querySelectorAll('.model-toggles input:checked')].map((x) => x.value);
  const traces = [];
  if (view === 'Z') traces.push({ x: k.P, y: k.Z, name: 'Reference (NIST)', mode: 'markers', marker: { color: c.teal, size: 5 } });
  for (const m of MODEL_LIST) {
    if (!show.includes(m)) continue;
    const pts = study.res.out[m].pts.filter((q) => q.Z != null);
    // draw each phase as its own segment so the jump at the vapor pressure is not joined
    for (const ph of ['v', 's', 'l']) {
      const seg = pts.filter((q) => q.phase === ph); if (!seg.length) continue;
      traces.push({ x: seg.map((q) => q.P), y: seg.map((q) => (view === 'Z' ? q.Z : q.err)), name: LABEL[m], mode: 'lines', line: { color: COLOR[m], width: m === i.model ? 3 : 2, dash: m === 'ideal' ? 'dash' : undefined }, showlegend: false, legendgroup: m });
    }
  }
  const lay = plotLayout('Pressure P / bar', view === 'Z' ? 'Compressibility factor Z' : 'Error in Z / %');
  if (view === 'err') { lay.yaxis.range = [-30, 30]; lay.shapes = [{ type: 'line', x0: k.P[0], x1: k.P[k.P.length - 1], y0: 0, y1: 0, line: { color: c.graphite, width: 1 } }]; }
  try { await window.Plotly.react('eos-chart', traces, lay, { responsive: true, displayModeBar: false }); } catch { /* numbers are in Step 2 */ }
  const seen = new Set(); legend('chart-legend', traces.filter((t) => (seen.has(t.name) ? false : seen.add(t.name))));
  $('chart-note').textContent = view === 'Z' ? (k.sat ? 'The reference jumps at the vapor pressure from the saturated vapor to the saturated liquid. Each model is drawn on the root the rule selects.' : 'At T_r near 1 the dense branch is where the cubics separate. The ideal gas is Z = 1.') : 'Errors beyond ±30% are clipped. The ideal gas and the virial equation leave the plot in the dense region.';
}

/* ---------- Graduate investigations ---------- */
function runB() {
  const rho = Number($('rhomax').value), rows = [];
  for (const [key, k] of Object.entries(data.cases)) {
    const f = data.fluids[k.fluid], ft = eos.fitB(k, f, rho); if (!ft) continue;
    const e = (b) => fix(b, 1) + ' (' + signed(100 * (b - ft.B) / Math.abs(ft.B)) + '%)';
    rows.push({ key, label: k.label, T: k.T, B: ft.B, C: ft.C, n: ft.n, pit: eos.bPitzer(f, k.T).B, vdw: eos.bCubic('vdw', f, k.T), srk: eos.bCubic('srk', f, k.T), pr: eos.bCubic('pr', f, k.T), e });
  }
  study.b = { rho, rows: rows.map(({ e, ...r }) => r) };
  $('b-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(r.label), cell(num(r.T, 6)), cell(fix(r.B, 1) + ' (' + r.n + ' points)'), cell(num(r.C, 4)), cell(r.e(r.pit)), cell(r.e(r.vdw)), cell(r.e(r.srk)), cell(r.e(r.pr))); return tr; }));
  $('b-wrap').hidden = false;
  const m = rows.find((r) => r.key === 'ch4_300'), w = rows.find((r) => r.key === 'h2o_500');
  $('b-status').textContent = 'Methane at 300 K: B = ' + fix(m.B, 1) + ' cm³/mol from the data, Pitzer ' + fix(m.pit, 1) + ', PR ' + fix(m.pr, 1) + '. Water at 500 K: ' + fix(w.B, 1) + ' against Pitzer ' + fix(w.pit, 1) + '. Change the density limit to see whether B depends on it.';
}

function runCsp() {
  const keys = ['ch4_tr105', 'co2_tr105', 'c3_tr105', 'h2o_tr105'], prs = [0.5, 1, 2, 3], rows = [];
  for (const key of keys) {
    const k = data.cases[key], f = data.fluids[k.fluid];
    rows.push({ key, name: f.name, omega: f.omega, z: prs.map((pr) => { const r = eos.zAt(k, pr * f.Pc); return { ref: r.Z, pr: eos.zModel('pr', f, k.T, r.P, 'gibbs'), vdw: eos.zModel('vdw', f, k.T, r.P, 'gibbs') }; }) });
  }
  study.csp = rows;
  $('csp-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(r.name), cell(num(r.omega, 4)), ...r.z.map((z) => cell(num(z.ref, 4) + ', ' + num(z.pr, 4)))); return tr; }));
  const vrow = document.createElement('tr'); vrow.append(cell('van der Waals (every fluid)'), cell('—'), ...rows[0].z.map((z) => cell(num(z.vdw, 4)))); $('csp-body').append(vrow);
  $('csp-wrap').hidden = false; $('csp-chart').hidden = false;
  const z2 = rows.slice(0, 3).map((r) => r.z[2].ref), spread = 100 * (Math.max(...z2) - Math.min(...z2)) / Math.min(...z2);
  $('csp-status').textContent = 'At P_r = 2 the three nonpolar fluids give Z = ' + z2.map((z) => num(z, 4)).join(', ') + ' (spread ' + fix(spread) + '%); water gives ' + num(rows[3].z[2].ref, 4) + ' and van der Waals ' + num(rows[0].z[2].vdw, 4) + '.';
  if (!window.Plotly) return;
  const cols = [c.teal, c.amber, c.rust, c.skyblue], traces = [];
  keys.forEach((key, j) => { const k = data.cases[key], f = data.fluids[k.fluid]; traces.push({ x: k.P.map((p) => p / f.Pc), y: k.Z, name: f.name + ' (reference)', mode: 'lines', line: { color: cols[j], width: 2.5 } }); });
  const k0 = data.cases.ch4_tr105, f0 = data.fluids.methane;
  traces.push({ x: k0.P.map((p) => p / f0.Pc), y: k0.P.map((p) => eos.zModel('vdw', f0, k0.T, p, 'gibbs')), name: 'van der Waals (every fluid)', mode: 'lines', line: { color: c.graphite, width: 2, dash: 'dash' } });
  window.Plotly.react('csp-chart', traces, Object.assign(plotLayout('Reduced pressure P_r = P/P_c', 'Compressibility factor Z'), { showlegend: true, legend: { x: 0.55, y: 0.98 } }), { responsive: true, displayModeBar: false }).catch(() => {});
}

function runSat() {
  const rows = [];
  for (const key of ['co2_280', 'c3_300', 'h2o_500']) {
    const k = data.cases[key], f = data.fluids[k.fluid];
    for (const m of ['vdw', 'srk', 'pr']) {
      const ps = eos.eosPsat(m, f, k.T), tr = eos.translation(m, f, k), sp = eos.spinodals(m, f, k.T);
      const a0 = eos.compare(m, f, k, { rule: 'label' }), a1 = eos.compare(m, f, k, { rule: 'label', shift: tr.c });
      const liq = (r) => { const e = r.pts.filter((q) => q.phase === 'l').map((q) => Math.abs(q.err)); return e.reduce((s, x) => s + x, 0) / e.length; };
      rows.push({ key, label: k.label, model: m, sp: sp.map((s) => s.P), psat: ps ? ps.P : null, psatRef: k.sat.P, VL: tr.Veos, VLref: tr.Vref, c: tr.c, liq0: liq(a0), liq1: liq(a1) });
    }
  }
  study.sat = rows;
  $('sat-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(r.label), cell(eos.MODELS[r.model].name), cell(r.sp.map((p) => num(p, 4)).join(' to ')), cell(num(r.psat, 5) + ' / ' + num(r.psatRef, 5) + ' (' + signed(100 * (r.psat - r.psatRef) / r.psatRef) + '%)'), cell(num(r.VL, 4) + ' / ' + num(r.VLref, 4) + ' (' + signed(100 * (r.VL - r.VLref) / r.VLref) + '%)'), cell(num(r.c, 4)), cell(fix(r.liq0) + ' / ' + fix(r.liq1))); return tr; }));
  $('sat-wrap').hidden = false;
  const co2 = rows.find((r) => r.key === 'co2_280' && r.model === 'pr'), w = rows.find((r) => r.key === 'h2o_500' && r.model === 'pr');
  $('sat-status').textContent = 'Peng–Robinson: vapor pressure ' + signed(100 * (co2.psat - co2.psatRef) / co2.psatRef) + '% for CO₂ and ' + signed(100 * (w.psat - w.psatRef) / w.psatRef) + '% for water, but saturated liquid volume ' + signed(100 * (co2.VL - co2.VLref) / co2.VLref) + '% and ' + signed(100 * (w.VL - w.VLref) / w.VLref) + '%. A constant shift c moves every volume by the same amount and leaves the vapor pressure unchanged.';
}

/* ---------- Save, restore ---------- */
function notes() { return Object.fromEntries(Object.entries(NOTE_IDS).map(([k, id]) => [k, $(id).value])); }
function summary(i, res) { const r = res.out[i.model]; return { gas: r.aadGas, dense: r.aadDense, virial: res.out.virial.aadGas }; }
function saveCase() {
  if (!study.res) return;
  const name = $('case-name').value.trim() || 'Case ' + (study.cases.length + 1);
  study.cases.push({ name, inputs: { ...study.inputs }, summary: summary(study.inputs, study.res) }); renderCases();
  $('status').textContent = 'Saved “' + name + '”. Change one setting, calculate, then save the next case.';
}
function renderCases() {
  $('comparison-empty').hidden = study.cases.length > 0; $('comparison-table-wrap').hidden = !study.cases.length;
  $('comparison-body').replaceChildren(...study.cases.map((s) => {
    const tr = document.createElement('tr'), m = s.summary;
    tr.append(cell(s.name), cell(cs(s.inputs.case).label), cell(eos.MODELS[s.inputs.model].name + ', ' + s.inputs.rule + ', ' + (s.inputs.shift === 'sat' ? 'shifted' : 'no shift')), cell(fix(m.gas) + ' / ' + fix(m.dense)), cell(fix(m.virial)));
    const td = document.createElement('td'), b = document.createElement('button');
    b.type = 'button'; b.className = 'secondary-button'; b.textContent = 'Reopen'; b.setAttribute('aria-label', 'Reopen ' + s.name);
    b.addEventListener('click', () => { applyInputs(s.inputs); $('case-name').value = s.name; calculate({ quiet: true }); $('status').textContent = 'Reopened and recalculated “' + s.name + '”.'; $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    td.append(b); tr.append(td); return tr;
  }));
}
function loadCase(id) {
  if (!data.cases[id]) return;
  applyInputs({ case: id, model: $('model').value || 'pr', rule: 'label', shift: 'none', pinspect: defaultInspect(id) });
  $('case-name').value = cs(id).label.replace(/ \(.*\)$/, '');
  for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === id));
  $('status').textContent = cs(id).label + ' loaded. Make a prediction, then press Compare the equations.';
}
function evidenceCheck() {
  const n = notes(), issues = [];
  if (!study.b) issues.push('Fit B for every isotherm (A).');
  if (!study.csp) issues.push('Compare at the same T_r (B).');
  if (!study.sat) issues.push('Compare the phase boundaries (C).');
  for (const [k, label] of [['b', 'Claim 1'], ['csp', 'Claim 2'], ['sat', 'Claim 3'], ['decision', 'the decision']]) if ((n[k] || '').trim().length < 40) issues.push('Write ' + label + ' with numbers.');
  return { complete: !issues.length, issues };
}
function exportStudy() {
  const record = { schema: SCHEMA, engineVersion: eos.EOS_VERSION, dataVersion: data.version, savedAt: new Date().toISOString(),
    inputs: study.inputs || readInputs(), prediction: $('prediction').value, caseName: $('case-name').value, cases: study.cases, view: $('view').value,
    shown: [...document.querySelectorAll('.model-toggles input:checked')].map((x) => x.value), rhoMax: $('rhomax').value,
    notes: notes(), reflection: $('reflection').value, investigations: { b: Boolean(study.b), csp: Boolean(study.csp), sat: Boolean(study.sat) }, aiCode: window.aiCode?.state() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(withStudent(record), null, 2)], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = studentFileName('labP2-eos-study.json'); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Study downloaded. Open it later to restore the cases, settings and notes.';
}
async function openStudy(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 3e6) throw new Error('The file is larger than a Lab P2 study.');
    const rec = JSON.parse(await file.text());
    if (rec.schema !== SCHEMA) throw new Error('This file is not a Lab P2 study.');
    if (!validInputs(rec.inputs)) throw new Error('The saved inputs are invalid.');
    applyInputs(rec.inputs); $('prediction').value = ['low', 'mid', 'high'].includes(rec.prediction) ? rec.prediction : ''; $('case-name').value = typeof rec.caseName === 'string' ? rec.caseName.slice(0, 80) : '';
    $('view').value = rec.view === 'err' ? 'err' : 'Z';
    if (Array.isArray(rec.shown)) for (const x of document.querySelectorAll('.model-toggles input')) x.checked = rec.shown.includes(x.value);
    if (['0.5', '1', '2'].includes(rec.rhoMax)) $('rhomax').value = rec.rhoMax;
    for (const [k, id] of Object.entries(NOTE_IDS)) $(id).value = typeof rec.notes?.[k] === 'string' ? rec.notes[k] : '';
    $('reflection').value = typeof rec.reflection === 'string' ? rec.reflection : '';
    study.cases = (Array.isArray(rec.cases) ? rec.cases : []).slice(0, 60).filter((s) => validInputs(s?.inputs) && typeof s.name === 'string').map((s) => ({ name: s.name.slice(0, 80), inputs: { ...s.inputs }, summary: summary(s.inputs, evaluate(s.inputs)) }));
    renderCases(); calculate({ quiet: true });
    if (rec.investigations?.b) runB();
    if (rec.investigations?.csp) runCsp();
    if (rec.investigations?.sat) runSat();
    $('status').textContent = 'Study reopened. ' + study.cases.length + ' saved cases and the investigations were recalculated from the saved inputs.';
  } catch (error) { $('status').textContent = 'The study could not be opened: ' + error.message; }
  finally { event.target.value = ''; }
}

async function init() {
  try { data = await (await fetch(new URL('../../labs/assets/p2-eos-nist.json', import.meta.url))).json(); }
  catch { $('status').textContent = 'The reference isotherms could not be loaded.'; return; }
  $('case').replaceChildren(...Object.entries(data.cases).map(([k, s]) => new Option(s.label, k)));
  $('case').addEventListener('change', () => { const id = $('case').value; syncShift(); $('pinspect').value = String(defaultInspect(id)); for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === id)); });
  for (const b of document.querySelectorAll('[data-case]')) b.addEventListener('click', () => loadCase(b.dataset.case));
  $('calculate').addEventListener('click', () => calculate());
  $('eos-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('view').addEventListener('change', renderChart);
  for (const x of document.querySelectorAll('.model-toggles input')) x.addEventListener('change', renderChart);
  $('save-case').addEventListener('click', saveCase);
  $('run-b').addEventListener('click', runB); $('run-csp').addEventListener('click', runCsp); $('run-sat').addEventListener('click', runSat);
  $('rhomax').addEventListener('change', () => { if (study.b) runB(); });
  $('check-evidence').addEventListener('click', () => { const r = evidenceCheck(); $('evidence-status').textContent = r.complete ? 'All sections and calculations are present. Scientific reasoning still needs instructor review.' : r.issues.join(' '); });
  $('export-study').addEventListener('click', exportStudy); $('import-study').addEventListener('change', openStudy);
  loadCase('ch4_300');
}
init();
