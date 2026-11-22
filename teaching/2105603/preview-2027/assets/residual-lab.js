/** Lab P3 · 2027 preview page module: residual properties and process energy balances. */
import * as rs from './residual.js';
import { MODELS as EOS } from './eos.js';
import { palette as c } from '../../labs/assets/palette.js';
import { withStudent, studentFileName } from './student.js';

const SCHEMA = 'skh-thermo-p3-residual-study/1';
const $ = (id) => document.getElementById(id);
const num = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { maximumSignificantDigits: d }).replace(/^-/, '−'));
const fix = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-/, '−'));
const signed = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d));
const pct = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? 100 * (a - b) / Math.abs(b) : null);
const LABEL = { ideal: 'Ideal gas', virial: 'Virial, Pitzer B', vdw: 'van der Waals', rk: 'Redlich–Kwong', srk: 'Soave–Redlich–Kwong', pr: 'Peng–Robinson' };
const COLOR = { ideal: c.graphite, virial: c.plum, vdw: c.sage, rk: c.skyblue, srk: c.rust, pr: c.amber };
const NOTE_IDS = { concept1: 'note-concept1', concept2: 'note-concept2', concept3: 'note-concept3', int: 'note-int', bud: 'note-bud', rank: 'note-rank', decision: 'note-decision' };
const STATES = [['methane', '100'], ['methane', '20'], ['co2', '30'], ['co2', '100'], ['n2', '200']];
let data = null;
const study = { inputs: null, res: null, cases: [], int: null, bud: null, rank: null };

function cell(t, html = false) { const td = document.createElement('td'); if (html) td.innerHTML = t; else td.textContent = t; return td; }
function li(h) { const e = document.createElement('li'); e.innerHTML = h; return e; }
const fname = (f) => data.fluids[f].name;
const phaseName = (p) => ({ v: 'vapor', l: 'liquid', s: 'supercritical' }[p]);

function fillP(keep) {
  const f = $('fluid').value, ps = rs.pressures(data, f);
  $('pres').replaceChildren(...ps.map((p) => new Option(p + ' bar', p)));
  if (ps.includes(keep)) $('pres').value = keep;
}
function readInputs() { return { fluid: $('fluid').value, P: $('pres').value, T: Number($('temp').value), proc: $('proc').value, model: $('model').value, source: $('source').value }; }
function applyInputs(i) { $('fluid').value = i.fluid; fillP(i.P); $('temp').value = String(i.T); $('proc').value = i.proc; $('model').value = i.model; $('source').value = i.source; }
function tRange(f) { const b = data.isobars[f]['0.001'].T; return [b[0], b[b.length - 1]]; }
function validInputs(i) {
  if (!i || !data.fluids[i.fluid] || !rs.pressures(data, i.fluid).includes(i.P) || !rs.PROCESSES[i.proc] || !EOS[i.model] || !['shomate', 'nist'].includes(i.source)) return false;
  const [lo, hi] = tRange(i.fluid); return i.T >= lo && i.T <= hi;
}
function showError(msg) {
  const box = $('form-error');
  if (!msg) { box.hidden = true; box.replaceChildren(); return; }
  box.replaceChildren(Object.assign(document.createElement('p'), { textContent: msg })); box.hidden = false; box.focus();
}

function evaluate(i) {
  const fl = data.fluids[i.fluid], ref = rs.nistResidual(data, i.fluid, i.T, i.P), P = Number(i.P), state = {};
  for (const m of rs.MODELS) state[m] = rs.residual(m, fl, i.T, P, 'label', ref.phase);
  const proc = {}; for (const m of rs.MODELS) proc[m] = rs.process(data, i.proc, m, i.source);
  return { ref, state, proc, procRef: rs.nistProcess(data, i.proc) };
}

