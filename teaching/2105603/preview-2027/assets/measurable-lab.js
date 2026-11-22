/** Lab P1 · 2027 preview page module: measurable properties from tabulated PVT and Cp. */
import { PROPERTIES_VERSION, R, properties, stepStudy, throttle, inversion, tableSpacing, stateIndex } from './properties.js';
import { palette as c } from '../../labs/assets/palette.js';
import { withStudent, studentFileName } from './student.js';

const SCHEMA = 'skh-thermo-p1-properties-study/1';
const $ = (id) => document.getElementById(id);
const num = (v, d = 5) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { maximumSignificantDigits: d }).replace(/^-/, '−'));
const sci = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : v.toExponential(d - 1).replace('e', ' × 10^').replace(/\^\+?(-?)(\d+)/, (_, s, e) => '<sup>' + (s ? '−' : '') + e + '</sup>').replace(/^-/, '−'));
const signed = (v, d = 2) => (v == null || !Number.isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d));
const pct = (a, b) => (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0 ? null : 100 * (a - b) / Math.abs(b));
const T_ROWS = [1, 2, 5, 10, 20, 50, 100];
const P_ROWS = [1, 2, 5, 10, 25, 50];
const NOTE_IDS = { concept1: 'note-concept1', concept2: 'note-concept2', concept3: 'note-concept3', step: 'note-step', thr: 'note-thr', inv: 'note-inv', decision: 'note-decision' };
const DEFAULT = { state: 'ch4_300_100', stepT: 5, stepP: 5, scheme: 'central' };
let data = null;
const study = { inputs: null, result: null, cases: [], step: null, thr: null, inv: null };

function cell(t, html = false) { const td = document.createElement('td'); if (html) td.innerHTML = t; else td.textContent = t; return td; }
function li(h) { const e = document.createElement('li'); e.innerHTML = h; return e; }
const st = (key) => data.states[key];

function fillSteps(key) {
  const s = st(key), sp = tableSpacing(s), keepT = $('stepT').value, keepP = $('stepP').value;
  $('stepT').replaceChildren(...T_ROWS.map((k) => new Option(num(k * sp.dT, 3) + ' K', String(k))));
  $('stepP').replaceChildren(...P_ROWS.map((k) => new Option(num(k * sp.dP, 3) + ' bar', String(k))));
  if (T_ROWS.includes(Number(keepT))) $('stepT').value = keepT; else $('stepT').value = '5';
  if (P_ROWS.includes(Number(keepP))) $('stepP').value = keepP; else $('stepP').value = '5';
}
function readInputs() { return { state: $('state').value, stepT: Number($('stepT').value), stepP: Number($('stepP').value), scheme: $('scheme').value === 'forward' ? 'forward' : 'central' }; }
function applyInputs(i) { $('state').value = i.state; fillSteps(i.state); $('stepT').value = String(i.stepT); $('stepP').value = String(i.stepP); $('scheme').value = i.scheme; }
function validInputs(i) { return i && data.states[i.state] && T_ROWS.includes(i.stepT) && P_ROWS.includes(i.stepP) && ['central', 'forward'].includes(i.scheme); }

function invalidateGraduate(msg) {
  study.step = null;
  $('step-wrap').hidden = true; $('step-status').textContent = msg || '';
}

function showError(msg) {
  const box = $('form-error');
  if (!msg) { box.hidden = true; box.replaceChildren(); return; }
  box.replaceChildren(Object.assign(document.createElement('p'), { textContent: msg })); box.hidden = false; box.focus();
}

