/** Lab P6 · 2027 preview page module: activity coefficients from VLE and G^E models. */
import * as ac from './activity.js';
import { palette as c } from '../../labs/assets/palette.js';
import { withStudent, studentFileName } from './student.js';

const SCHEMA = 'skh-thermo-p6-activity-study/1';
const $ = (id) => document.getElementById(id);
const fx = (v, d = 3) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-/, '−'));
const num = (v, d = 4) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { maximumSignificantDigits: d }).replace(/^-/, '−'));
const NOTE_IDS = { concept1: 'note-concept1', concept2: 'note-concept2', concept3: 'note-concept3', all: 'note-all', henry: 'note-henry', stab: 'note-stab', decision: 'note-decision' };
const OBJ = { lng: 'ln γ', gE: 'G^E/RT' };
let data = null, props = null, E60 = null;
const study = { inputs: null, res: null, cases: [], all: null, henry: null, stab: null };
function cell(t) { const td = document.createElement('td'); td.textContent = t; return td; }
function li(h) { const e = document.createElement('li'); e.innerHTML = h; return e; }
function readInputs() { return { model: $('model').value, alpha: Number($('alpha').value), objective: $('objective').value, xh: Number($('xh').value) }; }
function applyInputs(i) { $('model').value = i.model; $('alpha').value = String(i.alpha); $('objective').value = i.objective; $('xh').value = String(i.xh); }
function validInputs(i) { return i && ac.MODELS[i.model] && [0.2, 0.3, 0.47].includes(i.alpha) && OBJ[i.objective] && i.xh > 0 && i.xh < 1; }
function evaluate(i) {
  const f = ac.fit(i.model, E60, i.alpha, i.objective);
  return { f, p60: ac.predict(i.model, f.p, props, data.datasets[0]), p80: ac.predict(i.model, f.p, props, data.datasets[1]), curv: ac.minCurvature(i.model, f.p) };
}
function pstr(m, p) { return m === 'm1' ? 'A = ' + fx(p[0], 4) : m === 'wilson' ? 'Λ₁₂ = ' + fx(p[0], 4) + ', Λ₂₁ = ' + fx(p[1], 4) : m === 'nrtl' ? 'τ₁₂ = ' + fx(p[0], 4) + ', τ₂₁ = ' + fx(p[1], 4) + ', α = ' + p[2] : 'A₁₂ = ' + fx(p[0], 4) + ', A₂₁ = ' + fx(p[1], 4); }
function calculate({ quiet = false } = {}) {
  if (!data) return false;
  const i = readInputs(); if (!validInputs(i)) { $('form-error').hidden = false; $('form-error').textContent = 'Enter x₁ between 0 and 1.'; return false; }
  $('form-error').hidden = true; study.inputs = i; study.res = evaluate(i);
  $('diagram-panel').hidden = false; render(); renderChart();
  for (const id of ['save-case', 'run-all', 'run-henry', 'run-stab', 'export-study']) $(id).disabled = false;
  $('graduate-baseline').textContent = 'Current: ' + ac.MODELS[i.model] + ', objective ' + OBJ[i.objective] + ' · γ₁∞ ' + fx(Math.exp(study.res.f.inf[0]), 2) + ', RMS y₁ at 80 kPa ' + fx(study.res.p80.rmsY, 4) + '.';
  if (!quiet) $('status').textContent = 'Calculated. Add the result to the comparison before changing a setting.';
  return true;
}
function render() {
  const i = study.inputs, { f, p60, p80, curv } = study.res, g = f.inf.map(Math.exp);
  $('result-placeholder').hidden = true; $('results').hidden = false;
  $('result-phase').textContent = ac.MODELS[i.model] + (i.model === 'nrtl' ? ', α = ' + i.alpha : '') + ' · fitted to ' + OBJ[i.objective];
  $('phase-interpretation').textContent = E60.length + ' data points at 60 kPa inside the vapor-pressure ranges; ' + p80.rows.length + ' at 80 kPa held out.';
  const rows = [['Parameters', pstr(i.model, f.p)], ['RMS residual, G^E/RT', fx(f.rms, 4)], ['RMS residual, ln γ', fx(f.rmsLn, 3)], ['γ₁∞ (2-propanol in water), γ₂∞', fx(g[0], 2) + ', ' + fx(g[1], 2)],
    ['60 kPa (fitted): RMS bubble T, RMS y₁', fx(p60.rmsT, 2) + ' K, ' + fx(p60.rmsY, 4)], ['80 kPa (held out): RMS bubble T, RMS y₁', fx(p80.rmsT, 2) + ' K, ' + fx(p80.rmsY, 4)],
    ['Minimum scaled curvature 1 + x₁x₂∂²(G^E/RT)/∂x₁²', fx(curv.c, 3) + ' at x₁ = ' + fx(curv.x, 3) + (curv.c < 0 ? ' · predicts a liquid split' : ' · one liquid')]];
  $('sum-body').replaceChildren(...rows.map(([a, b]) => { const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = a; tr.append(th, cell(b)); return tr; }));
  $('pt-body').replaceChildren(...E60.map((q) => { const l = ac.lnGamma(i.model, f.p, q.x), b = p60.rows.find((r) => r.x === q.x), tr = document.createElement('tr');
    tr.append(cell(fx(q.x, 4)), cell(fx(q.T, 2)), cell(fx(q.g1, 3) + ' / ' + fx(Math.exp(l[0]), 3)), cell(fx(q.g2, 3) + ' / ' + fx(Math.exp(l[1]), 3)), cell(fx(q.gE, 3) + ' / ' + fx(ac.gE(i.model, f.p, q.x), 3)), cell(fx(q.y, 4) + ' / ' + (b ? fx(b.y, 4) : '—'))); return tr; }));
  const pr = $('prediction').value, act = g[0] < 3 ? 'low' : g[0] <= 15 ? 'mid' : 'high';
  $('prediction-feedback').textContent = pr ? (pr === act ? 'Your prediction matches this fit: γ₁∞ = ' + fx(g[0], 2) + '.' : 'This fit gives γ₁∞ = ' + fx(g[0], 2) + '. Question B in Step 4 shows why fits disagree.') : '';
  const x = i.xh, l = ac.lnGamma(i.model, f.p, x), q = E60[Math.floor(E60.length / 2)];
  $('calc-steps').replaceChildren(
    li('Data point x₁ = ' + q.x + ', y₁ = ' + q.y + ', T = ' + q.T + ' K, P = ' + q.PkPa + ' kPa: P₁<sup>sat</sup> = ' + fx(q.p1, 3) + ' kPa, P₂<sup>sat</sup> = ' + fx(q.p2, 3) + ' kPa (Antoine).'),
    li('γ₁ = y₁P/(x₁P₁<sup>sat</sup>) = ' + fx(q.g1, 4) + '; γ₂ = y₂P/(x₂P₂<sup>sat</sup>) = ' + fx(q.g2, 4) + '; G<sup>E</sup>/RT = x₁ ln γ₁ + x₂ ln γ₂ = ' + fx(q.gE, 4) + '.'),
    li('Model at x₁ = ' + x + ': ln γ₁ = ' + fx(l[0], 4) + ', ln γ₂ = ' + fx(l[1], 4) + ', G<sup>E</sup>/RT = ' + fx(ac.gE(i.model, f.p, x), 4) + '.'),
    li('Gibbs–Duhem: x₁ d ln γ₁/dx₁ + x₂ d ln γ₂/dx₁ = ' + (() => { const h = 1e-5, a = ac.lnGamma(i.model, f.p, x - h), b = ac.lnGamma(i.model, f.p, x + h); return (x * (b[0] - a[0]) / (2 * h) + (1 - x) * (b[1] - a[1]) / (2 * h)).toExponential(1); })() + ' (zero for any model derived from one G<sup>E</sup>).'),
    li('Henry convention at x₁ = ' + x + ': γ₁* = γ₁/γ₁∞ = ' + fx(Math.exp(l[0] - f.inf[0]), 4) + '; it tends to 1 as x₁ → 0, as γ₁ tends to 1 as x₁ → 1.'),
  );
}
async function renderChart() {
  if (!study.res) return; if (!window.Plotly) { setTimeout(renderChart, 200); return; }
  const i = study.inputs, f = study.res.f, view = $('view').value, xs = Array.from({ length: 199 }, (_, k) => (k + 1) / 200), tr = []; let yT;
  if (view === 'lng') {
    tr.push({ x: E60.map((q) => q.x), y: E60.map((q) => Math.log(q.g1)), name: 'ln γ₁ data', mode: 'markers', marker: { color: c.amber, size: 8 } }, { x: E60.map((q) => q.x), y: E60.map((q) => Math.log(q.g2)), name: 'ln γ₂ data', mode: 'markers', marker: { color: c.teal, size: 8 } });
    tr.push({ x: xs, y: xs.map((x) => ac.lnGamma(i.model, f.p, x)[0]), name: 'ln γ₁ model', mode: 'lines', line: { color: c.amber, width: 2.5 } }, { x: xs, y: xs.map((x) => ac.lnGamma(i.model, f.p, x)[1]), name: 'ln γ₂ model', mode: 'lines', line: { color: c.teal, width: 2.5 } }); yT = 'ln γ';
  } else if (view === 'ge') {
    const pts = E60.filter((q) => q.x > 0.02 && q.x < 0.98);
    tr.push({ x: pts.map((q) => q.x), y: pts.map((q) => q.gE / (q.x * (1 - q.x))), name: 'Data', mode: 'markers', marker: { color: c.teal, size: 8 } }, { x: xs, y: xs.map((x) => ac.gE(i.model, f.p, x) / (x * (1 - x))), name: 'Model', mode: 'lines', line: { color: c.amber, width: 2.5 } }); yT = 'G^E/(RT x₁x₂)';
  } else {
    for (const [k, col] of [[0, c.teal], [1, c.rust]]) { const ds = data.datasets[k], pr = k ? study.res.p80 : study.res.p60; tr.push({ x: ds.rows.map((r) => r.x), y: ds.rows.map((r) => r.y), name: ds.pressureKPa + ' kPa data', mode: 'markers', marker: { color: col, size: 7 } }, { x: pr.rows.map((r) => r.x), y: pr.rows.map((r) => r.y), name: ds.pressureKPa + ' kPa model', mode: 'lines', line: { color: col, width: 2 } }); }
    tr.push({ x: [0, 1], y: [0, 1], name: 'y = x', mode: 'lines', line: { color: c.mist, width: 1, dash: 'dot' } }); yT = 'y₁';
  }
  const layout = { margin: { l: 70, r: 16, t: 16, b: 56 }, font: { family: 'Source Sans 3, sans-serif', size: 13, color: c.ink }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', showlegend: false, xaxis: { title: { text: 'x₁ (2-propanol)' }, range: [0, 1], linecolor: c.graphite, gridcolor: c.mist, zeroline: false }, yaxis: { title: { text: yT }, linecolor: c.graphite, gridcolor: c.mist, zeroline: false } };
  try { await window.Plotly.react('act-chart', tr, layout, { responsive: true, displayModeBar: false }); } catch { /* numbers in Step 2 */ }
  $('chart-legend').replaceChildren(...tr.map((t) => { const sp = document.createElement('span'), e = document.createElement('i'); e.style.borderColor = t.marker?.color || t.line.color; if (t.mode === 'markers') e.className = 'legend-dot'; sp.append(e, document.createTextNode(t.name)); return sp; }));
  $('chart-note').textContent = view === 'ge' ? 'For two-parameter Margules this plot is a straight line from A₁₂ at x₁ = 0 to A₂₁ at x₁ = 1. The dilute points scatter widely because x is uncertain by 0.02.' : view === 'xy' ? 'The azeotrope is where the curve crosses y = x. The 80 kPa curve uses parameters fitted at 60 kPa.' : 'The dilute 2-propanol points (x₁ < 0.05) scatter because the composition uncertainty is comparable with x₁.';
}
function runAll() {
  const rows = []; for (const m of Object.keys(ac.MODELS)) for (const o of ['lng', 'gE']) { const f = ac.fit(m, E60, 0.3, o), a = ac.predict(m, f.p, props, data.datasets[0]), b = ac.predict(m, f.p, props, data.datasets[1]), cv = ac.minCurvature(m, f.p); rows.push({ m, o, p: f.p, g: f.inf.map(Math.exp), a, b, cv }); }
  study.all = rows.map((r) => ({ m: r.m, o: r.o, p: r.p, g: r.g, rmsY60: r.a.rmsY, rmsY80: r.b.rmsY, curv: r.cv.c }));
  $('all-body').replaceChildren(...rows.map((r) => { const t = document.createElement('tr'); t.append(cell(ac.MODELS[r.m]), cell(OBJ[r.o]), cell(pstr(r.m, r.p)), cell(fx(r.g[0], 2) + ', ' + fx(r.g[1], 2)), cell(fx(r.a.rmsT, 2) + ', ' + fx(r.a.rmsY, 3)), cell(fx(r.b.rmsT, 2) + ', ' + fx(r.b.rmsY, 3)), cell(fx(r.cv.c, 3))); return t; }));
  $('all-wrap').hidden = false;
  const best = rows.reduce((b, r) => (r.b.rmsY < b.b.rmsY ? r : b));
  $('all-status').textContent = 'Smallest held-out RMS y₁ at 80 kPa: ' + ac.MODELS[best.m] + ' with ' + OBJ[best.o] + ' (' + fx(best.b.rmsY, 3) + '). Splits predicted: ' + rows.filter((r) => r.cv.c < 0).map((r) => ac.MODELS[r.m] + ' (' + OBJ[r.o] + ')').join(', ') + '.';
}
function runHenry() {
  const rows = []; for (const m of ['m2', 'vl', 'wilson', 'nrtl']) for (const o of ['lng', 'gE']) { const f = ac.fit(m, E60, 0.3, o), g = Math.exp(f.inf[0]), l = ac.lnGamma(m, f.p, 0.01)[0]; rows.push({ m, o, g, H345: g * ac.psat(props[0], 345), H355: g * ac.psat(props[0], 355), r: Math.exp(l), h: Math.exp(l) / g }); }
  study.henry = rows;
  $('henry-body').replaceChildren(...rows.map((r) => { const t = document.createElement('tr'); t.append(cell(ac.MODELS[r.m] + ', ' + OBJ[r.o]), cell(fx(r.g, 2)), cell(num(r.H345, 4)), cell(num(r.H355, 4)), cell(fx(r.r, 3) + ', ' + fx(r.h, 4))); return t; }));
  $('henry-wrap').hidden = false;
  const ln = rows.filter((r) => r.o === 'lng').map((r) => r.H345), ge = rows.filter((r) => r.o === 'gE').map((r) => r.H345);
  $('henry-status').textContent = 'H₁ at 345 K: ' + num(Math.min(...ln), 3) + '–' + num(Math.max(...ln), 3) + ' kPa from the ln γ fits, ' + num(Math.min(...ge), 3) + '–' + num(Math.max(...ge), 3) + ' kPa from the G^E fits.';
}
function runStab() {
  const rows = []; for (const a of [0.2, 0.3, 0.47]) for (const o of ['lng', 'gE']) { const f = ac.fit('nrtl', E60, a, o), cv = ac.minCurvature('nrtl', f.p); rows.push({ a, o, p: f.p, rmsLn: f.rmsLn, cv }); }
  study.stab = rows.map((r) => ({ a: r.a, o: r.o, p: r.p, c: r.cv.c, x: r.cv.x }));
  $('stab-body').replaceChildren(...rows.map((r) => { const t = document.createElement('tr'); t.append(cell(String(r.a)), cell(OBJ[r.o]), cell(fx(r.p[0], 3) + ', ' + fx(r.p[1], 3)), cell(fx(r.rmsLn, 3)), cell(fx(r.cv.c, 3) + ' (' + fx(r.cv.x, 3) + ')')); return t; }));
  $('stab-wrap').hidden = false;
  $('stab-status').textContent = rows.filter((r) => r.cv.c < 0).length + ' of 6 NRTL fits predict a split, all with the G^E objective: ' + rows.filter((r) => r.cv.c < 0).map((r) => 'α = ' + r.a).join(', ') + '.';
}
function notes() { return Object.fromEntries(Object.entries(NOTE_IDS).map(([k, id]) => [k, $(id).value])); }
function summary(r) { return { g: r.f.inf.map(Math.exp), y60: r.p60.rmsY, y80: r.p80.rmsY, c: r.curv.c }; }
function saveCase() { if (!study.res) return; const name = $('case-name').value.trim() || 'Case ' + (study.cases.length + 1); study.cases.push({ name, inputs: { ...study.inputs }, summary: summary(study.res) }); renderCases(); $('status').textContent = 'Saved “' + name + '”.'; }
function renderCases() {
  $('comparison-empty').hidden = study.cases.length > 0; $('comparison-table-wrap').hidden = !study.cases.length;
  $('comparison-body').replaceChildren(...study.cases.map((s) => { const t = document.createElement('tr'), m = s.summary; t.append(cell(s.name), cell(ac.MODELS[s.inputs.model] + ', ' + OBJ[s.inputs.objective]), cell(fx(m.g[0], 2) + ', ' + fx(m.g[1], 2)), cell(fx(m.y60, 3) + ' / ' + fx(m.y80, 3)), cell(fx(m.c, 3)));
    const td = document.createElement('td'), b = document.createElement('button'); b.type = 'button'; b.className = 'secondary-button'; b.textContent = 'Reopen'; b.addEventListener('click', () => { applyInputs(s.inputs); $('case-name').value = s.name; calculate({ quiet: true }); }); td.append(b); t.append(td); return t; }));
}
function loadCase(m) { applyInputs({ ...readInputs(), model: m, objective: 'lng' }); $('case-name').value = ac.MODELS[m]; for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === m)); $('status').textContent = ac.MODELS[m] + ' loaded. Make a prediction, then press Fit and predict.'; }
function evidenceCheck() { const n = notes(), issues = []; if (!study.all) issues.push('Fit every model both ways (A).'); if (!study.henry) issues.push('Compare the standard states (B).'); if (!study.stab) issues.push('Test stability (C).'); for (const [k, l] of [['all', 'Claim 1'], ['henry', 'Claim 2'], ['stab', 'Claim 3'], ['decision', 'the decision']]) if ((n[k] || '').trim().length < 40) issues.push('Write ' + l + ' with numbers.'); return issues; }
function exportStudy() {
  const rec = { schema: SCHEMA, engineVersion: ac.ACT_VERSION, dataVersion: data.version, savedAt: new Date().toISOString(), inputs: study.inputs || readInputs(), prediction: $('prediction').value, caseName: $('case-name').value, cases: study.cases, view: $('view').value, notes: notes(), reflection: $('reflection').value, investigations: { all: Boolean(study.all), henry: Boolean(study.henry), stab: Boolean(study.stab) }, aiCode: window.aiCode?.state() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(withStudent(rec), null, 2)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = studentFileName('labP6-activity-study.json'); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Study downloaded.';
}
async function openStudy(ev) {
  const file = ev.target.files?.[0]; if (!file) return;
  try { if (file.size > 3e6) throw new Error('The file is too large.'); const rec = JSON.parse(await file.text()); if (rec.schema !== SCHEMA) throw new Error('This file is not a Lab P6 study.'); if (!validInputs(rec.inputs)) throw new Error('The saved inputs are invalid.');
    applyInputs(rec.inputs); $('prediction').value = ['low', 'mid', 'high'].includes(rec.prediction) ? rec.prediction : ''; $('case-name').value = String(rec.caseName || '').slice(0, 80); $('view').value = ['lng', 'ge', 'xy'].includes(rec.view) ? rec.view : 'lng';
    for (const [k, id] of Object.entries(NOTE_IDS)) $(id).value = typeof rec.notes?.[k] === 'string' ? rec.notes[k] : ''; $('reflection').value = typeof rec.reflection === 'string' ? rec.reflection : '';
    study.cases = (rec.cases || []).slice(0, 60).filter((s) => validInputs(s?.inputs) && typeof s.name === 'string').map((s) => ({ name: s.name.slice(0, 80), inputs: s.inputs, summary: summary(evaluate(s.inputs)) }));
    renderCases(); calculate({ quiet: true }); if (rec.investigations?.all) runAll(); if (rec.investigations?.henry) runHenry(); if (rec.investigations?.stab) runStab();
    $('status').textContent = 'Study reopened and recalculated.';
  } catch (e) { $('status').textContent = 'The study could not be opened: ' + e.message; } finally { ev.target.value = ''; }
}
async function init() {
  try { data = await (await fetch(new URL('../../labs/assets/ipa-water.json', import.meta.url))).json(); props = data.properties; E60 = ac.experimental(data.datasets[0], props); } catch { $('status').textContent = 'The data could not be loaded.'; return; }
  for (const b of document.querySelectorAll('[data-case]')) b.addEventListener('click', () => loadCase(b.dataset.case));
  $('calculate').addEventListener('click', () => calculate()); $('act-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('view').addEventListener('change', renderChart); $('save-case').addEventListener('click', saveCase);
  $('run-all').addEventListener('click', runAll); $('run-henry').addEventListener('click', runHenry); $('run-stab').addEventListener('click', runStab);
  $('check-evidence').addEventListener('click', () => { const r = evidenceCheck(); $('evidence-status').textContent = r.length ? r.join(' ') : 'All sections and calculations are present. Scientific reasoning still needs instructor review.'; });
  $('export-study').addEventListener('click', exportStudy); $('import-study').addEventListener('change', openStudy);
  loadCase('m2');
}
init();
