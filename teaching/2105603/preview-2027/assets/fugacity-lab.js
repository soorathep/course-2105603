/** Lab P4 · 2027 preview page module: fugacity, the vapor pressure of a cubic, ΔH_vap and condensed-phase fugacity. */
import * as fg from './fugacity.js';
import { MODELS as EOS } from './eos.js';
import { palette as c } from '../../labs/assets/palette.js';
import { withStudent, studentFileName } from './student.js';

const SCHEMA = 'skh-thermo-p4-fugacity-study/1';
const $ = (id) => document.getElementById(id);
const num = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { maximumSignificantDigits: d }).replace(/^-/, '−'));
const fix = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-/, '−'));
const signed = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d));
const pct = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? 100 * (a - b) / Math.abs(b) : null);
const CUBICS = ['vdw', 'srk', 'pr'];
const LABEL = { vdw: 'van der Waals', srk: 'Soave–Redlich–Kwong', pr: 'Peng–Robinson' };
const COLOR = { vdw: c.sage, srk: c.rust, pr: c.amber };
const START = { co2: { T: 280, iso: 'co2_280' }, propane: { T: 300, iso: 'c3_300' }, water: { T: 500, iso: 'h2o_500' }, methane: { T: 150, iso: 'co2_280' } };
const NOTE_IDS = { concept1: 'note-concept1', concept2: 'note-concept2', concept3: 'note-concept3', curve: 'note-curve', dh: 'note-dh', liq: 'note-liq', decision: 'note-decision' };
let data = null;
const study = { inputs: null, res: null, cases: [], curve: null, dh: null, liq: null };

function cell(t, html = false) { const td = document.createElement('td'); if (html) td.innerHTML = t; else td.textContent = t; return td; }
function li(h) { const e = document.createElement('li'); e.innerHTML = h; return e; }
const fname = (f) => data.fluids[f].name;
const phaseName = (p) => ({ v: 'vapor', l: 'liquid', s: 'supercritical' }[p]);
function tRange(f) { const s = data.sat[f]; return [Math.ceil(s.T[0] * 10) / 10, Math.floor((data.fluids[f].Tc - 0.5) * 10) / 10]; }

function readInputs() { return { fluid: $('fluid').value, T: Number($('temp').value), iso: $('iso').value, model: $('model').value }; }
function applyInputs(i) { $('fluid').value = i.fluid; $('temp').value = String(i.T); $('iso').value = i.iso; $('model').value = i.model; syncRange(); }
function syncRange() { const [lo, hi] = tRange($('fluid').value); $('temp').min = String(lo); $('temp').max = String(hi); }
function validInputs(i) {
  if (!i || !data.fluids[i.fluid] || !data.isotherms[i.iso] || !CUBICS.includes(i.model)) return false;
  const [lo, hi] = tRange(i.fluid); return i.T >= lo && i.T <= hi;
}
function showError(msg) {
  const box = $('form-error');
  if (!msg) { box.hidden = true; box.replaceChildren(); return; }
  box.replaceChildren(Object.assign(document.createElement('p'), { textContent: msg })); box.hidden = false; box.focus();
}
function evaluate(i) {
  const fl = data.fluids[i.fluid], ref = fg.satRef(data, i.fluid, i.T), eos = {};
  for (const m of CUBICS) eos[m] = fg.satEos(m, fl, i.T);
  return { ref, eos, clap: fg.clapeyron(data, i.fluid, i.T), fug: pickRows(i) };
}
function pickRows(i) {
  const c = data.isotherms[i.iso], ps = c.sat.P, top = c.P[c.P.length - 1];
  const targets = [c.P[0], ps / 2, ps, ps * 1.0000001, (ps + top) / 2, top];
  const out = []; for (const P of targets) { let r = fg.fugacityRow(data, i.iso, P, i.model); if (P > ps && r.phase !== 'l') { const j = c.phase.indexOf('l'); r = fg.fugacityRow(data, i.iso, c.P[j], i.model); r.P = c.P[j]; } out.push(r); }
  // the saturated liquid row shares P with the saturated vapor: force its phase
  const j = c.phase.indexOf('l'); out[3] = liquidAt(i, j);
  return out;
}
function liquidAt(i, j) {
  const c = data.isotherms[i.iso], fl = data.fluids[c.fluid], ps = c.sat.P, T = c.T;
  const row = fg.fugacityRow(data, i.iso, c.P[j], i.model);
  const fRef = Math.exp(c.lnphi[j]) * c.P[j], VL = c.sat.ZL * fg.R * T / (ps * 1e5), poy = Math.exp(VL * (c.P[j] - ps) * 1e5 / (fg.R * T));
  const lnphiSat = c.lnphi[c.phase.indexOf('l')];
  return { ...row, phase: 'l', fRef, phiRef: Math.exp(c.lnphi[j]), fPoy: Math.exp(lnphiSat) * ps * poy, poy };
}