function calculate({ quiet = false } = {}) {
  if (!data) return false;
  const inputs = readInputs();
  let r;
  try { r = properties(st(inputs.state), inputs); } catch (e) { showError(e.message + ' Choose a smaller step.'); return false; }
  showError('');
  if (JSON.stringify(inputs) !== JSON.stringify(study.inputs)) invalidateGraduate('Settings changed. Run the step-size study again for the current state.');
  study.inputs = inputs; study.result = r;
  $('diagram-panel').hidden = false;
  renderResult(); renderPaper(); renderChart();
  for (const id of ['save-case', 'run-step', 'run-thr', 'run-inv', 'export-study']) $(id).disabled = false;
  $('graduate-baseline').textContent = 'Current state: ' + st(inputs.state).label + ' · δT = ' + num(r.step.dT, 3) + ' K, δP = ' + num(r.step.dP, 3) + ' bar, ' + inputs.scheme + ' differences · μJT = ' + num(r.mu, 4) + ' K/bar (reference ' + num(r.ref.mu, 4) + ').';
  if (!quiet) $('status').textContent = 'Calculated. Add the result to the comparison before changing a setting.';
  return true;
}

function renderResult() {
  const r = study.result, s = st(study.inputs.state);
  $('result-placeholder').hidden = true; $('results').hidden = false;
  $('result-phase').textContent = s.label + ' · Z = ' + num(r.Z, 4);
  const e = pct(r.mu, r.ref.mu), ec = pct(r.cpcv, r.ref.cpcv);
  $('phase-interpretation').textContent = 'Your differences reproduce μJT to ' + (e == null ? '—' : signed(e, 2) + '%') + ' and Cp − Cv to ' + (ec == null ? '—' : signed(ec, 2) + '%') + ' of the reference. ' +
    (r.Z > 0.98 && r.Z < 1.02 ? 'Z is close to 1, but μJT is not zero: an ideal-gas Z does not make every property ideal.' : r.Z < 0.1 ? 'This is a liquid: the ideal-gas column does not apply.' : 'Z is far from 1: the ideal-gas column fails for most properties.');
  const p = $('prediction').value, ratio = r.cpcv / R, actual = ratio < 1 ? 'low' : ratio <= 1.1 ? 'near' : 'high';
  $('prediction-feedback').textContent = p ? (p === actual ? 'Your prediction matches: Cp − Cv = ' + num(ratio, 3) + ' R.' : 'Cp − Cv = ' + num(ratio, 3) + ' R here. Question A in Step 4 explains why.') : '';
  const liquid = r.Z < 0.1;
  const rows = [
    ['α / K⁻¹', sci(r.alpha), '—', liquid ? '—' : sci(r.ideal.alpha)],
    ['κ<sub>T</sub> / bar⁻¹', sci(r.kappa), '—', liquid ? '—' : sci(r.ideal.kappa)],
    ['C<sub>p</sub> − C<sub>v</sub> / (J/(mol K))', num(r.cpcv, 5), num(r.ref.cpcv, 5), liquid ? '—' : num(R, 5)],
    ['μ<sub>JT</sub> / (K/bar)', num(r.mu, 5), num(r.ref.mu, 5), liquid ? '—' : '0'],
    ['(∂U/∂V)<sub>T</sub> = Tα/κ<sub>T</sub> − P / bar', num(r.piT, 5), '—', liquid ? '—' : '0'],
    ['(∂H/∂P)<sub>T</sub> = V − T(∂V/∂T)<sub>P</sub> / (J/(mol bar))', num(r.dHdP, 5), num(-r.ref.mu * r.Cp, 5), liquid ? '—' : '0'],
  ];
  $('prop-body').replaceChildren(...rows.map(([label, a, b, d]) => { const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.innerHTML = label; tr.append(th, cell(a, true), cell(b), cell(d, true)); return tr; }));
  $('result-maxwell').textContent = num(r.maxwell.dSdP, 6) + ' against ' + num(r.maxwell.minusdVdT, 6) + ' (' + signed(pct(r.maxwell.dSdP, r.maxwell.minusdVdT), 2) + '%)';
}

