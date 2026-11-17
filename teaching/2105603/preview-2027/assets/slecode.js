// Lab 10 Graduate step E: check code that an AI assistant helped write, on measured naphthalene solubility.
// Data: Xu et al., J. Chem. Eng. Data 64 (2019) 3018 via NIST ThermoML (molality of naphthalene vs T).
// Model: pure solid naphthalene, Delta Cp neglected; liquid ln gamma1 = (W/RT) x2^2 (one-parameter regular
// solution). The lab recomputes the ideal solubility, the mole fraction and gamma1 of a stated row, the
// least-squares W in ln x1, and the predicted solubility at 298.15 K. Saved in the study file as "aiCode".
const $ = (id) => document.getElementById(id);
const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
export const R = 8.314462618, TREF = 298.15;
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const INPUT = ['ai-solvent', 'ai-fusion', 'ai-row', 'ai-xid', 'ai-x', 'ai-g', 'ai-w', 'ai-rmse', 'ai-xp'];

export const moleFraction = (m, M) => m / (m + 1000 / M);
export const idealX = (T, Tm, dH) => Math.exp(-dH * 1000 / R * (1 / T - 1 / Tm));
export function solubility(T, w, Tm, dH) {
  const rhs = -dH * 1000 / R * (1 / T - 1 / Tm), f = (x) => Math.log(x) + w / (R * T) * (1 - x) ** 2 - rhs;
  let lo = 1e-12, hi = 1 - 1e-12;
  if (f(lo) * f(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; if (hi - lo < 1e-15) break; }
  return (lo + hi) / 2;
}
export function rows(solvent) {
  const s = data.solvents[solvent];
  return s.rows.map((r) => ({ T: r.T, x: moleFraction(r.molality, s.molarMass) }));
}
export function fitW(rs, Tm, dH) {
  const obj = (w) => rs.reduce((a, r) => a + (Math.log(solubility(r.T, w, Tm, dH)) - Math.log(r.x)) ** 2, 0);
  let a = -6000, b = 9000; const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a), d = a + g * (b - a), fc = obj(c), fd = obj(d);
  for (let i = 0; i < 120; i++) { if (fc < fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = obj(c); } else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = obj(d); } }
  const w = (a + b) / 2;
  return { w, rmse: Math.sqrt(obj(w) / rs.length), obj };
}
const close = (a, b, rel, abs = 0) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));

function csv() {
  const lines = ['solvent,M_solvent_g_per_mol,T_K,U_T_K,molality_naphthalene_mol_per_kg'];
  for (const [k, s] of Object.entries(data.solvents)) for (const r of s.rows) lines.push([k, s.molarMass, r.T, r.UT, r.molality].join(','));
  return lines.join('\n') + '\n';
}
function download() {
  const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'lab10-naphthalene-solubility.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function fillRows() {
  const s = data.solvents[$('ai-solvent').value];
  const keep = $('ai-row').value;
  $('ai-row').innerHTML = s.rows.map((r, i) => `<option value="${i}">${r.T} K · m = ${r.molality}</option>`).join('');
  if (keep && Number(keep) < s.rows.length) $('ai-row').value = keep;
}