function calculate({ quiet = false } = {}) {
  if (!data) return false;
  const i = readInputs(), [lo, hi] = tRange(i.fluid);
  if (!(i.T >= lo && i.T <= hi)) { showError('Enter a temperature between ' + lo + ' and ' + hi + ' K for ' + fname(i.fluid) + '.'); return false; }
  showError(''); study.inputs = i; study.res = evaluate(i);
  $('diagram-panel').hidden = false;
  renderState(); renderProcess(); renderPaper(); renderChart();
  for (const id of ['save-case', 'run-int', 'run-bud', 'run-rank', 'export-study']) $(id).disabled = false;
  const r = study.res.proc.pr, n = study.res.procRef;
  $('graduate-baseline').textContent = 'Current: ' + rs.PROCESSES[i.proc].label + ' · PR outlet ' + fix(r?.T2, 2) + ' K against ' + fix(n.T2, 2) + ' K (' + (i.source === 'nist' ? 'NIST ideal gas' : 'Shomate') + ').';
  if (!quiet) $('status').textContent = 'Calculated. Add the result to the comparison before changing a setting.';
  return true;
}

function renderState() {
  const i = study.inputs, { ref, state } = study.res;
  $('result-placeholder').hidden = true; $('results').hidden = false;
  $('result-phase').textContent = fname(i.fluid) + ' · ' + num(i.T, 5) + ' K, ' + i.P + ' bar';
  $('phase-interpretation').textContent = 'Reference: ' + phaseName(ref.phase) + ', Z = ' + num(ref.Z, 4) + ', H^R = ' + num(ref.HR, 4) + ' J/mol, T S^R = ' + num(i.T * ref.SR, 4) + ' J/mol, G^R = ' + num(ref.GR, 4) + ' J/mol.';
  $('state-title').textContent = 'Residual properties of ' + fname(i.fluid).toLowerCase() + ' at ' + num(i.T, 5) + ' K and ' + i.P + ' bar';
  const row = (name, r, isRef) => { const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = name;
    const e = (k) => (isRef ? num(r[k], 5) : num(r[k], 5) + ' (' + signed(pct(r[k], ref[k])) + '%)');
    tr.append(th, cell(e('Z')), cell(e('HR')), cell(isRef ? num(r.SR, 5) : num(r.SR, 4) + ' (' + signed(pct(r.SR, ref.SR)) + '%)'), cell(e('GR'))); return tr; };
  $('state-body').replaceChildren(row('NIST reference', ref, true), ...rs.MODELS.filter((m) => m !== 'ideal').map((m) => row(LABEL[m], state[m], false)));
}

function renderProcess() {
  const i = study.inputs, { proc, procRef } = study.res, pr = rs.PROCESSES[i.proc];
  $('proc-title').textContent = pr.label;
  const rows = [['NIST reference', procRef, true], ...rs.MODELS.map((m) => [LABEL[m], proc[m], false])];
  $('proc-body').replaceChildren(...rows.map(([name, r, isRef]) => {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = name;
    if (!r) { tr.append(th, cell('no solution'), cell('—'), cell('—'), cell('—'), cell('—')); return tr; }
    tr.append(th, cell(fix(r.T2, 2)), cell(isRef ? '—' : signed(r.T2 - procRef.T2, 2)), cell(pr.kind === 'valve' ? '0 (valve)' : fix(r.W, 0) + (isRef ? '' : ' (' + signed(pct(r.W, procRef.W)) + '%)')), cell(isRef ? '—' : fix(r.dHig, 0)), cell(isRef ? '—' : fix(r.HR1, 0)));
    return tr;
  }));
  const p = proc.pr, ig = proc.ideal, oor = rs.MODELS.some((m) => proc[m]?.outOfRange);
  $('proc-note').textContent = (pr.kind === 'valve' ? 'For a valve ΔH = 0, so ΔH^ig = −(H₂^R − H₁^R): the ideal-gas cooling equals the change of the residual. ' : 'For a reversible adiabatic compressor S₂ = S₁ and the work is ΔH. ')
    + (oor ? 'The outlet lies below 298 K, where the Shomate equation is extrapolated. ' : '') + 'Ideal-gas source: ' + (i.source === 'nist' ? 'NIST 0.001 bar isobar.' : 'Shomate equation.');
  const pred = $('prediction').value;
  if (pred && i.proc === 'comp_co2' && ig && procRef) {
    const e = pct(ig.W, procRef.W), act = e < 5 ? 'low' : e <= 15 ? 'mid' : 'high';
    $('prediction-feedback').textContent = pred === act ? 'Your prediction matches: the ideal gas overestimates the work by ' + fix(e) + '%.' : 'The ideal gas overestimates the work by ' + fix(e) + '%. Question A in Step 4 explains why.';
  } else $('prediction-feedback').textContent = pred ? 'Choose the CO₂ compressor to check your prediction.' : '';
}