function renderPaper() {
  const r = study.result, s = st(study.inputs.state), ib = s.isobar, it = s.isotherm, { i, j } = stateIndex(s), k = study.inputs.stepT, m = study.inputs.stepP;
  const fwd = study.inputs.scheme === 'forward';
  const iT0 = fwd ? i : i - k, iP0 = fwd ? j : j - m;
  $('calc-steps').replaceChildren(
    li('Isobar at ' + num(s.P, 4) + ' bar: V(' + num(ib.T[iT0], 5) + ' K) = ' + num(ib.V[iT0], 8) + ', V(' + num(ib.T[i + k], 5) + ' K) = ' + num(ib.V[i + k], 8) + ' L/mol, so (∂V/∂T)<sub>P</sub> ≈ ' + sci(r.alpha * r.V, 5) + ' L/(mol K) and α = (1/V)(∂V/∂T)<sub>P</sub> = ' + sci(r.alpha) + ' K⁻¹ with V = ' + num(r.V, 7) + ' L/mol.'),
    li('Isotherm at ' + num(s.T, 5) + ' K: V(' + num(it.P[iP0], 5) + ' bar) = ' + num(it.V[iP0], 8) + ', V(' + num(it.P[j + m], 5) + ' bar) = ' + num(it.V[j + m], 8) + ' L/mol, so κ<sub>T</sub> = −(1/V)(∂V/∂P)<sub>T</sub> = ' + sci(r.kappa) + ' bar⁻¹.'),
    li('C<sub>p</sub> − C<sub>v</sub> = TVα²/κ<sub>T</sub> × 100 J/(L bar) = ' + num(r.T, 5) + ' × ' + num(r.V, 6) + ' × (' + sci(r.alpha) + ')²/' + sci(r.kappa) + ' × 100 = ' + num(r.cpcv, 5) + ' J/(mol K).'),
    li('μ<sub>JT</sub> = [T(∂V/∂T)<sub>P</sub> − V]/C<sub>p</sub> × 100 = (' + num(r.T * r.alpha * r.V, 6) + ' − ' + num(r.V, 6) + ') × 100/' + num(r.Cp, 5) + ' = ' + num(r.mu, 5) + ' K/bar.'),
    li('Internal pressure (∂U/∂V)<sub>T</sub> = Tα/κ<sub>T</sub> − P = ' + num(r.T * r.alpha / r.kappa, 6) + ' − ' + num(r.P, 4) + ' = ' + num(r.piT, 5) + ' bar.'),
  );
}

async function renderChart() {
  if (!study.result) return;
  if (!window.Plotly) { setTimeout(renderChart, 200); return; }
  const s = st(study.inputs.state), ib = s.isobar, r = study.result, view = $('view').value, { i } = stateIndex(s);
  let traces, yTitle;
  if (view === 'mu') {
    traces = [{ x: ib.T, y: ib.JT, name: 'Tabulated μJT', mode: 'lines', line: { color: c.teal, width: 2.5 } },
      { x: [r.T], y: [r.mu], name: 'Your μJT at the state', mode: 'markers', marker: { color: c.amber, size: 11 }, line: { color: c.amber } },
      { x: [ib.T[0], ib.T[ib.T.length - 1]], y: [0, 0], name: 'Ideal gas · μJT = 0', mode: 'lines', line: { color: c.graphite, width: 1.5, dash: 'dash' } }];
    yTitle = 'μJT / (K/bar)';
  } else {
    traces = [{ x: ib.T, y: ib.V, name: 'Tabulated V on the isobar', mode: 'lines', line: { color: c.teal, width: 2.5 } }];
    if (r.Z > 0.1) traces.push({ x: ib.T, y: ib.T.map((t) => R * t / (s.P * 100)), name: 'Ideal gas V = RT/P', mode: 'lines', line: { color: c.graphite, width: 1.5, dash: 'dash' } });
    const k = study.inputs.stepT, a = study.inputs.scheme === 'forward' ? i : i - k;
    traces.push({ x: [ib.T[a], ib.T[i + k]], y: [ib.V[a], ib.V[i + k]], name: 'Points used for (∂V/∂T)P', mode: 'markers+lines', marker: { color: c.amber, size: 9 }, line: { color: c.amber, width: 1.5 } });
    yTitle = 'Molar volume V / (L/mol)';
  }
  const layout = { margin: { l: 80, r: 16, t: 16, b: 56 }, font: { family: 'Source Sans 3, sans-serif', size: 13, color: c.ink }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', showlegend: false, hovermode: 'closest',
    xaxis: { title: { text: 'Temperature T / K' }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist }, yaxis: { title: { text: yTitle }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist } };
  try { await window.Plotly.react('mp-chart', traces, layout, { responsive: true, displayModeBar: false }); } catch { /* numbers are in Step 2 */ }
  $('chart-legend').replaceChildren(...traces.map((t) => { const sp = document.createElement('span'), e = document.createElement('i'); e.style.borderColor = t.line.color; if (t.mode === 'markers') e.className = 'legend-dot'; else e.style.borderTopStyle = t.line.dash === 'dash' ? 'dashed' : 'solid'; sp.append(e, document.createTextNode(t.name)); return sp; }));
  $('chart-note').textContent = view === 'mu'
    ? 'μJT changes with T along the isobar. A gas cools on throttling where μJT > 0 and warms where μJT < 0.'
    : (r.Z > 0.1 ? 'The slope of V(T) gives α. The gap to the ideal-gas line is Z − 1 times RT/P.' : 'A liquid volume changes little with T, so α is small and Tα < 1.');
}