function run() {
  try {
    if (!data) throw new Error('The measured data are not loaded yet.');
    const solvent = $('ai-solvent').value, F = data.fusion[$('ai-fusion').value], s = data.solvents[solvent];
    const Tm = F.Tm, dH = F.dH, rs = rows(solvent), k = Number($('ai-row').value), row = s.rows[k];
    const fit = fitW(rs, Tm, dH), checks = [];

    const xidLab = idealX(TREF, Tm, dH), xidYou = num('ai-xid');
    if (Number.isFinite(xidYou)) {
      const ok = close(xidYou, xidLab, 0.002);
      let why = '';
      if (!ok) {
        const alts = { 'with ΔH in kJ/mol where J/mol is needed (no factor 1000)': Math.exp(-dH / R * (1 / TREF - 1 / Tm)), 'with T in °C': Math.exp(-dH * 1000 / R * (1 / (TREF - 273.15) - 1 / (Tm - 273.15))), 'with the other fusion data set': idealX(TREF, ...(F === data.fusion.paper ? [data.fusion.nist.Tm, data.fusion.nist.dH] : [data.fusion.paper.Tm, data.fusion.paper.dH])) };
        const hit = Object.entries(alts).find(([, v]) => close(xidYou, v, 0.01));
        why = hit ? `Your value matches the ideal solubility computed ${hit[0]}.` : 'Check ln x₁ = −(ΔH/R)(1/T − 1/T_m) with ΔH in J/mol and T in K.';
      }
      checks.push({ name: `Ideal solubility at ${TREF} K`, lab: fmt(xidLab), yours: fmt(xidYou), ok, why });
    }

    const xLab = moleFraction(row.molality, s.molarMass), xYou = num('ai-x');
    if (Number.isFinite(xYou)) {
      const ok = close(xYou, xLab, 0.002);
      let why = '';
      if (!ok) {
        if (close(xYou, row.molality, 0.002)) why = 'This is the molality, not the mole fraction. x₁ = m/(m + 1000/M_solvent).';
        else if (close(xYou, 1 - xLab, 0.002)) why = 'This is the solvent mole fraction x₂. Component 1 is naphthalene.';
        else if (close(xYou, row.molality / (row.molality + 1000 / 128.17), 0.002)) why = 'The molar mass of naphthalene was used in place of the solvent\'s. Molality is per kg of solvent.';
        else why = 'Check the conversion x₁ = m/(m + 1000/M_solvent) and the molar mass of the solvent.';
      }
      checks.push({ name: `Mole fraction x₁ of the row at ${row.T} K`, lab: fmt(xLab), yours: fmt(xYou), ok, why });
    }

    const gLab = idealX(row.T, Tm, dH) / xLab, gYou = num('ai-g');
    if (Number.isFinite(gYou)) {
      const ok = close(gYou, gLab, 0.005);
      checks.push({ name: `γ₁ at ${row.T} K from the data and the fusion data`, lab: fmt(gLab, 3), yours: fmt(gYou, 3), ok,
        why: ok ? '' : close(gYou, 1 / gLab, 0.005) ? 'Your value is the inverse: γ₁ = x₁ᵢᵈ/x₁, the ideal solubility over the measured one.' : 'Check γ₁ = x₁ᵢᵈ(T)/x₁ at the row\'s own T, with the fusion data set you chose.' });
    }

    const wYou = num('ai-w');
    if (!Number.isFinite(wYou)) throw new Error('Enter the fitted W from your code, in J/mol.');
    const excess = (fit.obj(wYou) - fit.obj(fit.w)) / fit.obj(fit.w);
    const okW = Math.abs(wYou - fit.w) <= Math.max(5, 0.005 * Math.abs(fit.w));
    let whyW = '';
    if (!okW) {
      if (close(wYou, fit.w / 1000, 0.01)) whyW = 'Your W is in kJ/mol. The checks use J/mol.';
      else if (excess > 0.01) whyW = `Your W gives a sum of squares ${fmt(100 * excess, 1)} % above the minimum of the objective in ln x₁. A different objective (for example in x₁ or in ln γ₁), a different set of rows, or a stopped optimizer.`;
      else whyW = 'Your W is near the minimum of a flat objective; report fewer digits, and its uncertainty.';
    }
    checks.push({ name: 'Fitted W, minimizing Σ(ln x₁,model − ln x₁,meas)² over all rows', lab: `${fmt(fit.w, 1)} J/mol`, yours: `${fmt(wYou, 1)} J/mol`, ok: okW, why: whyW });

    const rmYou = num('ai-rmse');
    if (Number.isFinite(rmYou)) {
      const rm = Math.sqrt(fit.obj(wYou) / rs.length), ok = close(rmYou, rm, 0.02, 2e-4);
      checks.push({ name: 'RMSE in ln x₁ at your W', lab: fmt(rm), yours: fmt(rmYou), ok,
        why: ok ? '' : close(rmYou, rm * rm, 0.02) ? 'This is the mean square, not its root.' : 'Check that each model x₁ solves the implicit equation at the row\'s T, and that the error is in ln x₁.' });
    }

    const xpYou = num('ai-xp');
    if (Number.isFinite(xpYou)) {
      const xp = solubility(TREF, wYou, Tm, dH), ok = close(xpYou, xp, 0.003);
      const dilute = idealX(TREF, Tm, dH) * Math.exp(-wYou / (R * TREF));
      checks.push({ name: `Predicted solubility at ${TREF} K from your W`, lab: fmt(xp), yours: fmt(xpYou), ok,
        why: ok ? '' : close(xpYou, dilute, 0.003) ? 'Your value uses γ₁ at infinite dilution (x₂ = 1). γ₁ depends on x₁, so x₁ = x₁ᵢᵈ/γ₁(x₁) must be solved, not evaluated once.' : 'Solve ln x₁ + (W/RT)(1 − x₁)² = −(ΔH/R)(1/T − 1/T_m) for x₁.' });
    }

    const other = $('ai-fusion').value === 'paper' ? 'nist' : 'paper', O = data.fusion[other], fo = fitW(rs, O.Tm, O.dH);
    checks.push({ name: 'Same data, other fusion data set (for the discussion, not a code check)', lab: `W = ${fmt(fo.w, 0)} J/mol, x₁(${TREF} K) = ${fmt(solubility(TREF, fo.w, O.Tm, O.dH))}`, yours: '—', ok: true, kind: 'info', why: 'Compare W and the prediction. Which one depends on the fusion data, and which does not?' });

    last = { solvent, fusion: $('ai-fusion').value, row: k, ref: { xid: xidLab, x: xLab, gamma: gLab, w: fit.w, rmse: fit.rmse }, checks };
    render(last);
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message; }
}