function renderPaper() {
  const i = study.inputs, fl = data.fluids[i.fluid], P = Number(i.P), r = rs.cubicResidual(i.model, fl, i.T, P, 'label', study.res.ref.phase), R = rs.R, ref = study.res.ref;
  $('calc-steps').replaceChildren(
    li(EOS[i.model].name + ' at ' + num(i.T, 5) + ' K and ' + i.P + ' bar: T<sub>r</sub> = ' + num(r.p.Tr, 5) + ', α = ' + num(r.p.alpha, 6) + ', d ln α/d ln T<sub>r</sub> = ' + num(r.dlna, 5) + (i.model === 'srk' || i.model === 'pr' ? ' = −m√T<sub>r</sub>/[1 + m(1 − √T<sub>r</sub>)] with m = ' + num(r.p.m, 5) : '') + '.'),
    li('β = bP/RT = ' + num(r.beta, 6) + ', q = a/(bRT) = ' + num(r.q, 6) + '; root used Z = ' + num(r.Z, 6) + (r.roots.length > 1 ? ' (of ' + r.roots.map((z) => num(z, 4)).join(', ') + ')' : '') + '.'),
    li('I = ' + (i.model === 'vdw' ? 'β/Z' : 'ln[(Z + σβ)/(Z + εβ)]/(σ − ε)') + ' = ' + num(r.I, 6) + '.'),
    li('H<sup>R</sup>/RT = Z − 1 + (d ln α/d ln T<sub>r</sub> − 1)qI = ' + num(r.HR / (R * i.T), 6) + ' → H<sup>R</sup> = ' + num(r.HR, 5) + ' J/mol (reference ' + num(ref.HR, 5) + ').'),
    li('S<sup>R</sup>/R = ln(Z − β) + (d ln α/d ln T<sub>r</sub>)qI = ' + num(r.SR / R, 6) + ' → S<sup>R</sup> = ' + num(r.SR, 5) + ' J/(mol K) (reference ' + num(ref.SR, 5) + ').'),
    li('G<sup>R</sup> = H<sup>R</sup> − TS<sup>R</sup> = ' + num(r.GR, 5) + ' J/mol; check: G<sup>R</sup>/RT = Z − 1 − ln(Z − β) − qI = ' + num(r.GR / (R * i.T), 6) + '.'),
  );
}

async function renderChart() {
  if (!study.res) return;
  if (!window.Plotly) { setTimeout(renderChart, 200); return; }
  const f = study.inputs.fluid, fl = data.fluids[f], it = data.isotherms[f]['300'], g = data.isobars[f]['0.001'], view = $('view').value, R = rs.R;
  const H0 = g.H[g.T.indexOf(300)], S0 = g.S[g.T.indexOf(300)];
  const ref = it.P.map((P, j) => { const HR = it.H[j] - H0, SR = it.S[j] - S0 + R * Math.log(P / 0.001); return { HR, SR, GR: HR - 300 * SR }; });
  const step = Math.max(1, Math.floor(it.P.length / 80)), idx = it.P.map((_, j) => j).filter((j) => j % step === 0);
  const traces = [{ x: idx.map((j) => it.P[j]), y: idx.map((j) => ref[j][view]), name: 'Reference (NIST)', mode: 'markers', marker: { color: c.teal, size: 5 } }];
  for (const m of ['virial', 'vdw', 'srk', 'pr']) traces.push({ x: idx.map((j) => it.P[j]), y: idx.map((j) => rs.residual(m, fl, 300, it.P[j], 'label', it.phase[j])[view]), name: LABEL[m], mode: 'lines', line: { color: COLOR[m], width: m === study.inputs.model ? 3 : 2 } });
  const unit = view === 'SR' ? ' / (J/(mol K))' : ' / (J/mol)';
  const layout = { margin: { l: 80, r: 16, t: 16, b: 56 }, font: { family: 'Source Sans 3, sans-serif', size: 13, color: c.ink }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', showlegend: false, hovermode: 'closest',
    xaxis: { title: { text: 'Pressure P / bar' }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist }, yaxis: { title: { text: { HR: 'H^R', SR: 'S^R', GR: 'G^R' }[view] + unit }, zeroline: false, linecolor: c.graphite, gridcolor: c.mist } };
  try { await window.Plotly.react('res-chart', traces, layout, { responsive: true, displayModeBar: false }); } catch { /* numbers are in Step 2 */ }
  $('chart-legend').replaceChildren(...traces.map((t) => { const sp = document.createElement('span'), e = document.createElement('i'); e.style.borderColor = t.marker?.color || t.line.color; if (t.mode === 'markers') e.className = 'legend-dot'; sp.append(e, document.createTextNode(t.name)); return sp; }));
  $('chart-note').textContent = fname(f) + ' at 300 K. ' + (f === 'co2' ? 'The table stops at 60 bar, below the vapor pressure (67 bar), so this curve stays in the vapor. ' : '') + 'All residuals start at zero at P = 0 and grow roughly in proportion to P at low pressure, with slope set by B.';
}