function calculate({ quiet = false } = {}) {
  if (!data) return false;
  const i = readInputs(), [lo, hi] = tRange(i.fluid);
  if (!(i.T >= lo && i.T <= hi)) { showError('Enter a temperature between ' + lo + ' and ' + hi + ' K for ' + fname(i.fluid) + ': the reference table covers that range below T_c.'); return false; }
  showError(''); study.inputs = i; study.res = evaluate(i);
  $('diagram-panel').hidden = false;
  renderSat(); renderFug(); renderPaper(); renderChart();
  for (const id of ['save-case', 'run-curve', 'run-dh', 'run-liq', 'export-study']) $(id).disabled = false;
  const e = study.res.eos[i.model];
  $('graduate-baseline').textContent = 'Current: ' + fname(i.fluid) + ' at ' + num(i.T, 5) + ' K · ' + LABEL[i.model] + ' P^sat ' + num(e?.P, 5) + ' bar against ' + num(study.res.ref.P, 5) + ' bar.';
  if (!quiet) $('status').textContent = 'Calculated. Add the result to the comparison before changing a setting.';
  return true;
}

function renderSat() {
  const i = study.inputs, { ref, eos, clap } = study.res, fl = data.fluids[i.fluid];
  $('result-placeholder').hidden = true; $('results').hidden = false;
  $('result-phase').textContent = fname(i.fluid) + ' · ' + num(i.T, 5) + ' K';
  $('phase-interpretation').textContent = 'T_r = ' + num(i.T / fl.Tc, 3) + '. Reference vapor pressure ' + num(ref.P, 5) + ' bar. The Clapeyron equation with the reference ΔV gives ΔH_vap = ' + num(clap.clap, 5) + ' J/mol; the tabulated H^V − H^L is ' + num(clap.ref, 5) + ' J/mol.';
  $('sat-title').textContent = 'Saturation of ' + fname(i.fluid).toLowerCase() + ' at ' + num(i.T, 5) + ' K';
  const rows = [['NIST reference', { P: ref.P, VL: ref.VL, VV: ref.VV, phi: null, dH: ref.dH }, true], ...CUBICS.map((m) => [LABEL[m], eos[m], false])];
  $('sat-body').replaceChildren(...rows.map(([name, r, isRef]) => {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = name;
    if (!r) { tr.append(th, cell('no two-phase region'), cell('—'), cell('—'), cell('—'), cell('—')); return tr; }
    const e = (k, d) => num(r[k], d) + (isRef ? '' : ' (' + signed(pct(r[k], ref[k])) + '%)');
    tr.append(th, cell(e('P', 5)), cell(e('VL', 4)), cell(e('VV', 4)), cell(isRef ? '—' : num(r.phi, 4)), cell(e('dH', 5))); return tr;
  }));
  const pred = $('prediction').value;
  if (pred && i.iso === 'co2_280') { const r = study.res.fug, sat = r[3], top = r[5], e = 100 * (top.fRef / sat.fRef - 1), act = e < 10 ? 'low' : e <= 30 ? 'mid' : 'high';
    $('prediction-feedback').textContent = pred === act ? 'Your prediction matches: f rises by ' + fix(e) + '% from the vapor pressure to 200 bar.' : 'f rises by ' + fix(e) + '% from the vapor pressure to 200 bar. Question C in Step 4 explains why.'; }
  else $('prediction-feedback').textContent = pred ? 'Choose the CO₂ isotherm at 280 K to check your prediction.' : '';
}

function renderFug() {
  const i = study.inputs, c = data.isotherms[i.iso];
  $('fug-title').textContent = 'Fugacity along the isotherm: ' + c.label + ' · ' + LABEL[i.model];
  $('fug-body').replaceChildren(...study.res.fug.map((r) => { const tr = document.createElement('tr');
    tr.append(cell(num(r.P, 5)), cell(phaseName(r.phase)), cell(num(r.fRef, 5)), cell(num(r.phiRef, 4)), cell(num(r.fEos, 5) + ' (' + signed(pct(r.fEos, r.fRef), 2) + '%)'), cell(r.fPoy == null ? '—' : num(r.fPoy, 5) + ' (' + signed(pct(r.fPoy, r.fRef), 2) + '%)'), cell(r.poy == null ? '—' : num(r.poy, 5))); return tr; }));
}