function runStep() {
  if (!study.result) return;
  const rows = stepStudy(st(study.inputs.state), T_ROWS, study.inputs.stepP); study.step = true;
  $('step-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(r.scheme), cell(num(r.dT, 3)), cell(r.error ? r.error : num(r.mu, 5)), cell(r.error ? '—' : signed(r.muErr, 2)), cell(r.error ? '—' : num(r.cpcv, 5)), cell(r.error ? '—' : signed(r.cpcvErr, 2))); return tr; }));
  $('step-wrap').hidden = false;
  const ok = rows.filter((r) => r.scheme === 'central' && !r.error && Math.abs(r.muErr) <= 1);
  const largest = ok.length ? Math.max(...ok.map((r) => r.dT)) : null;
  $('step-status').textContent = 'Reference: μJT = ' + num(study.result.ref.mu, 5) + ' K/bar, Cp − Cv = ' + num(study.result.ref.cpcv, 5) + ' J/(mol K). ' + (largest ? 'The largest central step within 1% in μJT here is δT = ' + num(largest, 3) + ' K.' : 'No central step reaches 1% in μJT here.');
}

function runThr() {
  const rows = ['methane', 'n2'].map((k) => { const g = data.throttle[k]; return { label: g.label, a: throttle(g), b: throttle(g, 1) }; });
  study.thr = rows.map((r) => ({ label: r.label, T2: r.a.T2, constant: r.a.constant, one: r.b.integrated, all: r.a.integrated }));
  $('thr-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(r.label), cell(num(r.a.ideal, 5)), cell(num(r.a.constant, 5) + ' (' + signed(r.a.constant - r.a.T2, 1) + ')'), cell(num(r.b.integrated, 5) + ' (' + signed(r.b.integrated - r.a.T2, 1) + ')'), cell(num(r.a.integrated, 5) + ' (' + r.a.steps + ' steps)'), cell(num(r.a.T2, 5))); return tr; }));
  $('thr-wrap').hidden = false;
  const m = rows[0].a;
  $('thr-status').textContent = 'Methane: inlet μJT = ' + num(m.mu1, 4) + ' K/bar. The enthalpy balance gives ' + num(m.T2, 5) + ' K, a drop of ' + num(300 - m.T2, 3) + ' K; the ideal gas predicts no change. Brackets give the error against the enthalpy balance.';
}

function runInv() {
  const inv = inversion(data.inversion, data.fluids.n2); study.inv = inv.rows.map((r) => ({ P: r.P, T: r.T, vdw: r.vdw }));
  const f = (a) => (a.length ? a.map((x) => num(x, 4)).join(', ') : 'none');
  $('inv-body').replaceChildren(...inv.rows.map((r) => { const up = r.T.length ? Math.max(...r.T) : null, vu = r.vdw.length ? Math.max(...r.vdw) : null; const tr = document.createElement('tr'); tr.append(cell(num(r.P, 4)), cell(f(r.T)), cell(f(r.vdw)), cell(up && vu ? signed(pct(vu, up), 1) : '—')); return tr; }));
  $('inv-wrap').hidden = false;
  const withInv = inv.rows.filter((r) => r.T.length), maxP = withInv.length ? Math.max(...withInv.map((r) => r.P)) : null;
  $('inv-status').textContent = 'Van der Waals predicts an inversion temperature of ' + num(inv.vdwLowP, 4) + ' K at low pressure (6.75 Tc) and no inversion above ' + num(inv.vdwMaxP, 4) + ' bar (9 Pc). The NIST tables show inversion up to about ' + (maxP ? num(maxP, 3) : '—') + ' bar, the highest isobar with a sign change in the table. The NIST lower-branch points at high pressure lie in the compressed liquid.';
}

function notes() { return Object.fromEntries(Object.entries(NOTE_IDS).map(([k, id]) => [k, $(id).value])); }
function summary(r) { return { cpcv: r.cpcv, cpcvRef: r.ref.cpcv, mu: r.mu, muRef: r.ref.mu, dT: r.step.dT, dP: r.step.dP }; }

function saveCase() {
  if (!study.result) return;
  const name = $('case-name').value.trim() || 'Case ' + (study.cases.length + 1);
  study.cases.push({ name, inputs: { ...study.inputs }, summary: summary(study.result) }); renderCases();
  $('status').textContent = 'Saved “' + name + '”. Change one setting, calculate, then save the next case.';
}

function renderCases() {
  $('comparison-empty').hidden = study.cases.length > 0; $('comparison-table-wrap').hidden = !study.cases.length;
  $('comparison-body').replaceChildren(...study.cases.map((s) => {
    const tr = document.createElement('tr'), m = s.summary;
    tr.append(cell(s.name), cell(st(s.inputs.state).label), cell(num(m.dT, 3) + ' K, ' + num(m.dP, 3) + ' bar, ' + s.inputs.scheme), cell(num(m.cpcv, 5) + ' / ' + num(m.cpcvRef, 5)), cell(num(m.mu, 5) + ' / ' + num(m.muRef, 5)));
    const td = document.createElement('td'), b = document.createElement('button');
    b.type = 'button'; b.className = 'secondary-button'; b.textContent = 'Reopen'; b.setAttribute('aria-label', 'Reopen ' + s.name);
    b.addEventListener('click', () => { applyInputs(s.inputs); $('case-name').value = s.name; calculate({ quiet: true }); $('status').textContent = 'Reopened and recalculated “' + s.name + '”.'; $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    td.append(b); tr.append(td); return tr;
  }));
}

function loadCase(id) {
  if (!data.states[id]) return;
  applyInputs({ ...DEFAULT, state: id }); $('case-name').value = data.states[id].label.replace(/ \(.*\)$/, '');
  for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === id));
  $('status').textContent = data.states[id].label + ' loaded. Make a prediction, then press Calculate the properties.';
}

function evidenceCheck() {
  const n = notes(), issues = [];
  if (!study.step) issues.push('Run the step-size study (A).');
  if (!study.thr) issues.push('Compare the outlet temperatures (B).');
  if (!study.inv) issues.push('Find the inversion temperatures (C).');
  for (const [k, label] of [['step', 'Claim 1'], ['thr', 'Claim 2'], ['inv', 'Claim 3'], ['decision', 'the decision']]) if ((n[k] || '').trim().length < 40) issues.push('Write ' + label + ' with numbers.');
  return { complete: !issues.length, issues };
}

function exportStudy() {
  const record = { schema: SCHEMA, engineVersion: PROPERTIES_VERSION, dataVersion: data.version, savedAt: new Date().toISOString(),
    inputs: study.inputs || readInputs(), prediction: $('prediction').value, caseName: $('case-name').value, cases: study.cases, view: $('view').value,
    notes: notes(), reflection: $('reflection').value, investigations: { step: Boolean(study.step), thr: Boolean(study.thr), inv: Boolean(study.inv) } };
  const url = URL.createObjectURL(new Blob([JSON.stringify(withStudent(record), null, 2)], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = studentFileName('labP1-properties-study.json'); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Study downloaded. Open it later to restore the cases, settings and notes.';
}

async function openStudy(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 2e6) throw new Error('The file is larger than a Lab P1 study.');
    const rec = JSON.parse(await file.text());
    if (rec.schema !== SCHEMA) throw new Error('This file is not a Lab P1 study.');
    if (!validInputs(rec.inputs)) throw new Error('The saved inputs are invalid.');
    applyInputs(rec.inputs); $('prediction').value = rec.prediction || ''; $('case-name').value = typeof rec.caseName === 'string' ? rec.caseName.slice(0, 80) : '';
    $('view').value = rec.view === 'mu' ? 'mu' : 'V';
    for (const [k, id] of Object.entries(NOTE_IDS)) $(id).value = typeof rec.notes?.[k] === 'string' ? rec.notes[k] : '';
    $('reflection').value = typeof rec.reflection === 'string' ? rec.reflection : '';
    const cases = [];
    for (const s of (Array.isArray(rec.cases) ? rec.cases : []).slice(0, 50)) {
      if (!validInputs(s?.inputs) || typeof s.name !== 'string') continue;
      try { cases.push({ name: s.name.slice(0, 80), inputs: { ...s.inputs }, summary: summary(properties(st(s.inputs.state), s.inputs)) }); } catch { /* skip */ }
    }
    study.cases = cases; study.inputs = null; renderCases(); calculate({ quiet: true });
    if (rec.investigations?.step) runStep();
    if (rec.investigations?.thr) runThr();
    if (rec.investigations?.inv) runInv();
    $('status').textContent = 'Study reopened. ' + study.cases.length + ' saved cases and the investigations were recalculated from the saved inputs.';
  } catch (error) { $('status').textContent = 'The study could not be opened: ' + error.message; }
  finally { event.target.value = ''; }
}

async function init() {
  try {
    data = await (await fetch(new URL('../../labs/assets/p1-properties-nist.json', import.meta.url))).json();
  } catch { $('status').textContent = 'The property tables could not be loaded.'; return; }
  $('state').replaceChildren(...Object.entries(data.states).map(([k, s]) => new Option(s.label, k)));
  $('state').addEventListener('change', () => { fillSteps($('state').value); for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === $('state').value)); });
  for (const b of document.querySelectorAll('[data-case]')) b.addEventListener('click', () => loadCase(b.dataset.case));
  $('calculate').addEventListener('click', () => calculate());
  $('mp-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('view').addEventListener('change', renderChart);
  $('save-case').addEventListener('click', saveCase);
  $('run-step').addEventListener('click', runStep); $('run-thr').addEventListener('click', runThr); $('run-inv').addEventListener('click', runInv);
  $('check-evidence').addEventListener('click', () => { const r = evidenceCheck(); $('evidence-status').textContent = r.complete ? 'All sections and calculations are present. Scientific reasoning still needs instructor review.' : r.issues.join(' '); });
  $('export-study').addEventListener('click', exportStudy); $('import-study').addEventListener('change', openStudy);
  loadCase('ch4_300_100');
}

init();