/* ---------- Graduate investigations ---------- */
function runInt() {
  const every = Number($('every').value), rows = [];
  for (const f of ['methane', 'co2', 'n2']) {
    const r = rs.integrate(data, f, every), targets = f === 'co2' ? [10, 30, 60] : [20, 100, 200];
    for (const P of targets) { const q = r.reduce((b, x) => (Math.abs(x.P - P) < Math.abs(b.P - P) ? x : b)); rows.push({ f, ...q }); }
  }
  study.int = { every, rows: rows.map((r) => ({ f: r.f, P: r.P, gRT: r.gRT, hRT: r.hRT, sR: r.sR, ref: r.ref })) };
  $('int-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(fname(r.f)), cell(num(r.P, 4)), cell(num(r.gRT, 5)), cell(num(r.hRT, 5) + ' / ' + num(r.ref.hRT, 5)), cell(num(r.sR, 5) + ' / ' + num(r.ref.sR, 5))); return tr; }));
  $('int-wrap').hidden = false;
  const m = rows.find((r) => r.f === 'methane' && Math.abs(r.P - 100) < 3);
  $('int-status').textContent = 'Methane, 300 K, ' + num(m.P, 4) + ' bar: H^R/RT = ' + num(m.hRT, 5) + ' from Z alone, ' + num(m.ref.hRT, 5) + ' from the tabulated H (' + signed(pct(m.hRT, m.ref.hRT), 3) + '%). Using every ' + every + (every === 1 ? 'st' : 'th') + ' point.';
}
function runBud() {
  const rows = [];
  for (const k of Object.keys(rs.PROCESSES)) {
    const n = rs.nistProcess(data, k);
    for (const m of ['virial', 'srk', 'pr']) { const a = rs.process(data, k, m, 'shomate'), b = rs.process(data, k, m, 'nist'); rows.push({ k, m, eS: a.T2 - n.T2, eN: b.T2 - n.T2, cp: a.T2 - b.T2, eW: rs.PROCESSES[k].kind === 'valve' ? null : pct(a.W, n.W) }); }
  }
  study.bud = rows;
  $('bud-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(rs.PROCESSES[r.k].label), cell(LABEL[r.m]), cell(signed(r.eS, 2)), cell(signed(r.eN, 2)), cell(signed(r.cp, 2)), cell(r.eW == null ? '—' : signed(r.eW))); return tr; }));
  $('bud-wrap').hidden = false;
  const v = rows.find((r) => r.k === 'valve_ch4' && r.m === 'pr'), cc = rows.find((r) => r.k === 'comp_co2' && r.m === 'pr');
  $('bud-status').textContent = 'Methane valve, PR: ' + signed(v.eS, 2) + ' K, of which ' + signed(v.cp, 2) + ' K from Cp^ig. CO₂ compressor, PR: ' + signed(cc.eS, 2) + ' K, of which ' + signed(cc.cp, 2) + ' K from Cp^ig.';
}
function runRank() {
  const rows = [];
  for (const [f, P] of STATES) {
    const ref = rs.nistResidual(data, f, 300, P), fl = data.fluids[f];
    for (const m of ['virial', 'srk', 'pr']) { const r = rs.residual(m, fl, 300, Number(P), 'label', ref.phase); rows.push({ f, P, m, eZ: pct(r.Z, ref.Z), eH: pct(r.HR, ref.HR), eS: pct(r.SR, ref.SR) }); }
  }
  study.rank = rows;
  $('rank-body').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(cell(fname(r.f) + ', 300 K, ' + r.P + ' bar'), cell(LABEL[r.m]), cell(signed(r.eZ)), cell(signed(r.eH)), cell(signed(r.eS))); return tr; }));
  $('rank-wrap').hidden = false;
  const differ = [];
  for (const [f, P] of STATES) {
    const s = rows.filter((r) => r.f === f && r.P === P), best = (k) => s.reduce((b, r) => (Math.abs(r[k]) < Math.abs(b[k]) ? r : b)).m;
    if (best('eZ') !== best('eH')) differ.push(fname(f) + ' at ' + P + ' bar (Z: ' + LABEL[best('eZ')] + '; H^R: ' + LABEL[best('eH')] + ')');
  }
  $('rank-status').textContent = differ.length ? 'The model with the smallest Z error is not the one with the smallest H^R error for ' + differ.join('; ') + '.' : 'The same model is best for Z and H^R at every state.';
}