function renderPaper() {
  const i = study.inputs, e = study.res.eos[i.model], R = fg.R;
  if (!e) { $('calc-steps').replaceChildren(li('This cubic has no two-phase region at this temperature.')); return; }
  $('calc-steps').replaceChildren(
    li('Spinodal pressures of ' + EOS[i.model].name + ' at ' + num(i.T, 5) + ' K: ' + e.spinodal.map((s) => num(s.P, 5)).join(' and ') + ' bar. P<sup>sat</sup> lies between them.'),
    li('At P = ' + num(e.P, 7) + ' bar: liquid root Z<sup>L</sup> = ' + num(e.ZL, 6) + ', vapor root Z<sup>V</sup> = ' + num(e.ZV, 6) + '.'),
    li('ln φ<sup>L</sup> = Z − 1 − ln(Z − β) − qI = ' + num(e.lnphiL, 7) + '; ln φ<sup>V</sup> = ' + num(e.lnphiV, 7) + '. Equal: this is the vapor pressure.'),
    li('f<sup>sat</sup> = φ<sup>sat</sup>P<sup>sat</sup> = ' + num(e.phi, 5) + ' × ' + num(e.P, 5) + ' = ' + num(e.phi * e.P, 5) + ' bar in both phases.'),
    li('V<sup>L</sup> = Z<sup>L</sup>RT/P = ' + num(e.VL, 5) + ' and V<sup>V</sup> = ' + num(e.VV, 5) + ' cm³/mol; ΔH<sub>vap</sub> = H<sup>R</sup>(V) − H<sup>R</sup>(L) = ' + num(e.dH, 5) + ' J/mol (reference ' + num(study.res.ref.dH, 5) + ').'),
    li('Clapeyron check with the equation\'s own values: dP<sup>sat</sup>/dT = ΔH<sub>vap</sub>/(TΔV) = ' + num(e.dH / (i.T * (e.VV - e.VL) * 1e-6) / 1e5, 5) + ' bar/K.'),
  );
}