function render(res) {
  $('ai-out').innerHTML = res.checks.map((c) => `<tr><th scope="row">${c.name}</th><td>${c.lab}</td><td>${c.yours}</td><td class="${c.ok ? '' : 'warn'}">${c.kind === 'info' ? 'compare' : c.ok ? 'agrees' : 'check'}</td><td style="text-align:left">${c.why}</td></tr>`).join('');
  const code = res.checks.filter((c) => !c.kind), bad = code.filter((c) => !c.ok).length;
  $('ai-status').textContent = bad ? `${bad} of ${code.length} code checks disagree with the lab. Find the cause in the code, fix it, rerun, and enter the new outputs.` : `All ${code.length} code checks agree. Now explain what the checks do not establish.`;
  $('ai-results').hidden = false;
}

function state() {
  const s = { result: last };
  for (const id of [...TEXT, ...INPUT]) s[id] = $(id)?.value ?? '';
  return s;
}
function restore(s) {
  if (!s) return;
  if (typeof s['ai-solvent'] === 'string' && data?.solvents[s['ai-solvent']]) { $('ai-solvent').value = s['ai-solvent']; fillRows(); }
  for (const id of [...TEXT, ...INPUT]) if (typeof s[id] === 'string' && $(id)) $(id).value = s[id];
  if (s.result) run();
}

async function init() {
  if (!$('ai-run')) return;
  try {
    const response = await fetch(new URL('../../labs/assets/naphthalene-sle.json', import.meta.url));
    data = await response.json();
    $('ai-solvent').innerHTML = Object.keys(data.solvents).map((k) => `<option value="${k}"${k === 'octane' ? ' selected' : ''}>${k}</option>`).join('');
    fillRows();
    $('ai-run').disabled = false; $('ai-csv').disabled = false;
  } catch { $('ai-status').textContent = 'The measured data could not be loaded.'; }
  $('ai-solvent').addEventListener('change', fillRows);
  $('ai-run').addEventListener('click', run);
  $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const rec = JSON.parse(await file.text()); restore(rec.aiCode); } catch { /* the lab reports invalid files */ }
  });
  window.aiCode = { state, run, csv };
}
init();