/* ---------- Save, restore ---------- */
function notes() { return Object.fromEntries(Object.entries(NOTE_IDS).map(([k, id]) => [k, $(id).value])); }
function summary(res) { return { prHR: res.state.pr.HR, refHR: res.ref.HR, prT2: res.proc.pr?.T2 ?? null, refT2: res.procRef.T2 }; }
function saveCase() {
  if (!study.res) return;
  const name = $('case-name').value.trim() || 'Case ' + (study.cases.length + 1);
  study.cases.push({ name, inputs: { ...study.inputs }, summary: summary(study.res) }); renderCases();
  $('status').textContent = 'Saved “' + name + '”. Change one setting, calculate, then save the next case.';
}
function renderCases() {
  $('comparison-empty').hidden = study.cases.length > 0; $('comparison-table-wrap').hidden = !study.cases.length;
  $('comparison-body').replaceChildren(...study.cases.map((s) => {
    const tr = document.createElement('tr'), m = s.summary;
    tr.append(cell(s.name), cell(fname(s.inputs.fluid) + ', ' + num(s.inputs.T, 5) + ' K, ' + s.inputs.P + ' bar'), cell(rs.PROCESSES[s.inputs.proc].label + ', ' + s.inputs.source), cell(fix(m.prHR, 0) + ' / ' + fix(m.refHR, 0)), cell(fix(m.prT2, 2) + ' / ' + fix(m.refT2, 2)));
    const td = document.createElement('td'), b = document.createElement('button');
    b.type = 'button'; b.className = 'secondary-button'; b.textContent = 'Reopen'; b.setAttribute('aria-label', 'Reopen ' + s.name);
    b.addEventListener('click', () => { applyInputs(s.inputs); $('case-name').value = s.name; calculate({ quiet: true }); $('status').textContent = 'Reopened and recalculated “' + s.name + '”.'; $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    td.append(b); tr.append(td); return tr;
  }));
}
function loadCase(id) {
  const pr = rs.PROCESSES[id]; if (!pr) return;
  applyInputs({ fluid: pr.fluid, P: pr.P1, T: pr.T1, proc: id, model: $('model').value || 'pr', source: 'shomate' });
  $('case-name').value = pr.label.split(' · ')[0];
  for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === id));
  $('status').textContent = pr.label + ' loaded. Make a prediction, then press Calculate.';
}
function evidenceCheck() {
  const n = notes(), issues = [];
  if (!study.int) issues.push('Integrate the isotherms (A).');
  if (!study.bud) issues.push('Split the process errors (B).');
  if (!study.rank) issues.push('Rank the models (C).');
  for (const [k, label] of [['int', 'Claim 1'], ['bud', 'Claim 2'], ['rank', 'Claim 3'], ['decision', 'the decision']]) if ((n[k] || '').trim().length < 40) issues.push('Write ' + label + ' with numbers.');
  return { complete: !issues.length, issues };
}
function exportStudy() {
  const record = { schema: SCHEMA, engineVersion: rs.RES_VERSION, dataVersion: data.version, savedAt: new Date().toISOString(),
    inputs: study.inputs || readInputs(), prediction: $('prediction').value, caseName: $('case-name').value, cases: study.cases, view: $('view').value, every: $('every').value,
    notes: notes(), reflection: $('reflection').value, investigations: { int: Boolean(study.int), bud: Boolean(study.bud), rank: Boolean(study.rank) }, aiCode: window.aiCode?.state() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(withStudent(record), null, 2)], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = studentFileName('labP3-residual-study.json'); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Study downloaded. Open it later to restore the cases, settings and notes.';
}
async function openStudy(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 3e6) throw new Error('The file is larger than a Lab P3 study.');
    const rec = JSON.parse(await file.text());
    if (rec.schema !== SCHEMA) throw new Error('This file is not a Lab P3 study.');
    if (!validInputs(rec.inputs)) throw new Error('The saved inputs are invalid.');
    applyInputs(rec.inputs); $('prediction').value = ['low', 'mid', 'high'].includes(rec.prediction) ? rec.prediction : ''; $('case-name').value = typeof rec.caseName === 'string' ? rec.caseName.slice(0, 80) : '';
    $('view').value = ['HR', 'SR', 'GR'].includes(rec.view) ? rec.view : 'HR'; if (['1', '4', '16'].includes(rec.every)) $('every').value = rec.every;
    for (const [k, id] of Object.entries(NOTE_IDS)) $(id).value = typeof rec.notes?.[k] === 'string' ? rec.notes[k] : '';
    $('reflection').value = typeof rec.reflection === 'string' ? rec.reflection : '';
    study.cases = (Array.isArray(rec.cases) ? rec.cases : []).slice(0, 60).filter((s) => validInputs(s?.inputs) && typeof s.name === 'string').map((s) => ({ name: s.name.slice(0, 80), inputs: { ...s.inputs }, summary: summary(evaluate(s.inputs)) }));
    renderCases(); calculate({ quiet: true });
    if (rec.investigations?.int) runInt();
    if (rec.investigations?.bud) runBud();
    if (rec.investigations?.rank) runRank();
    $('status').textContent = 'Study reopened. ' + study.cases.length + ' saved cases and the investigations were recalculated from the saved inputs.';
  } catch (error) { $('status').textContent = 'The study could not be opened: ' + error.message; }
  finally { event.target.value = ''; }
}