async function renderChart() {
  if (!study.res) return;
  if (!window.Plotly) { setTimeout(renderChart, 200); return; }
  const i = study.inputs, view = $('view').value, traces = [];
  let layoutX, layoutY;
  if (view === 'f') {
    const iso = data.isotherms[i.iso], step = Math.max(1, Math.floor(iso.P.length / 90)), idx = iso.P.map((_, j) => j).filter((j) => j % step === 0 || iso.phase[j] !== iso.phase[j - 1]);
    traces.push({ x: idx.map((j) => iso.P[j]), y: idx.map((j) => Math.exp(iso.lnphi[j]) * iso.P[j]), name: 'Reference (NIST)', mode: 'markers', marker: { color: c.teal, size: 5 } });
    for (const m of CUBICS) for (const ph of ['v', 'l']) {
      const js = idx.filter((j) => iso.phase[j] === ph); if (!js.length) continue;
      traces.push({ x: js.map((j) => iso.P[j]), y: js.map((j) => fg.fugacityRow(data, i.iso, iso.P[j], m).fEos), name: LABEL[m], mode: 'lines', line: { color: COLOR[m], width: m === i.model ? 3 : 2 } });
    }
    const lj = idx.filter((j) => iso.phase[j] === 'l');
    traces.push({ x: lj.map((j) => iso.P[j]), y: lj.map((j) => liquidAt(i, j).fPoy), name: 'Poynting from saturation', mode: 'lines', line: { color: c.graphite, width: 1.6, dash: 'dash' } });
    traces.push({ x: [0, iso.P[iso.P.length - 1]], y: [0, iso.P[iso.P.length - 1]], name: 'Ideal gas f = P', mode: 'lines', line: { color: c.mist, width: 1.2, dash: 'dot' } });
    layoutX = 'Pressure P / bar'; layoutY = 'Fugacity f / bar';
    $('chart-note').textContent = data.isotherms[i.iso].label + '. f is continuous at the vapor pressure and its slope drops from V^V/RT to V^L/RT. In the liquid the Poynting curve starts from the reference saturated liquid.';
  } else {
    const f = i.fluid, s = data.sat[f], fl = data.fluids[f];
    traces.push({ x: s.T.map((t) => 1000 / t), y: s.P.map((p) => Math.log(p)), name: 'Reference (NIST)', mode: 'markers', marker: { color: c.teal, size: 4 } });
    for (const m of CUBICS) { const Ts = s.T.filter((t, k) => k % 6 === 0 && t < fl.Tc - 0.5); const pts = Ts.map((t) => [t, fg.satEos(m, fl, t)]).filter((q) => q[1]); traces.push({ x: pts.map((q) => 1000 / q[0]), y: pts.map((q) => Math.log(q[1].P)), name: LABEL[m], mode: 'lines', line: { color: COLOR[m], width: m === i.model ? 3 : 2 } }); }
    layoutX = '1000/T / K⁻¹'; layoutY = 'ln(P^sat / bar)';
    $('chart-note').textContent = fname(f) + ': ln P^sat is nearly linear in 1/T. By the Clapeyron equation its slope is −ΔH_vap/(R ΔZ), with ΔZ = Z^V − Z^L. Van der Waals has the wrong slope because its a does not depend on T.';
  }
  const layout = { margin: { l: 70, r: 16, t: 16, b: 56 }, font: { family: 'Source Sans 3, sans-serif', size: 13, color: c.ink }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', showlegend: false, hovermode: 'closest',
    xaxis: { title: { text: layoutX }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist }, yaxis: { title: { text: layoutY }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist } };
  if (view === 'f') { const c0 = data.isotherms[i.iso]; layout.yaxis.range = [0, Math.max(...c0.P.map((P, j) => Math.exp(c0.lnphi[j]) * P)) * 1.35]; }
  try { await window.Plotly.react('fug-chart', traces, layout, { responsive: true, displayModeBar: false }); } catch { /* numbers are in Step 2 */ }
  const seen = new Set(); $('chart-legend').replaceChildren(...traces.filter((t) => (seen.has(t.name) ? false : seen.add(t.name))).map((t) => { const sp = document.createElement('span'), e = document.createElement('i'); e.style.borderColor = t.marker?.color || t.line.color; if (t.mode === 'markers') e.className = 'legend-dot'; else e.style.borderTopStyle = t.line.dash ? 'dashed' : 'solid'; sp.append(e, document.createTextNode(t.name)); return sp; }));
}

/* ---------- Graduate investigations ---------- */
function runCurve() {
  const rows = [];
  for (const f of ['methane', 'co2', 'propane', 'water']) { const fl = data.fluids[f], s = data.sat[f];
    for (const tr of [0.6, 0.7, 0.8, 0.9, 0.95, 0.99]) { const T = tr * fl.Tc; if (T < s.T[0]) { rows.push({ f, tr, T, below: true }); continue; }
      const ref = fg.satRef(data, f, T).P, e = {}; for (const m of CUBICS) { const q = fg.satEos(m, fl, T); e[m] = q ? pct(q.P, ref) : null; } rows.push({ f, tr, T, ref, e }); } }
  study.curve = rows;
  $('curve-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(fname(r.f)), cell(num(r.tr, 2)), cell(num(r.T, 5)));
    if (r.below) tr.append(cell('below the table (triple point or table start)'), cell('—'), cell('—'), cell('—')); else tr.append(cell(num(r.ref, 5)), ...CUBICS.map((m) => cell(signed(r.e[m])))); return tr; }));
  $('curve-wrap').hidden = false;
  const ok = rows.filter((r) => !r.below), mx = (m) => Math.max(...ok.map((r) => Math.abs(r.e[m])));
  const at07 = ok.filter((r) => r.tr === 0.7).map((r) => fname(r.f) + ' ' + signed(r.e.srk, 2) + '%').join(', ');
  $('curve-status').textContent = 'Largest |error|: van der Waals ' + fix(mx('vdw'), 0) + '%, SRK ' + fix(mx('srk')) + '%, PR ' + fix(mx('pr')) + '%. SRK at T_r = 0.7: ' + at07 + '.';
}
function runDh() {
  const rows = [];
  for (const f of ['co2', 'propane', 'water']) { const fl = data.fluids[f], s = data.sat[f];
    for (const tr of [0.6, 0.75, 0.85, 0.95]) { const T0 = tr * fl.Tc; if (T0 < s.T[0]) continue;
      // use the nearest table row: the saturation table is coarse at low T, and a row avoids interpolating H and V
      const T = s.T.reduce((b, t) => (Math.abs(t - T0) < Math.abs(b - T0) ? t : b)); const k = fg.clapeyron(data, f, T), e = fg.satEos('pr', fl, T); rows.push({ f, T, ref: k.ref, clap: pct(k.clap, k.ref), cc: pct(k.cc, k.ref), pr: e ? pct(e.dH, k.ref) : null }); } }
  study.dh = rows;
  $('dh-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(fname(r.f)), cell(num(r.T, 5)), cell(num(r.ref, 5)), cell(signed(r.clap, 2)), cell(signed(r.cc)), cell(signed(r.pr))); return tr; }));
  $('dh-wrap').hidden = false;
  const w = rows.filter((r) => r.f === 'propane');
  $('dh-status').textContent = 'Propane: Clausius–Clapeyron ' + w.map((r) => signed(r.cc) + '% at ' + num(r.T, 4) + ' K').join(', ') + '. Clapeyron with the reference ΔV stays within ' + fix(Math.max(...rows.map((r) => Math.abs(r.clap))), 2) + '%.';
}
function runLiq() {
  const rows = [];
  for (const k of ['co2_280', 'c3_300', 'h2o_500']) { const c = data.isotherms[k];
    for (const P of [100, 200]) { let j = -1; for (let q = 0; q < c.P.length; q++) if (c.phase[q] === 'l' && (j < 0 || Math.abs(c.P[q] - P) < Math.abs(c.P[j] - P))) j = q; if (Math.abs(c.P[j] - P) > 1) continue;
      const r = liquidAt({ iso: k, model: 'pr' }, j); rows.push({ k, label: c.label.replace(/ \(.*\)$/, ''), cond: 'liquid at ' + num(c.P[j], 4) + ' bar, Poynting factor ' + num(r.poy, 4), ref: r.fRef, approx: r.fPoy, unit: ' bar' }); } }
  for (const T of [268.15, 263.15, 253.15, 243.15]) { const iw = fg.iceWater(T), est = fg.solidRatio(T, 6010, 273.15); rows.push({ k: 'ice', label: 'Ice / supercooled water', cond: num(T, 5) + ' K, f_s/f_l', ref: iw.ratio, approx: est, unit: '' }); }
  study.liq = rows;
  $('liq-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(r.label), cell(r.cond), cell(num(r.ref, 5) + r.unit), cell(num(r.approx, 5) + r.unit), cell(signed(pct(r.approx, r.ref), 2))); return tr; }));
  $('liq-wrap').hidden = false;
  const co2 = rows.find((r) => r.k === 'co2_280' && r.cond.includes('200')), ice = rows.find((r) => r.cond.startsWith('263'));
  $('liq-status').textContent = 'Constant-V^L Poynting for CO₂ at 200 bar: ' + signed(pct(co2.approx, co2.ref), 2) + '%. Ice/liquid ratio at 263.15 K: ' + num(ice.ref, 4) + ' measured, ' + num(ice.approx, 4) + ' from ΔH_fus.';
}

/* ---------- Save, restore ---------- */
function notes() { return Object.fromEntries(Object.entries(NOTE_IDS).map(([k, id]) => [k, $(id).value])); }
function summary(i, res) { const e = res.eos[i.model]; return { P: e?.P ?? null, Pref: res.ref.P, dH: e?.dH ?? null, dHref: res.ref.dH }; }
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
    tr.append(cell(s.name), cell(fname(s.inputs.fluid) + ', ' + num(s.inputs.T, 5) + ' K'), cell(LABEL[s.inputs.model]), cell(num(m.P, 5) + ' / ' + num(m.Pref, 5)), cell(num(m.dH, 5) + ' / ' + num(m.dHref, 5)));
    const td = document.createElement('td'), b = document.createElement('button');
    b.type = 'button'; b.className = 'secondary-button'; b.textContent = 'Reopen'; b.setAttribute('aria-label', 'Reopen ' + s.name);
    b.addEventListener('click', () => { applyInputs(s.inputs); $('case-name').value = s.name; calculate({ quiet: true }); $('status').textContent = 'Reopened and recalculated “' + s.name + '”.'; $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    td.append(b); tr.append(td); return tr;
  }));
}
function loadCase(f) {
  const s = START[f]; if (!s) return;
  applyInputs({ fluid: f, T: s.T, iso: s.iso, model: $('model').value || 'pr' });
  $('case-name').value = fname(f).replace('Carbon dioxide', 'CO₂') + ' · ' + s.T + ' K';
  for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === f));
  $('status').textContent = fname(f) + ' at ' + s.T + ' K loaded. Make a prediction, then press the button.';
}
function evidenceCheck() {
  const n = notes(), issues = [];
  if (!study.curve) issues.push('Test the vapor-pressure curves (A).');
  if (!study.dh) issues.push('Compare the routes to ΔH_vap (B).');
  if (!study.liq) issues.push('Test the condensed-phase forms (C).');
  for (const [k, label] of [['curve', 'Claim 1'], ['dh', 'Claim 2'], ['liq', 'Claim 3'], ['decision', 'the decision']]) if ((n[k] || '').trim().length < 40) issues.push('Write ' + label + ' with numbers.');
  return { complete: !issues.length, issues };
}
function exportStudy() {
  const record = { schema: SCHEMA, engineVersion: fg.FUG_VERSION, dataVersion: data.version, savedAt: new Date().toISOString(),
    inputs: study.inputs || readInputs(), prediction: $('prediction').value, caseName: $('case-name').value, cases: study.cases, view: $('view').value,
    notes: notes(), reflection: $('reflection').value, investigations: { curve: Boolean(study.curve), dh: Boolean(study.dh), liq: Boolean(study.liq) }, aiCode: window.aiCode?.state() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(withStudent(record), null, 2)], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = studentFileName('labP4-fugacity-study.json'); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Study downloaded. Open it later to restore the cases, settings and notes.';
}
async function openStudy(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 3e6) throw new Error('The file is larger than a Lab P4 study.');
    const rec = JSON.parse(await file.text());
    if (rec.schema !== SCHEMA) throw new Error('This file is not a Lab P4 study.');
    if (!validInputs(rec.inputs)) throw new Error('The saved inputs are invalid.');
    applyInputs(rec.inputs); $('prediction').value = ['low', 'mid', 'high'].includes(rec.prediction) ? rec.prediction : ''; $('case-name').value = typeof rec.caseName === 'string' ? rec.caseName.slice(0, 80) : '';
    $('view').value = rec.view === 'psat' ? 'psat' : 'f';
    for (const [k, id] of Object.entries(NOTE_IDS)) $(id).value = typeof rec.notes?.[k] === 'string' ? rec.notes[k] : '';
    $('reflection').value = typeof rec.reflection === 'string' ? rec.reflection : '';
    study.cases = (Array.isArray(rec.cases) ? rec.cases : []).slice(0, 60).filter((s) => validInputs(s?.inputs) && typeof s.name === 'string').map((s) => ({ name: s.name.slice(0, 80), inputs: { ...s.inputs }, summary: summary(s.inputs, evaluate(s.inputs)) }));
    renderCases(); calculate({ quiet: true });
    if (rec.investigations?.curve) runCurve();
    if (rec.investigations?.dh) runDh();
    if (rec.investigations?.liq) runLiq();
    $('status').textContent = 'Study reopened. ' + study.cases.length + ' saved cases and the investigations were recalculated from the saved inputs.';
  } catch (error) { $('status').textContent = 'The study could not be opened: ' + error.message; }
  finally { event.target.value = ''; }
}
async function init() {
  try { data = await (await fetch(new URL('../../labs/assets/p4-fugacity-nist.json', import.meta.url))).json(); }
  catch { $('status').textContent = 'The reference tables could not be loaded.'; return; }
  $('iso').replaceChildren(...Object.entries(data.isotherms).map(([k, s]) => new Option(s.label, k)));
  $('fluid').addEventListener('change', syncRange);
  for (const b of document.querySelectorAll('[data-case]')) b.addEventListener('click', () => loadCase(b.dataset.case));
  $('calculate').addEventListener('click', () => calculate());
  $('fug-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('view').addEventListener('change', renderChart);
  $('save-case').addEventListener('click', saveCase);
  $('run-curve').addEventListener('click', runCurve); $('run-dh').addEventListener('click', runDh); $('run-liq').addEventListener('click', runLiq);
  $('check-evidence').addEventListener('click', () => { const r = evidenceCheck(); $('evidence-status').textContent = r.complete ? 'All sections and calculations are present. Scientific reasoning still needs instructor review.' : r.issues.join(' '); });
  $('export-study').addEventListener('click', exportStudy); $('import-study').addEventListener('change', openStudy);
  loadCase('co2');
}
init();