async function init() {
  try { data = await (await fetch(new URL('../../labs/assets/p3-residual-nist.json', import.meta.url))).json(); }
  catch { $('status').textContent = 'The reference tables could not be loaded.'; return; }
  $('proc').replaceChildren(...Object.entries(rs.PROCESSES).map(([k, p]) => new Option(p.label, k)));
  $('fluid').addEventListener('change', () => { fillP(); const [lo, hi] = tRange($('fluid').value); $('temp').min = String(lo); $('temp').max = String(hi); });
  for (const b of document.querySelectorAll('[data-case]')) b.addEventListener('click', () => loadCase(b.dataset.case));
  $('calculate').addEventListener('click', () => calculate());
  $('res-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('view').addEventListener('change', renderChart);
  $('save-case').addEventListener('click', saveCase);
  $('run-int').addEventListener('click', runInt); $('run-bud').addEventListener('click', runBud); $('run-rank').addEventListener('click', runRank);
  $('every').addEventListener('change', () => { if (study.int) runInt(); });
  $('check-evidence').addEventListener('click', () => { const r = evidenceCheck(); $('evidence-status').textContent = r.complete ? 'All sections and calculations are present. Scientific reasoning still needs instructor review.' : r.issues.join(' '); });
  $('export-study').addEventListener('click', exportStudy); $('import-study').addEventListener('change', openStudy);
  loadCase('valve_ch4');
}
init();
